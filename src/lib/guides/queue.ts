// src/lib/guides/queue.ts
//
// The topic queue: which question the engine drafts next. Seeded once from
// src/lib/guides/candidates.ts; after that, Firestore (guideTopics) is the
// source of truth and Jon orders it in /admin/guides/topics. A topic he skips
// keeps its reason, so it is never offered again; a question he types in goes
// to the front.

import { adminFirestore } from '@/lib/firebase-admin';
import { CANDIDATES, UNBUILT_TOOLS, type FutureTool, type Proof } from './candidates';
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
  source: 'list' | 'jon';
  skipReason?: string;
  guideSlug?: string;
  /** Drafting attempts that produced nothing usable; skipped after two. */
  failures?: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

const clean = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

export async function listTopics(): Promise<Topic[]> {
  const snap = await adminFirestore.collection(TOPICS_COLLECTION).get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Topic, 'id'>) })).sort((a, b) => a.rank - b.rank);
}

/** Writes the starting list, once: only when the queue has never held anything. */
export async function ensureQueueSeeded(now = new Date()): Promise<number> {
  const existing = await adminFirestore.collection(TOPICS_COLLECTION).limit(1).get();
  if (!existing.empty) return 0;
  const at = now.toISOString();
  await Promise.all(
    CANDIDATES.map((c, i) =>
      adminFirestore.collection(TOPICS_COLLECTION).add(
        clean({ ...c, rank: (i + 1) * 10, status: 'queued', source: 'list', createdAt: at, updatedAt: at }),
      ),
    ),
  );
  return CANDIDATES.length;
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

/** Jon's own question, to the front of the queue. */
export async function addTopic(question: string, pillar: PillarId, now = new Date()): Promise<string> {
  const topics = await listTopics();
  const first = topics.filter((t) => t.status === 'queued')[0]?.rank ?? 10;
  const at = now.toISOString();
  const ref = await adminFirestore.collection(TOPICS_COLLECTION).add({
    question: question.trim().slice(0, 160),
    pillar,
    proof: 'any',
    rank: first - 10,
    status: 'queued',
    source: 'jon',
    createdAt: at,
    updatedAt: at,
  });
  return ref.id;
}

/** Swaps a queued topic with its neighbour, up (-1) or down (+1). */
export async function moveTopic(id: string, direction: -1 | 1): Promise<void> {
  const queued = (await listTopics()).filter((t) => t.status === 'queued');
  const i = queued.findIndex((t) => t.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= queued.length) return;
  await Promise.all([setTopic(queued[i].id, { rank: queued[j].rank }), setTopic(queued[j].id, { rank: queued[i].rank })]);
}

export async function skipTopic(id: string, reason: string): Promise<void> {
  await setTopic(id, { status: 'skipped', skipReason: reason.trim().slice(0, 300) || 'Skipped' });
}

/** Back into the queue, after a skip or a draft that was turned down. */
export async function requeueTopic(id: string): Promise<void> {
  // Empty strings rather than undefined: an undefined field is not written, so
  // the old reason would survive the requeue.
  await setTopic(id, { status: 'queued', skipReason: '', guideSlug: '' });
}
