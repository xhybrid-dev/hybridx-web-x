// POST /api/collect: receives the plan finder tracker's batches.
//
// Validates and scrubs each batch with collect-core (unknown events and
// properties are dropped, free text is scrubbed), then stores one document in
// hx_batches. Always answers 204 with no body: the tracker never reads the
// response and never retries, and scrapers learn nothing.
//
// Never stored: IP address, user agent, cookies, the raw body. The user agent
// is read once to drop obvious bots. The IP address is read once, hashed with
// a per-process salt, and held in memory for ten minutes to cap how fast one
// client can write (App Hosting has no edge firewall for this); it is never
// written anywhere. Request bodies are never logged.

import { createHash, randomBytes } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { adminFirestore } from '@/lib/firebase-admin';
import { validateBatch, DEFAULT_SCHEMA } from '@/lib/plan-finder/collect-core';
import { BATCH_RETENTION_MS, COLLECTIONS } from '@/lib/plan-finder/config';

export const dynamic = 'force-dynamic';

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|facebookexternalhit|preview|monitor/i;
// The site itself, its app subdomains, and local development.
const OWN_ORIGIN = /^https?:\/\/(?:[a-z0-9-]+\.)*(?:hybridx\.club|localhost)(?::\d+)?(?:\/|$)/i;

// A normal page load sends a handful of batches (one every few seconds of
// activity, up to 400 events). This allows twenty busy page loads in ten minutes.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_BATCHES = 60;
const SALT = randomBytes(16);
const windows = new Map<string, { count: number; resetAt: number }>();

function overLimit(ip: string | null): boolean {
  if (!ip) return false;
  const now = Date.now();
  if (windows.size > 5000) {
    for (const [k, w] of windows) if (now >= w.resetAt) windows.delete(k);
  }
  const key = createHash('sha256').update(SALT).update(ip).digest('base64url').slice(0, 22);
  const w = windows.get(key);
  if (!w || now >= w.resetAt) {
    windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  w.count += 1;
  return w.count > MAX_BATCHES;
}

const quiet = () => new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
  if (BOT.test(request.headers.get('user-agent') || '')) return quiet();

  const origin = request.headers.get('origin') || request.headers.get('referer') || '';
  if (origin && !OWN_ORIGIN.test(origin)) return quiet();

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip');
  if (overLimit(ip)) return quiet();

  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > DEFAULT_SCHEMA.limits.maxBodyBytes) return quiet();
  const raw = await request.text();

  const result = validateBatch(raw, { now: Date.now() });
  if (!result.ok || result.events.length === 0) return quiet();

  const first = Math.min(...result.events.map((e) => e.t));
  try {
    await adminFirestore.collection(COLLECTIONS.batches).add({
      sid: result.sid,
      // UTC day of the batch's first event: the daily rollup reads batches by day.
      day: new Date(first).toISOString().slice(0, 10),
      ctx: result.ctx,
      events: result.events,
      // Counts only. A steady stream of drops means the tracker and the schema have drifted.
      dropped: result.dropped,
      skewed: result.skewed,
      receivedAt: Timestamp.fromMillis(result.receivedAt),
      expireAt: Timestamp.fromMillis(result.receivedAt + BATCH_RETENTION_MS),
    });
  } catch (err) {
    // The error class only: never the batch.
    console.error('[collect] could not store a batch:', err instanceof Error ? err.name : 'unknown error');
  }
  return quiet();
}
