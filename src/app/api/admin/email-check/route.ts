import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-auth';
import {
  getEmailProvider,
  sendEmail,
  describeResendKey,
  EMAIL_FROM,
  EMAIL_REPLY_TO,
} from '@/lib/email/service';

/**
 * Admin-only email diagnostic.
 *
 * "The email did not send" is not something you can act on. This reports
 * which transport is actually configured and, on POST, performs a real send
 * and returns the provider's own error verbatim.
 *
 * Only ever reports whether a credential is present, never its value.
 */

function configSnapshot() {
  return {
    provider: getEmailProvider(),
    from: EMAIL_FROM,
    replyTo: EMAIL_REPLY_TO,
    present: {
      RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
      SMTP_HOST: Boolean(process.env.SMTP_HOST),
      SMTP_PORT: Boolean(process.env.SMTP_PORT),
      SMTP_USER: Boolean(process.env.SMTP_USER),
      SMTP_PASSWORD: Boolean(process.env.SMTP_PASSWORD),
      LEAD_TOKEN_SECRET: Boolean(process.env.LEAD_TOKEN_SECRET),
    },
    resendKey: describeResendKey(),
    smtpHost: process.env.SMTP_HOST || null,
    smtpPort: process.env.SMTP_PORT || null,
  };
}

// Never let this be cached. `dynamic = 'force-dynamic'` (below) only stops
// Next.js from caching it at build/ISR time — it says nothing to a browser or
// an intermediate CDN, either of which will happily cache a plain GET. That
// gap is exactly what makes a fixed secret look like it never took effect:
// the diagnostic keeps serving the response it cached before the fix.
const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
};

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403, headers: NO_STORE_HEADERS });
  }

  const snapshot = configSnapshot();
  const notes: string[] = [];

  if (snapshot.provider === 'none') {
    notes.push(
      'No transport configured. In production every send will now throw rather than silently discard the message.'
    );
  }
  if (snapshot.provider === 'smtp') {
    notes.push(
      'Falling back to SMTP because RESEND_API_KEY is not set. Firebase App Hosting runs on Cloud Run, ' +
        'which restricts outbound SMTP — sends to smtp.gmail.com commonly time out. Prefer Resend.'
    );
  }
  if (!snapshot.present.LEAD_TOKEN_SECRET) {
    notes.push(
      'LEAD_TOKEN_SECRET is not set. Race card confirmation links will stop working after each restart.'
    );
  }
  if (snapshot.resendKey?.present && !snapshot.resendKey.looksLikeResendKey) {
    notes.push(
      'RESEND_API_KEY does not start with "re_". The stored value is probably not a Resend API key.'
    );
  }
  if (snapshot.resendKey?.hadSurroundingWhitespace) {
    notes.push(
      'RESEND_API_KEY had surrounding whitespace (usually a trailing newline from setting the secret via a file or pipe). It is trimmed before use, but worth re-saving cleanly.'
    );
  }

  return NextResponse.json({ ...snapshot, notes }, { headers: NO_STORE_HEADERS });
}

/**
 * Sends a real test message. Defaults to the signed-in admin's own address.
 *
 * An override is supported via ?to= because of a specific trap: while a
 * sending domain is unverified, Resend still accepts mail addressed to the
 * account owner and rejects everything else. Testing only against the admin's
 * own address can therefore pass while every real subscriber send fails.
 */
export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403, headers: NO_STORE_HEADERS });
  }

  const snapshot = configSnapshot();
  const requestedTo = request.nextUrl.searchParams.get('to')?.trim();
  const to = requestedTo || session.email;
  const stamp = new Date().toISOString();

  if (requestedTo && requestedTo !== session.email) {
    console.warn(`[email-check] Admin ${session.email} sent a test email to ${requestedTo}`);
  }

  try {
    await sendEmail({
      to,
      subject: `HybridX email test — ${stamp}`,
      html: `<p>Email transport test.</p><p>Provider: <strong>${snapshot.provider}</strong><br/>From: ${snapshot.from}<br/>Sent: ${stamp}</p>`,
      text: `Email transport test.\n\nProvider: ${snapshot.provider}\nFrom: ${snapshot.from}\nSent: ${stamp}`,
      // A diagnostic to the admin's own inbox is genuinely transactional, and
      // it must not depend on the bridge: the whole point is to isolate whether
      // the *transport* works, so a marketing-system outage should not change
      // what this test does or add a round trip to it.
      transactional: true,
      // And bypass the shared suppression list. Without this the diagnostic is
      // not isolated at all: a complained-on admin address makes sendEmail
      // return silently, the route sees no error, and the one tool built to
      // prove the transport works reports green for a message that never left.
      ignoreSuppression: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[email-check] Test send failed:', message);
    return NextResponse.json(
      { ok: false, to, ...snapshot, error: message },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      to,
      ...snapshot,
      note: 'Accepted by the provider. If it does not arrive, check spam and the provider dashboard for a bounce.',
    },
    { headers: NO_STORE_HEADERS }
  );
}

// Never cache a diagnostic.
export const dynamic = 'force-dynamic';
