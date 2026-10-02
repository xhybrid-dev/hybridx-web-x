// src/lib/shop/config.ts
//
// Everything the shop sells, declared once.
//
// Client-safe: no secrets and no environment reads here, so the landing page,
// the buy buttons and the server routes all read the same names and prices.
// Stripe Price IDs and the other per-deployment values are resolved on the
// server in ./env.ts, keyed by the names declared below.
//
// A second event is a new entry in SHOP_EVENTS and its own landing page. Keys
// are prefixed with the event because they are also the Storage path
// (shop/{fileKey}/v{n}.pdf) and the shop_products document id, and a bare
// "guide" would collide with the next event's guide.
//
// Items marked TBC are decisions for Jon (docs/shop-setup.md, "Decisions").
// Each is a value here, so settling one is an edit to this file and nothing
// else.

/** A deliverable file. One per PDF in private Storage. */
export interface ShopFile {
  key: string;
  name: string;
  pages: number;
  /** What the browser saves the download as. */
  downloadFilename: string;
}

/** Something a visitor can buy. Grants one or more files. */
export interface ShopOffer {
  key: string;
  name: string;
  /** Used on the buy button: "Buy the {label}, £8". */
  label: string;
  /**
   * The price shown on the page, in pence. TBC.
   *
   * The checkout route compares this against the Stripe Price before creating
   * a session and refuses on a mismatch, so the page can never quote one price
   * while Stripe charges another.
   */
  pricePence: number;
  /** The environment variable holding this offer's Stripe Price ID. */
  priceEnv: string;
  /** File keys this offer grants. A bundle lists more than one. */
  files: string[];
}

export interface ShopPreview {
  /** Path under /public. */
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
}

export interface ShopEvent {
  slug: string;
  name: string;
  /** The landing page. The thanks page is `${path}/thanks`. */
  path: string;
  /** Default close time, overridable with SHOP_SALES_CLOSE_AT. ISO 8601. */
  salesCloseAt: string;
  emailSubject: string;
  files: ShopFile[];
  offers: ShopOffer[];
  previews: Record<string, ShopPreview[]>;
  policies: {
    /** TBC: Jon to confirm he will update the files for free. */
    updates: string;
    /** TBC: Jon's refund policy, one or two sentences. */
    refunds: string;
  };
}

/**
 * The immediate-supply consent (Consumer Contracts Regulations 2013, reg. 37).
 *
 * Without express consent and an acknowledgement that the right to cancel is
 * lost, a UK buyer of a download can cancel within 14 days even after they
 * have the file. TBC: the wording is Jon's to confirm. Bump `version` whenever
 * `text` changes; every order records the version and text it was sold under.
 */
export const SHOP_CONSENT = {
  version: '2026-10-02',
  text: 'I want to download this PDF immediately and understand that I lose my right to cancel once the download has started.',
} as const;

/** Shown on the page and in the terms. TBC. */
export const SHOP_SUPPORT_EMAIL = 'training@hybridx.club';

const GLASGOW_PREVIEWS = '/shop/hyrox-glasgow-2027';

export const SHOP_EVENTS: readonly ShopEvent[] = [
  {
    slug: 'hyrox-glasgow-2027',
    name: 'HYROX Glasgow 2027',
    path: '/hyrox-glasgow-2027',
    salesCloseAt: '2027-03-14T23:59:00Z',
    emailSubject: 'Your HYROX Glasgow 2027 downloads',
    files: [
      {
        key: 'glasgow-2027-guide',
        name: 'HYROX Glasgow 2027 Preparation Guide',
        pages: 16,
        downloadFilename: 'HybridX-HYROX-Glasgow-2027-Guide.pdf',
      },
      {
        key: 'glasgow-2027-pack',
        name: 'HYROX Glasgow 2027 Pacing Pack',
        pages: 10,
        downloadFilename: 'HybridX-HYROX-Glasgow-2027-Pacing-Pack.pdf',
      },
    ],
    offers: [
      {
        key: 'glasgow-2027-guide',
        name: 'HYROX Glasgow 2027 Preparation Guide',
        label: 'Preparation Guide',
        pricePence: 800,
        priceEnv: 'STRIPE_PRICE_GUIDE',
        files: ['glasgow-2027-guide'],
      },
      {
        key: 'glasgow-2027-pack',
        name: 'HYROX Glasgow 2027 Pacing Pack',
        label: 'Pacing Pack',
        pricePence: 500,
        priceEnv: 'STRIPE_PRICE_PACK',
        files: ['glasgow-2027-pack'],
      },
      {
        key: 'glasgow-2027-bundle',
        name: 'HYROX Glasgow 2027 Preparation Guide and Pacing Pack',
        label: 'Guide and Pacing Pack',
        pricePence: 1200,
        priceEnv: 'STRIPE_PRICE_BUNDLE',
        files: ['glasgow-2027-guide', 'glasgow-2027-pack'],
      },
    ],
    previews: {
      'glasgow-2027-guide': [
        {
          src: `${GLASGOW_PREVIEWS}/guide-1.webp`,
          width: 900,
          height: 1273,
          caption: 'Cover',
          alt: 'Cover of the Preparation Guide: GLASGOW in large yellow letters on black, with the dates 10 to 14 March 2027, the SEC, a 22-week plan from 12 October 2026, and Open and Doubles with Pro notes.',
        },
        {
          src: `${GLASGOW_PREVIEWS}/guide-5.webp`,
          width: 900,
          height: 1273,
          caption: 'Page 5: your timeline',
          alt: 'Guide page 5, the timeline: 22 weeks from 12 October 2026 to race week, coloured by phase (base, build, race specific, peak and taper), with benchmark tests and simulations marked, a phase table, key ticket dates and advice for starting late.',
        },
        {
          src: `${GLASGOW_PREVIEWS}/guide-7.webp`,
          width: 900,
          height: 1273,
          caption: 'Page 7: week by week',
          alt: 'Guide page 7, the week-by-week plan: a table listing the quality run, hybrid session and long session for each week of phases 1 and 2 and the start of phase 3.',
        },
      ],
      'glasgow-2027-pack': [
        {
          src: `${GLASGOW_PREVIEWS}/pack-1.webp`,
          width: 900,
          height: 1273,
          caption: 'Cover',
          alt: 'Cover of the Pacing Pack: PACE IT in large yellow letters on black, with split tables for 7 divisions and 40 finish times, a time prediction from 9 benchmark tests, and race cards.',
        },
        {
          src: `${GLASGOW_PREVIEWS}/pack-3.webp`,
          width: 900,
          height: 1273,
          caption: 'Page 3: Open split targets',
          alt: 'Pacing Pack page 3, Open split targets: tables for Men from 1:10 to 2:00 and Women from 1:20 to 2:10, giving the time for every run and station, the clock at halfway and the finish.',
        },
        {
          src: `${GLASGOW_PREVIEWS}/pack-8.webp`,
          width: 900,
          height: 1273,
          caption: 'Page 8: race cards',
          alt: 'Pacing Pack page 8, race cards: four cut-out cards listing every segment with target and clock columns, one filled in as an example for Men at 1:30.',
        },
      ],
    },
    policies: {
      updates:
        'If HYROX publish the Glasgow course layout or change the rules, the files are updated and the new versions appear on your download page at no charge.',
      refunds:
        'Because the files download straight away, purchases cannot be cancelled once a download has started. If a file is faulty or not as described, reply to your order email and it will be corrected or refunded.',
    },
  },
];

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export function getShopEvent(slug: string): ShopEvent | undefined {
  return SHOP_EVENTS.find((e) => e.slug === slug);
}

/** Every file across every event, by key. */
export function getShopFile(key: string): (ShopFile & { event: ShopEvent }) | undefined {
  for (const event of SHOP_EVENTS) {
    const file = event.files.find((f) => f.key === key);
    if (file) return { ...file, event };
  }
  return undefined;
}

export function getShopOffer(key: string): (ShopOffer & { event: ShopEvent }) | undefined {
  for (const event of SHOP_EVENTS) {
    const offer = event.offers.find((o) => o.key === key);
    if (offer) return { ...offer, event };
  }
  return undefined;
}

/** "£8" for whole pounds, "£8.50" otherwise. */
export function formatPence(pence: number): string {
  const pounds = pence / 100;
  return Number.isInteger(pounds) ? `£${pounds}` : `£${pounds.toFixed(2)}`;
}

/** Storage path for one version of a file. */
export function shopStoragePath(fileKey: string, version: number): string {
  return `shop/${fileKey}/v${version}.pdf`;
}
