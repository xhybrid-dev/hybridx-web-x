// src/app/api/cron/marketing-maintenance/route.ts
//
// The marketing site's only scheduled job. Two pieces of upkeep on the link to
// the mailing system, both of which exist so that a failure over there does not
// quietly become a loss over here.
//
//   1. **Drain the lead outbox.** Forwarding is fire-and-forget on the request
//      path, so a bridge outage costs a delay rather than a submission — but
//      only because something eventually retries. This is that something.
//
//   2. **Refresh the complainant mirror.** Keeps the check that protects the
//      sending domain answerable locally, so a form submission does not pay for
//      a cross-project round trip.
//
// Both are safe to run repeatedly and safe to miss: the outbox is keyed on
// per-lead state and the mirror is a full replacement. A skipped run delays
// work, it does not corrupt anything.
//
// Suggested schedule — hourly is ample for both:
//
//   gcloud scheduler jobs create http marketing-maintenance \
//     --schedule="0 * * * *" \
//     --uri="https://hybridx.club/api/cron/marketing-maintenance" \
//     --http-method=GET \
//     --headers="Authorization=Bearer ${CRON_SECRET}" \
//     --location=us-central1

import { NextResponse } from 'next/server';
import { drainOutbox } from '@/lib/lead-outbox';
import { refreshComplaintMirror } from '@/lib/suppression-mirror';
import { pruneRateLimits } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  // Fails closed. An unset secret means an unauthenticated endpoint that
  // triggers cross-project writes, so refusing is the only safe reading of a
  // missing configuration.
  if (!secret) {
    console.error('[cron/marketing-maintenance] CRON_SECRET is not set; refusing to run');
    return new NextResponse('Not configured', { status: 503 });
  }

  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Independent, so one failing must not skip the others. The outbox protects
  // leads and the mirror protects the sending domain; neither is worth
  // sacrificing to the other's bad day, and neither is worth sacrificing to a
  // housekeeping sweep.
  const [outbox, mirror, limits] = await Promise.allSettled([
    drainOutbox(),
    refreshComplaintMirror(),
    pruneRateLimits(),
  ]);

  const result = {
    outbox:
      outbox.status === 'fulfilled'
        ? outbox.value
        : { error: String((outbox.reason as Error)?.message ?? outbox.reason) },
    mirror:
      mirror.status === 'fulfilled'
        ? mirror.value
        : { error: String((mirror.reason as Error)?.message ?? mirror.reason) },
    rateLimits:
      limits.status === 'fulfilled'
        ? limits.value
        : { error: String((limits.reason as Error)?.message ?? limits.reason) },
  };

  if (outbox.status === 'rejected' || mirror.status === 'rejected' || limits.status === 'rejected') {
    console.error('[cron/marketing-maintenance] partial failure:', result);
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
