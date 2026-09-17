import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { verifyLeadToken } from '@/lib/lead-tokens';
import { markLeadDownloaded } from '@/lib/leads';
import { getMagnet, magnetConfirmPath } from '@/lib/magnets';

/**
 * Token-gated delivery for every gated magnet.
 *
 * One route rather than one per asset: the two that existed differed by a
 * filename, a Content-Disposition and a redirect path, and 33 of the newer
 * one's 48 lines were the older one verbatim. The parts worth getting right —
 * the token check, the no-store headers, sending an expired link somewhere
 * useful — are exactly the parts a copy silently inherits and then diverges on.
 *
 * The files live outside /public deliberately. A static URL would let anyone
 * skip the email, which is the whole funnel. The only route to one is a token
 * signed for one address on one magnet.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const magnet = getMagnet(slug);

  // An unknown slug is a 404, not a redirect: there is no funnel page to send
  // anybody back to, and pretending otherwise would loop them.
  if (!magnet || magnet.asset.kind !== 'gated') {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  const token = request.nextUrl.searchParams.get('token') || undefined;
  const verified = verifyLeadToken(token, magnet.slug);

  if (!verified.valid) {
    // Somewhere useful rather than a bare 403. An expired link is a subscriber
    // coming back to something they already paid an address for, not an
    // attacker — and the confirm page explains what went wrong and offers a
    // fresh one.
    const url = new URL(
      `${magnetConfirmPath(magnet)}?error=${verified.reason}`,
      request.nextUrl.origin,
    );
    return NextResponse.redirect(url, 302);
  }

  const filePath = path.join(process.cwd(), 'private', magnet.asset.file);

  let file: Buffer;
  try {
    file = await readFile(filePath);
  } catch (error) {
    console.error(`[magnet:${magnet.slug}] could not read ${magnet.asset.file}:`, error);
    return NextResponse.json({ error: 'That file is temporarily unavailable.' }, { status: 500 });
  }

  // Recorded here rather than from a click handler on the confirmation page.
  // This is the request that actually delivers the file, so it also catches the
  // reader who returns to the link a fortnight later from their inbox, and it
  // cannot be missed by a browser that blocked the page's JavaScript.
  //
  // Not awaited, and its failure is swallowed: this is analytics, and analytics
  // must never stand between somebody and the file they are owed.
  void markLeadDownloaded(magnet.slug, verified.email).catch((error) => {
    console.error(`[magnet:${magnet.slug}] could not record the download:`, error);
  });

  return new NextResponse(new Uint8Array(file), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${magnet.asset.disposition}; filename="${magnet.asset.downloadFilename}"`,
      'Content-Length': String(file.byteLength),
      // A signed, per-address URL: never let a shared cache hold onto it.
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
