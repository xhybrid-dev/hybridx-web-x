// src/lib/magnets.ts
//
// Every lead magnet on the site, declared once.
//
// A magnet is a page that trades a file for an email address, and until now
// each one brought its own copy of the machinery to do it: a server action, an
// email template, a download route, a confirm page and a set of constants. The
// ATHX funnel came to 855 lines of that against 1,276 lines of actual page
// design, and it was not new code — 100 of its action's 155 lines, 91 of its
// email's 127 and 33 of its download route's 48 were identical to the race
// card's. Five files copied and edited per campaign is five chances to copy the
// wrong constant, and a magnet wired to another magnet's slug fails silently:
// leads file under the wrong funnel and the download gate rejects every token.
//
// So the parts that differ are data and the parts that do not are shared. A new
// campaign is an entry here, a PDF, and a page — the page being the only part
// that was ever the work.
//
// What is deliberately NOT here: the page itself. A generic landing page
// rendered from configuration would have made the ATHX pacing calculator
// impossible, and that calculator is the part of that page doing the
// persuading. Plumbing is generic; pages are bespoke.

/**
 * How the asset reaches the person.
 *
 *   - `immediate` — single opt-in. The form states that signing up means
 *     ongoing email, the address is recorded as consenting, and the guide is
 *     sent straight away.
 *   - `confirmed` — double opt-in. The email carries a signed link; clicking it
 *     is what grants consent and unlocks the file. Use this when the list will
 *     be sold to rather than merely nurtured: an address nobody verified is
 *     worth very little at launch.
 */
export type MagnetDelivery = 'immediate' | 'confirmed';

/** A file anyone may fetch, served from /public. Pairs with `immediate`. */
export interface PublicAsset {
  kind: 'public';
  /** Path under /public, leading slash included. */
  url: string;
}

/**
 * A file behind a signed token, living outside /public.
 *
 * The location is the gate: a static URL under /public would let anyone skip
 * the email, which is the entire funnel. Pairs with `confirmed`.
 */
export interface GatedAsset {
  kind: 'gated';
  /** Filename inside private/. */
  file: string;
  /** What the browser saves it as. */
  downloadFilename: string;
  /**
   * `inline` opens the file in the browser tab, which on a phone is where it
   * gets read; `attachment` drops it into Files, where it does not. Prefer
   * inline for anything meant to be read now, attachment for anything meant to
   * be printed.
   */
  disposition: 'inline' | 'attachment';
}

export type MagnetAsset = PublicAsset | GatedAsset;

/** The delivery email's copy and colour, which is all that differs between them. */
export interface MagnetEmailCopy {
  subject: string;
  heading: string;
  /** One paragraph under the heading, before the button. */
  intro: string;
  buttonLabel: string;
  /**
   * One genuinely useful thing, placed after the button.
   *
   * Not a pitch. Somebody who opens a guide they asked for and finds an advert
   * inside does not open the next email, and this is the first message a new
   * subscriber ever receives from us.
   */
  insight: string;
  /** Link label in the footer, pointing back at the funnel page. */
  footerLinkLabel: string;
  /** Completes "You are receiving this because ...". */
  reason: string;
  /** Accent colour: the header rule and the button. */
  accent: string;
  /**
   * Text on the accent. Stated rather than assumed: white on the ATHX orange is
   * 3.56:1, which a bold 16px button label does not clear, and every magnet
   * copied that button from the last one.
   */
  accentText: string;
  /** An extra line in the footer, where a funnel needs one. */
  disclaimer?: string;
}

export interface MagnetDefinition {
  /**
   * The funnel slug. Travels to the mailing system as the lead's `source`,
   * where it resolves to an intake route and decides which journey enrols the
   * subscriber. Must satisfy the shared slug rule — see isValidLeadSource.
   */
  slug: string;
  /** Internal label, for logs and the admin views. */
  name: string;
  /**
   * Tag carried into the mailing system alongside the automatic `route:` one.
   *
   * Hyphens, never underscores: the receiving end accepts `[a-z0-9:-]` and
   * silently drops anything else, so an underscored slug reused as a tag
   * arrives as no tag at all.
   */
  tag: string;
  /** The funnel page, for the email footer and the "ask again" links. */
  pagePath: string;
  /** Where a confirmation link lands. Required for `confirmed` delivery. */
  confirmPath?: string;
  /** Rate-limit bucket, so one funnel's traffic cannot exhaust another's. */
  rateLimitBucket: string;
  delivery: MagnetDelivery;
  asset: MagnetAsset;
  email: MagnetEmailCopy;
}

// ---------------------------------------------------------------------------
// The registry
// ---------------------------------------------------------------------------

export const MAGNETS: readonly MagnetDefinition[] = [
  {
    slug: 'athx_2027_guide',
    name: 'What is ATHX? one-page guide',
    tag: 'athx-2027-guide',
    pagePath: '/athx-2027',
    confirmPath: '/athx-2027/confirm',
    rateLimitBucket: 'athx-guide',
    delivery: 'confirmed',
    asset: {
      kind: 'gated',
      file: 'what-is-athx.pdf',
      downloadFilename: 'What-Is-ATHX.pdf',
      disposition: 'inline',
    },
    email: {
      subject: 'One click and your ATHX guide is here',
      heading: 'One click and the guide is yours',
      intro:
        'You asked for the one-page guide to ATHX. Confirm your address below and it downloads straight away. We ask because it keeps this list to people who actually want to hear from us.',
      buttonLabel: 'Confirm and download the guide',
      insight:
        'One thing worth knowing before you even open it: in the Endurance Zone, only the ski distance scores. The run is a buy-in. Which means every second spent running is a second not spent scoring, and the usual advice to start easy costs you more than it saves.',
      footerLinkLabel: 'Work out your own Endurance Zone number',
      reason: 'you asked for the ATHX guide at',
      accent: '#ea580c',
      // Black, not white. See MagnetEmailCopy.accentText.
      accentText: '#0a0a0a',
      disclaimer:
        'Unofficial and independently produced. Not affiliated with or endorsed by ATHX Games.',
    },
  },
  {
    slug: 'hyrox_rules_card',
    name: 'HYROX 2026/27 race day rules card',
    tag: 'hyrox-rules-card-2026',
    pagePath: '/hyrox-rule-changes-2026',
    confirmPath: '/hyrox-rule-changes-2026/confirm',
    rateLimitBucket: 'race-card',
    delivery: 'confirmed',
    asset: {
      kind: 'gated',
      file: 'hyrox-race-day-card-fold.pdf',
      downloadFilename: 'HybridX-HYROX-2026-27-Race-Day-Rules-Card.pdf',
      // Printed and folded, not read on a phone.
      disposition: 'attachment',
    },
    email: {
      subject: 'Confirm your email to get the HYROX race day card',
      heading: 'Confirm your email to get the card',
      intro:
        'One click and the HYROX 2026/27 race day rules card is yours. We ask because it keeps our list to people who actually want to hear from us.',
      buttonLabel: 'Confirm and download the card',
      insight:
        'One thing you can act on before you even open it: for 2026/27, leaving any station unfinished is a disqualification rather than a time penalty. Do not leave a station until a judge confirms you are done.',
      footerLinkLabel: 'The full 2026/27 rule changes',
      reason: 'you requested the HYROX race day rules card at',
      accent: '#fadb5c',
      accentText: '#111111',
    },
  },
  {
    slug: 'build_a_bigger_engine',
    name: 'Build a Bigger Engine VO2max guide',
    tag: 'vo2max-guide',
    pagePath: '/build-a-bigger-engine',
    rateLimitBucket: 'engine-guide',
    // Single opt-in: the form states that signing up means ongoing email, and
    // the guide arrives immediately rather than behind a confirmation.
    delivery: 'immediate',
    asset: {
      kind: 'public',
      url: '/build-a-bigger-engine/HybridX-Build-A-Bigger-Engine-VO2max-Guide.pdf',
    },
    email: {
      subject: 'Your free guide is here: Build a Bigger Engine',
      heading: 'Your free guide is here',
      intro:
        'Welcome in. This is the science of raising your VO2max for running and hybrid performance, written in plain language you can actually use this week. No jargon walls, no fluff.',
      buttonLabel: 'Download your guide',
      insight:
        'Short on time? Start with Section 4. It is the single highest leverage idea in the whole guide, and you can put it into your next session.',
      footerLinkLabel: 'hybridx.club',
      reason: 'you requested the free VO2max guide at',
      accent: '#C1121F',
      accentText: '#FBF5EF',
    },
  },
] as const;

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

const BY_SLUG = new Map(MAGNETS.map((m) => [m.slug, m]));

export function getMagnet(slug: string): MagnetDefinition | undefined {
  return BY_SLUG.get(slug);
}

/**
 * Look a magnet up, or throw.
 *
 * Used where there is nothing sensible to do without one — a download route
 * cannot serve an unknown file, and a capture form cannot deliver an unknown
 * guide. Unlike a funnel slug, which is captured even when unrecognised because
 * the lead is worth more than the classification, an unknown magnet means the
 * page is wired to something that does not exist. That is a deploy-time mistake
 * and should be loud.
 */
export function requireMagnet(slug: string): MagnetDefinition {
  const magnet = BY_SLUG.get(slug);
  if (!magnet) {
    throw new Error(
      `Unknown magnet "${slug}". Add it to src/lib/magnets.ts before wiring a page to it.`,
    );
  }
  return magnet;
}

/** Every gated magnet's download path, in one place so the route and the pages agree. */
export function magnetDownloadPath(slug: string, token: string): string {
  return `/api/magnet/${encodeURIComponent(slug)}/download?token=${encodeURIComponent(token)}`;
}

/**
 * Where the asset actually lives for this person.
 *
 * A public asset is the same URL for everyone; a gated one is a signed,
 * per-address link. Callers ask this rather than branching on `asset.kind`
 * themselves, so a magnet switched from public to gated needs no other change.
 */
export function magnetAssetUrl(magnet: MagnetDefinition, token: string | null): string {
  if (magnet.asset.kind === 'public') return magnet.asset.url;
  if (!token) {
    throw new Error(`Magnet "${magnet.slug}" is gated and needs a token to build a link.`);
  }
  return magnetDownloadPath(magnet.slug, token);
}

/** The confirm path, asserted rather than assumed — a confirmed magnet must have one. */
export function magnetConfirmPath(magnet: MagnetDefinition): string {
  if (!magnet.confirmPath) {
    throw new Error(
      `Magnet "${magnet.slug}" uses confirmed opt-in but declares no confirmPath.`,
    );
  }
  return magnet.confirmPath;
}
