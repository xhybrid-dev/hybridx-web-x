// src/lib/guides/harvest/analyse.ts
//
// What the weekly Search Console harvest makes of the rows (docs/content-engine-plan.md,
// step 6 and section 4.5). Pure functions, tested on recorded-style rows.
//
//   group   queries that mean the same thing ("sled push weight hyrox",
//           "hyrox sled push weights") become one group, by their content words
//   route   each group is one of:
//             owned    a page of ours is already in the top three: nothing to do
//             covered  an article or a queued topic already answers it: its
//                      numbers go on that topic or article
//             refresh  one of our pages ranks 4–20 for it: improve that page
//             new      nothing of ours answers it well: a candidate article
//   score   impressions × how much room there is to climb × whether it is
//           our subject at all
//
// Query text is whatever somebody typed into Google. It is only ever compared,
// counted and shown as text: never followed as an instruction.

import type { ScRow } from '@/lib/google/search-console';
import { overlap, terms } from '../related';
import { SITE_PAGES, type PillarId } from '../topics';

export interface PageStat {
  /** A path on hybridx.club, or the full URL for any other host. */
  page: string;
  clicks: number;
  impressions: number;
  position: number;
}

export interface QueryGroup {
  /** The group's content words, sorted. */
  key: string;
  /** The query in the group with the most impressions. */
  top: string;
  /** Up to eight queries, most impressions first. */
  queries: string[];
  clicks: number;
  impressions: number;
  /** Average position, weighted by impressions. */
  position: number;
  /** Pages shown for the group, most impressions first. */
  pages: PageStat[];
}

export type RouteKind = 'owned' | 'covered' | 'refresh' | 'new';

export interface RoutedGroup extends QueryGroup {
  kind: RouteKind;
  score: number;
  pillar: PillarId;
  /** The page to improve (refresh) or that owns it (owned). */
  page?: string;
  /** The article or queued topic that already answers it (covered). */
  guideSlug?: string;
  topicId?: string;
  why: string;
}

const HOST = /^https?:\/\/(www\.)?hybridx\.club(?=\/|$)/i;
const pathOf = (url: string) => (HOST.test(url) ? url.replace(HOST, '') || '/' : url);

/** Rows grouped by meaning. Queries with no content words (the brand, "hyrox") are left out. */
export function groupQueries(rows: ScRow[]): QueryGroup[] {
  const groups = new Map<string, { queries: Map<string, number>; pages: Map<string, { clicks: number; impressions: number; weighted: number }> }>();
  for (const r of rows) {
    const key = [...terms(r.query)].sort().join(' ');
    if (!key) continue;
    const g = groups.get(key) ?? { queries: new Map(), pages: new Map() };
    g.queries.set(r.query, (g.queries.get(r.query) ?? 0) + r.impressions);
    const path = pathOf(r.page);
    const p = g.pages.get(path) ?? { clicks: 0, impressions: 0, weighted: 0 };
    p.clicks += r.clicks;
    p.impressions += r.impressions;
    p.weighted += r.position * r.impressions;
    g.pages.set(path, p);
    groups.set(key, g);
  }
  return [...groups.entries()].map(([key, g]) => {
    const queries = [...g.queries.entries()].sort((a, b) => b[1] - a[1]).map(([q]) => q);
    const pages = [...g.pages.entries()]
      .map(([page, p]) => ({ page, clicks: p.clicks, impressions: p.impressions, position: p.impressions ? p.weighted / p.impressions : 0 }))
      .sort((a, b) => b.impressions - a.impressions || a.position - b.position);
    const impressions = pages.reduce((n, p) => n + p.impressions, 0);
    return {
      key,
      top: queries[0],
      queries: queries.slice(0, 8),
      clicks: pages.reduce((n, p) => n + p.clicks, 0),
      impressions,
      position: impressions ? pages.reduce((n, p) => n + p.position * p.impressions, 0) / impressions : 0,
      pages,
    };
  });
}

/* ── Scoring ────────────────────────────────────────────────────────────── */

/** Words that mark a query as our subject. A query without one is someone else's. */
const OUR_SUBJECT =
  /\b(hyrox|athx|hybrid|sled|wall ?balls?|burpees?|lunges?|farmers?|skierg|ski ?erg|row(ing)?|roxzone|run(s|ning|ner)?|lift(s|ing|er)?|strength|squats?|deadlifts?|kettlebells?|functional fitness|marathon|5k|10k|pace|pacing|vo2 ?max|zone ?2|zones|taper(ing)?|division|doubles|singles|pro|open|engine|conditioning|intervals?|tempo|threshold|vdot|1rm|one rep max|heart rate|programme|program|plan|workout|training)\b/i;

/** How much a page could gain: little from the top three, most from the bottom of page one. */
export function opportunity(position: number): number {
  if (position <= 0) return 0.3;
  if (position <= 3) return 0.1;
  if (position <= 10) return 1;
  if (position <= 20) return 0.8;
  if (position <= 50) return 0.5;
  return 0.3;
}

export function fit(query: string): number {
  return OUR_SUBJECT.test(query) ? 1 : 0.2;
}

export function scoreGroup(g: Pick<QueryGroup, 'top' | 'impressions' | 'position'>): number {
  return Math.round(g.impressions * opportunity(g.position) * fit(g.top) * 10) / 10;
}

/* ── Routing ────────────────────────────────────────────────────────────── */

const QUESTION = /^(how|what|why|when|which|should|can|is|are|does|do|will|best)\b|\b(vs|versus|or)\b/i;
/** Pages too broad to be the answer to one specific question. */
const BROAD = new Set(['/', '/guides', '/calculators', '/app', '/books']);
/** Close enough to say an article or topic already answers the group. */
export const SAME_SUBJECT = 0.5;

const PILLAR_WORDS: [PillarId, RegExp][] = [
  ['athx', /\bathx\b/i],
  ['tools', /\b(calculator|vdot|1rm|one rep max|heart rate zones?|pace calculator|predictor)\b/i],
  ['starting-out', /\b(first|beginners?|division|open or pro|pro or open|doubles|singles|start(ing)?|baseline|taper)\b/i],
  ['running-lifting', /\b(lift(ing|er)?|strength|squats?|deadlifts?|legs|marathon|5k|10k|gym|hybrid)\b/i],
];

/** The pillar a group belongs under: its page's, else by its words, else HYROX. */
export function pillarFor(g: Pick<QueryGroup, 'top' | 'pages'>, guides: { slug: string; pillar: PillarId }[]): PillarId {
  for (const p of g.pages) {
    const site = SITE_PAGES.find((s) => s.route === p.page)?.pillar;
    if (site) return site;
    const guide = guides.find((x) => `/guides/${x.slug}` === p.page)?.pillar;
    if (guide) return guide;
  }
  return PILLAR_WORDS.find(([, re]) => re.test(g.top))?.[0] ?? 'hyrox';
}

export interface RouteContext {
  guides: { slug: string; title: string; point: string; pillar: PillarId }[];
  /** Topics already in the queue, drafted, or skipped (a skip is Jon's veto). */
  topics: { id: string; question: string; status: string }[];
}

export function routeGroup(g: QueryGroup, ctx: RouteContext): RoutedGroup {
  const words = terms(g.queries.join(' '));
  const best = g.pages[0];
  const base = { ...g, score: scoreGroup(g), pillar: pillarFor(g, ctx.guides) };

  // An article already answers it.
  const guide = ctx.guides
    // The title alone, or the title and point together: whichever matches better,
    // so a search that is the title word for word is not diluted by the point.
    .map((x) => ({ x, s: Math.max(overlap(words, terms(x.title)), overlap(words, terms(`${x.title} ${x.point}`))) }))
    .sort((a, b) => b.s - a.s)[0];
  if (guide && guide.s >= SAME_SUBJECT) {
    const path = `/guides/${guide.x.slug}`;
    const own = g.pages.find((p) => p.page === path);
    if (own && own.position <= 3) return { ...base, kind: 'owned', page: path, guideSlug: guide.x.slug, why: `Already in the top three with ${path}.` };
    if (own && own.position <= 20) {
      return { ...base, kind: 'refresh', page: path, guideSlug: guide.x.slug, why: `${path} ranks ${own.position.toFixed(1)}: improve it to answer "${g.top}" more directly.` };
    }
    return {
      ...base,
      kind: 'covered',
      guideSlug: guide.x.slug,
      why: best ? `${path} answers it, but searchers land on ${best.page}. Link to it from there.` : `${path} answers it.`,
    };
  }

  // A topic already in the queue (or drafted, or vetoed) answers it.
  const topic = ctx.topics
    .map((t) => ({ t, s: overlap(words, terms(t.question)) }))
    .sort((a, b) => b.s - a.s)[0];
  if (topic && topic.s >= SAME_SUBJECT) {
    return { ...base, kind: 'covered', topicId: topic.t.id, why: `The topic "${topic.t.question}" covers it (${topic.t.status}).` };
  }

  if (best && best.position <= 3) return { ...base, kind: 'owned', page: best.page, why: `Already in the top three with ${best.page}.` };
  if (best && best.position <= 20 && !(QUESTION.test(g.top) && BROAD.has(best.page))) {
    return { ...base, kind: 'refresh', page: best.page, why: `${best.page} ranks ${best.position.toFixed(1)}: improve it to answer "${g.top}".` };
  }
  return {
    ...base,
    kind: 'new',
    why: best ? `Nothing answers it directly: the best is ${best.page} at ${best.position.toFixed(1)}.` : 'Nothing of ours answers it.',
  };
}

/** Every group routed and scored, highest score first. */
export function analyse(rows: ScRow[], ctx: RouteContext): RoutedGroup[] {
  return groupQueries(rows)
    .map((g) => routeGroup(g, ctx))
    .sort((a, b) => b.score - a.score || b.impressions - a.impressions);
}

/** A group's best query as a topic question: capitalised, with a question mark if it asks one. */
export function asQuestion(query: string): string {
  const q = query.trim().replace(/\s+/g, ' ').replace(/\?+$/, '').slice(0, 150);
  const asks = /^(how|what|why|when|which|should|can|is|are|does|do|will)\b/i.test(q) && !/^how to\b/i.test(q);
  return q.charAt(0).toUpperCase() + q.slice(1) + (asks ? '?' : '');
}
