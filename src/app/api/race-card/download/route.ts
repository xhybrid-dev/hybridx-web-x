import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { verifyLeadToken } from '@/lib/lead-tokens';

/**
 * Token-gated delivery of the race day rules card.
 *
 * The PDF deliberately lives outside /public — a static URL would let anyone
 * skip the email confirmation, which is the whole point of the gate. The only
 * way to this file is a signed token issued to a confirmed address.
 */

const SOURCE = 'hyrox_rules_card';
const PDF_PATH = path.join(process.cwd(), 'private', 'hyrox-race-day-card-fold.pdf');
const CONFIRM_PATH = '/hyrox-rule-changes-2026/confirm';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || undefined;
  const verified = verifyLeadToken(token, SOURCE);

  if (!verified.valid) {
    // Send people somewhere useful rather than showing a bare 403 — an expired
    // link is a returning subscriber, not an attacker.
    const url = new URL(`${CONFIRM_PATH}?error=${verified.reason}`, request.nextUrl.origin);
    return NextResponse.redirect(url, 302);
  }

  let file: Buffer;
  try {
    file = await readFile(PDF_PATH);
  } catch (error) {
    console.error('[race-card] Could not read the card PDF:', error);
    return NextResponse.json({ error: 'The card is temporarily unavailable.' }, { status: 500 });
  }

  return new NextResponse(new Uint8Array(file), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition':
        'attachment; filename="HybridX-HYROX-2026-27-Race-Day-Rules-Card.pdf"',
      'Content-Length': String(file.byteLength),
      // Signed, per-address URL: never let a shared cache hold onto it.
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
