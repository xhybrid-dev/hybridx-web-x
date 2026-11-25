import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// indexnow.ts imports Firestore and the guide store at the top; the logic under test takes them as
// arguments, so stand them in.
vi.mock('@/lib/firebase-admin', () => ({ adminFirestore: {} }));
vi.mock('@/lib/guides/store', () => ({ listPublishedGuides: async () => [] }));

import { announceGuides, guidesToAnnounce, INDEXNOW_ENDPOINT, INDEXNOW_KEY, submitToIndexNow, type IndexNowState } from '@/lib/indexnow';

const ORIGIN = 'https://hybridx.club';
const g = (slug: string, updatedAt = '2026-11-25T07:00:00.000Z') => ({ slug, updatedAt });

function deps(guides: ReturnType<typeof g>[], state: IndexNowState, status = 200) {
  const saved: IndexNowState[] = [];
  const sent: string[][] = [];
  return {
    saved,
    sent,
    d: {
      origin: ORIGIN,
      guides: async () => guides,
      loadState: async () => state,
      saveState: async (s: IndexNowState) => void saved.push(s),
      submit: async (urls: string[]) => {
        sent.push(urls);
        return { ok: status === 200 || status === 202, status };
      },
    },
  };
}

describe('the IndexNow key', () => {
  it('is a valid key, and is served from public/ as the file IndexNow looks for', () => {
    expect(INDEXNOW_KEY).toMatch(/^[a-zA-Z0-9-]{8,128}$/);
    const file = join(process.cwd(), 'public', `${INDEXNOW_KEY}.txt`);
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, 'utf8')).toBe(INDEXNOW_KEY);
  });
});

describe('what gets announced', () => {
  it('is a guide never announced, or one that changed since', () => {
    const state = { pinged: { a: '2026-11-25T07:00:00.000Z', b: '2026-11-01T07:00:00.000Z' } };
    expect(guidesToAnnounce([g('a'), g('b'), g('c')], state).map((x) => x.slug)).toEqual(['b', 'c']);
  });

  it('sends the guide URLs and the hub, then remembers what it sent', async () => {
    const { d, sent, saved } = deps([g('new-guide')], { pinged: {} });
    const out = await announceGuides(d);
    expect(out.announced).toEqual(['new-guide']);
    expect(sent[0]).toEqual([`${ORIGIN}/guides/new-guide`, `${ORIGIN}/guides`]);
    expect(saved[0].pinged['new-guide']).toBe('2026-11-25T07:00:00.000Z');
  });

  it('sends nothing, and does not write, when everything is already announced', async () => {
    const { d, sent, saved } = deps([g('a')], { pinged: { a: '2026-11-25T07:00:00.000Z' } });
    const out = await announceGuides(d);
    expect(out).toEqual({ announced: [], skipped: 'nothing new' });
    expect(sent).toHaveLength(0);
    expect(saved).toHaveLength(0);
  });

  it('remembers nothing when IndexNow refuses, so the next hour tries again', async () => {
    const { d, saved } = deps([g('a')], { pinged: {} }, 429);
    const out = await announceGuides(d);
    expect(out.announced).toEqual([]);
    expect(out.skipped).toContain('429');
    expect(saved).toHaveLength(0);
  });
});

describe('the request', () => {
  it('names the host, the key and where the key file is, and accepts 200 and 202', async () => {
    const calls: { url: string; body: Record<string, unknown> }[] = [];
    for (const status of [200, 202, 403]) {
      const fetchImpl = (async (url: string, init: RequestInit) => {
        calls.push({ url, body: JSON.parse(String(init.body)) });
        return new Response(null, { status });
      }) as unknown as typeof fetch;
      const r = await submitToIndexNow([`${ORIGIN}/guides/x`], ORIGIN, fetchImpl);
      expect(r.ok).toBe(status !== 403);
    }
    expect(calls[0].url).toBe(INDEXNOW_ENDPOINT);
    expect(calls[0].body).toEqual({ host: 'hybridx.club', key: INDEXNOW_KEY, keyLocation: `${ORIGIN}/${INDEXNOW_KEY}.txt`, urlList: [`${ORIGIN}/guides/x`] });
  });
});
