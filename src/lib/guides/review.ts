// src/lib/guides/review.ts
//
// What review may do to an article, and in which state. Kept apart from the
// server actions so the rules are plain functions with tests, and the actions
// stay thin: check the admin, call one of these, redirect.
//
//   awaiting_review / revising ── approve ──▶ scheduled (next free slot) or published (now)
//   scheduled ── unschedule ──▶ awaiting_review
//   awaiting_review / revising / scheduled ── reject (with a reason) ──▶ rejected
//   published ── retire (optional redirect) ──▶ retired
//
// Editing content is allowed in any state but retired and rejected; it never
// changes the state.

import { isAllowedHref } from './inline';
import { nextFreeSlot } from './slots';
import { getEngineSettings, getGuide, takenSlots, updateGuideState } from './store';
import type { Guide, GuideStatus } from './types';
import type { PillarId } from './topics';

export class ReviewError extends Error {}

/** The placeholder text a new article starts with. An article still carrying it cannot be approved. */
export const PLACEHOLDERS = {
  point: 'One sentence: the single point this article makes.',
  description: 'One or two sentences for search results: the answer, briefly.',
  firstParagraph: 'The answer goes here first, with its number.',
} as const;

const REVIEWABLE: GuideStatus[] = ['awaiting_review', 'revising'];

async function load(slug: string): Promise<Guide> {
  const guide = await getGuide(slug);
  if (!guide) throw new ReviewError('That article does not exist.');
  return guide;
}

export function stillHasPlaceholders(g: Pick<Guide, 'point' | 'description' | 'blocks'>): boolean {
  return (
    g.point === PLACEHOLDERS.point ||
    g.description === PLACEHOLDERS.description ||
    g.blocks.some((b) => b.type === 'paragraph' && b.text === PLACEHOLDERS.firstParagraph)
  );
}

export async function approve(slug: string, when: 'slot' | 'now', now = new Date()): Promise<Guide> {
  const guide = await load(slug);
  if (!REVIEWABLE.includes(guide.status)) throw new ReviewError(`Only an article waiting for review can be approved; this one is ${guide.status.replace('_', ' ')}.`);
  if (stillHasPlaceholders(guide)) throw new ReviewError('This article still has placeholder text. Edit it before approving.');
  if (when === 'now') {
    return updateGuideState(slug, { status: 'published', publishedAt: now.toISOString(), publishAt: undefined, rejectionReason: undefined });
  }
  const slot = nextFreeSlot(now, await takenSlots(), await getEngineSettings());
  return updateGuideState(slug, { status: 'scheduled', publishAt: slot.toISOString(), rejectionReason: undefined });
}

export async function unschedule(slug: string): Promise<Guide> {
  const guide = await load(slug);
  if (guide.status !== 'scheduled') throw new ReviewError('Only a scheduled article can be taken out of its slot.');
  return updateGuideState(slug, { status: 'awaiting_review', publishAt: undefined });
}

export async function reject(slug: string, reason: string): Promise<Guide> {
  const guide = await load(slug);
  if (![...REVIEWABLE, 'scheduled'].includes(guide.status)) throw new ReviewError('Only an unpublished article can be turned down. Retire a published one instead.');
  const why = reason.trim();
  if (why.length < 3) throw new ReviewError('Say briefly why, so the topic is not offered again.');
  return updateGuideState(slug, { status: 'rejected', rejectionReason: why.slice(0, 500), publishAt: undefined });
}

export async function retire(slug: string, redirectTo: string): Promise<Guide> {
  const guide = await load(slug);
  if (guide.status !== 'published') throw new ReviewError('Only a published article can be retired.');
  const to = redirectTo.trim();
  if (to && (!to.startsWith('/') || !isAllowedHref(to) || to === `/guides/${slug}`)) {
    throw new ReviewError('Send its readers to a page on this site, such as /guides or another article.');
  }
  return updateGuideState(slug, { status: 'retired', redirectTo: to || undefined });
}

export function canEdit(status: GuideStatus): boolean {
  return status !== 'retired' && status !== 'rejected';
}

/** A URL slug from a title: lowercase words joined by hyphens, at most 80 characters. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}

/** A new article's starting content, to be edited before it can be approved. */
export function newArticle(title: string, pillar: PillarId, slug: string) {
  return {
    slug,
    status: 'awaiting_review' as const,
    title: title.trim().slice(0, 70),
    point: PLACEHOLDERS.point,
    description: PLACEHOLDERS.description,
    pillar,
    blocks: [{ type: 'paragraph' as const, text: PLACEHOLDERS.firstParagraph }],
  };
}
