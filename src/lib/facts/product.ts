// src/lib/facts/product.ts
//
// What HybridX sells and may say about itself: the one place a price, a trial
// length or a headline number comes from. docs/content-engine-plan.md, step 1.
//
// The content engine may state these and nothing else about the product, and
// never anything under NOT_CLAIMED. Pages written by hand are held to the same
// figures by src/lib/__tests__/facts.test.ts, which scans the site's copy for
// a trial length, a monthly price or an athlete count that disagrees with this
// file. That is how "first month free" survived in llms.txt for months after
// the trial became 14 days: nothing compared the two.

export const APP = {
  name: 'HybridX app',
  /** Where the product is. */
  url: 'https://app.hybridx.club',
  /** Where it is described and priced. */
  page: '/app',
  pricePence: 500,
  billingPeriod: 'month',
  /**
   * Reduced from a free first month to 14 days to improve retention
   * (owner, 10 November 2026).
   */
  trialDays: 14,
  /**
   * How copy describes the price. "Very affordable", never "the most
   * affordable" or "the cheapest" (owner, 10 November 2026): a comparison
   * needs evidence on file, and the price makes the point on its own.
   */
  affordability: 'very affordable',
  includes: [
    'daily workouts',
    'a programme library',
    'session logging and progress tracking',
    'race-date alignment: set your race date and the plan lines up to it',
    'Edge Coach, an AI coach for technique, pacing and plan questions',
  ],
  /**
   * Where it can be used today. The iOS and Android apps are built
   * (xhybrid-dev/hybridx-app) but not yet published. They never sell a
   * membership: purchase is on the website only. Flip these when they are in
   * the stores; store badges and links read them.
   */
  availability: { web: true, ios: false, android: false },
} as const;

/** "£5/month", "£5 a month": the price as copy writes it. */
export function appPriceLabel(style: 'slash' | 'words' = 'slash'): string {
  const pounds = APP.pricePence % 100 === 0 ? String(APP.pricePence / 100) : (APP.pricePence / 100).toFixed(2);
  return style === 'slash' ? `£${pounds}/month` : `£${pounds} a month`;
}

/**
 * The headline number. True, and usable, worded as athletes who have trained
 * with HybridX plans: most of them bought the paperback plans on Amazon (KDP)
 * rather than using the app (owner, 10 November 2026). So it is never an app,
 * user or subscriber count.
 */
export const ATHLETES = {
  count: 2000,
  wording: 'Over 2,000 athletes have trained with HybridX plans',
} as const;

/**
 * Who an article is by, and who stands behind it. The brand is the author;
 * Jon Lee, HybridX's trainer, reviews and approves every article before it is
 * published (owner, 10 November 2026). Articles are AI-drafted, so "reviewed
 * by" is the accurate credit, and "How our guides are written" says so.
 */
export const ARTICLE_AUTHOR = {
  name: 'HybridX',
  type: 'Organization',
  url: 'https://hybridx.club',
} as const;

export const ARTICLE_REVIEWER = {
  name: 'Jon Lee',
  role: 'HybridX trainer',
  type: 'Person',
} as const;

/**
 * Never stated by generated content, whatever a prompt or a draft says. Each
 * entry says why, so the list can be revisited when the reason stops applying.
 */
export const NOT_CLAIMED: readonly { claim: string; why: string }[] = [
  {
    claim: 'A number of app users, subscribers or members',
    why: 'The 2,000 figure counts athletes who have trained with HybridX plans, mostly book buyers. There is no published app user count.',
  },
  {
    claim: 'The app is available on the App Store or Google Play',
    why: 'Not yet published. Follows APP.availability.',
  },
  {
    claim: 'A membership can be bought inside the iOS or Android app',
    why: 'The store apps never sell; purchase is on the website only.',
  },
  {
    claim: 'Loading a target finish time, or "this exact schedule", into the app',
    why: 'The app has fixed programmes and no target-time setting.',
  },
  {
    claim: 'Partnership with, or endorsement by, HYROX or ATHX',
    why: 'There is none. Both names are used only to describe the events.',
  },
  {
    claim: 'The cheapest or most affordable app, or any comparison with a named competitor',
    why: 'Owner decision, 10 November 2026: say "very affordable" and let the price speak. UK advertising rules also require evidence on file for superlatives and comparisons.',
  },
  {
    claim: 'Guaranteed results, times or weight loss',
    why: 'Not true of any training plan.',
  },
  {
    claim: 'Diagnosis or treatment of an injury or medical condition',
    why: 'Coaching, not medical advice. Pain and injury go to a professional.',
  },
];
