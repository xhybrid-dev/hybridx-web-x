/**
 * EXAMPLE, NOT EXECUTED. Written for the Next.js App Router with firebase-admin. It has not been run
 * against Firestore, so treat it as a sketch to adapt to the real repo (import paths, the existing
 * Admin SDK initialiser, the site's origin).
 *
 * Route: POST /api/collect
 * Job:   receive a batch of tracker events, validate and scrub it with collect-core, store one
 *        Firestore document per batch.
 *
 * What is NOT stored, by design: IP address, user agent, cookies, the raw request. The user agent is
 * read once to drop obvious bots, then forgotten.
 */
import { NextResponse } from 'next/server';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { adminApp } from '@/lib/firebase-admin'; // the repo's existing Admin SDK initialiser
import { validateBatch } from '@/lib/hx/collect-core'; // port of server/collect-core.js (or import the JS as it is)
import schema from '@/lib/hx/events.schema.json'; // data/events.schema.json

export const runtime = 'nodejs';

const RETENTION_DAYS = 400; // matches docs/06. Pair with a Firestore TTL policy on `expireAt`.
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|facebookexternalhit|preview|monitor/i;
const OWN_ORIGIN = /^https:\/\/(www\.)?hybridx\.club(\/|$)/;

const quiet = (status: number) => new NextResponse(null, { status });

export async function POST(req: Request) {
  // 1. Cheap filters. Return 204 so scrapers learn nothing and the tracker never retries.
  if (BOT.test(req.headers.get('user-agent') || '')) return quiet(204);
  const origin = req.headers.get('origin') || req.headers.get('referer') || '';
  if (process.env.NODE_ENV === 'production' && origin && !OWN_ORIGIN.test(origin)) return quiet(204);

  // 2. The tracker sends text/plain so the browser skips the CORS preflight. Read it as text.
  const raw = await req.text();
  if (raw.length > schema.limits.maxBodyBytes) return quiet(413);

  // 3. Validate and scrub. Unknown events and props are dropped, free text is scrubbed.
  const r = validateBatch(raw, { schema, now: Date.now() });
  if (!r.ok) return quiet(400);

  // 4. One document per batch (about three per visit) keeps Firestore writes and reads low.
  const first = Math.min(...r.events.map((e: { t: number }) => e.t));
  await getFirestore(adminApp).collection('hx_batches').add({
    sid: r.sid,
    day: new Date(first).toISOString().slice(0, 10), // UTC day of the batch's first event, a query helper
    ctx: r.ctx,
    events: r.events,
    receivedAt: Timestamp.now(),
    expireAt: Timestamp.fromMillis(Date.now() + RETENTION_DAYS * 86_400_000),
  });
  return quiet(204);
}

// Rate limiting: use a Vercel Firewall rule on /api/collect (for example 60 requests a minute per IP)
// rather than code. That keeps IP addresses out of the application entirely.
