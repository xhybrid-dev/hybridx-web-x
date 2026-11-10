// src/lib/facts/index.ts
//
// The facts registry: everything a page, a tool or the content engine may state
// as fact, from one import. docs/content-engine-plan.md, section 4.3.
//
// New facts go in their own module here. Facts that already have a home are
// re-exported from it rather than copied, so there is only ever one place to
// change them.

export * from './hyrox-standards';
export * from './product';

// The 2026/27 rule changes, penalties and completion standards. Renamed on the
// way through: race-content.ts also exports a STATIONS, for the watch.
export {
  RULE_CHANGES,
  PENALTY_ITEMS,
  LAP_CONFIGS,
  STATIONS as STATION_STANDARDS,
} from '@/lib/hyrox-rules-2026';

// ATHX: the three zones and how they are scored.
export { ATHX_ZONES, ATHX_TOTAL_WORKING_MINUTES } from '@/lib/athx-content';
