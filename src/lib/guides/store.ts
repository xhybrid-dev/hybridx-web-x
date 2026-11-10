// src/lib/guides/store.ts
//
// Articles in Firestore. docs/content-engine-plan.md, section 4.2.
//
// Articles live here rather than in the repo so that publishing one takes
// seconds instead of a build, and so a bad draft can only break its own page,
// never the deploy. Every content save keeps the previous version in
// guideRevisions; a change of status (approve, schedule, reject) does not count
// as a new revision of the content.
//
// Reads are made at request time only: the guide pages are force-dynamic, and
// nothing reads this collection while the site is built. The public list is
// held in memory for a few minutes, because every article page needs it (for
// related links) and it changes three times a week. Publishing calls
// invalidateGuideCache(); other instances catch up within CACHE_MS.
//
// A scheduled article is public from its slot onwards, decided when the list
// is read, so it goes live at 07:00 however late the hourly job runs. The job
// then records it as published (publishDueGuides).
//
// A document that fails the schema is skipped and logged, never served: one
// bad record must not take the hub or the sitemap down with it.

import { adminFirestore } from '@/lib/firebase-admin';
import { SAMPLE_GUIDES } from './fixtures';
import { DEFAULT_SETTINGS, EngineSettingsSchema, type EngineSettings } from './slots';
import { GuideSchema, type Guide } from './types';

export const GUIDES_COLLECTION = 'guides';
export const REVISIONS_COLLECTION = 'guideRevisions';
export const COMMENTS_COLLECTION = 'guideComments';
const SETTINGS_DOC = { collection: 'contentSettings', id: 'engine' } as const;

const CACHE_MS = 5 * 60 * 1000;
let cache: { at: number; guides: Guide[] } | null = null;

/** `GUIDES_FIXTURES=1 npm run dev` previews the pages with the sample articles. */
function usingFixtures(): boolean {
  return process.env.GUIDES_FIXTURES === '1' && process.env.NODE_ENV !== 'production';
}

function parse(id: string, data: Record<string, unknown>): Guide | null {
  const result = GuideSchema.safeParse({ ...data, slug: id });
  if (result.success) return result.data;
  const first = result.error.issues[0];
  console.error(`[guides] skipped ${id}: ${first?.path.join('.') || 'document'} ${first?.message ?? 'is invalid'}`);
  return null;
}

/** Firestore holds everything but the slug, which is the document id. */
function toDoc(guide: Guide): Record<string, unknown> {
  const { slug: _slug, ...data } = guide;
  // Firestore rejects undefined; an absent field is simply not written.
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
}

/** What the public sees of an article at `now`: a due scheduled article is published. */
function asPublic(g: Guide, now: number): Guide | null {
  if (g.status === 'published' || g.status === 'retired') return g;
  if (g.status === 'scheduled' && g.publishAt && Date.parse(g.publishAt) <= now) {
    return { ...g, status: 'published', publishedAt: g.publishAt };
  }
  return null;
}

async function loadPublicCandidates(now: number): Promise<Guide[]> {
  if (cache && now - cache.at < CACHE_MS) return cache.guides;
  const snapshots = await Promise.all(
    (['published', 'retired', 'scheduled'] as const).map((status) =>
      adminFirestore.collection(GUIDES_COLLECTION).where('status', '==', status).get(),
    ),
  );
  const guides = snapshots
    .flatMap((snap) => snap.docs)
    .map((doc) => parse(doc.id, (doc.data() ?? {}) as Record<string, unknown>))
    .filter((g): g is Guide => g !== null);
  cache = { at: now, guides };
  return guides;
}

/** Published and retired articles: everything a public route may serve. */
export async function listPublicGuides(now = Date.now()): Promise<Guide[]> {
  if (usingFixtures()) return SAMPLE_GUIDES;
  return (await loadPublicCandidates(now)).map((g) => asPublic(g, now)).filter((g): g is Guide => g !== null);
}

/** Published articles, newest first. */
export async function listPublishedGuides(now = Date.now()): Promise<Guide[]> {
  return (await listPublicGuides(now))
    .filter((g) => g.status === 'published')
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
}

/**
 * Published articles for a page that is built ahead of time and refreshed
 * hourly (the pillar pages). Never reads Firestore while the site is built, as
 * the build has no credentials, and never fails: a pillar page must render
 * whether or not the articles can be read. Built pages show no articles until
 * their first refresh.
 */
export async function listPublishedGuidesOutsideBuild(): Promise<Guide[]> {
  if (process.env.NEXT_PHASE === 'phase-production-build') return [];
  try {
    return await listPublishedGuides();
  } catch (error) {
    console.error('[guides] page served without articles:', error instanceof Error ? error.message : error);
    return [];
  }
}

/** A published or retired article, or null. Drafts are never public. */
export async function getPublicGuide(slug: string, now = Date.now()): Promise<Guide | null> {
  return (await listPublicGuides(now)).find((g) => g.slug === slug) ?? null;
}

export function invalidateGuideCache(): void {
  cache = null;
}

/* ── Admin reads ─────────────────────────────────────────────────────────── */

/** Any article, in any status. Admin only. */
export async function getGuide(slug: string): Promise<Guide | null> {
  const snap = await adminFirestore.collection(GUIDES_COLLECTION).doc(slug).get();
  return snap.exists ? parse(slug, (snap.data() ?? {}) as Record<string, unknown>) : null;
}

/** Every article, most recently changed first. Admin only. */
export async function listAllGuides(): Promise<Guide[]> {
  const snap = await adminFirestore.collection(GUIDES_COLLECTION).get();
  return snap.docs
    .map((doc) => parse(doc.id, (doc.data() ?? {}) as Record<string, unknown>))
    .filter((g): g is Guide => g !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export interface GuideRevision {
  revision: number;
  savedAt: string;
}

/** The saved revisions of an article, newest first. */
export async function listRevisions(slug: string): Promise<GuideRevision[]> {
  const snap = await adminFirestore.collection(REVISIONS_COLLECTION).where('slug', '==', slug).get();
  return snap.docs
    .map((d) => d.data() as { revision: number; savedAt: string })
    .map(({ revision, savedAt }) => ({ revision, savedAt }))
    .sort((a, b) => b.revision - a.revision);
}

/* ── Writes ──────────────────────────────────────────────────────────────── */

/**
 * Saves an article's content as its next revision and keeps a copy of that
 * revision. The revision number is assigned here, inside a transaction, so two
 * saves can never both become revision 3.
 */
export async function saveGuide(
  input: Omit<Guide, 'revision' | 'updatedAt'>,
  now = new Date(),
): Promise<Guide> {
  const ref = adminFirestore.collection(GUIDES_COLLECTION).doc(input.slug);
  const saved = await adminFirestore.runTransaction(async (tx) => {
    const current = await tx.get(ref);
    const previous = current.exists ? Number((current.data() as { revision?: number }).revision ?? 0) : 0;
    const guide = GuideSchema.parse({ ...input, revision: previous + 1, updatedAt: now.toISOString() });
    tx.set(ref, toDoc(guide));
    tx.set(adminFirestore.collection(REVISIONS_COLLECTION).doc(`${guide.slug}__${guide.revision}`), {
      slug: guide.slug,
      revision: guide.revision,
      savedAt: guide.updatedAt,
      guide: toDoc(guide),
    });
    return guide;
  });
  invalidateGuideCache();
  return saved;
}

export type StatePatch = Partial<
  Record<'status' | 'publishAt' | 'publishedAt' | 'redirectTo' | 'rejectionReason', string | undefined>
>;

/**
 * Changes where an article is in its life (status, slot, redirect, reason)
 * without touching its content or revision. A key set to undefined is removed.
 * The result must still pass the schema, so an impossible state (scheduled
 * without a slot, published without a date) is refused rather than saved.
 */
export async function updateGuideState(slug: string, patch: StatePatch): Promise<Guide> {
  const ref = adminFirestore.collection(GUIDES_COLLECTION).doc(slug);
  const updated = await adminFirestore.runTransaction(async (tx) => {
    const current = await tx.get(ref);
    if (!current.exists) throw new Error(`No article ${slug}`);
    const merged: Record<string, unknown> = { ...(current.data() as Record<string, unknown>), ...patch, slug };
    for (const [k, v] of Object.entries(patch)) if (v === undefined) delete merged[k];
    const guide = GuideSchema.parse(merged);
    tx.set(ref, toDoc(guide));
    return guide;
  });
  invalidateGuideCache();
  return updated;
}

/**
 * Records every scheduled article whose slot has passed as published. Run by
 * the hourly maintenance job; the public pages already show them from the slot.
 */
export async function publishDueGuides(now = new Date()): Promise<{ published: string[] }> {
  const snap = await adminFirestore.collection(GUIDES_COLLECTION).where('status', '==', 'scheduled').get();
  const published: string[] = [];
  for (const doc of snap.docs) {
    const publishAt = (doc.data() as { publishAt?: string }).publishAt;
    if (!publishAt || Date.parse(publishAt) > now.getTime()) continue;
    await updateGuideState(doc.id, { status: 'published', publishedAt: publishAt, publishAt: undefined });
    published.push(doc.id);
  }
  return { published };
}

/** The slots already held by scheduled articles. */
export async function takenSlots(): Promise<string[]> {
  const snap = await adminFirestore.collection(GUIDES_COLLECTION).where('status', '==', 'scheduled').get();
  return snap.docs.map((d) => (d.data() as { publishAt?: string }).publishAt).filter((s): s is string => !!s);
}

/* ── Comments ────────────────────────────────────────────────────────────── */

export interface GuideComment {
  id: string;
  slug: string;
  /** The revision the comment was made on. */
  revision: number;
  /** The block it points at, or null for the whole article. */
  blockIndex: number | null;
  text: string;
  by: string;
  createdAt: string;
  /** Open until a revision deals with it (plan step 4) or it is marked done. */
  status: 'open' | 'resolved';
}

export async function addComment(input: Omit<GuideComment, 'id' | 'createdAt' | 'status'>, now = new Date()): Promise<string> {
  const ref = await adminFirestore.collection(COMMENTS_COLLECTION).add({
    ...input,
    createdAt: now.toISOString(),
    status: 'open',
  });
  return ref.id;
}

export async function listComments(slug: string): Promise<GuideComment[]> {
  const snap = await adminFirestore.collection(COMMENTS_COLLECTION).where('slug', '==', slug).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<GuideComment, 'id'>) }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function resolveComment(id: string): Promise<void> {
  await adminFirestore.collection(COMMENTS_COLLECTION).doc(id).update({ status: 'resolved' });
}

/* ── Settings ────────────────────────────────────────────────────────────── */

/** The engine settings, with the decided defaults for anything never saved. */
export async function getEngineSettings(): Promise<EngineSettings> {
  const snap = await adminFirestore.collection(SETTINGS_DOC.collection).doc(SETTINGS_DOC.id).get();
  const result = EngineSettingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...(snap.exists ? snap.data() : {}) });
  if (result.success) return result.data;
  console.error('[guides] engine settings invalid, using defaults:', result.error.issues[0]?.message);
  return DEFAULT_SETTINGS;
}

export async function saveEngineSettings(settings: EngineSettings): Promise<EngineSettings> {
  const valid = EngineSettingsSchema.parse(settings);
  await adminFirestore.collection(SETTINGS_DOC.collection).doc(SETTINGS_DOC.id).set(valid);
  return valid;
}

/** Where review emails go: the saved address, else the first admin. */
export function reviewAddress(settings: EngineSettings): string {
  return settings.reviewAddress || (process.env.ADMIN_EMAILS ?? '').split(',')[0]?.trim() || '';
}
