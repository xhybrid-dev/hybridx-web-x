// src/lib/indexnow.ts
//
// Tells search engines that use IndexNow (Bing, and through it Copilot and ChatGPT search;
// Yandex, Naver, Seznam) the moment a guide goes live or changes, instead of waiting for them
// to come back to the sitemap. Google does not use IndexNow; it keeps reading the sitemap.
//
// The key is public by design: IndexNow proves a host owns its key by finding it in a file on
// that host, which is public/<key>.txt. It authorises nothing but "these URLs on this host
// changed", so there is nothing to protect and no secret to bind.
//
// What is sent is only guide URLs that are already public, once per change, and the hub page.
// Nothing here runs outside production (see liveIndexNow).

import { adminFirestore } from '@/lib/firebase-admin';
import { listPublishedGuides } from '@/lib/guides/store';
import { guidePath } from '@/lib/guides/schema';
import { SITE_CONFIG } from '@/lib/seo';
import type { Guide } from '@/lib/guides/types';

export const INDEXNOW_KEY = '7518a1ef42c3ebbb7e91ea3c180053a7';
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/IndexNow';
const PRODUCTION_ORIGIN = 'https://hybridx.club';
const STATE = { collection: 'contentSettings', id: 'indexnow' } as const;

/** URLs IndexNow takes in one request is 10,000; a guide a slot never gets near it. */
const MAX_URLS = 100;

export interface IndexNowState {
  /** slug to the updatedAt that was last announced. */
  pinged: Record<string, string>;
}

export interface IndexNowDeps {
  origin: string;
  guides: () => Promise<Pick<Guide, 'slug' | 'updatedAt'>[]>;
  loadState: () => Promise<IndexNowState>;
  saveState: (state: IndexNowState) => Promise<void>;
  submit: (urls: string[]) => Promise<{ ok: boolean; status: number }>;
}

/** The guides that have never been announced, or that changed since they were. */
export function guidesToAnnounce(guides: readonly Pick<Guide, 'slug' | 'updatedAt'>[], state: IndexNowState): Pick<Guide, 'slug' | 'updatedAt'>[] {
  return guides.filter((g) => state.pinged[g.slug] !== g.updatedAt);
}

export async function announceGuides(deps: IndexNowDeps): Promise<{ announced: string[]; skipped?: string }> {
  const [guides, state] = await Promise.all([deps.guides(), deps.loadState()]);
  const due = guidesToAnnounce(guides, state).slice(0, MAX_URLS);
  if (due.length === 0) return { announced: [], skipped: 'nothing new' };
  // The hub lists them, so it changed too.
  const urls = [...due.map((g) => `${deps.origin}${guidePath(g.slug)}`), `${deps.origin}/guides`];
  const result = await deps.submit(urls);
  // 200 and 202 are both "received". Anything else is left to try again next hour.
  if (!result.ok) return { announced: [], skipped: `IndexNow answered ${result.status}` };
  const next: IndexNowState = { pinged: { ...state.pinged } };
  for (const g of due) next.pinged[g.slug] = g.updatedAt;
  await deps.saveState(next);
  return { announced: due.map((g) => g.slug) };
}

export async function submitToIndexNow(urls: string[], origin: string, fetchImpl: typeof fetch = fetch): Promise<{ ok: boolean; status: number }> {
  const response = await fetchImpl(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: new URL(origin).host, key: INDEXNOW_KEY, keyLocation: `${origin}/${INDEXNOW_KEY}.txt`, urlList: urls }),
    signal: AbortSignal.timeout(10_000),
  });
  return { ok: response.status === 200 || response.status === 202, status: response.status };
}

/** The hourly job's step. Production only: a preview or a developer's machine must not announce anything. */
export async function liveIndexNow(): Promise<{ announced: string[]; skipped?: string }> {
  const origin = SITE_CONFIG.url;
  if (process.env.NODE_ENV !== 'production' || origin !== PRODUCTION_ORIGIN) return { announced: [], skipped: 'not production' };
  const ref = adminFirestore.collection(STATE.collection).doc(STATE.id);
  return announceGuides({
    origin,
    guides: () => listPublishedGuides(),
    loadState: async () => {
      const snap = await ref.get();
      const pinged = (snap.data() as Partial<IndexNowState> | undefined)?.pinged;
      return { pinged: pinged && typeof pinged === 'object' ? pinged : {} };
    },
    saveState: async (state) => {
      await ref.set(state);
    },
    submit: (urls) => submitToIndexNow(urls, origin),
  });
}
