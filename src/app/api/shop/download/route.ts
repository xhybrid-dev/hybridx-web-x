import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { requestDownload } from '@/lib/shop/downloads';
import { clientIp } from '@/lib/shop/request';

/**
 * POST { token, product } → 200 { url }, a signed URL valid for five minutes.
 *
 * Per-order limits are counted from shop_downloads (see downloads.ts). The
 * per-IP limit here is the outer layer, against somebody guessing tokens.
 */

const HOUR_MS = 60 * 60 * 1000;
const IP_LIMIT = 60;

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400, headers: NO_STORE });
  }

  const ip = clientIp(request.headers);
  if (ip !== 'unknown') {
    const { allowed } = await checkRateLimit(`shop-download:${ip}`, HOUR_MS, IP_LIMIT);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many downloads from this connection. Please try again later.' },
        { status: 429, headers: NO_STORE },
      );
    }
  }

  try {
    const result = await requestDownload({ token: body?.token, product: body?.product, ip });
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: result.status, headers: NO_STORE });
    }
    return NextResponse.json({ url: result.url }, { headers: NO_STORE });
  } catch (err) {
    console.error('[shop] download failed:', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { error: 'The download could not be prepared. Please try again in a minute.' },
      { status: 500, headers: NO_STORE },
    );
  }
}
