// src/lib/plan-finder/launch.ts
//
// Whether the plan finder is on the homepage, set with PLAN_FINDER_MODE in
// apphosting.yaml (build and run time). Anything other than 'on' means off, so
// a missing or mistyped value fails towards the homepage as it was.
//
//   off   the homepage alone (/start still works)
//   on    the entry section in front of the homepage for everyone
//
// The value 'experiment' (half the visits, chosen per page load in a middleware
// file) is still read, as 'on'. That middleware sat at the repository root
// while the app is under src/, so Next ignored it: the experiment never ran and
// every visit was the plan finder. The experiment is over and the middleware is
// gone; if a split test is wanted again, it needs sticky buckets and must keep
// crawlers on one arm, or it serves search engines two different homepages.
//
// Safe for the Edge runtime: no Node APIs.

export type PlanFinderMode = 'off' | 'on';

export function planFinderMode(value = process.env.PLAN_FINDER_MODE): PlanFinderMode {
  return value === 'on' || value === 'experiment' ? 'on' : 'off';
}
