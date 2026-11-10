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
//   3. **Plan finder upkeep.** Rolls up each settled day of tracked visits
//      into one hx_rollups document for the admin, and removes step-5 note
//      text once it is 90 days old (src/lib/plan-finder/store.ts). Both catch
//      up on missed days by themselves. Early each month it also writes the
//      monthly review, once ANTHROPIC_API_KEY is configured
//      (src/lib/plan-finder/monthly-review.ts).
//
//   4. **Publish due guides.** Records scheduled articles whose slot has
//      passed as published (src/lib/guides/store.ts). Visitors see them from
//      the slot itself either way; this keeps Firestore saying so too.
//
//   5. **Draft guides.** One step of the drafting engine
//      (src/lib/guides/engine/run.ts): checks, a review, a revision or a new
//      draft, then any review email that is due. Off unless
//      CONTENT_ENGINE_MODE is "on". It never publishes anything.
//
// All are safe to run repeatedly and safe to miss: the outbox is keyed on
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
import { blankOldNotes, runDailyRollups } from '@/lib/plan-finder/store';
import { runMonthlyReview } from '@/lib/plan-finder/monthly-review';
import { publishDueGuides } from '@/lib/guides/store';
import { runEngineStep } from '@/lib/guides/engine/run';
import { liveDeps } from '@/lib/guides/engine/live';

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
  // Guides go live at their slot whether or not this runs (the public pages
  // decide that when they are read); this records them as published.
  const [outbox, mirror, limits, rollups, notes, review, guides, engine] = await Promise.allSettled([
    drainOutbox(),
    refreshComplaintMirror(),
    pruneRateLimits(),
    runDailyRollups(),
    blankOldNotes(),
    runMonthlyReview(),
    publishDueGuides(),
    runEngineStep(liveDeps),
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
    planFinderRollups:
      rollups.status === 'fulfilled'
        ? rollups.value
        : { error: String((rollups.reason as Error)?.message ?? rollups.reason) },
    planFinderNotes:
      notes.status === 'fulfilled'
        ? notes.value
        : { error: String((notes.reason as Error)?.message ?? notes.reason) },
    planFinderReview:
      review.status === 'fulfilled'
        ? review.value
        : { error: String((review.reason as Error)?.message ?? review.reason) },
    guidesPublished:
      guides.status === 'fulfilled'
        ? guides.value
        : { error: String((guides.reason as Error)?.message ?? guides.reason) },
    guideEngine:
      engine.status === 'fulfilled'
        ? engine.value
        : { error: String((engine.reason as Error)?.message ?? engine.reason) },
  };

  if ([outbox, mirror, limits, rollups, notes, review, guides, engine].some((r) => r.status === 'rejected')) {
    console.error('[cron/marketing-maintenance] partial failure:', result);
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
