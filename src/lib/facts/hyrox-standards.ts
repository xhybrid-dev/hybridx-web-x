// src/lib/facts/hyrox-standards.ts
//
// HYROX station work and loads, by division: the numbers an article, a tool or
// the content engine may state. docs/content-engine-plan.md, step 1.
//
// Two rules keep this file worth trusting:
//
//   1. A division appears here only when its loads are confirmed. The four
//      singles divisions and the five doubles divisions are. Relay is absent
//      on purpose: a wrong load in an article is worse than no article, and
//      the content engine reads UNCOVERED_FORMATS and will not state a load
//      for a format listed there.
//   2. LOADS_CHECK records who confirmed the loads, against what, and when.
//      Jon Lee (HybridX's trainer) checked every singles figure against the
//      official 2026/27 rulebook on 10 November 2026, and gave the doubles
//      rule: each doubles division carries the loads of its equivalent singles
//      division. hyrox.com could not be reached from the session that wrote
//      this file, which is why the confirmation is recorded rather than
//      assumed.
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

export type DoublesDivisionId =
  | 'women-doubles'
  | 'women-pro-doubles'
  | 'men-doubles'
  | 'men-pro-doubles'
  | 'mixed-doubles';

export interface DoublesDivision {
  id: DoublesDivisionId;
  label: string;
  /** The singles division whose loads it carries. */
  loadsAs: DivisionId;
  note?: string;
}

/**
 * Doubles carry the loads of the equivalent singles division (Jon Lee, from
 * the 2026/27 rulebook): sled pull 78 kg for Women Doubles; 103 kg for Women
 * Pro Doubles, Men Doubles and Mixed Doubles; 153 kg for Men Pro Doubles.
 * Mixed shares the Men Open loads, which is what puts its sled pull at 103 kg.
 */
export const DOUBLES: readonly DoublesDivision[] = [
  { id: 'women-doubles', label: 'Women Doubles', loadsAs: 'women-open' },
  { id: 'women-pro-doubles', label: 'Women Pro Doubles', loadsAs: 'women-pro' },
  { id: 'men-doubles', label: 'Men Doubles', loadsAs: 'men-open' },
  { id: 'men-pro-doubles', label: 'Men Pro Doubles', loadsAs: 'men-pro' },
  {
    id: 'mixed-doubles',
    label: 'Mixed Doubles',
    loadsAs: 'men-open',
    note: 'Each partner throws the wall ball to the target for their own sex: 2.70 m for women, 3.00 m for men.',
  },
];

/**
 * Formats whose loads are deliberately not stated anywhere yet, and why.
 * Add a format above from the rulebook, then remove it here.
 */
export const UNCOVERED_FORMATS: readonly { format: 'relay'; reason: string }[] = [
  {
    format: 'relay',
    reason: 'Not yet confirmed from the 2026/27 Team Relay rulebook.',
  },
];

/**
 * Who confirmed DIVISIONS and DOUBLES, against what, and when. Set
 * `confirmedOn` back to null if a new season's rulebook changes anything,
 * until the new figures are checked: the content engine states unconfirmed
 * loads only with a "check the current rulebook" line, and never in a table.
 */
export const LOADS_CHECK: {
  confirmedOn: string | null;
  confirmedBy: string;
  against: string;
  agreedBy: readonly string[];
} = {
  confirmedOn: '2026-11-10',
  confirmedBy: 'Jon Lee, HybridX trainer',
  against: 'HYROX 2026/27 official rulebook',
  // Secondary sources consulted on 10 November 2026, before the rulebook
  // check. They agree with each other, and with the rulebook, on every
  // singles figure above.
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

/** A doubles division's loads: those of its equivalent singles division. */
export function doublesLoads(id: DoublesDivisionId): DivisionLoads {
  const found = DOUBLES.find((d) => d.id === id);
  if (!found) throw new Error(`Unknown HYROX doubles division: ${id}`);
  return division(found.loadsAs);
}

export function loadsConfirmed(): boolean {
  return LOADS_CHECK.confirmedOn !== null;
}
