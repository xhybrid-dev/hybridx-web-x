// src/lib/calculators/strength-engine.ts
//
// The strength and engine test (docs/content-engine-plan.md, step 8 and
// section 5.2): is an athlete held back by strength or by their engine? A
// coach's heuristic, not a validated model, and the page says so.
//
// Inputs: division, bodyweight, a set of 1 to 10 reps for the squat, the
// deadlift and the press (never a true max: the one-rep max is estimated with
// the Epley formula, the site's 1RM calculator's default), and a 5 km time.
//
// The targets are Jon's (11 November 2026):
//   strength, as multiples of bodyweight for the estimated one-rep max,
//     Men Open 1.25 squat, 1.5 deadlift, 0.6 press;
//     Women Open 1.0, 1.25, 0.45;
//     Men Pro 1.5, 2.0, 1.0;
//     Women Pro the Men Open targets, as they race at the Men Open loads;
//   engine, a 5 km in Men Open 22:00, Women Open 25:00, Men Pro 20:00,
//     Women Pro 23:00.
//
// Each lift is scored as a share of its target, capped at 1.2 so one big lift
// cannot hide a weak one, and the three are averaged. The engine is the target
// 5 km over the athlete's, capped the same. Whichever is more than 10% behind
// the other is the limiter; otherwise the athlete is balanced. Doubles athletes
// use their equivalent singles division (mixed doubles: Men Open).

export const DIVISIONS = ['men-open', 'women-open', 'men-pro', 'women-pro'] as const;
export type Division = (typeof DIVISIONS)[number];

export const DIVISION_LABELS: Record<Division, string> = {
  'men-open': 'Men Open',
  'women-open': 'Women Open',
  'men-pro': 'Men Pro',
  'women-pro': 'Women Pro',
};

export const LIFTS = ['squat', 'deadlift', 'press'] as const;
export type Lift = (typeof LIFTS)[number];

export const LIFT_LABELS: Record<Lift, string> = { squat: 'Back squat', deadlift: 'Deadlift', press: 'Strict press' };

export interface Targets {
  /** Estimated one-rep max as a multiple of bodyweight. */
  strength: Record<Lift, number>;
  /** 5 km time, seconds. */
  fiveK: number;
}

export const TARGETS: Record<Division, Targets> = {
  'men-open': { strength: { squat: 1.25, deadlift: 1.5, press: 0.6 }, fiveK: 22 * 60 },
  'women-open': { strength: { squat: 1.0, deadlift: 1.25, press: 0.45 }, fiveK: 25 * 60 },
  'men-pro': { strength: { squat: 1.5, deadlift: 2.0, press: 1.0 }, fiveK: 20 * 60 },
  'women-pro': { strength: { squat: 1.25, deadlift: 1.5, press: 0.6 }, fiveK: 23 * 60 },
};

/** No single score counts for more than this, so one strong lift cannot hide a weak one. */
export const CAP = 1.2;
/** A side more than this far behind the other is the limiter. */
export const MARGIN = 0.1;
export const MAX_REPS = 10;

export interface LiftSet {
  kg: number;
  reps: number;
}

export interface TestInput {
  division: Division;
  bodyweightKg: number;
  lifts: Record<Lift, LiftSet>;
  /** 5 km time, seconds. */
  fiveK: number;
}

export type Verdict = 'force-limited' | 'engine-limited' | 'balanced';

export interface LiftResult {
  lift: Lift;
  estimatedMax: number;
  /** The estimated max as a multiple of bodyweight. */
  ratio: number;
  target: number;
  /** ratio / target, capped. */
  score: number;
}

export interface TestResult {
  verdict: Verdict;
  lifts: LiftResult[];
  strength: number;
  engine: number;
  /** The lift furthest below its target. */
  weakest: Lift;
  targets: Targets;
}

/** Epley: weight × (1 + reps / 30); a single is its own max. */
export function estimateMax({ kg, reps }: LiftSet): number {
  return reps <= 1 ? kg : kg * (1 + reps / 30);
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** The reason an input cannot be scored, or null. */
export function invalid(input: TestInput): string | null {
  if (!(input.bodyweightKg >= 35 && input.bodyweightKg <= 200)) return 'Enter a bodyweight between 35 and 200 kg.';
  for (const lift of LIFTS) {
    const s = input.lifts[lift];
    if (!(s.kg > 0 && s.kg <= 500)) return `Enter the weight for your ${LIFT_LABELS[lift].toLowerCase()}.`;
    if (!(Number.isInteger(s.reps) && s.reps >= 1 && s.reps <= MAX_REPS)) return `Reps for the ${LIFT_LABELS[lift].toLowerCase()}: 1 to ${MAX_REPS}.`;
  }
  if (!(input.fiveK >= 12 * 60 && input.fiveK <= 60 * 60)) return 'Enter a 5 km time between 12:00 and 60:00.';
  return null;
}

export function scoreTest(input: TestInput): TestResult {
  const targets = TARGETS[input.division];
  const lifts = LIFTS.map((lift) => {
    const estimatedMax = estimateMax(input.lifts[lift]);
    const ratio = estimatedMax / input.bodyweightKg;
    const target = targets.strength[lift];
    return { lift, estimatedMax: Math.round(estimatedMax * 10) / 10, ratio: r2(ratio), target, score: r2(Math.min(ratio / target, CAP)) };
  });
  // Averaged from the unrounded shares, then rounded once.
  const strength = r2(
    LIFTS.reduce((n, lift) => n + Math.min(estimateMax(input.lifts[lift]) / input.bodyweightKg / targets.strength[lift], CAP), 0) / LIFTS.length,
  );
  const engine = r2(Math.min(targets.fiveK / input.fiveK, CAP));
  const verdict: Verdict = strength < engine * (1 - MARGIN) ? 'force-limited' : engine < strength * (1 - MARGIN) ? 'engine-limited' : 'balanced';
  const weakest = [...lifts].sort((a, b) => a.score - b.score || LIFTS.indexOf(a.lift) - LIFTS.indexOf(b.lift))[0].lift;
  return { verdict, lifts, strength, engine, weakest, targets };
}

/* ── The eight weeks ────────────────────────────────────────────────────── */

export interface Focus {
  headline: string;
  why: string;
  /** What a training week looks like for the eight weeks. */
  week: string[];
  /** How the eight weeks progress. */
  blocks: string[];
  retest: string;
}

/** The eight-week focus for a verdict, aimed at the weakest lift where strength is the limiter. */
export function focusFor(result: Pick<TestResult, 'verdict' | 'weakest'>): Focus {
  const weakest = LIFT_LABELS[result.weakest].toLowerCase();
  switch (result.verdict) {
    case 'force-limited':
      return {
        headline: 'Strength is holding you back',
        why: `Your engine is ahead of your strength. On race day that shows on the sleds, the lunges and the wall balls, where you run out of force before you run out of breath. Your ${weakest} is furthest from its target.`,
        week: [
          `3 strength sessions, each starting with the ${weakest}`,
          '2 runs: one easy, one at threshold, to keep the engine you have',
          '1 easy session of stations, light, for technique',
        ],
        blocks: [
          'Weeks 1 to 3: 4 sets of 6 at RPE 7, adding a little weight each week',
          'Weeks 4 to 6: 5 sets of 5 at RPE 7 to 8',
          'Week 7: 5 sets of 3, heavier, with full rest',
          'Week 8: half the sets, then retest',
        ],
        retest: 'Retest the same three lifts for the same reps in week 8, and your 5 km the week after.',
      };
    case 'engine-limited':
      return {
        headline: 'Your engine is holding you back',
        why: 'Your strength is ahead of your engine. HYROX is eight kilometres of running with the stations in between, so the time you can gain is in the runs and in how quickly you recover after each station.',
        week: [
          '4 runs: two easy, one at threshold, one set of intervals',
          '2 strength sessions to keep what you have: 3 sets of 5 at RPE 7',
          'Once a week, finish a run with one station straight after, to practise running tired',
        ],
        blocks: [
          'Weeks 1 to 3: build the easy running by about 10% a week',
          'Weeks 4 to 6: threshold runs of 2 × 12 minutes, intervals of 5 × 4 minutes at 5 km effort',
          'Week 7: the hardest week: one compromised session of 4 × 1 km with a station after each',
          'Week 8: a third less running, then retest',
        ],
        retest: 'Run a 5 km time trial at the end of week 8, rested, on a flat route.',
      };
    case 'balanced':
      return {
        headline: 'Balanced: train the race itself',
        why: 'Neither side is holding the other back. The next gains are in doing both at once: running well on tired legs, and stations done steadily after a run.',
        week: [
          '3 runs: one easy, one threshold, one compromised session with stations',
          '2 strength sessions',
          '1 longer HYROX simulation every other week',
        ],
        blocks: [
          'Weeks 1 to 3: compromised running, 3 rounds of 1 km and a station',
          'Weeks 4 to 6: 4 to 5 rounds, at race pace',
          'Week 7: a half simulation at race pace',
          'Week 8: lighter, then retest',
        ],
        retest: 'Retest your lifts and your 5 km in week 8, on separate days.',
      };
  }
}

/* ── Inputs from a URL or a form ────────────────────────────────────────── */

/** "21:30" or "1290" (seconds) to seconds. */
export function parseTime(text: string): number | null {
  const t = text.trim();
  const mmss = t.match(/^(\d{1,2}):([0-5]\d)$/);
  if (mmss) return Number(mmss[1]) * 60 + Number(mmss[2]);
  return /^\d{3,4}$/.test(t) ? Number(t) : null;
}

export function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;
}

/** Reads a test from query parameters or form fields. Null if anything is missing or out of range. */
export function parseTestInput(get: (key: string) => string | null | undefined): TestInput | null {
  const division = get('division');
  if (!(DIVISIONS as readonly string[]).includes(division ?? '')) return null;
  const num = (k: string) => Number(get(k) ?? NaN);
  const input: TestInput = {
    division: division as Division,
    bodyweightKg: num('bw'),
    lifts: {
      squat: { kg: num('sq'), reps: num('sqr') },
      deadlift: { kg: num('dl'), reps: num('dlr') },
      press: { kg: num('pr'), reps: num('prr') },
    },
    fiveK: parseTime(get('5k') ?? '') ?? NaN,
  };
  return invalid(input) ? null : input;
}

export function testQuery(input: TestInput): string {
  const { squat, deadlift, press } = input.lifts;
  return new URLSearchParams({
    division: input.division,
    bw: String(input.bodyweightKg),
    sq: String(squat.kg),
    sqr: String(squat.reps),
    dl: String(deadlift.kg),
    dlr: String(deadlift.reps),
    pr: String(press.kg),
    prr: String(press.reps),
    '5k': formatTime(input.fiveK),
  }).toString();
}
