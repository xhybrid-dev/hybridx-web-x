// src/lib/guides/store.ts
//
// Articles in Firestore. docs/content-engine-plan.md, section 4.2.
//
// Articles live here rather than in the repo so that publishing one takes
// seconds instead of a build, and so a bad draft can only break its own page,
// never the deploy. Every save keeps the previous version in guideRevisions.
//
// Reads are made at request time only: the guide pages are force-dynamic, and
// nothing reads this collection while the site is built. The public list is
// held in memory for a few minutes, because every article page needs it (for
// related links) and it changes three times a week. Publishing calls
// invalidateGuideCache(); other instances catch up within CACHE_MS.
//
// A document that fails the schema is skipped and logged, never served: one
// bad record must not take the hub or the sitemap down with it.

import { adminFirestore } from '@/lib/firebase-admin';
import { SAMPLE_GUIDES } from './fixtures';
import { GuideSchema, type Guide } from './types';

/** `GUIDES_FIXTURES=1 npm run dev` previews the pages with the sample articles. */
function usingFixtures(): boolean {
  return process.env.GUIDES_FIXTURES === '1' && process.env.NODE_ENV !== 'production';
}

export const GUIDES_COLLECTION = 'guides';
export const REVISIONS_COLLECTION = 'guideRevisions';

const CACHE_MS = 5 * 60 * 1000;
let cache: { at: number; guides: Guide[] } | null = null;

function parse(id: string, data: Record<string, unknown>): Guide | null {
  const result = GuideSchema.safeParse({ ...data, slug: id });
  if (result.success) return result.data;
  const first = result.error.issues[0];
  console.error(`[guides] skipped ${id}: ${first?.path.join('.') || 'document'} ${first?.message ?? 'is invalid'}`);
  return null;
}

/** Published and retired articles: everything a public route may serve. */
export async function listPublicGuides(now = Date.now()): Promise<Guide[]> {
  if (usingFixtures()) return SAMPLE_GUIDES;
  if (cache && now - cache.at < CACHE_MS) return cache.guides;
  const snapshots = await Promise.all(
    (['published', 'retired'] as const).map((status) =>
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

/** Published articles, newest first. */
export async function listPublishedGuides(): Promise<Guide[]> {
  return (await listPublicGuides())
    .filter((g) => g.status === 'published')
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
}

/** A published or retired article, or null. Drafts are never public. */
export async function getPublicGuide(slug: string): Promise<Guide | null> {
  return (await listPublicGuides()).find((g) => g.slug === slug) ?? null;
}

export function invalidateGuideCache(): void {
  cache = null;
}

/**
 * Saves an article as its next revision and keeps a copy of that revision.
 * The revision number is assigned here, inside a transaction, so two saves
 * can never both become revision 3.
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
    const { slug, ...data } = guide;
    tx.set(ref, data);
    tx.set(adminFirestore.collection(REVISIONS_COLLECTION).doc(`${slug}__${guide.revision}`), {
      slug,
      revision: guide.revision,
      savedAt: guide.updatedAt,
      guide: data,
    });
    return guide;
  });
  invalidateGuideCache();
  return saved;
}
