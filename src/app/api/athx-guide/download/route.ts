import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { verifyLeadToken } from '@/lib/lead-tokens';
import { markLeadDownloaded } from '@/lib/leads';
import { ATHX_PDF_FILE, ATHX_PDF_FILENAME, ATHX_SOURCE } from '@/lib/athx-campaign';

/**
 * Token-gated delivery of the one-page ATHX guide.
 *
 * The PDF lives outside /public deliberately: a static URL would let anyone
 * skip the email entirely, and the email is the whole funnel. The only route to
 * this file is a token signed for one address on this one magnet.
 *
 * The link will get shared eventually. That is fine and not worth defending
 * against — it costs a download, and the person who shared it is exactly the
 * kind of subscriber the list wants.
 */

const CONFIRM_PATH = '/athx-2027/confirm';
const PDF_PATH = path.join(process.cwd(), 'private', ATHX_PDF_FILE);

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || undefined;
  const verified = verifyLeadToken(token, ATHX_SOURCE);

  if (!verified.valid) {
    // Somewhere useful rather than a bare 403. An expired link is a subscriber
    // coming back to a guide they already paid an address for, not an attacker.
    const url = new URL(`${CONFIRM_PATH}?error=${verified.reason}`, request.nextUrl.origin);
    return NextResponse.redirect(url, 302);
  }

  let file: Buffer;
  try {
    file = await readFile(PDF_PATH);
  } catch (error) {
    console.error('[athx-guide] Could not read the guide PDF:', error);
    return NextResponse.json({ error: 'The guide is temporarily unavailable.' }, { status: 500 });
  }

  // Recorded here rather than from a click handler on the confirmation page.
  // This is the request that actually delivers the file, so it also catches the
  // reader who comes back to the link a fortnight later from their inbox — and
  // it cannot be missed by a browser that blocked the page's JavaScript.
  //
  // Not awaited, and its failure is swallowed: this is analytics, and analytics
  // must never stand between somebody and the file they are owed.
  void markLeadDownloaded(ATHX_SOURCE, verified.email).catch((error) => {
    console.error('[athx-guide] Could not record the download:', error);
  });

  return new NextResponse(new Uint8Array(file), {
    headers: {
      'Content-Type': 'application/pdf',
      // Inline, not attachment. On a phone this opens in the browser tab, where
      // it gets read; as an attachment it lands in Files, where it does not.
      'Content-Disposition': `inline; filename="${ATHX_PDF_FILENAME}"`,
      'Content-Length': String(file.byteLength),
      // A signed, per-address URL: never let a shared cache hold onto it.
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
