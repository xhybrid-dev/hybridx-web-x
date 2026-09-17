import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-auth';
import { getBridgeContract, getSuppressionState, isBridgeConfigured } from '@/lib/marketing-bridge';
import { adminFirestore } from '@/lib/firebase-admin';
import { MAX_FORWARD_ATTEMPTS } from '@/lib/lead-outbox';
import { checkComplaintMirror } from '@/lib/suppression-mirror';

/**
 * Admin-only diagnostic for the link between this site and the mailing system.
 *
 * "Is the funnel working?" is not answerable by reading code, because the two
 * halves live in different Firebase projects and the failures that matter are
 * silent by design: lead forwarding is fire-and-forget so an outage cannot cost
 * a submission, which also means an outage looks exactly like success from
 * here. This performs the round trips and reports what actually happened.
 *
 * Everything it does is read-only. It never writes a lead, so it can be run
 * against production as often as you like without polluting the list.
 */

export const dynamic = 'force-dynamic';

const NO_STORE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
};

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
  }

  const checks: Check[] = [];

  // 1 — Is the bridge even configured on this side?
  const configured = isBridgeConfigured();
  checks.push({
    name: 'Bridge configured',
    ok: configured,
    detail: configured
      ? `MARKETING_APP_URL and LEAD_BRIDGE_SECRET are both set (${process.env.MARKETING_APP_URL}).`
      : 'MARKETING_APP_URL or LEAD_BRIDGE_SECRET is missing. Leads are captured locally but never reach the mailing system.',
  });

  // 2 — Can we reach the app, and does it accept our credential? The contract
  //     endpoint is the cheapest authenticated call there is, and its answer is
  //     useful in its own right.
  const contract = configured ? await getBridgeContract() : null;
  checks.push({
    name: 'Authenticated round trip',
    ok: !!contract,
    detail: contract
      ? `Reached the mailing system and authenticated. Contract version ${contract.version}.`
      : 'Could not reach the mailing system, or the shared secret was rejected. Check that LEAD_BRIDGE_SECRET is identical in both Firebase projects.',
  });

  // 3 — Does the suppression lookup work? This is the check that protects the
  //     sending domain: without it we would mail people who have complained.
  const suppression = configured
    ? await getSuppressionState('bridge-diagnostic@hybridx.club')
    : null;
  checks.push({
    name: 'Suppression lookup',
    ok: !!suppression && !suppression.unknown,
    detail:
      suppression && !suppression.unknown
        ? 'The shared suppression list answered. Complainants will be filtered before any send.'
        : 'The suppression lookup did not answer. Sends fail open, so mail still goes out — including, potentially, to someone who reported us as spam.',
  });

  // 4 — Do the fields this site sends still exist in the contract? This is the
  //     drift check. The site once sent `utm.source` while the app read
  //     `utm.utm_source`, and every lead's attribution was discarded for months
  //     with nothing failing anywhere.
  if (contract) {
    // Every field this site actually puts on the wire — see lib/leads.ts. The
    // first version of this list omitted `name` and `consentMethod`, which would
    // have let the very failure this check exists for repeat on those two.
    const required = ['email', 'name', 'source', 'consent', 'consentMethod', 'utm', 'tags'];

    // The remote body is unvalidated JSON, so `fields` may be anything. Using
    // `in` against a primitive throws, and a diagnostic that 500s reports
    // nothing at all — the worst possible behaviour for a drift check.
    const fields = contract.fields;
    const usable = typeof fields === 'object' && fields !== null;
    const missing = usable ? required.filter((f) => !(f in fields)) : required;
    checks.push({
      name: 'Payload contract',
      ok: missing.length === 0,
      detail: !usable
        ? 'The mailing system returned a contract with no readable field list, so drift cannot be checked.'
        : missing.length
          ? `The mailing system no longer documents: ${missing.join(', ')}. This site may be sending fields that are now ignored.`
          : `All ${required.length} fields this site sends are still in the contract.`,
    });
  }

  // 5 — Is anything stuck in the outbox? A backlog here is the visible form of
  //     a bridge problem: leads captured but not yet nurtured.
  try {
    const stuck = await adminFirestore
      .collection('leads')
      .where('forwarded', '==', false)
      .count()
      .get();
    const pending = stuck.data().count;
    checks.push({
      name: 'Lead outbox',
      // A handful in flight is normal — a lead is un-forwarded for the moment
      // between capture and delivery. A pile is not.
      ok: pending < 25,
      detail:
        pending === 0
          ? 'Every captured lead has reached the mailing system.'
          : `${pending} lead${pending === 1 ? '' : 's'} not yet forwarded. The hourly drain ` +
            `retries with backoff and gives up after ${MAX_FORWARD_ATTEMPTS} attempts; a ` +
            'persistent backlog means the bridge has been failing.',
    });
  } catch (err) {
    checks.push({
      name: 'Lead outbox',
      ok: false,
      detail: `Could not read the outbox: ${err instanceof Error ? err.message : String(err)}. ` +
        'The composite index on (forwarded, forwardNextAttemptAt) may not be deployed.',
    });
  }

  // 6 — Is the complainant mirror answering locally? When it is not, every send
  //     falls back to a cross-project lookup on the visitor's critical path.
  const mirror = await checkComplaintMirror('bridge-diagnostic@hybridx.club').catch(() => null);
  checks.push({
    name: 'Complainant mirror',
    ok: mirror?.source === 'mirror',
    detail:
      mirror?.source === 'mirror'
        ? 'Fresh. Complainant checks are answered locally, off the send path.'
        : 'Stale, absent or truncated, so every send falls back to a live lookup. Check that ' +
          'the marketing-maintenance cron is scheduled and reaching the mailing system.',
  });

  const ok = checks.every((c) => c.ok);

  return NextResponse.json(
    {
      ok,
      summary: ok
        ? 'Every route between this site and the mailing system is working.'
        : 'One or more checks failed — see below.',
      checks,
      contract: contract ?? undefined,
      checkedAt: new Date().toISOString(),
    },
    { headers: NO_STORE },
  );
}
