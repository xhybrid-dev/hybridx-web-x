// src/lib/guides/queue.ts
//
// The topic queue: which question the engine drafts next. Seeded once from
// src/lib/guides/candidates.ts; after that, Firestore (guideTopics) is the
// source of truth and Jon orders it in /admin/guides/topics. A topic he skips
// keeps its reason, so it is never offered again; a question he types in goes
// to the front.
//
// From step 6 the weekly Search Console harvest adds topics people are searching
// for, records the search numbers on topics they match, and reorders the queue
// in four bands (reorderQueue):
//   1. Jon's own questions, and topics he moved up, in his order;
//   2. topics with search demand, highest score first: what Search Console
//      says finds us, or what Keyword Planner says is searched for (step 10);
//   3. the rest, in their order;
//   4. topics he moved down, in his order.
// So search data decides the order only where Jon has not.

import { adminFirestore } from '@/lib/firebase-admin';
import { CANDIDATES, UNBUILT_TOOLS, type Candidate, type FutureTool, type Proof } from './candidates';
import { describeDuplicate, findDuplicates, type Compared } from './duplicates';
import { listAllGuides } from './store';
import type { PillarId, ToolId } from './topics';

export const TOPICS_COLLECTION = 'guideTopics';

export type TopicStatus = 'queued' | 'drafting' | 'drafted' | 'skipped';

export interface Topic {
  id: string;
  question: string;
  pillar: PillarId;
  /** 'any' lets the draft choose the proof element (Jon's own questions). */
  proof: Proof | 'any';
  tool?: ToolId;
  needs?: FutureTool;
  note?: string;
  /** Lower goes first. Spaced by 10 so a move needs no renumbering. */
  rank: number;
  status: TopicStatus;
  source: 'list' | 'jon' | 'search';
  /** Search Console numbers from the latest harvest that matched it (step 6). */
  search?: TopicSearch;
  /** Keyword Planner's UK monthly searches for its best phrase (step 10). */
  volume?: TopicVolume;
  /** Jon moved it: up keeps it ahead of search-ranked topics, down behind them. */
  held?: 'up' | 'down';
  skipReason?: string;
  guideSlug?: string;
  /** Drafting attempts that produced nothing usable; skipped after two. */
  failures?: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TopicSearch {
  /** The harvest it came from (its date). */
  harvest: string;
  impressions: number;
  clicks: number;
  position: number;
  score: number;
  queries: string[];
}

export interface TopicVolume {
  keyword: string;
  avgMonthly: number;
  /** The latest three months' average. */
  recent: number;
  /** avgMonthly scored like a search we do not rank for: see harvest/volumes.ts. */
  score: number;
  checkedAt: string;
}

/** What orders a topic within the search band: the stronger of what finds us and what is searched for. */
export function demandScore(t: Pick<Topic, 'search' | 'volume'>): number {
  return Math.max(t.search?.score ?? 0, t.volume?.score ?? 0);
}

const clean = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

export async function listTopics(): Promise<Topic[]> {
  const snap = await adminFirestore.collection(TOPICS_COLLECTION).get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Topic, 'id'>) })).sort((a, b) => a.rank - b.rank);
}

/** A question as a key: case, punctuation and spacing do not make a different question. */
export const questionKey = (q: string): string => q.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * The candidates the queue does not hold, whatever has become of them: a topic already drafted,
 * skipped or turned down still counts as held, so a topic Jon skipped never comes back.
 */
export function missingCandidates(topics: readonly Pick<Topic, 'question'>[], candidates: readonly Candidate[] = CANDIDATES): Candidate[] {
  const held = new Set(topics.map((t) => questionKey(t.question)));
  return candidates.filter((c) => !held.has(questionKey(c.question)));
}

/**
 * Writes the starting list when the queue has never held anything, and from then on adds any
 * candidate in candidates.ts the queue does not hold, at the back (reorderQueue places it by
 * demand). So a topic added to the list in code reaches a queue that was seeded long ago.
 */
export async function ensureQueueSeeded(now = new Date()): Promise<number> {
  const topics = await listTopics();
  const missing = missingCandidates(topics);
  if (missing.length === 0) return 0;
  const at = now.toISOString();
  const last = topics.at(-1)?.rank ?? 0;
  await Promise.all(
    missing.map((c, i) =>
      adminFirestore.collection(TOPICS_COLLECTION).add(
        clean({ ...c, rank: last + (i + 1) * 10, status: 'queued', source: 'list', createdAt: at, updatedAt: at }),
      ),
    ),
  );
  return missing.length;
}

/** Whether a topic can be drafted now: queued, and any tool it needs exists. */
export function isDraftable(t: Topic, unbuilt: readonly FutureTool[] = UNBUILT_TOOLS): boolean {
  return t.status === 'queued' && (!t.needs || !unbuilt.includes(t.needs));
}

/** The next topic to draft, or null when nothing draftable is queued. */
export async function nextTopic(): Promise<Topic | null> {
  return (await listTopics()).find((t) => isDraftable(t)) ?? null;
}

export async function setTopic(id: string, patch: Partial<Omit<Topic, 'id'>>, now = new Date()): Promise<void> {
  await adminFirestore.collection(TOPICS_COLLECTION).doc(id).update(clean({ ...patch, updatedAt: now.toISOString() }));
}

/** The longest brief a topic carries. The drafting prompt passes it on as the editor's note. */
export const BRIEF_MAX = 1000;

/**
 * Jon's own question, to the front of the queue. An optional brief goes to the
 * drafting model as "a note from the editor": the angle, what to cover, what to
 * leave out.
 */
export async function addTopic(question: string, pillar: PillarId, now = new Date(), brief?: string): Promise<string> {
  const topics = await listTopics();
  const first = topics.filter((t) => t.status === 'queued')[0]?.rank ?? 10;
  const at = now.toISOString();
  const ref = await adminFirestore.collection(TOPICS_COLLECTION).add(
    clean({
      question: question.trim().slice(0, 160),
      pillar,
      proof: 'any',
      note: brief?.trim().slice(0, BRIEF_MAX) || undefined,
      rank: first - 10,
      status: 'queued',
      source: 'jon',
      createdAt: at,
      updatedAt: at,
    }),
  );
  return ref.id;
}

/**
 * A sentence saying which queued topic or live article a new question repeats, or
 * null. Adding the same question worded differently put a second article on one
 * question onto the site; this is the check that stops it at the door.
 */
export async function duplicateOfQuestion(question: string): Promise<string | null> {
  const [topics, guides] = await Promise.all([listTopics(), listAllGuides()]);
  const existing: Compared[] = [
    ...topics
      .filter((t) => t.status === 'queued' || t.status === 'drafting')
      .map((t) => ({ label: 'a topic already in the queue', title: t.question })),
    ...guides
      .filter((g) => g.status !== 'retired' && g.status !== 'rejected')
      .map((g) => ({ label: `/guides/${g.slug}`, title: g.title })),
  ];
  const [found] = findDuplicates(question, existing);
  return found ? `That repeats a question already covered: ${describeDuplicate(found)}` : null;
}

/** Whether a question is already waiting or being drafted, so a double click adds it once. */
export async function isInQueue(question: string): Promise<boolean> {
  const wanted = question.trim().toLowerCase();
  return (await listTopics()).some((t) => (t.status === 'queued' || t.status === 'drafting') && t.question.trim().toLowerCase() === wanted);
}

/** Swaps a queued topic with its neighbour, up (-1) or down (+1). */
export async function moveTopic(id: string, direction: -1 | 1): Promise<void> {
  const queued = (await listTopics()).filter((t) => t.status === 'queued');
  const i = queued.findIndex((t) => t.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= queued.length) return;
  await Promise.all([
    setTopic(queued[i].id, { rank: queued[j].rank, held: direction === -1 ? 'up' : 'down' }),
    setTopic(queued[j].id, { rank: queued[i].rank }),
  ]);
}

/** The queued topics in the order reorderQueue puts them. */
export function bandOrder(queued: Topic[]): Topic[] {
  const byRank = (a: Topic, b: Topic) => a.rank - b.rank;
  const first = queued.filter((t) => t.source === 'jon' || t.held === 'up').sort(byRank);
  const last = queued.filter((t) => t.held === 'down' && t.source !== 'jon').sort(byRank);
  const middle = queued.filter((t) => !first.includes(t) && !last.includes(t));
  const searched = middle.filter((t) => demandScore(t) > 0).sort((a, b) => demandScore(b) - demandScore(a) || byRank(a, b));
  const rest = middle.filter((t) => !searched.includes(t)).sort(byRank);
  return [...first, ...searched, ...rest, ...last];
}

/** Renumbers the queued topics into their bands. Returns how many moved. */
export async function reorderQueue(now = new Date()): Promise<number> {
  const queued = (await listTopics()).filter((t) => t.status === 'queued');
  let moved = 0;
  await Promise.all(
    bandOrder(queued).map((t, i) => {
      const rank = (i + 1) * 10;
      if (t.rank === rank) return undefined;
      moved++;
      return setTopic(t.id, { rank }, now);
    }),
  );
  return moved;
}

/** A topic from search, added at the back for reorderQueue to place by its score. */
export async function addSearchTopic(input: { question: string; pillar: PillarId; note: string; search: TopicSearch }, now = new Date()): Promise<string> {
  const last = (await listTopics()).at(-1)?.rank ?? 0;
  const at = now.toISOString();
  const ref = await adminFirestore.collection(TOPICS_COLLECTION).add(
    clean({ ...input, proof: 'any', rank: last + 10, status: 'queued', source: 'search', createdAt: at, updatedAt: at }),
  );
  return ref.id;
}

export async function skipTopic(id: string, reason: string): Promise<void> {
  await setTopic(id, { status: 'skipped', skipReason: reason.trim().slice(0, 300) || 'Skipped' });
}

/** Back into the queue, after a skip or a draft that was turned down. */
export async function requeueTopic(id: string, now = new Date()): Promise<void> {
  // Empty strings rather than undefined: an undefined field is not written, so
  // the old reason would survive the requeue. The failure count goes too: a
  // topic put back with two failures would be skipped again on its next one.
  await setTopic(id, { status: 'queued', skipReason: '', guideSlug: '', failures: 0, lastError: '' }, now);
}

/**
 * A topic the engine skipped itself, after two drafts that came to nothing, as
 * opposed to one Jon skipped (which has no failures). Usually an outage rather
 * than anything wrong with the topic.
 */
export const isEngineSkipped = (t: Pick<Topic, 'status' | 'failures'>): boolean => t.status === 'skipped' && (t.failures ?? 0) >= 2;

/** Puts back every topic the engine skipped, leaving Jon's own skips alone. Returns how many. */
export async function requeueEngineSkipped(now = new Date()): Promise<number> {
  const skipped = (await listTopics()).filter(isEngineSkipped);
  await Promise.all(skipped.map((t) => requeueTopic(t.id, now)));
  return skipped.length;
}
