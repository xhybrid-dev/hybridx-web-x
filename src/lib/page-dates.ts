// src/lib/page-dates.ts
//
// When each hand-built page last changed, for <lastmod> in the sitemap.
//
// Google uses lastmod only while it stays believable: a date that moves on
// every fetch, or on every deploy, teaches it to ignore the whole sitemap. So
// these are fixed dates, one per page, set to the page's last real change.
// src/lib/__tests__/sitemap.test.ts compares each with the last commit to the
// page's file and fails if the page changed after its date: edit a page, bump
// its date here in the same commit.
//
// Seeded on 10 November 2026 from each page file's last commit.

export const PAGE_UPDATED: Readonly<Record<string, string>> = {
  '/': '2026-11-25',
  '/calculators': '2026-11-11',
  '/calculators/running': '2026-07-07',
  '/calculators/strength': '2026-07-07',
  '/calculators/general-health': '2026-07-07',
  '/calculators/body-fat-calculator': '2026-11-25',
  '/calculators/calorie-macronutrient-calculator': '2026-07-07',
  '/calculators/heart-rate-zone-calculator': '2026-07-07',
  '/calculators/one-rep-max-calculator': '2026-07-07',
  '/calculators/percentage-based-weight-calculator': '2026-07-07',
  '/calculators/powerlifting-score-calculator': '2026-11-25',
  '/calculators/pace-calculator': '2026-07-07',
  '/calculators/race-time-predictor': '2026-07-07',
  '/calculators/split-time-calculator': '2026-07-07',
  '/calculators/garmin-tcx-generator': '2026-07-14',
  '/calculators/week-planner': '2026-11-11',
  '/calculators/hyrox-pacer': '2026-11-11',
  '/calculators/strength-engine-test': '2026-11-25',
  '/free-hyrox-plan': '2026-11-25',
  '/build-a-bigger-engine': '2026-06-24',
  '/app': '2026-11-25',
  '/store': '2026-07-07',
  '/books': '2026-07-07',
  '/vdot': '2026-11-25',
  '/12-week-running-hyrox': '2026-11-25',
  '/privacy-policy': '2026-10-02',
  '/how-to-train-for-hyrox': '2026-11-25',
  '/hyrox-training-plan': '2026-11-25',
  '/hybrid-training-program': '2026-11-25',
  '/hyrox-rule-changes-2026': '2026-11-11',
  '/athx-2027': '2026-11-11',
  '/weigh-in': '2026-11-20',
  '/trail-quest': '2026-10-23',
  '/una': '2026-11-24',
  '/una/nerdy-bits': '2026-11-20',
  '/training': '2026-11-20',
  '/shop-terms': '2026-10-02',
  '/terms': '2026-11-13',
  '/guides': '2026-11-10',
  '/guides/how-we-write': '2026-11-10',
  '/hyrox-glasgow-2027': '2026-10-04',
};
