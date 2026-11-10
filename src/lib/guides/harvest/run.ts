// src/lib/guides/harvest/run.ts
//
// The weekly Search Console harvest (docs/content-engine-plan.md, step 6): a
// step of the hourly maintenance job that does real work about once a week.
//
//   1. Read 28 days of query × page rows, ending three days ago.
//   2. Group, route and score them (analyse.ts).
//   3. Put the numbers on the topics they match, add up to MAX_NEW_TOPICS new
//      topics people are searching for that nothing answers, and reorder the
//      queue (queue.ts, reorderQueue). A topic Jon skipped is never re-added:
//      a skip is a veto.
//   4. Record each article's clicks, impressions and position (guideMetrics),
//      and keep the harvest (guideHarvests) for the search page in admin.
//   5. Over the next ticks, check whether recent articles are indexed, a few
//      per tick, then email Jon a summary.
//
// Like the engine, it assumes a tick can be cut off: each stage is saved
// before the next, and the inspections and the email are separate ticks. A
// failed harvest (no access yet, an API error) is recorded and retried a day
// later, not every hour. It reads only; the one write it makes outside its own
// collections is to the topic queue, and only when the engine is on.

import { adminFirestore } from '@/lib/firebase-admin';
import {
  SearchConsoleError,
  harvestWindow,
  inspectUrl,
  searchAnalytics,
  searchConsoleSite,
  type Inspection,
  type ScRow,
  type SearchConsoleDeps,
} from '@/lib/google/search-console';
import { inEmailHours, type SummaryEmail } from '../email';
import { engineOn } from '../engine/run';
import { addSearchTopic, listTopics, reorderQueue, setTopic, type Topic, type TopicSearch } from '../queue';
import { getEngineSettings, listAllGuides, reviewAddress } from '../store';
import type { Guide } from '../types';
import { analyse, asQuestion, fit, type RoutedGroup } from './analyse';

export const HARVESTS_COLLECTION = 'guideHarvests';
export const METRICS_COLLECTION = 'guideMetrics';
const STATE = { collection: 'contentSettings', id: 'searchHarvest' } as const;

const DAY_MS = 86_400_000;
export const HARVEST_EVERY_MS = 7 * DAY_MS;
const RETRY_AFTER_MS = DAY_MS;
/** New topics from search per harvest, so a week's data cannot flood the queue. */
export const MAX_NEW_TOPICS = 5;
/** A new topic needs at least this many impressions in the 28 days. */
export const MIN_NEW_IMPRESSIONS = 10;
/** Articles published within this are checked for indexing. */
const INSPECT_WITHIN_MS = 60 * DAY_MS;
/** URL inspections per tick. Google allows 2,000 a day per property. */
const INSPECT_PER_TICK = 8;
/** Groups kept in the harvest record for the admin page and the export. */
const KEEP_GROUPS = 300;
const SITE_URL = 'https://hybridx.club';

export interface HarvestState {
  lastHarvestAt?: string;
  lastHarvestId?: string;
  lastAttemptAt?: string;
  error?: string;
  /** Slugs still to inspect for this harvest. */
  inspect?: string[];
  /** The harvest whose summary email is still to send. */
  summaryFor?: string;
}

export interface HarvestRecord {
  id: string;
  at: string;
  site: string;
  window: { startDate: string; endDate: string };
  rows: number;
  clicks: number;
  impressions: number;
  groups: RoutedGroup[];
  /** Topics this harvest added to the queue. */
  added: { id: string; question: string; impressions: number; score: number }[];
}

export interface GuideMetric {
  slug: string;
  harvest?: string;
  clicks?: number;
  impressions?: number;
  position?: number;
  /** Search queries that brought it the most impressions. */
  queries?: string[];
  index?: Inspection & { checkedAt: string };
}

export interface HarvestDeps {
  sc: SearchConsoleDeps;
  send(email: SummaryEmail): Promise<void>;
  now(): Date;
}

/* ── Storage ────────────────────────────────────────────────────────────── */

const clean = <T extends object>(o: T) => JSON.parse(JSON.stringify(o)) as T;
const stateRef = () => adminFirestore.collection(STATE.collection).doc(STATE.id);

export async function getHarvestState(): Promise<HarvestState> {
  const snap = await stateRef().get();
  return snap.exists ? (snap.data() as HarvestState) : {};
}

async function saveState(state: HarvestState): Promise<void> {
  await stateRef().set(clean(state));
}

export async function getHarvest(id: string): Promise<HarvestRecord | null> {
  const snap = await adminFirestore.collection(HARVESTS_COLLECTION).doc(id).get();
  return snap.exists ? (snap.data() as HarvestRecord) : null;
}

export async function listMetrics(): Promise<GuideMetric[]> {
  const snap = await adminFirestore.collection(METRICS_COLLECTION).get();
  return snap.docs.map((d) => d.data() as GuideMetric);
}

async function mergeMetric(slug: string, patch: Partial<GuideMetric>): Promise<void> {
  const ref = adminFirestore.collection(METRICS_COLLECTION).doc(slug);
  const current = (await ref.get()).data() as GuideMetric | undefined;
  await ref.set(clean({ ...(current ?? {}), ...patch, slug }));
}

/* ── The stages ─────────────────────────────────────────────────────────── */

/** Per-article numbers from the rows: everything that landed on /guides/<slug>. */
export function articleNumbers(rows: ScRow[]): Map<string, Omit<GuideMetric, 'slug' | 'harvest' | 'index'>> {
  const out = new Map<string, { clicks: number; impressions: number; weighted: number; queries: Map<string, number> }>();
  for (const r of rows) {
    const slug = r.page.match(/^https?:\/\/(?:www\.)?hybridx\.club\/guides\/([a-z0-9-]+)\/?$/i)?.[1];
    if (!slug) continue;
    const m = out.get(slug) ?? { clicks: 0, impressions: 0, weighted: 0, queries: new Map() };
    m.clicks += r.clicks;
    m.impressions += r.impressions;
    m.weighted += r.position * r.impressions;
    m.queries.set(r.query, (m.queries.get(r.query) ?? 0) + r.impressions);
    out.set(slug, m);
  }
  return new Map(
    [...out.entries()].map(([slug, m]) => [
      slug,
      {
        clicks: m.clicks,
        impressions: m.impressions,
        position: m.impressions ? Math.round((m.weighted / m.impressions) * 10) / 10 : undefined,
        queries: [...m.queries.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([q]) => q),
      },
    ]),
  );
}

const statsOf = (g: RoutedGroup, harvest: string): TopicSearch => ({
  harvest,
  impressions: g.impressions,
  clicks: g.clicks,
  position: Math.round(g.position * 10) / 10,
  score: g.score,
  queries: g.queries.slice(0, 5),
});

/** Puts search numbers on matched topics, adds new ones, and reorders. */
async function feedQueue(groups: RoutedGroup[], topics: Topic[], harvest: string, now: Date, log: string[]): Promise<HarvestRecord['added']> {
  // A topic's numbers are the best-scoring group that matched it this week.
  const best = new Map<string, RoutedGroup>();
  for (const g of groups) if (g.kind === 'covered' && g.topicId && !best.has(g.topicId)) best.set(g.topicId, g);
  for (const t of topics) {
    const g = best.get(t.id);
    if (g) await setTopic(t.id, { search: statsOf(g, harvest) }, now);
    else if (t.search && t.status === 'queued') await setTopic(t.id, { search: { ...t.search, score: 0 } }, now);
  }

  const added: HarvestRecord['added'] = [];
  for (const g of groups) {
    if (added.length >= MAX_NEW_TOPICS) break;
    // Only our subject: a popular search with no training word in it is someone else's.
    if (g.kind !== 'new' || g.impressions < MIN_NEW_IMPRESSIONS || fit(g.top) < 1) continue;
    const question = asQuestion(g.top);
    const note = `From Search Console: ${g.impressions} impressions in 28 days, average position ${g.position.toFixed(1)}. Searches: ${g.queries.slice(0, 5).map((q) => `"${q}"`).join(', ')}. Answer what these searchers want.`;
    const id = await addSearchTopic({ question, pillar: g.pillar, note, search: statsOf(g, harvest) }, now);
    added.push({ id, question, impressions: g.impressions, score: g.score });
  }
  const moved = await reorderQueue(now);
  log.push(`queue: ${best.size} topic(s) matched search, ${added.length} added, ${moved} moved`);
  return added;
}

async function harvest(deps: HarvestDeps, state: HarvestState, now: Date, log: string[]): Promise<void> {
  const site = searchConsoleSite();
  await saveState({ ...state, lastAttemptAt: now.toISOString() }); // counted first: a cut-off harvest waits a day
  const window = harvestWindow(now);
  let rows: ScRow[];
  try {
    rows = await searchAnalytics(deps.sc, site, window);
  } catch (e) {
    const error = e instanceof SearchConsoleError || e instanceof Error ? e.message : String(e);
    await saveState({ ...state, lastAttemptAt: now.toISOString(), error });
    log.push(`search harvest failed: ${error}`);
    return;
  }

  const id = now.toISOString().slice(0, 10);
  const [guides, topics] = await Promise.all([listAllGuides(), listTopics()]);
  const published = guides.filter((g) => g.status === 'published' || g.status === 'scheduled');
  const groups = analyse(rows, {
    guides: published.map((g) => ({ slug: g.slug, title: g.title, point: g.point, pillar: g.pillar })),
    topics: topics.map((t) => ({ id: t.id, question: t.question, status: t.status })),
  });

  const added = engineOn() ? await feedQueue(groups, topics, id, now, log) : [];
  for (const [slug, numbers] of articleNumbers(rows)) await mergeMetric(slug, { ...numbers, harvest: id });

  const record: HarvestRecord = {
    id,
    at: now.toISOString(),
    site,
    window,
    rows: rows.length,
    clicks: rows.reduce((n, r) => n + r.clicks, 0),
    impressions: rows.reduce((n, r) => n + r.impressions, 0),
    groups: groups.slice(0, KEEP_GROUPS).map((g) => ({ ...g, pages: g.pages.slice(0, 3) })),
    added,
  };
  await adminFirestore.collection(HARVESTS_COLLECTION).doc(id).set(clean(record));

  const inspect = published
    .filter((g) => g.status === 'published' && g.publishedAt && now.getTime() - Date.parse(g.publishedAt) <= INSPECT_WITHIN_MS)
    .map((g) => g.slug);
  await saveState({ lastHarvestAt: now.toISOString(), lastHarvestId: id, lastAttemptAt: now.toISOString(), inspect, summaryFor: id });
  log.push(`search harvest ${id}: ${rows.length} rows, ${groups.length} groups, ${added.length} new topic(s)`);
}

async function inspectSome(deps: HarvestDeps, state: HarvestState, now: Date, log: string[]): Promise<void> {
  const site = searchConsoleSite();
  const batch = (state.inspect ?? []).slice(0, INSPECT_PER_TICK);
  // Taken off the list first: a cut-off inspection is not retried this week.
  await saveState({ ...state, inspect: (state.inspect ?? []).slice(batch.length) });
  for (const slug of batch) {
    try {
      const result = await inspectUrl(deps.sc, site, `${SITE_URL}/guides/${slug}`);
      await mergeMetric(slug, { index: { ...result, checkedAt: now.toISOString() } });
    } catch (e) {
      log.push(`inspect ${slug} failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  log.push(`inspected ${batch.length} article(s) for indexing`);
}

async function sendSummary(deps: HarvestDeps, state: HarvestState, now: Date, log: string[]): Promise<void> {
  const settings = await getEngineSettings();
  if (!inEmailHours(now, settings)) return;
  const record = state.summaryFor ? await getHarvest(state.summaryFor) : null;
  const to = reviewAddress(settings);
  if (record && to && !settings.paused) {
    const [guides, topics, metrics] = await Promise.all([listAllGuides(), listTopics(), listMetrics()]);
    await deps.send(summaryFor(record, guides, topics, metrics, to, now));
    log.push(`search summary ${record.id} emailed`);
  }
  await saveState({ ...state, summaryFor: undefined });
}

/** What the weekly summary says, from the harvest and the current state of things. */
export function summaryFor(record: HarvestRecord, guides: Guide[], topics: Topic[], metrics: GuideMetric[], to: string, now: Date): SummaryEmail {
  const week = now.getTime() - 7 * DAY_MS;
  return {
    kind: 'summary',
    to,
    harvest: { id: record.id, window: record.window, clicks: record.clicks, impressions: record.impressions },
    published: guides.filter((g) => g.status === 'published' && g.publishedAt && Date.parse(g.publishedAt) >= week).map((g) => g.title),
    scheduled: guides.filter((g) => g.status === 'scheduled').map((g) => g.title),
    added: record.added.map((a) => ({ question: a.question, impressions: a.impressions })),
    next: topics.filter((t) => t.status === 'queued').slice(0, 3).map((t) => t.question),
    refresh: record.groups
      .filter((g) => g.kind === 'refresh' && g.page)
      .slice(0, 5)
      .map((g) => ({ page: g.page!, query: g.top, position: Math.round(g.position * 10) / 10, impressions: g.impressions })),
    notIndexed: metrics
      .filter((m) => m.index && m.index.verdict !== 'PASS')
      .filter((m) => {
        const g = guides.find((x) => x.slug === m.slug);
        return g?.status === 'published' && g.publishedAt && now.getTime() - Date.parse(g.publishedAt) > 7 * DAY_MS;
      })
      .map((m) => ({ slug: m.slug, state: m.index?.coverageState ?? m.index?.verdict ?? 'unknown' })),
  };
}

/** One tick of the harvest: at most one stage. Called by the hourly maintenance job. */
export async function runSearchHarvest(deps: HarvestDeps): Promise<{ skipped?: string; log?: string[] }> {
  if (!engineOn()) return { skipped: 'CONTENT_ENGINE_MODE is not "on"' };
  const now = deps.now();
  const state = await getHarvestState();
  const log: string[] = [];

  if (state.inspect?.length) await inspectSome(deps, state, now, log);
  else if (state.summaryFor) await sendSummary(deps, state, now, log);
  else {
    const since = (at?: string) => (at ? now.getTime() - Date.parse(at) : Infinity);
    const due = since(state.lastHarvestAt) >= HARVEST_EVERY_MS && (!state.error || since(state.lastAttemptAt) >= RETRY_AFTER_MS);
    const cutOff = !state.error && since(state.lastAttemptAt) < RETRY_AFTER_MS && since(state.lastAttemptAt) < since(state.lastHarvestAt);
    if (!due || cutOff) return { skipped: 'not due', log };
    await harvest(deps, state, now, log);
  }
  return { log };
}
