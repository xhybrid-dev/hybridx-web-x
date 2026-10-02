import { after, NextRequest, NextResponse } from 'next/server';
import { clientIp } from '@/lib/shop/request';
import { normaliseEmail, RESEND_RESPONSE, resendRateLimited, sendLinksFor } from '@/lib/shop/resend';

/**
 * POST { email } → always 200 with the same message.
 *
 * Whether the address has an order, whether it was rate limited, and whether
 * the send worked are all invisible from here. The lookup and the send run
 * after the response, so they do not show in its timing either.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    // Treated as an empty submission below.
  }

  const ok = NextResponse.json({ message: RESEND_RESPONSE }, { headers: { 'Cache-Control': 'no-store' } });

  const email = normaliseEmail(body?.email);
  if (!email) {
    return NextResponse.json(
      { error: 'Please enter a valid email address.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  // Honeypot.
  if (typeof body.website === 'string' && body.website.length > 0) return ok;

  const ip = clientIp(request.headers);
  after(async () => {
    if (await resendRateLimited(email, ip)) return;
    await sendLinksFor(email);
  });

  return ok;
}
