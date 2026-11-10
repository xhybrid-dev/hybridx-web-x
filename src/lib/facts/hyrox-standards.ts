// src/lib/facts/hyrox-standards.ts
//
// HYROX station work and loads, by division: the numbers an article, a tool or
// the content engine may state. docs/content-engine-plan.md, step 1.
//
// Two rules keep this file worth trusting:
//
//   1. A division appears here only when its loads are agreed. The four
//      singles divisions are. Doubles and relay are absent on purpose:
//      secondary sources disagree on mixed doubles (which ball, which sled
//      load), and a wrong load in an article is worse than no article. The
//      content engine reads UNCOVERED_FORMATS and will not state a load for
//      them until they are added here from the rulebook.
//   2. LOADS_CHECK records whether the loads have been confirmed against the
//      official rulebook. Until `confirmedOn` is set, they stand on secondary
//      sources that agree with each other, and the engine treats them as
//      unconfirmed. hyrox.com could not be reached from the session that wrote
//      this file, so the owner confirms them.
//
// Station order and work are not new facts: they restate what
// src/lib/hyrox-rules-2026.ts (the 2026/27 rulebooks) and src/lib/race-content.ts
// (the watch's RaceData.hpp) already say, and src/lib/__tests__/facts.test.ts
// fails if the three ever disagree.

export const SEASON = '2026/27';

export type StationId =
  | 'skierg'
  | 'sled-push'
  | 'sled-pull'
  | 'burpee-broad-jump'
  | 'row'
  | 'farmers-carry'
  | 'sandbag-lunges'
  | 'wall-balls';

export interface StationWork {
  id: StationId;
  name: string;
  /** Order in the race, 1–8. */
  order: number;
  /** Metres of work, or null where the work is counted in reps. */
  metres: number | null;
  /** Reps of work, or null where the work is a distance. */
  reps: number | null;
}

/** The eight stations in race order. The same in every division. */
export const STATION_WORK: readonly StationWork[] = [
  { id: 'skierg', name: 'SkiErg', order: 1, metres: 1000, reps: null },
  { id: 'sled-push', name: 'Sled Push', order: 2, metres: 50, reps: null },
  { id: 'sled-pull', name: 'Sled Pull', order: 3, metres: 50, reps: null },
  { id: 'burpee-broad-jump', name: 'Burpee Broad Jump', order: 4, metres: 80, reps: null },
  { id: 'row', name: 'Rowing', order: 5, metres: 1000, reps: null },
  { id: 'farmers-carry', name: 'Farmers Carry', order: 6, metres: 200, reps: null },
  { id: 'sandbag-lunges', name: 'Sandbag Lunges', order: 7, metres: 100, reps: null },
  { id: 'wall-balls', name: 'Wall Balls', order: 8, metres: null, reps: 100 },
];

/** Eight 1 km runs, one before each station. */
export const RUNS = { count: 8, metres: 1000 } as const;

export type DivisionId = 'women-open' | 'women-pro' | 'men-open' | 'men-pro';

export interface DivisionLoads {
  id: DivisionId;
  label: string;
  sex: 'women' | 'men';
  category: 'open' | 'pro';
  /** Sled push, kilograms, including the sled itself. */
  sledPushKg: number;
  /** Sled pull, kilograms, including the sled itself. */
  sledPullKg: number;
  /** Farmers carry, kilograms per hand. */
  farmersCarryKgEach: number;
  sandbagKg: number;
  wallBallKg: number;
  /** Wall ball target height. Follows sex, not category. */
  wallBallTargetMetres: number;
}

export const DIVISIONS: readonly DivisionLoads[] = [
  {
    id: 'women-open',
    label: 'Women Open',
    sex: 'women',
    category: 'open',
    sledPushKg: 102,
    sledPullKg: 78,
    farmersCarryKgEach: 16,
    sandbagKg: 10,
    wallBallKg: 4,
    wallBallTargetMetres: 2.7,
  },
  {
    id: 'women-pro',
    label: 'Women Pro',
    sex: 'women',
    category: 'pro',
    sledPushKg: 152,
    sledPullKg: 103,
    farmersCarryKgEach: 24,
    sandbagKg: 20,
    wallBallKg: 6,
    wallBallTargetMetres: 2.7,
  },
  {
    id: 'men-open',
    label: 'Men Open',
    sex: 'men',
    category: 'open',
    sledPushKg: 152,
    sledPullKg: 103,
    farmersCarryKgEach: 24,
    sandbagKg: 20,
    wallBallKg: 6,
    wallBallTargetMetres: 3.0,
  },
  {
    id: 'men-pro',
    label: 'Men Pro',
    sex: 'men',
    category: 'pro',
    sledPushKg: 202,
    sledPullKg: 153,
    farmersCarryKgEach: 32,
    sandbagKg: 30,
    wallBallKg: 9,
    wallBallTargetMetres: 3.0,
  },
];

/**
 * Formats whose loads are deliberately not stated anywhere yet, and why.
 * Add a format to DIVISIONS from the rulebook, then remove it here.
 */
export const UNCOVERED_FORMATS: readonly { format: 'doubles' | 'relay'; reason: string }[] = [
  {
    format: 'doubles',
    reason:
      'Secondary sources disagree on mixed doubles loads (the wall ball and sled weights). Not stated until taken from the 2026/27 Doubles rulebook.',
  },
  {
    format: 'relay',
    reason: 'Not yet taken from the 2026/27 Team Relay rulebook.',
  },
];

/**
 * Whether DIVISIONS has been checked against the official rulebook.
 *
 * `confirmedOn` stays null until the owner has compared every number above
 * with the 2026/27 Singles rulebook. The content engine states unconfirmed
 * loads only with a "check the current rulebook" line, and never in a table.
 */
export const LOADS_CHECK: {
  confirmedOn: string | null;
  against: string;
  agreedBy: readonly string[];
} = {
  confirmedOn: null,
  against: 'HYROX 2026/27 Singles rulebook (hyrox.com)',
  // Secondary sources consulted on 10 November 2026. They agree with each
  // other on every singles figure above; none of them is the rulebook.
  agreedBy: [
    'https://www.redbull.com/gb-en/hyrox-weights-overview',
    'https://rundida.com/tools/hyrox-weights/',
    'https://hybridathleteclub.com/hyrox-weights',
    'https://www.uniquelysport.com/post/hyrox-weights',
  ],
};

export function division(id: DivisionId): DivisionLoads {
  const found = DIVISIONS.find((d) => d.id === id);
  if (!found) throw new Error(`Unknown HYROX division: ${id}`);
  return found;
}

export function loadsConfirmed(): boolean {
  return LOADS_CHECK.confirmedOn !== null;
}
