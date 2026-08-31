import { NextRequest, NextResponse } from 'next/server';
import { magnetDownloadPath } from '@/lib/magnets';

/**
 * The race card's original download URL, kept alive.
 *
 * Delivery moved to /api/magnet/[slug]/download when the magnets were pulled
 * onto one registry. This route stays because the old URL is out in the world:
 * it is a signed, per-address link that people bookmark, forward and paste into
 * team chats, and the tokens behind it last thirty days. Removing it would turn
 * every one of those into a 404 for a file the holder already paid an address
 * for.
 *
 * A redirect rather than a second copy of the handler — one implementation of
 * the token check, the headers and the download accounting, whichever door
 * somebody arrives at.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? '';
  return NextResponse.redirect(
    new URL(magnetDownloadPath('hyrox_rules_card', token), request.nextUrl.origin),
    // 307: the method and body are preserved, and it is not cached the way a
    // 301 would be. The destination is a signed URL; nothing here should be
    // remembered by an intermediary.
    307,
  );
}
