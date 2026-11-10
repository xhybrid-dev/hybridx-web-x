'use server';

// Review actions for /admin/guides. Every action checks the admin session on
// the server: the buttons are only a convenience. All are POSTs (server
// actions), so following a link, including one a mail scanner prefetches from
// a review email, can never approve or change anything.

import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-auth';
import {
  ReviewError,
  approve,
  canEdit,
  newArticle,
  reject,
  retire,
  slugify,
  unschedule,
} from '@/lib/guides/review';
import { EngineSettingsSchema } from '@/lib/guides/slots';
import { LinkDecisionError, decideProposal } from '@/lib/guides/backlinks';
import { engineOn } from '@/lib/guides/engine/run';
import { addTopic, ensureQueueSeeded, moveTopic, requeueTopic, skipTopic } from '@/lib/guides/queue';
import {
  addComment,
  getGuide,
  resolveComment,
  saveEngineSettings,
  saveGuide,
  updateGuideState,
} from '@/lib/guides/store';
import { PILLAR_IDS, type PillarId } from '@/lib/guides/topics';
import { GuideSchema, type Block } from '@/lib/guides/types';

const BASE = '/admin/guides';
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) throw new Error('Not authorized');
  return session;
}

function slugOf(form: FormData): string {
  const slug = String(form.get('slug') ?? '');
  if (!SLUG.test(slug) || slug.length > 80) throw new Error('Bad request');
  return slug;
}

/** Runs a review step, sending any refusal back to the page as a message. */
async function step(slug: string, run: () => Promise<unknown>, done: string): Promise<never> {
  try {
    await run();
  } catch (error) {
    if (error instanceof ReviewError) redirect(`${BASE}/${slug}?error=${encodeURIComponent(error.message)}`);
    throw error;
  }
  redirect(`${BASE}/${slug}?done=${done}`);
}

export async function approveGuide(form: FormData) {
  await requireAdmin();
  const slug = slugOf(form);
  const when = form.get('when') === 'now' ? 'now' : 'slot';
  await step(slug, () => approve(slug, when), when === 'now' ? 'published' : 'scheduled');
}

/** Accept or skip one suggested link from an older article to this one. */
export async function decideLinkAction(form: FormData) {
  await requireAdmin();
  const slug = slugOf(form);
  const source = String(form.get('source') ?? '');
  const decision = form.get('decision') === 'accept' ? 'accept' : 'skip';
  if (!SLUG.test(source) || source.length > 80) throw new Error('Bad request');
  let done: string;
  try {
    const p = await decideProposal(`${slug}__${source}`, decision);
    done = p.status === 'applied' ? 'link-applied' : p.status === 'accepted' ? 'link-accepted' : p.status === 'stale' ? 'link-stale' : 'link-skipped';
  } catch (error) {
    if (error instanceof LinkDecisionError) redirect(`${BASE}/${slug}?error=${encodeURIComponent(error.message)}#links`);
    throw error;
  }
  redirect(`${BASE}/${slug}?done=${done}#links`);
}

export async function unscheduleGuide(form: FormData) {
  await requireAdmin();
  const slug = slugOf(form);
  await step(slug, () => unschedule(slug), 'unscheduled');
}

export async function rejectGuide(form: FormData) {
  await requireAdmin();
  const slug = slugOf(form);
  await step(slug, () => reject(slug, String(form.get('reason') ?? '')), 'rejected');
}

export async function retireGuide(form: FormData) {
  await requireAdmin();
  const slug = slugOf(form);
  await step(slug, () => retire(slug, String(form.get('redirectTo') ?? '')), 'retired');
}

export async function commentOnGuide(form: FormData) {
  const session = await requireAdmin();
  const slug = slugOf(form);
  const text = String(form.get('text') ?? '').trim();
  const rawIndex = String(form.get('blockIndex') ?? '');
  const guide = await getGuide(slug);
  if (!guide) throw new Error('Bad request');
  if (!text) redirect(`${BASE}/${slug}?error=${encodeURIComponent('Write the comment first.')}#comment`);
  const blockIndex = rawIndex === '' ? null : Number(rawIndex);
  if (blockIndex !== null && (!Number.isInteger(blockIndex) || blockIndex < 0 || blockIndex >= guide.blocks.length)) {
    throw new Error('Bad request');
  }
  await addComment({ slug, revision: guide.revision, blockIndex, text: text.slice(0, 2000), by: session.email });
  // With the engine on, a comment on an article waiting for review asks for a
  // revision: the engine picks it up on its next hourly tick.
  if (engineOn() && guide.status === 'awaiting_review') {
    await updateGuideState(slug, { status: 'revising' });
    redirect(`${BASE}/${slug}?done=revising#comments`);
  }
  redirect(`${BASE}/${slug}?done=commented#comments`);
}

export async function resolveGuideComment(form: FormData) {
  await requireAdmin();
  const slug = slugOf(form);
  const id = String(form.get('id') ?? '');
  if (!/^[A-Za-z0-9]{1,40}$/.test(id)) throw new Error('Bad request');
  await resolveComment(id);
  redirect(`${BASE}/${slug}#comments`);
}

export async function createGuide(form: FormData) {
  await requireAdmin();
  const title = String(form.get('title') ?? '').trim();
  const pillar = String(form.get('pillar') ?? '') as PillarId;
  if (title.length < 5 || !PILLAR_IDS.includes(pillar)) {
    redirect(`${BASE}/new?error=${encodeURIComponent('Give it a title of at least a few words, and pick its topic.')}`);
  }
  const base = slugify(title);
  if (!base || base === 'how-we-write') redirect(`${BASE}/new?error=${encodeURIComponent('That title cannot be made into an address. Try other words.')}`);
  let slug = base;
  for (let n = 2; await getGuide(slug); n++) slug = `${base.slice(0, 76)}-${n}`;
  await saveGuide(newArticle(title, pillar, slug));
  redirect(`${BASE}/${slug}/edit`);
}

export interface EditPayload {
  title: string;
  description: string;
  point: string;
  pillar: PillarId;
  blocks: Block[];
}

/** Saves edited content as the next revision. Returns the problems instead if it does not pass. */
export async function saveGuideEdit(slug: string, payload: EditPayload): Promise<{ ok: true } | { ok: false; errors: string[] }> {
  await requireAdmin();
  if (!SLUG.test(slug)) throw new Error('Bad request');
  const current = await getGuide(slug);
  if (!current) return { ok: false, errors: ['That article no longer exists.'] };
  if (!canEdit(current.status)) return { ok: false, errors: [`A ${current.status} article cannot be edited.`] };

  const { revision: _r, updatedAt: _u, ...rest } = current;
  const next = { ...rest, title: payload.title, description: payload.description, point: payload.point, pillar: payload.pillar, blocks: payload.blocks };
  const check = GuideSchema.safeParse({ ...next, revision: current.revision + 1, updatedAt: new Date().toISOString() });
  if (!check.success) {
    return {
      ok: false,
      errors: check.error.issues.map((issue) => {
        const [first, index, ...path] = issue.path;
        const where =
          first === 'blocks' && typeof index === 'number'
            ? `Block ${index + 1} (${payload.blocks[index]?.type ?? 'unknown'})${path.length ? ' ' + path.join('.') : ''}`
            : issue.path.join('.') || 'Article';
        return `${where}: ${plainMessage(issue)}`;
      }),
    };
  }
  await saveGuide(next);
  return { ok: true };
}

/** Zod's wording, said plainly for the editor. */
function plainMessage(issue: { code: string; message: string; minimum?: unknown; maximum?: unknown; type?: unknown }): string {
  if (issue.code === 'too_small' && issue.type === 'string') return issue.minimum === 1 ? 'is empty' : `needs at least ${issue.minimum} characters`;
  if (issue.code === 'too_big' && issue.type === 'string') return `is too long (at most ${issue.maximum} characters)`;
  if (issue.code === 'too_small' && issue.type === 'array') return issue.minimum === 1 ? 'needs at least one line' : `needs at least ${issue.minimum}`;
  if (issue.code === 'too_big' && issue.type === 'array') return `has too many (at most ${issue.maximum})`;
  return issue.message;
}

export async function saveSettings(form: FormData) {
  await requireAdmin();
  const parsed = EngineSettingsSchema.safeParse({
    publishDays: form.getAll('publishDays').map(Number),
    publishTime: String(form.get('publishTime') ?? ''),
    timeZone: 'Europe/London',
    emailFrom: String(form.get('emailFrom') ?? ''),
    emailTo: String(form.get('emailTo') ?? ''),
    reviewAddress: String(form.get('reviewAddress') ?? '').trim(),
    paused: form.get('paused') === 'on',
  });
  if (!parsed.success) {
    redirect(`${BASE}/settings?error=${encodeURIComponent('Check the settings: pick at least one day, use HH:MM times, and a valid email address or none.')}`);
  }
  await saveEngineSettings(parsed.data);
  redirect(`${BASE}/settings?done=saved`);
}

/* ── The topic queue ─────────────────────────────────────────────────────── */

const TOPIC_ID = /^[A-Za-z0-9]{1,40}$/;
const topicId = (form: FormData) => {
  const id = String(form.get('id') ?? '');
  if (!TOPIC_ID.test(id)) throw new Error('Bad request');
  return id;
};

export async function addTopicAction(form: FormData) {
  await requireAdmin();
  const question = String(form.get('question') ?? '').trim();
  const pillar = String(form.get('pillar') ?? '') as PillarId;
  if (question.length < 8 || !PILLAR_IDS.includes(pillar)) {
    redirect(`${BASE}/topics?error=${encodeURIComponent('Write the question in full, and pick its topic.')}`);
  }
  await ensureQueueSeeded();
  await addTopic(question, pillar);
  redirect(`${BASE}/topics?done=added`);
}

export async function moveTopicAction(form: FormData) {
  await requireAdmin();
  await moveTopic(topicId(form), form.get('direction') === 'up' ? -1 : 1);
  redirect(`${BASE}/topics`);
}

export async function skipTopicAction(form: FormData) {
  await requireAdmin();
  await skipTopic(topicId(form), String(form.get('reason') ?? ''));
  redirect(`${BASE}/topics?done=skipped`);
}

export async function requeueTopicAction(form: FormData) {
  await requireAdmin();
  await requeueTopic(topicId(form));
  redirect(`${BASE}/topics?done=requeued`);
}

export async function seedTopicsAction() {
  await requireAdmin();
  await ensureQueueSeeded();
  redirect(`${BASE}/topics`);
}
