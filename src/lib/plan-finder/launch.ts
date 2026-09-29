// src/lib/plan-finder/launch.ts
//
// Whether the plan finder is on the homepage, set with PLAN_FINDER_MODE in
// apphosting.yaml (build and run time). Anything other than 'on' or
// 'experiment' means off, so a missing or mistyped value fails towards the
// homepage as it was.
//
//   off         the homepage alone (/start still works)
//   on          the entry section in front of the homepage for everyone
//   experiment  half of visits get the entry section (arm A), half the plain
//               homepage (control), decided per page load in middleware.ts
//
// Safe for the Edge runtime: no Node APIs.

export type PlanFinderMode = 'off' | 'on' | 'experiment';

export function planFinderMode(value = process.env.PLAN_FINDER_MODE): PlanFinderMode {
  return value === 'on' || value === 'experiment' ? value : 'off';
}

/** The control arm's page. Reached only through the middleware rewrite of "/". */
export const CONTROL_PATH = '/home-control';
