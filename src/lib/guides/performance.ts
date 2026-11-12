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
// by the `src` an article's call to action or tool link carries to the form
// (guide-<slug>). App sign-ups come from the app over the bridge, by the same
// src (getAppSignupsBySrc): a reader who clicked through and signed up, and
// one who left an address first and signed up later.

import { guideSrc } from '@/lib/app-links';
import { adminFirestore } from '@/lib/firebase-admin';
import type { AppSignups, SrcCounts } from '@/lib/marketing-bridge';
import type { GuideMetric } from './harvest/run';
import type { Guide } from './types';

export const CLICKS_COLLECTION = 'guideClicks';
const DAY_MS = 86_400_000;
/** Not indexed this long after publishing: look at it. */
export const NOT_INDEXED_AFTER_DAYS = 30;
/** Fewer impressions than this, this long after publishing: look at it. */
export const FEW_IMPRESSIONS_AFTER_DAYS = 90;
export const FEW_IMPRESSIONS = 100;

/** The `src` a lead from an article carries. Declared with the app's src rule. */
export { guideSrc };
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
  /** Absent when the app could not be asked. */
  app?: SrcCounts;
  flags: Flag[];
}

const ZERO: SrcCounts = { signups: 0, trials: 0, paying: 0 };

function plus(a: SrcCounts | undefined, b: SrcCounts | undefined): SrcCounts {
  return {
    signups: (a?.signups ?? 0) + (b?.signups ?? 0),
    trials: (a?.trials ?? 0) + (b?.trials ?? 0),
    paying: (a?.paying ?? 0) + (b?.paying ?? 0),
  };
}

/** One src's app sign-ups, both ways in. */
export function appCountsFor(app: AppSignups, src: string): SrcCounts {
  return plus(app.direct[src] ?? ZERO, app.viaEmail[src]);
}

export interface AppSourceRow {
  src: string;
  direct: SrcCounts;
  viaEmail: SrcCounts;
  total: SrcCounts;
}

/** Every src the app has sign-ups for (articles, tools, pages), most sign-ups first. */
export function appSourceRows(app: AppSignups): AppSourceRow[] {
  const srcs = new Set([...Object.keys(app.direct), ...Object.keys(app.viaEmail)]);
  return [...srcs]
    .map((src) => ({
      src,
      direct: app.direct[src] ?? ZERO,
      viaEmail: app.viaEmail[src] ?? ZERO,
      total: appCountsFor(app, src),
    }))
    .sort((a, b) => b.total.signups - a.total.signups || b.total.paying - a.total.paying || a.src.localeCompare(b.src));
}

/** One row per published article, newest first, with its flags. */
export function performanceRows(
  guides: Pick<Guide, 'slug' | 'title' | 'status' | 'publishedAt'>[],
  metrics: GuideMetric[],
  clicks: GuideClicks[],
  leads: ReadonlyMap<string, number>,
  now: Date,
  app: AppSignups | null = null,
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
        ...(app ? { app: appCountsFor(app, guideSrc(g.slug)) } : {}),
        flags,
      };
    });
}

export const FLAG_WORDS: Record<Flag, string> = {
  'not-indexed': `Not indexed ${NOT_INDEXED_AFTER_DAYS} days after publishing: check it in Search Console (URL inspection), and that something links to it.`,
  'few-impressions': `Under ${FEW_IMPRESSIONS} impressions in 28 days, ${FEW_IMPRESSIONS_AFTER_DAYS} days after publishing: nobody searches for it as written. Retitle it to the words people use, or retire it into a related article.`,
};
