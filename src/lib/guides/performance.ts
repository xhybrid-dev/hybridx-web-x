// src/lib/guides/performance.ts
//
// How each article is doing (docs/content-engine-plan.md, step 7): search
// numbers from the weekly harvest, clicks on its tool and its call to action,
// and the leads that came from it, with two flags that say an article needs
// a look.
//
// Clicks are counted on the server, by /api/guides/out, as plain totals per
// article: no cookie, no identifier, nothing about the visitor. So they count
// everyone, not only the people who accepted analytics. Leads are attributed
// by the `src` the call to action carries to the form (guide-<slug>).

import { adminFirestore } from '@/lib/firebase-admin';
import type { GuideMetric } from './harvest/run';
import type { Guide } from './types';

export const CLICKS_COLLECTION = 'guideClicks';
const DAY_MS = 86_400_000;
/** Not indexed this long after publishing: look at it. */
export const NOT_INDEXED_AFTER_DAYS = 30;
/** Fewer impressions than this, this long after publishing: look at it. */
export const FEW_IMPRESSIONS_AFTER_DAYS = 90;
export const FEW_IMPRESSIONS = 100;

/** The `src` a lead from an article carries. */
export const guideSrc = (slug: string) => `guide-${slug}`;
const SRC = /^guide-([a-z0-9-]{1,80})$/;

export interface GuideClicks {
  slug: string;
  cta: number;
  tool: number;
  updatedAt?: string;
}

/** Adds one click. A transaction, so two at once both count. */
export async function recordClick(slug: string, kind: 'cta' | 'tool', now = new Date()): Promise<void> {
  const ref = adminFirestore.collection(CLICKS_COLLECTION).doc(slug);
  await adminFirestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = (snap.exists ? snap.data() : {}) as Partial<GuideClicks>;
    tx.set(ref, {
      slug,
      cta: (current.cta ?? 0) + (kind === 'cta' ? 1 : 0),
      tool: (current.tool ?? 0) + (kind === 'tool' ? 1 : 0),
      updatedAt: now.toISOString(),
    });
  });
}

export async function listClicks(): Promise<GuideClicks[]> {
  const snap = await adminFirestore.collection(CLICKS_COLLECTION).get();
  return snap.docs.map((d) => d.data() as GuideClicks);
}

/** Leads whose src names an article, counted per article. */
export async function leadsByGuide(): Promise<Map<string, number>> {
  const snap = await adminFirestore.collection('leads').where('extra.src', '>=', 'guide-').where('extra.src', '<', 'guide.').get();
  const out = new Map<string, number>();
  for (const doc of snap.docs) {
    const slug = String((doc.data() as { extra?: { src?: string } }).extra?.src ?? '').match(SRC)?.[1];
    if (slug) out.set(slug, (out.get(slug) ?? 0) + 1);
  }
  return out;
}

export type Flag = 'not-indexed' | 'few-impressions';

export interface PerformanceRow {
  slug: string;
  title: string;
  publishedAt: string;
  days: number;
  indexed: 'yes' | 'no' | 'unchecked';
  coverage?: string;
  clicks?: number;
  impressions?: number;
  position?: number;
  ctaClicks: number;
  toolClicks: number;
  leads: number;
  flags: Flag[];
}

/** One row per published article, newest first, with its flags. */
export function performanceRows(
  guides: Pick<Guide, 'slug' | 'title' | 'status' | 'publishedAt'>[],
  metrics: GuideMetric[],
  clicks: GuideClicks[],
  leads: ReadonlyMap<string, number>,
  now: Date,
): PerformanceRow[] {
  return guides
    .filter((g): g is typeof g & { publishedAt: string } => g.status === 'published' && !!g.publishedAt)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .map((g) => {
      const m = metrics.find((x) => x.slug === g.slug);
      const c = clicks.find((x) => x.slug === g.slug);
      const days = Math.floor((now.getTime() - Date.parse(g.publishedAt)) / DAY_MS);
      const indexed = !m?.index ? 'unchecked' : m.index.verdict === 'PASS' ? 'yes' : 'no';
      const flags: Flag[] = [];
      if (days >= NOT_INDEXED_AFTER_DAYS && indexed !== 'yes') flags.push('not-indexed');
      if (days >= FEW_IMPRESSIONS_AFTER_DAYS && (m?.impressions ?? 0) < FEW_IMPRESSIONS) flags.push('few-impressions');
      return {
        slug: g.slug,
        title: g.title,
        publishedAt: g.publishedAt,
        days,
        indexed,
        coverage: m?.index?.coverageState,
        clicks: m?.clicks,
        impressions: m?.impressions,
        position: m?.position,
        ctaClicks: c?.cta ?? 0,
        toolClicks: c?.tool ?? 0,
        leads: leads.get(g.slug) ?? 0,
        flags,
      };
    });
}

export const FLAG_WORDS: Record<Flag, string> = {
  'not-indexed': `Not indexed ${NOT_INDEXED_AFTER_DAYS} days after publishing: check it in Search Console (URL inspection), and that something links to it.`,
  'few-impressions': `Under ${FEW_IMPRESSIONS} impressions in 28 days, ${FEW_IMPRESSIONS_AFTER_DAYS} days after publishing: nobody searches for it as written. Retitle it to the words people use, or retire it into a related article.`,
};
