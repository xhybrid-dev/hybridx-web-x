// src/lib/guides/backlinks.ts
//
// Links from older articles to a new one. docs/content-engine-plan.md, step 4b.
//
// When Jon approves an article, the engine picks the published articles most
// related to it (related.ts) and asks the drafting model where, in each, a
// reader would naturally want to go next. Each suggestion is one paragraph of
// one older article, with a link to the new article added: either a few of its
// existing words turned into the link, or one short sentence added at the end
// of it. Nothing else in the paragraph may change.
//
// Code checks every suggestion before Jon sees it: one new link, to the new
// article, with link words that say where it goes; every other word, link and
// format exactly as it was; no new problem for the draft checks. Anything else
// is dropped and logged.
//
// Jon accepts or skips each one in /admin/guides. An accepted link goes into
// the older article only once the new article is live, so no page ever links
// to one that is not public yet, and saving it as a new revision moves that
// article's date in the sitemap at the moment the link appears. If the
// paragraph has changed since the suggestion, it is not applied; it is marked
// stale instead, never forced in.

import { adminFirestore } from '@/lib/firebase-admin';
import { checkDraft } from './checks';
import { disallowedLinks, parseInline, plainText } from './inline';
import { linkCandidates, linkedArticles } from './related';
import { getGuide, saveGuide } from './store';
import { GuideSchema, type Guide } from './types';

export const PROPOSALS_COLLECTION = 'guideLinkProposals';
export const BACKLINKS_COLLECTION = 'guideBacklinks';
/** Older articles asked about per new article. */
export const MAX_SOURCES = 3;
/** The most words a suggestion may add to a paragraph. */
export const ADDED_WORDS_MAX = 30;
/**
 * A published article older than this when the engine first sees it is not
 * offered links. Articles get their links when they are approved; this stops a
 * backlog being proposed all at once.
 */
export const BACKLINK_WINDOW_MS = 14 * 86_400_000;

export type ProposalStatus = 'proposed' | 'accepted' | 'skipped' | 'applied' | 'stale';

export interface LinkProposal {
  /** `${target}__${source}`: one suggestion per pair. */
  id: string;
  /** The new article the link points to. */
  target: string;
  /** The older article that would carry the link. */
  source: string;
  /** 0-based index of the paragraph in the older article. */
  block: number;
  /** The paragraph as it was when suggested. */
  before: string;
  /** The paragraph with the link added. */
  after: string;
  status: ProposalStatus;
  createdAt: string;
  decidedAt?: string;
  appliedAt?: string;
  /** Why a suggestion went stale. */
  note?: string;
}

/** Where the engine is with one new article's links. */
export interface BacklinkState {
  target: string;
  /** pending: a model call has been counted; done: suggestions saved; none: nothing worth suggesting; failed: gave up. */
  status: 'pending' | 'done' | 'none' | 'failed';
  attempts: number;
  proposed: number;
  note?: string;
  emailedAt?: string;
  updatedAt: string;
}

/** What the drafting model returns: one paragraph per older article. */
export interface LinkSuggestion {
  article: string;
  /** 1-based block number, as the prompt numbers them. */
  paragraph: number;
  text: string;
}

const GENERIC_ANCHOR = /^(click here|here|read more|more|this|this article|this guide|this post|link|the article|our article|our guide)$/i;

/* ── Rules ──────────────────────────────────────────────────────────────── */

/**
 * Whether `after` is `before` with one link to `targetPath` added and nothing
 * else changed, other than one short addition at the end. The reason it is
 * not, or null.
 */
export function checkLinkEdit(before: string, after: string, targetPath: string): string | null {
  const tokens = parseInline(after);
  const links = tokens.filter((t): t is Extract<typeof t, { kind: 'link' }> => t.kind === 'link');
  const toTarget = links.filter((l) => l.href.split('#')[0] === targetPath);
  if (toTarget.length !== 1) return 'it must add exactly one link to the new article';
  if (disallowedLinks(after).length) return 'it links to a page an article may not link to';
  if (after.length > 1500) return 'the paragraph would be too long';

  const hrefsBefore = parseInline(before).flatMap((t) => (t.kind === 'link' ? [t.href] : [])).sort();
  const hrefsAfter = links.filter((l) => l !== toTarget[0]).map((l) => l.href).sort();
  if (JSON.stringify(hrefsBefore) !== JSON.stringify(hrefsAfter)) return "it changes the paragraph's other links";

  const link = toTarget[0];
  const anchor = link.text.trim();
  if (GENERIC_ANCHOR.test(anchor) || anchor.length < 3 || anchor.split(/\s+/).length > 10) {
    return 'the link words must say what the reader will find (three to ten words)';
  }

  // Either a few existing words became the link...
  if (after.replace(`[${link.text}](${link.href})`, () => link.text) === before) return null;

  // ...or one short addition at the end carries it.
  const base = before.trimEnd();
  if (after.startsWith(base) && /^\s+\S/.test(after.slice(base.length))) {
    const words = plainText(after.slice(base.length)).trim().split(/\s+/).length;
    return words > ADDED_WORDS_MAX ? `it adds ${words} words; the most is ${ADDED_WORDS_MAX}` : null;
  }
  return 'it changes words in the paragraph; it may only turn existing words into the link, or add one short sentence at the end';
}

/** The older articles worth asking about: published, related enough, not already linking to the new one. */
export function linkSources(target: Pick<Guide, 'slug' | 'title' | 'pillar' | 'point' | 'description'>, published: Guide[]): Guide[] {
  const candidates = published.filter(
    (g) => g.status === 'published' && g.slug !== target.slug && !linkedArticles(g.blocks).includes(target.slug),
  );
  return linkCandidates(target, candidates, MAX_SOURCES);
}

const errorKeys = (g: Pick<Guide, 'slug' | 'title' | 'pillar' | 'blocks'>) => new Set(checkDraft(g).errors.map((e) => `${e.code}|${e.block ?? ''}|${e.message}`));

/** Turns the model's suggestions into proposals, dropping any that break a rule. */
export function proposalsFrom(
  target: Pick<Guide, 'slug'>,
  sources: Guide[],
  suggestions: LinkSuggestion[],
  now: Date,
): { proposals: LinkProposal[]; refused: string[] } {
  const proposals: LinkProposal[] = [];
  const refused: string[] = [];
  const targetPath = `/guides/${target.slug}`;
  for (const s of suggestions) {
    const source = sources.find((g) => g.slug === s.article);
    const refuse = (why: string) => refused.push(`${s.article}: ${why}`);
    if (!source) {
      refuse('not one of the articles asked about');
      continue;
    }
    if (proposals.some((p) => p.source === source.slug)) {
      refuse('a second suggestion for the same article');
      continue;
    }
    const index = s.paragraph - 1;
    const block = source.blocks[index];
    if (!block || block.type !== 'paragraph') {
      refuse(`block ${s.paragraph} is not a paragraph`);
      continue;
    }
    const after = s.text.trim();
    const why = checkLinkEdit(block.text, after, targetPath);
    if (why) {
      refuse(why);
      continue;
    }
    const edited = { ...source, blocks: source.blocks.map((b, i) => (i === index ? { type: 'paragraph' as const, text: after } : b)) };
    if (!GuideSchema.safeParse(edited).success) {
      refuse('the edited article would not fit the article format');
      continue;
    }
    const known = errorKeys(source);
    const added = [...errorKeys(edited)].filter((k) => !known.has(k));
    if (added.length) {
      refuse(`the added words fail the checks (${added[0].split('|')[2]})`);
      continue;
    }
    proposals.push({
      id: `${target.slug}__${source.slug}`,
      target: target.slug,
      source: source.slug,
      block: index,
      before: block.text,
      after,
      status: 'proposed',
      createdAt: now.toISOString(),
    });
  }
  return { proposals, refused };
}

/** Whether an article is public at `now`: published, or scheduled with its slot passed. */
export function isLive(g: Pick<Guide, 'status' | 'publishAt'>, now: Date): boolean {
  return g.status === 'published' || (g.status === 'scheduled' && !!g.publishAt && Date.parse(g.publishAt) <= now.getTime());
}

/** Approved articles the engine has not yet looked for links to, oldest slot first. */
export function targetsNeedingLinks(guides: Guide[], seen: ReadonlySet<string>, now: Date): Guide[] {
  return guides
    .filter((g) => !seen.has(g.slug))
    .filter(
      (g) =>
        g.status === 'scheduled' ||
        (g.status === 'published' && !!g.publishedAt && now.getTime() - Date.parse(g.publishedAt) <= BACKLINK_WINDOW_MS),
    )
    .sort((a, b) => (a.publishAt ?? a.publishedAt ?? '').localeCompare(b.publishAt ?? b.publishedAt ?? ''));
}

/* ── Storage ────────────────────────────────────────────────────────────── */

const clean = <T extends object>(o: T) => JSON.parse(JSON.stringify(o)) as T;

export async function listBacklinkStates(): Promise<BacklinkState[]> {
  const snap = await adminFirestore.collection(BACKLINKS_COLLECTION).get();
  return snap.docs.map((d) => d.data() as BacklinkState);
}

export async function saveBacklinkState(state: BacklinkState, now: Date): Promise<void> {
  await adminFirestore.collection(BACKLINKS_COLLECTION).doc(state.target).set(clean({ ...state, updatedAt: now.toISOString() }));
}

export async function saveProposals(proposals: LinkProposal[]): Promise<void> {
  for (const p of proposals) await adminFirestore.collection(PROPOSALS_COLLECTION).doc(p.id).set(clean(p));
}

/** Suggestions for links to one new article, or every suggestion in one status. */
export async function listProposals(filter: { target: string } | { status: ProposalStatus }): Promise<LinkProposal[]> {
  const [field, value] = 'target' in filter ? ['target', filter.target] : ['status', filter.status];
  const snap = await adminFirestore.collection(PROPOSALS_COLLECTION).where(field, '==', value).get();
  return snap.docs.map((d) => d.data() as LinkProposal).sort((a, b) => a.id.localeCompare(b.id));
}

async function patchProposal(id: string, patch: Partial<LinkProposal>): Promise<LinkProposal> {
  const ref = adminFirestore.collection(PROPOSALS_COLLECTION).doc(id);
  await ref.update(clean(patch));
  return (await ref.get()).data() as LinkProposal;
}

/* ── Jon's decision, and applying it ────────────────────────────────────── */

export class LinkDecisionError extends Error {}

/**
 * Accept or skip one suggestion. An accepted one goes in straight away if the
 * new article is already live, and otherwise waits for the hourly job.
 * Changing your mind is allowed until it has gone in.
 */
export async function decideProposal(id: string, decision: 'accept' | 'skip', now = new Date()): Promise<LinkProposal> {
  const snap = await adminFirestore.collection(PROPOSALS_COLLECTION).doc(id).get();
  if (!snap.exists) throw new LinkDecisionError('That suggestion does not exist.');
  const current = snap.data() as LinkProposal;
  if (current.status === 'applied' || current.status === 'stale') {
    throw new LinkDecisionError(current.status === 'applied' ? 'That link is already in.' : 'That suggestion is out of date.');
  }
  const decided = await patchProposal(id, { status: decision === 'accept' ? 'accepted' : 'skipped', decidedAt: now.toISOString() });
  return decision === 'accept' ? applyProposal(decided, now) : decided;
}

/** Puts one accepted link into its older article, if the new article is live. */
export async function applyProposal(p: LinkProposal, now = new Date()): Promise<LinkProposal> {
  if (p.status !== 'accepted') return p;
  const target = await getGuide(p.target);
  if (!target || target.status === 'rejected' || target.status === 'retired') {
    return patchProposal(p.id, { status: 'stale', note: 'the new article was turned down or retired' });
  }
  if (!isLive(target, now)) return p;
  const source = await getGuide(p.source);
  if (!source || source.status !== 'published') {
    return patchProposal(p.id, { status: 'stale', note: 'the older article is no longer published' });
  }
  if (linkedArticles(source.blocks).includes(p.target)) {
    return patchProposal(p.id, { status: 'applied', appliedAt: now.toISOString(), note: 'it already linked to the new article' });
  }
  const block = source.blocks[p.block];
  if (!block || block.type !== 'paragraph' || block.text !== p.before) {
    return patchProposal(p.id, { status: 'stale', note: 'the paragraph has changed since the suggestion' });
  }
  const { revision: _r, updatedAt: _u, ...rest } = source;
  await saveGuide({ ...rest, blocks: source.blocks.map((b, i) => (i === p.block ? { type: 'paragraph' as const, text: p.after } : b)) }, now);
  return patchProposal(p.id, { status: 'applied', appliedAt: now.toISOString() });
}

/**
 * Puts in every accepted link whose new article has gone live. Run by the
 * hourly maintenance job, whether or not the engine is on: these are Jon's
 * decisions, not the engine's.
 */
export async function applyAcceptedLinks(now = new Date()): Promise<{ applied: string[]; stale: string[] }> {
  const applied: string[] = [];
  const stale: string[] = [];
  for (const p of await listProposals({ status: 'accepted' })) {
    const after = await applyProposal(p, now);
    if (after.status === 'applied') applied.push(p.id);
    if (after.status === 'stale') stale.push(p.id);
  }
  return { applied, stale };
}

/** For the email: each suggestion with the title of the article it changes. */
export async function withSourceTitles(proposals: LinkProposal[]): Promise<(LinkProposal & { sourceTitle: string })[]> {
  return Promise.all(proposals.map(async (p) => ({ ...p, sourceTitle: (await getGuide(p.source))?.title ?? p.source })));
}
