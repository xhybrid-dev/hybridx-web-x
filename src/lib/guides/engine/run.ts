// src/lib/guides/engine/run.ts
//
// The drafting engine (docs/content-engine-plan.md, step 4): one step per tick
// of the hourly maintenance job, every stage saved before the next, so a
// failure or a timeout loses at most one stage and nothing publishes by
// accident. Publishing is never the engine's to do: it hands Jon a draft and
// stops.
//
// Each tick, in order:
//   1. advance a draft already under way: code checks (one fix if they fail),
//      then the second-model review (one fix if it finds something serious);
//   2. otherwise revise an article Jon has commented on (at most three rounds);
//   3. otherwise start a new draft from the topic queue, if the pipeline has
//      room: fewer than two waiting for review, and fewer than three waiting or
//      scheduled ahead, which keeps pace with three slots a week;
//   4. send any review email that is due, within the email hours.
//
// At most MODEL_CALLS_PER_TICK model calls per tick, to stay well inside the
// job's time limit. Off unless CONTENT_ENGINE_MODE is "on"; the admin Pause
// switch stops drafting, revising and emails without a deploy. A lease lock
// keeps two overlapping ticks from working the same article.
//
// The model calls and the email sender are passed in (EngineDeps), so this file
// can be tested with stand-ins and never imports a model SDK itself.

import { adminFirestore } from '@/lib/firebase-admin';
import { checkDraft, type CheckResult, type Issue } from '../checks';
import type { ReviewEmail, ReviewEmailKind } from '../email';
import { inEmailHours } from '../email';
import { ensureQueueSeeded, listTopics, nextTopic, setTopic, type Topic } from '../queue';
import { slugify } from '../review';
import type { EngineSettings } from '../slots';
import {
  getEngineSettings,
  getGuide,
  listAllGuides,
  listComments,
  listPublishedGuides,
  resolveComment,
  reviewAddress,
  saveGuide,
  updateGuideState,
} from '../store';
import { RESERVED_GUIDE_SLUGS } from '../topics';
import { GuideSchema, type Guide } from '../types';
import type { EngineModels, ReviewOutcome } from './models';
import { draftPrompt, fixPrompt, revisePrompt, reviewPrompt, type BriefTopic } from './prompts';
import { toContent, type DraftContent } from './shape';

export const RUNS_COLLECTION = 'guideRuns';
const LOCK = { collection: 'contentSettings', id: 'engineLock' } as const;
const LOCK_MS = 10 * 60_000;
export const MODEL_CALLS_PER_TICK = 2;
export const MAX_REVISION_ROUNDS = 3;
const MAX_ATTEMPTS = 3;
const REMINDER_AFTER_MS = 3 * 86_400_000;

export interface Run {
  slug: string;
  topicId?: string;
  kind: 'draft' | 'revision';
  stage: 'check' | 'review' | 'notify' | 'done';
  /** Revision rounds after the first draft. */
  round: number;
  checkFixes: number;
  reviewFixes: number;
  /** Failed model calls at the current stage. */
  attempts: number;
  checks?: CheckResult;
  review?: ReviewOutcome;
  changedBlocks?: number[];
  gaveUp?: boolean;
  error?: string;
  notifiedAt?: string;
  reminderSentAt?: string;
  updatedAt: string;
}

export interface EngineDeps {
  models: EngineModels;
  send(email: ReviewEmail): Promise<void>;
  now(): Date;
}

export function engineOn(): boolean {
  return process.env.CONTENT_ENGINE_MODE === 'on';
}

/* ── Storage ────────────────────────────────────────────────────────────── */

const clean = <T extends object>(o: T) => JSON.parse(JSON.stringify(o)) as T;

export async function getRun(slug: string): Promise<Run | null> {
  const snap = await adminFirestore.collection(RUNS_COLLECTION).doc(slug).get();
  return snap.exists ? (snap.data() as Run) : null;
}

async function saveRun(run: Run, now: Date): Promise<void> {
  await adminFirestore.collection(RUNS_COLLECTION).doc(run.slug).set(clean({ ...run, updatedAt: now.toISOString() }));
}

async function runsAt(stage: Run['stage']): Promise<Run[]> {
  const snap = await adminFirestore.collection(RUNS_COLLECTION).where('stage', '==', stage).get();
  return snap.docs.map((d) => d.data() as Run);
}

async function takeLock(now: Date): Promise<boolean> {
  const ref = adminFirestore.collection(LOCK.collection).doc(LOCK.id);
  return adminFirestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const until = Number((snap.data() as { lockedUntil?: number } | undefined)?.lockedUntil ?? 0);
    if (until > now.getTime()) return false;
    tx.set(ref, { lockedUntil: now.getTime() + LOCK_MS });
    return true;
  });
}

async function releaseLock(): Promise<void> {
  await adminFirestore.collection(LOCK.collection).doc(LOCK.id).set({ lockedUntil: 0 });
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

const contentOf = (g: Guide): DraftContent => ({ title: g.title, description: g.description, point: g.point, blocks: g.blocks });
const message = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 300);

/** What the schema says about a candidate article, as fixable issues. */
function schemaIssues(candidate: Record<string, unknown>, now: Date): Issue[] {
  const result = GuideSchema.safeParse({ ...candidate, revision: 1, updatedAt: now.toISOString() });
  if (result.success) return [];
  return result.error.issues.slice(0, 15).map((i) => {
    const [first, index, ...rest] = i.path;
    const block = first === 'blocks' && typeof index === 'number' ? index + 1 : undefined;
    return { code: 'schema', block, message: `${block ? rest.join('.') || 'block' : i.path.join('.')}: ${i.message}` };
  });
}

/** Saves new content for an article as its next revision, keeping its status. */
async function saveContent(guide: Guide, content: DraftContent, now: Date): Promise<Guide> {
  const { revision: _r, updatedAt: _u, ...rest } = guide;
  return saveGuide({ ...rest, ...content }, now);
}

/** 1-based blocks that differ between two versions. */
export function changedBlocks(before: Guide['blocks'], after: Guide['blocks']): number[] {
  const out: number[] = [];
  for (let i = 0; i < Math.max(before.length, after.length); i++) {
    if (JSON.stringify(before[i]) !== JSON.stringify(after[i])) out.push(i + 1);
  }
  return out;
}

async function uniqueSlug(title: string): Promise<string> {
  let base = slugify(title) || 'article';
  if ((RESERVED_GUIDE_SLUGS as readonly string[]).includes(base)) base = `${base}-guide`;
  let slug = base;
  for (let n = 2; await getGuide(slug); n++) slug = `${base.slice(0, 76)}-${n}`;
  return slug;
}

async function briefTopicFor(run: Pick<Run, 'topicId'>, guide: Guide): Promise<BriefTopic> {
  const topic = run.topicId ? (await listTopics()).find((t) => t.id === run.topicId) : undefined;
  return topic ?? { question: guide.title, pillar: guide.pillar, proof: 'any' };
}

/* ── The stages ─────────────────────────────────────────────────────────── */

interface Tick {
  deps: EngineDeps;
  now: Date;
  calls: number;
  published: Guide[];
  log: string[];
}

const spend = (t: Tick) => (t.calls > 0 ? (t.calls--, true) : false);

/**
 * Takes a run as far as the tick's model budget allows: checks (and one fix),
 * then review (and one fix), then ready to notify.
 */
async function advance(run: Run, guide: Guide, t: Tick): Promise<void> {
  const topic = await briefTopicFor(run, guide);
  const brief = draftPrompt(topic, t.published);

  for (;;) {
    if (run.stage === 'check') {
      const checks = checkDraft(guide, t.published, { fromModel: true });
      if (checks.errors.length && run.checkFixes < 1 && spend(t)) {
        run.checkFixes++;
        try {
          const fixed = toContent(await t.deps.models.write(fixPrompt(brief, contentOf(guide), checks.errors)));
          if (!schemaIssues({ ...guide, ...fixed }, t.now).length) {
            guide = await saveContent(guide, fixed, t.now);
            t.log.push(`${run.slug}: fixed ${checks.errors.length} check problem(s)`);
            continue;
          }
        } catch (e) {
          run.error = `fix after checks failed: ${message(e)}`;
        }
      }
      run.checks = checks;
      run.stage = 'review';
      await saveRun(run, t.now);
      continue;
    }

    if (run.stage === 'review') {
      // The review gets a tick to itself, so that it and the fix it may ask
      // for always fit in one tick's model budget.
      if (t.calls < MODEL_CALLS_PER_TICK || !spend(t)) break;
      let review: ReviewOutcome;
      try {
        review = await t.deps.models.review(reviewPrompt(topic.question, guide.pillar, contentOf(guide)));
      } catch (e) {
        run.attempts++;
        run.error = `review failed: ${message(e)}`;
        if (run.attempts < MAX_ATTEMPTS) {
          await saveRun(run, t.now);
          break;
        }
        review = { skipped: `the review failed ${MAX_ATTEMPTS} times (${message(e)})` };
      }
      run.review = review;
      run.attempts = 0;
      const serious = 'skipped' in review ? [] : review.notes.filter((n) => n.severity === 'serious');
      if (serious.length && run.reviewFixes < 1 && spend(t)) {
        run.reviewFixes++;
        try {
          const problems = serious.map((n) => ({ block: n.block || undefined, message: `"${n.quote}": ${n.problem}` }));
          const fixed = toContent(await t.deps.models.write(fixPrompt(brief, contentOf(guide), problems)));
          if (!schemaIssues({ ...guide, ...fixed }, t.now).length) {
            guide = await saveContent(guide, fixed, t.now);
            run.checks = checkDraft(guide, t.published, { fromModel: true });
            t.log.push(`${run.slug}: fixed ${serious.length} serious review note(s)`);
          }
        } catch (e) {
          run.error = `fix after review failed: ${message(e)}`;
        }
      }
      run.stage = 'notify';
    }

    if (run.stage === 'notify') {
      if (guide.status === 'drafting' || guide.status === 'revising') {
        await updateGuideState(guide.slug, { status: 'awaiting_review' });
      }
      await saveRun(run, t.now);
    }
    break;
  }
}

async function revise(guide: Guide, t: Tick): Promise<void> {
  const previous = (await getRun(guide.slug)) ?? null;
  const comments = (await listComments(guide.slug)).filter((c) => c.status === 'open');
  if (!comments.length) {
    await updateGuideState(guide.slug, { status: 'awaiting_review' });
    return;
  }
  const base: Run = previous ?? { slug: guide.slug, kind: 'revision', stage: 'done', round: 0, checkFixes: 0, reviewFixes: 0, attempts: 0, updatedAt: '' };
  const round = base.round + 1;
  if (round > MAX_REVISION_ROUNDS) {
    await updateGuideState(guide.slug, { status: 'awaiting_review' });
    await saveRun({ ...base, kind: 'revision', stage: 'notify', gaveUp: true }, t.now);
    t.log.push(`${guide.slug}: ${MAX_REVISION_ROUNDS} rounds without approval; handed back to Jon`);
    return;
  }
  if (!spend(t)) return;
  const topic = await briefTopicFor(base, guide);
  let revised: DraftContent;
  try {
    revised = toContent(await t.deps.models.write(revisePrompt(draftPrompt(topic, t.published), contentOf(guide), comments)));
  } catch (e) {
    const attempts = base.attempts + 1;
    await saveRun({ ...base, attempts, error: `revision failed: ${message(e)}`, ...(attempts >= MAX_ATTEMPTS ? { stage: 'notify', gaveUp: true } : {}) }, t.now);
    if (attempts >= MAX_ATTEMPTS) await updateGuideState(guide.slug, { status: 'awaiting_review' });
    return;
  }
  const issues = schemaIssues({ ...guide, ...revised }, t.now);
  if (issues.length) {
    await saveRun({ ...base, attempts: base.attempts + 1, error: `the revision did not fit the article format: ${issues[0].message}` }, t.now);
    return;
  }
  const saved = await saveContent(guide, revised, t.now);
  await Promise.all(comments.map((c) => resolveComment(c.id)));
  const run: Run = {
    slug: guide.slug,
    topicId: base.topicId,
    kind: 'revision',
    stage: 'check',
    round,
    checkFixes: 0,
    reviewFixes: 0,
    attempts: 0,
    changedBlocks: changedBlocks(guide.blocks, saved.blocks),
    updatedAt: t.now.toISOString(),
  };
  t.log.push(`${guide.slug}: revision ${round} from ${comments.length} comment(s)`);
  await advance(run, saved, t);
}

async function failTopic(topic: Topic, reason: string, t: Tick): Promise<void> {
  const failures = (topic.failures ?? 0) + 1;
  await setTopic(
    topic.id,
    failures >= 2
      ? { status: 'skipped', failures, lastError: reason, skipReason: `The drafting model could not produce a usable draft twice (${reason}).` }
      : { status: 'queued', failures, lastError: reason },
    t.now,
  );
  t.log.push(`topic "${topic.question}": ${reason}`);
}

async function draft(t: Tick): Promise<void> {
  await ensureQueueSeeded(t.now);
  const topic = await nextTopic();
  if (!topic) {
    t.log.push('queue empty: nothing to draft');
    return;
  }
  if (!spend(t)) return;
  await setTopic(topic.id, { status: 'drafting' }, t.now);
  const brief = draftPrompt(topic, t.published);

  let content: DraftContent;
  try {
    content = toContent(await t.deps.models.write(brief));
  } catch (e) {
    return failTopic(topic, message(e), t);
  }
  const slug = await uniqueSlug(content.title || topic.question);
  const candidate = () => ({ ...content, slug, status: 'drafting', pillar: topic.pillar });
  let issues = schemaIssues(candidate(), t.now);
  if (issues.length && spend(t)) {
    try {
      content = toContent(await t.deps.models.write(fixPrompt(brief, content, issues)));
      issues = schemaIssues(candidate(), t.now);
    } catch (e) {
      return failTopic(topic, message(e), t);
    }
  }
  if (issues.length) return failTopic(topic, `the draft did not fit the article format: ${issues[0].message}`, t);

  const guide = await saveGuide({ ...content, slug, status: 'drafting', pillar: topic.pillar }, t.now);
  await setTopic(topic.id, { status: 'drafted', guideSlug: slug }, t.now);
  t.log.push(`${slug}: drafted from "${topic.question}"`);
  await advance({ slug, topicId: topic.id, kind: 'draft', stage: 'check', round: 0, checkFixes: 0, reviewFixes: 0, attempts: 0, updatedAt: t.now.toISOString() }, guide, t);
}

/** Whether the pipeline has room for another draft. */
export function pipelineHasRoom(guides: Pick<Guide, 'status' | 'publishAt'>[], now: Date): boolean {
  const waiting = guides.filter((g) => g.status === 'drafting' || g.status === 'awaiting_review' || g.status === 'revising').length;
  const ahead = guides.filter((g) => g.status === 'scheduled' && g.publishAt && Date.parse(g.publishAt) > now.getTime()).length;
  return waiting < 2 && waiting + ahead < 3;
}

async function sendDue(settings: EngineSettings, t: Tick): Promise<void> {
  if (!inEmailHours(t.now, settings)) return;
  const to = reviewAddress(settings);
  if (!to) {
    t.log.push('no review address: set one in settings or ADMIN_EMAILS');
    return;
  }
  const sendOne = async (run: Run, kind: ReviewEmailKind, patch: Partial<Run>) => {
    const guide = await getGuide(run.slug);
    // Already dealt with in admin (approved, turned down, deleted): no email.
    if (!guide || guide.status !== 'awaiting_review') {
      await saveRun({ ...run, ...patch }, t.now);
      return;
    }
    await t.deps.send({ kind, to, guide, checks: run.checks, review: run.review, changedBlocks: run.changedBlocks, error: run.error });
    await saveRun({ ...run, ...patch }, t.now);
    t.log.push(`${run.slug}: emailed (${kind})`);
  };

  for (const run of await runsAt('notify')) {
    const kind: ReviewEmailKind = run.gaveUp ? 'gave-up' : run.kind === 'revision' ? 'revised' : 'ready';
    await sendOne(run, kind, { stage: 'done', notifiedAt: t.now.toISOString() });
  }
  for (const run of await runsAt('done')) {
    if (run.reminderSentAt || !run.notifiedAt || t.now.getTime() - Date.parse(run.notifiedAt) < REMINDER_AFTER_MS) continue;
    if ((await getGuide(run.slug))?.status !== 'awaiting_review') continue;
    await sendOne(run, 'reminder', { reminderSentAt: t.now.toISOString() });
  }
}

/** One tick of the engine. Called by the hourly maintenance job. */
export async function runEngineStep(deps: EngineDeps): Promise<{ skipped?: string; log?: string[] }> {
  if (!engineOn()) return { skipped: 'CONTENT_ENGINE_MODE is not "on"' };
  const now = deps.now();
  if (!(await takeLock(now))) return { skipped: 'another tick is running' };
  try {
    const settings = await getEngineSettings();
    if (settings.paused) return { skipped: 'paused in settings' };
    const t: Tick = { deps, now, calls: MODEL_CALLS_PER_TICK, published: await listPublishedGuides(now.getTime()), log: [] };

    const inFlight = [...(await runsAt('check')), ...(await runsAt('review'))];
    if (inFlight.length) {
      for (const run of inFlight) {
        const guide = await getGuide(run.slug);
        if (guide && t.calls > 0) await advance(run, guide, t);
      }
    } else {
      const guides = await listAllGuides();
      const revising = guides.find((g) => g.status === 'revising');
      if (revising) await revise(revising, t);
      else if (pipelineHasRoom(guides, now)) await draft(t);
      else t.log.push('pipeline full: waiting for review or for slots to pass');
    }

    await sendDue(settings, t);
    return { log: t.log };
  } finally {
    await releaseLock();
  }
}
