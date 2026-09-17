// src/lib/marketing-bridge.ts
//
// Connects this site to the mailing system in the app (app.hybridx.club,
// Firebase project hyroxedgeai).
//
// The two properties are separate apps in separate Firebase projects. This site
// captures the top of the funnel through its lead magnets; the app owns
// campaigns, journeys, consent and the suppression list. Before this bridge
// existed the two never spoke, which meant two problems:
//
//   - leads captured here were invisible to the system built to nurture them;
//   - an unsubscribe or spam complaint recorded there was invisible here, so
//     someone who had opted out could still receive magnet email — the exact
//     pattern that produces complaints and damages a sending domain both
//     properties now share.
//
// Every call is best-effort. Lead capture and magnet delivery are the things
// the visitor actually asked for; a marketing integration being down must never
// break either.

const BRIDGE_TIMEOUT_MS = 4000;

function bridgeConfig(): { url: string; secret: string } | null {
  const url = process.env.MARKETING_APP_URL?.replace(/\/$/, '');
  const secret = process.env.LEAD_BRIDGE_SECRET;
  if (!url || !secret) return null;
  return { url, secret };
}

/** Whether the bridge can be used at all. Surfaced by the admin email diagnostic. */
export function isBridgeConfigured(): boolean {
  return bridgeConfig() !== null;
}

/**
 * Fetch with a timeout, so a slow or unreachable app cannot hold a form
 * submission open. AbortSignal.timeout is available on the Node 18+ runtime
 * this deploys to.
 */
async function bridgeFetch(path: string, init: RequestInit): Promise<Response | null> {
  const config = bridgeConfig();
  if (!config) return null;

  try {
    return await fetch(`${config.url}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${config.secret}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(BRIDGE_TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (error) {
    console.error(
      `[marketing-bridge] ${path} unreachable:`,
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

export interface ForwardLeadInput {
  email: string;
  name?: string;
  /** Magnet identifier, matching the LeadSource values used by lib/leads.ts. */
  source: string;
  /**
   * Whether this person agreed to ongoing marketing, as opposed to merely
   * requesting the asset. Passing `true` without evidence is the failure that
   * turns a mailing list into a liability, so callers state it explicitly
   * rather than relying on a default.
   */
  consent: boolean;
  consentMethod?: string;
  utm?: Record<string, string>;
  tags?: string[];
}

/**
 * Push a captured lead into the mailing system.
 *
 * Deliberately swallows every failure: the lead is already saved to this
 * project's own `leads` collection, so a bridge outage costs a delay in
 * nurturing, not the lead itself. Losing the visitor's submission because a
 * downstream integration is unavailable would be a far worse trade.
 */
export async function forwardLead(input: ForwardLeadInput): Promise<boolean> {
  const response = await bridgeFetch('/api/marketing/leads', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  // Unreachable. Retryable — the app may simply be redeploying.
  if (!response) return false;

  if (!response.ok) {
    console.error(`[marketing-bridge] lead forward rejected: ${response.status}`);

    // A 4xx other than 429 is the payload's fault, and replaying it will fail
    // exactly the same way for ever. Reported as delivered so the outbox stops
    // retrying it; the error is on the document and in the log for whoever
    // looks. Retrying a permanently-malformed lead until the attempt ceiling
    // just delays every lead behind it.
    if (response.status >= 400 && response.status < 500 && response.status !== 429) {
      return true;
    }
    return false;
  }

  console.log(`[marketing-bridge] forwarded ${input.source} lead`);
  return true;
}

/** Fire-and-forget wrapper, making the intent explicit at the call site. */
export function forwardLeadAsync(input: ForwardLeadInput): void {
  void forwardLead(input);
}

export interface SuppressionState {
  suppressed: boolean;
  complained: boolean;
  /** True when the bridge could not be reached, so the answer is unknown. */
  unknown: boolean;
}

const UNKNOWN: SuppressionState = { suppressed: false, complained: false, unknown: true };

/**
 * Ask the app whether an address is unmailable.
 *
 * Returns `unknown` rather than throwing when the bridge is unavailable, so
 * callers can choose their own failure posture. See `sendEmail` for the one
 * this site takes.
 */
export async function getSuppressionState(email: string): Promise<SuppressionState> {
  const response = await bridgeFetch(
    `/api/marketing/suppression?email=${encodeURIComponent(email)}`,
    { method: 'GET' },
  );

  if (!response?.ok) return UNKNOWN;

  try {
    const data = (await response.json()) as { suppressed?: boolean; complained?: boolean };
    return {
      suppressed: data.suppressed === true,
      complained: data.complained === true,
      unknown: false,
    };
  } catch {
    return UNKNOWN;
  }
}

export interface BridgeContract {
  version: string;
  endpoint: string;
  auth: string;
  fields: Record<string, { type: string; required?: boolean; note?: string }>;
  responds: Record<string, string>;
}

/**
 * Read the mailing system's published payload contract.
 *
 * Worth having as more than a health check: it is the answer to "what can a new
 * funnel send", retrieved from the system that will actually parse it rather
 * than inferred from whichever existing caller was copied. The two halves of
 * this bridge previously disagreed about UTM field names for months without
 * anything failing, because each side had only ever read its own definition.
 *
 * Returns null when unreachable or unauthorised — the caller decides whether
 * that is worth reporting.
 */
export async function getBridgeContract(): Promise<BridgeContract | null> {
  const response = await bridgeFetch('/api/marketing/leads', { method: 'GET' });
  if (!response?.ok) return null;

  try {
    return (await response.json()) as BridgeContract;
  } catch {
    return null;
  }
}

export interface UnsubscribeLink {
  url: string;
  oneClick: boolean;
}

/**
 * Ask the mailing system for a one-click unsubscribe URL for an address.
 *
 * Mail this site sends previously offered only `mailto:unsubscribe@…`, which
 * fails twice: Gmail and Yahoo have required a one-click HTTPS endpoint of bulk
 * senders since February 2024, and an opt-out arriving in a human inbox never
 * reaches the shared suppression list. Someone could unsubscribe from a magnet
 * email and keep receiving campaigns, which is how a sending domain earns spam
 * complaints from people who did everything right.
 *
 * The token is minted there rather than here on purpose: the signing key that
 * makes every unsubscribe link unforgeable should live in one project, not two.
 *
 * Returns null when unavailable, so the caller can fall back rather than fail.
 * A magnet that does not arrive is a worse outcome than one whose unsubscribe
 * header is a mailto for an afternoon.
 */
export async function getUnsubscribeLink(email: string): Promise<UnsubscribeLink | null> {
  const response = await bridgeFetch('/api/marketing/unsubscribe-link', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

  if (!response?.ok) {
    if (response) {
      console.error(`[marketing-bridge] unsubscribe link refused: ${response.status}`);
    }
    return null;
  }

  try {
    const data = (await response.json()) as { url?: string; oneClick?: boolean };
    if (!data.url) return null;
    return { url: data.url, oneClick: data.oneClick === true };
  } catch {
    return null;
  }
}

export interface ComplaintList {
  hashes: string[];
  count: number;
  truncated: boolean;
  syncedAt: string;
}

/**
 * Fetch the mailing system's complainant list, for local mirroring.
 *
 * Addresses come back as sha256 hashes — the same derivation the mailing system
 * already uses for its document ids — so a mirror living in this project is not
 * a plaintext list of the people who have reported us.
 *
 * Only complaints. An unsubscribe does not belong here: everything this site
 * sends was requested seconds earlier, and withholding a guide because someone
 * once opted out of a campaign fails the person while solving nothing.
 */
export async function getComplaintHashes(): Promise<ComplaintList | null> {
  const response = await bridgeFetch('/api/marketing/complaints', { method: 'GET' });
  if (!response?.ok) return null;

  try {
    const data = (await response.json()) as Partial<ComplaintList>;
    if (!Array.isArray(data.hashes)) return null;
    return {
      hashes: data.hashes.filter((h): h is string => typeof h === 'string'),
      count: data.count ?? data.hashes.length,
      truncated: data.truncated === true,
      syncedAt: data.syncedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
