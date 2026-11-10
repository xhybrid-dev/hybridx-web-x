// src/lib/guides/related.ts
//
// How closely two articles are related, and which to link from which.
//
// Relatedness is the words two articles share in their title, point and
// description, plus a bonus for sharing a pillar. Words every article uses
// ("hyrox", "training", "race") count for nothing, so two articles are related
// by what they are about, not by the sport they are both in. Deterministic and
// cheap: it runs on every article page, in the brief, in the checks and when
// the engine picks older articles to link to a new one.
//
// The related box under an article is chosen when the page renders, so a new
// article starts appearing on older ones without either being rewritten. Links
// inside the text of older articles are a different thing: the engine proposes
// them and Jon approves each one (backlinks.ts).

import { parseInline } from './inline';
import type { PillarId } from './topics';
import type { Block, Guide } from './types';

export type Subject = Pick<Guide, 'pillar' | 'title'> & Partial<Pick<Guide, 'point' | 'description'>>;

/** Words that say nothing about what an article is about. */
const STOP = new Set(
  `a an and are as at be been before but by can could do does doing for from get got had has have how i if in into is it its
  just me more most my no not of on or our out over same should so than that the their them then there these they this to too up
  us very was we were what when where which while who why will with without you your yours after also any each every first
  much many one two three four five per few lot lots way ways make makes made need needs use used using good best better
  stop look like long hard fast keep take wait enough normal difference already often last going start really help helps
  know want right wrong thing things
  hyrox hybridx hybrid race races racing train training trained session sessions workout workouts week weeks day days`.split(/\s+/),
);

/** Lowercase content words, with a plural "s" taken off so "sleds" meets "sled". */
export function terms(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().replace(/[’']/g, '').split(/[^a-z0-9]+/)) {
    if (raw.length < 3 || STOP.has(raw) || /^\d+$/.test(raw)) continue;
    const word = raw.length > 4 && raw.endsWith('s') && !raw.endsWith('ss') ? raw.slice(0, -1) : raw;
    if (!STOP.has(word)) out.add(word);
  }
  return out;
}

const subjectTerms = (s: Subject) => terms([s.title, s.point ?? '', s.description ?? ''].join(' '));

/** The pillar bonus. On its own it is below RELATED_MIN: sharing a pillar is not enough. */
const SAME_PILLAR = 0.15;
/** At or above this, two articles are related enough to link in the text. */
export const RELATED_MIN = 0.25;

/** How much two sets of words overlap: 0 for nothing, 1 for the same words. */
export function overlap(x: ReadonlySet<string>, y: ReadonlySet<string>): number {
  let shared = 0;
  for (const w of x) if (y.has(w)) shared++;
  return x.size && y.size ? shared / Math.sqrt(x.size * y.size) : 0;
}

/** 0 for nothing in common; about 1 for the same subject. */
export function relatedness(a: Subject, b: Subject): number {
  return overlap(subjectTerms(a), subjectTerms(b)) + (a.pillar === b.pillar ? SAME_PILLAR : 0);
}

/** Published articles other than `current`, most related first, newest first among equals. */
export function rankRelated<G extends Subject & Pick<Guide, 'slug'> & Partial<Pick<Guide, 'publishedAt'>>>(
  current: Subject & { slug?: string },
  published: G[],
): { guide: G; score: number }[] {
  return published
    .filter((g) => g.slug !== current.slug)
    .map((guide) => ({ guide, score: relatedness(current, guide) }))
    .sort((a, b) => b.score - a.score || (b.guide.publishedAt ?? '').localeCompare(a.guide.publishedAt ?? ''));
}

/** The related box under an article: the most related published articles. */
export function relatedGuides(current: Subject & Pick<Guide, 'slug'>, published: Guide[], limit = 3): Guide[] {
  return rankRelated(
    current,
    published.filter((g) => g.status === 'published'),
  )
    .slice(0, limit)
    .map((r) => r.guide);
}

/** Published articles related enough to link to in the text, most related first. */
export function linkCandidates<G extends Subject & Pick<Guide, 'slug'>>(current: Subject & { slug?: string }, published: G[], limit = 5): G[] {
  return rankRelated(current, published)
    .filter((r) => r.score >= RELATED_MIN)
    .slice(0, limit)
    .map((r) => r.guide);
}

/** Every piece of text in an article that may carry a link. */
export function inlineTexts(blocks: Block[]): { block: number; text: string }[] {
  const out: { block: number; text: string }[] = [];
  blocks.forEach((b, i) => {
    const add = (t?: string) => t && out.push({ block: i + 1, text: t });
    if (b.type === 'paragraph' || b.type === 'callout') add(b.text);
    else if (b.type === 'list') b.items.forEach(add);
    else if (b.type === 'workout') add(b.notes);
    else if (b.type === 'faq') b.items.forEach((item) => add(item.answer));
  });
  return out;
}

/** Every href in an article's text. */
export function linksIn(blocks: Block[]): string[] {
  return inlineTexts(blocks).flatMap(({ text }) =>
    parseInline(text).flatMap((t) => (t.kind === 'link' ? [t.href] : [])),
  );
}

/** The slugs of the articles an article links to, once each. */
export function linkedArticles(blocks: Block[]): string[] {
  const slugs = linksIn(blocks)
    .map((href) => href.split('#')[0].match(/^\/guides\/([a-z0-9-]+)$/)?.[1])
    .filter((s): s is string => !!s);
  return [...new Set(slugs)];
}

/** Published articles grouped by pillar, newest first within each. */
export function guidesByPillar(published: Guide[]): Map<PillarId, Guide[]> {
  const out = new Map<PillarId, Guide[]>();
  const sorted = [...published].sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
  for (const g of sorted) {
    if (g.status !== 'published') continue;
    out.set(g.pillar, [...(out.get(g.pillar) ?? []), g]);
  }
  return out;
}
