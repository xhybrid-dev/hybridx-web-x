// src/lib/calculators/week-planner.ts
//
// The week planner (docs/content-engine-plan.md, step 5 and section 5.1): days,
// goal, kit and long-run day in; a seven-day week out, and the three weeks
// after it. A coach's structure built on HybridX's rules, not a personalised
// prescription, and the page says so.
//
// The rules, each one checked for every combination of inputs and every week
// by src/lib/__tests__/week-planner.test.ts:
//   1. exactly the chosen number of training days, the long run on its day;
//   2. the day after the long run is a rest day;
//   3. in a 3-day week no two hard days touch; in any week, never three in a row;
//   4. heavy legs and a hard run are never on the same day. If you move
//      sessions so they are, lift first and leave at least 6 to 8 hours
//      (HybridX's rule, confirmed by Jon, 10 November 2026);
//   5. at least a full day between heavy legs and the next hard run or long
//      run, which is well past the 6 to 8 hours;
//   6. when strength and a run share a day, strength comes first;
//   7. nothing needs kit the athlete said they do not have;
//   8. weeks 1 to 3 build, and week 4 is lighter than week 3.
//
// Pure functions only: the page, the calendar file and the email link all
// come from the same plan.

export const DAY_COUNTS = [3, 4, 5] as const;
export type DayCount = (typeof DAY_COUNTS)[number];

export const GOALS = ['first-hyrox', 'faster-hyrox', 'athx', '10k-strength'] as const;
export type Goal = (typeof GOALS)[number];

export const KITS = ['full-gym', 'no-sled', 'basic-gym', 'home'] as const;
export type Kit = (typeof KITS)[number];

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export const WEEKS = 4;

export const GOAL_LABELS: Record<Goal, string> = {
  'first-hyrox': 'My first HYROX',
  'faster-hyrox': 'A faster HYROX',
  athx: 'ATHX',
  '10k-strength': 'A faster 10k, and stronger',
};

export const KIT_LABELS: Record<Kit, string> = {
  'full-gym': 'Full gym, with a sled and a SkiErg',
  'no-sled': 'Full gym, but no sled',
  'basic-gym': 'Basic gym: barbells, dumbbells, a rower',
  home: 'Home: dumbbells or a kettlebell',
};

export interface PlannerInput {
  days: DayCount;
  goal: Goal;
  kit: Kit;
  /** 0 = Monday … 6 = Sunday. */
  longRunDay: number;
}

/* ── Kit ────────────────────────────────────────────────────────────────── */

export type Equipment = 'sled' | 'skierg' | 'rower' | 'barbell' | 'dumbbells' | 'kettlebell' | 'wallball';

export const KIT_EQUIPMENT: Record<Kit, readonly Equipment[]> = {
  'full-gym': ['sled', 'skierg', 'rower', 'barbell', 'dumbbells', 'kettlebell', 'wallball'],
  'no-sled': ['skierg', 'rower', 'barbell', 'dumbbells', 'kettlebell', 'wallball'],
  'basic-gym': ['rower', 'barbell', 'dumbbells', 'kettlebell', 'wallball'],
  home: ['dumbbells', 'kettlebell'],
};

/** An exercise and what to do instead, in order. The last option needs nothing. */
interface Choice {
  name: string;
  needs?: Equipment;
  /** A swap that cannot take the session's dose (a distance, say) brings its own. */
  dose?: string;
}

const MOVES = {
  squat: [{ name: 'Back squat', needs: 'barbell' }, { name: 'Goblet squat', needs: 'dumbbells' }, { name: 'Kettlebell goblet squat', needs: 'kettlebell' }, { name: 'Bulgarian split squat' }],
  hinge: [{ name: 'Deadlift', needs: 'barbell' }, { name: 'Dumbbell Romanian deadlift', needs: 'dumbbells' }, { name: 'Kettlebell Romanian deadlift', needs: 'kettlebell' }, { name: 'Single-leg hip hinge' }],
  lunge: [{ name: 'Walking lunges holding dumbbells', needs: 'dumbbells' }, { name: 'Walking lunges holding a kettlebell', needs: 'kettlebell' }, { name: 'Walking lunges' }],
  press: [{ name: 'Overhead press', needs: 'barbell' }, { name: 'Dumbbell shoulder press', needs: 'dumbbells' }, { name: 'Kettlebell press', needs: 'kettlebell' }, { name: 'Pike push-ups' }],
  row: [{ name: 'Bent-over barbell row', needs: 'barbell' }, { name: 'Dumbbell row', needs: 'dumbbells' }, { name: 'Kettlebell row', needs: 'kettlebell' }, { name: 'Inverted row under a sturdy table' }],
  pushUp: [{ name: 'Push-ups' }],
  carry: [{ name: 'Farmers carry with kettlebells', needs: 'kettlebell' }, { name: 'Farmers carry with dumbbells', needs: 'dumbbells' }, { name: 'Carry two heavy bags or water containers' }],
  sledPush: [{ name: 'Sled push', needs: 'sled' }, { name: 'Wall drives and box step-ups (the sled push without a sled)', dose: '30 seconds of wall drives, then 10 step-ups each leg' }],
  sledPull: [{ name: 'Sled pull', needs: 'sled' }, { name: 'Bent-over barbell row', needs: 'barbell' }, { name: 'Dumbbell row', needs: 'dumbbells' }, { name: 'Inverted row under a sturdy table' }],
  ski: [{ name: 'SkiErg', needs: 'skierg' }, { name: 'Rower', needs: 'rower' }, { name: 'Kettlebell swings', needs: 'kettlebell' }, { name: 'Burpees' }],
  rowStation: [{ name: 'Rower', needs: 'rower' }, { name: 'Kettlebell swings', needs: 'kettlebell' }, { name: 'Burpees' }],
  wallBall: [{ name: 'Wall balls', needs: 'wallball' }, { name: 'Dumbbell thrusters', needs: 'dumbbells' }, { name: 'Kettlebell thrusters', needs: 'kettlebell' }, { name: 'Air squat to overhead reach' }],
  swing: [{ name: 'Kettlebell swings', needs: 'kettlebell' }, { name: 'Dumbbell swings', needs: 'dumbbells' }, { name: 'Broad jumps', dose: '10 reps' }],
  burpeeBroadJump: [{ name: 'Burpee broad jumps' }],
} satisfies Record<string, Choice[]>;

type Move = keyof typeof MOVES;

/** The exercise this kit allows: the first choice it has the equipment for. */
export function pick(move: Move, kit: Kit): Choice {
  const have = KIT_EQUIPMENT[kit];
  return (MOVES[move] as readonly Choice[]).find((c) => !c.needs || have.includes(c.needs))!;
}

/* ── Sessions ───────────────────────────────────────────────────────────── */

export type SessionKind =
  | 'long-run'
  | 'intervals'
  | 'tempo'
  | 'easy-run'
  | 'strength-lower'
  | 'strength-upper'
  | 'strength-full'
  | 'stations'
  | 'athx-strength'
  | 'athx-engine'
  | 'metcon';

type Tier = 'new' | 'trained';
type Four<T> = readonly [T, T, T, T];

interface SessionDef {
  title: string;
  /** Hard sessions are the ones rule 3 counts. */
  hard: boolean;
  /** Squats, deadlifts, lunges under load: rules 4 and 5. */
  heavyLegs: boolean;
  /** Fast running: rules 4 and 5. */
  hardRun: boolean;
  run: boolean;
  effort: string;
  /** Minutes, week by week, per tier. Week 4 is the lighter week. */
  minutes: Record<Tier, Four<number>>;
  /** The main set, week by week, per tier. */
  main: Record<Tier, Four<string>>;
  /** Exercises named in the session, swapped for the kit. */
  moves?: readonly (readonly [Move, Four<string> | Record<Tier, Four<string>>])[];
  notes?: string;
}

const same = <T,>(four: Four<T>): Record<Tier, Four<T>> => ({ new: four, trained: four });

const SESSIONS: Record<SessionKind, SessionDef> = {
  'long-run': {
    title: 'Long easy run',
    hard: false,
    heavyLegs: false,
    hardRun: false,
    run: true,
    effort: 'RPE 4–5: you can talk in full sentences',
    minutes: { new: [40, 45, 50, 35], trained: [55, 65, 75, 45] },
    main: {
      new: ['40 minutes easy', '45 minutes easy', '50 minutes easy', '35 minutes easy'],
      trained: ['55 minutes easy', '65 minutes easy', '75 minutes easy', '45 minutes easy'],
    },
    notes: 'Easy means easy. Walk the hills if your breathing goes.',
  },
  intervals: {
    title: 'Run intervals',
    hard: true,
    heavyLegs: false,
    hardRun: true,
    run: true,
    effort: 'RPE 8 on the efforts',
    minutes: { new: [35, 40, 42, 30], trained: [45, 50, 55, 40] },
    main: {
      new: ['5 × 2 minutes hard, 2 minutes walk or jog', '6 × 2 minutes hard, 2 minutes jog', '5 × 3 minutes hard, 2 minutes jog', '4 × 2 minutes hard, 2 minutes jog'],
      trained: ['6 × 3 minutes at 5k effort, 90 seconds jog', '5 × 4 minutes at 5k effort, 2 minutes jog', '6 × 4 minutes at 5k effort, 2 minutes jog', '4 × 3 minutes at 5k effort, 2 minutes jog'],
    },
    notes: '10 minutes easy before and after.',
  },
  tempo: {
    title: 'Tempo run',
    hard: true,
    heavyLegs: false,
    hardRun: true,
    run: true,
    effort: 'RPE 7: comfortably hard',
    minutes: { new: [35, 38, 40, 30], trained: [45, 50, 55, 40] },
    main: {
      new: ['15 minutes steady', '2 × 10 minutes steady, 3 minutes easy between', '20 minutes steady', '12 minutes steady'],
      trained: ['20 minutes at threshold', '2 × 12 minutes at threshold, 3 minutes easy between', '25 minutes at threshold', '15 minutes at threshold'],
    },
    notes: '10 minutes easy before and after.',
  },
  'easy-run': {
    title: 'Easy run',
    hard: false,
    heavyLegs: false,
    hardRun: false,
    run: true,
    effort: 'RPE 4–5',
    minutes: { new: [25, 30, 30, 20], trained: [35, 40, 45, 30] },
    main: {
      new: ['25 minutes easy', '30 minutes easy', '30 minutes easy', '20 minutes easy'],
      trained: ['35 minutes easy', '40 minutes easy', '45 minutes easy', '30 minutes easy'],
    },
  },
  'strength-lower': {
    title: 'Strength: legs',
    hard: true,
    heavyLegs: true,
    hardRun: false,
    run: false,
    effort: 'RPE 7–8: two good reps left in every set',
    minutes: same([50, 55, 55, 40]),
    main: same(['Rest 2 minutes between heavy sets', 'Rest 2 minutes between heavy sets', 'Rest 2 minutes between heavy sets', 'Lighter week: same moves, less weight']),
    moves: [
      ['squat', same(['4 × 6', '4 × 5', '5 × 5', '3 × 5'])],
      ['hinge', same(['3 × 6', '3 × 6', '4 × 5', '2 × 6'])],
      ['lunge', same(['3 × 10 each leg', '3 × 12 each leg', '3 × 12 each leg', '2 × 10 each leg'])],
    ],
  },
  'strength-upper': {
    title: 'Strength: upper body and carries',
    hard: false,
    heavyLegs: false,
    hardRun: false,
    run: false,
    effort: 'RPE 7',
    minutes: same([40, 45, 45, 30]),
    main: same(['Rest 90 seconds between sets', 'Rest 90 seconds between sets', 'Rest 90 seconds between sets', 'Lighter week: one set fewer of each']),
    moves: [
      ['press', same(['4 × 6', '4 × 6', '4 × 5', '3 × 6'])],
      ['row', same(['4 × 8', '4 × 8', '4 × 10', '3 × 8'])],
      ['pushUp', same(['3 sets, stopping 2 short of failure', '3 sets, stopping 2 short of failure', '4 sets, stopping 2 short of failure', '2 sets'])],
      ['carry', same(['4 × 40 metres', '4 × 50 metres', '5 × 50 metres', '3 × 40 metres'])],
    ],
  },
  'strength-full': {
    title: 'Strength: full body',
    hard: true,
    heavyLegs: true,
    hardRun: false,
    run: false,
    effort: 'RPE 7: two or three good reps left in every set',
    minutes: same([50, 55, 55, 40]),
    main: same(['Rest 2 minutes between heavy sets', 'Rest 2 minutes between heavy sets', 'Rest 2 minutes between heavy sets', 'Lighter week: one set fewer of each']),
    moves: [
      ['squat', same(['3 × 6', '3 × 6', '4 × 5', '2 × 6'])],
      ['hinge', same(['3 × 6', '3 × 6', '3 × 5', '2 × 6'])],
      ['press', same(['3 × 8', '3 × 8', '4 × 6', '2 × 8'])],
      ['row', same(['3 × 10', '3 × 10', '4 × 8', '2 × 10'])],
      ['carry', same(['3 × 40 metres', '3 × 50 metres', '4 × 50 metres', '2 × 40 metres'])],
    ],
  },
  stations: {
    title: 'HYROX stations and compromised running',
    hard: true,
    heavyLegs: false,
    hardRun: true,
    run: true,
    effort: 'RPE 7–8: race effort, not a sprint',
    minutes: { new: [45, 50, 55, 35], trained: [55, 60, 70, 45] },
    main: {
      new: ['3 rounds: run 500 metres, then one station', '4 rounds: run 500 metres, then one station', '4 rounds: run 750 metres, then one station', '2 rounds: run 500 metres, then one station'],
      trained: ['4 rounds: run 1 km, then one station', '5 rounds: run 1 km, then one station', '6 rounds: run 1 km, then one station', '3 rounds: run 1 km, then one station'],
    },
    moves: [
      ['sledPush', same(['2 lengths', '2 lengths', '3 lengths', '2 lengths'])],
      ['wallBall', { new: ['20 reps', '25 reps', '30 reps', '20 reps'], trained: ['30 reps', '40 reps', '50 reps', '25 reps'] }],
      ['lunge', same(['20 metres', '25 metres', '30 metres', '20 metres'])],
      ['carry', same(['50 metres', '75 metres', '100 metres', '50 metres'])],
      // By time, not metres: the SkiErg's swaps (rower, swings, burpees) can all take it.
      ['ski', same(['75 seconds hard', '90 seconds hard', '2 minutes hard', '75 seconds hard'])],
      ['burpeeBroadJump', same(['10 reps', '12 reps', '15 reps', '10 reps'])],
    ],
    notes: 'One station per round, in the order listed. Rest 2 minutes between rounds. Practise going straight from the station into the run.',
  },
  'athx-strength': {
    title: 'ATHX strength: heavy lifts',
    hard: true,
    heavyLegs: true,
    hardRun: false,
    run: false,
    effort: 'RPE 8: heavy, but every rep clean',
    minutes: same([55, 60, 60, 45]),
    main: same([
      'Work up in sets of 3 to a heavy, clean triple',
      'Work up in sets of 2 to a heavy, clean double',
      'Work up to a heavy single on the press, a double on the squat and a triple on the deadlift: the ATHX Strength Zone order',
      'Lighter week: work up to about 80% of last week',
    ]),
    moves: [
      ['press', same(['work up, then 3 × 3', 'work up, then 3 × 2', 'heavy single', '3 × 3 lighter'])],
      ['squat', same(['work up, then 3 × 3', 'work up, then 3 × 2', 'heavy double', '3 × 3 lighter'])],
      ['hinge', same(['work up, then 3 × 3', 'work up, then 2 × 3', 'heavy triple', '2 × 3 lighter'])],
    ],
    notes: 'The Strength Zone is scored on heavy lifts. With light kit, train the movement and the effort, and test heavy when you can get to a gym.',
  },
  'athx-engine': {
    title: 'ATHX engine: run and ski',
    hard: true,
    heavyLegs: false,
    hardRun: true,
    run: true,
    effort: 'RPE 8',
    minutes: same([45, 50, 55, 40]),
    main: {
      new: ['4 rounds: run 600 metres, then 2 minutes of the ski move below', '5 rounds: run 600 metres, then 2 minutes of the ski move below', '4 rounds: run 800 metres, then 3 minutes of the ski move below', '3 rounds: run 600 metres, then 2 minutes of the ski move below'],
      trained: ['5 rounds: run 600 metres, then 2 minutes of the ski move below', '4 rounds: run 800 metres, then 3 minutes of the ski move below', '5 rounds: run 800 metres, then 3 minutes of the ski move below', '3 rounds: run 800 metres, then 2 minutes of the ski move below'],
    },
    moves: [['ski', same(['every round, hard', 'every round, hard', 'every round, hard', 'every round, steady'])]],
    notes: 'The Endurance Zone is a 3 km run, then the ski for the time left. Run controlled and save something for the ski.',
  },
  metcon: {
    title: 'Mixed conditioning',
    hard: true,
    heavyLegs: false,
    hardRun: false,
    run: true,
    effort: 'RPE 8',
    minutes: same([35, 40, 40, 30]),
    main: same([
      '3 rounds for quality, 2 minutes rest between: the moves below, then a 200 metre run',
      '4 rounds, 2 minutes rest between',
      '15 minutes, as many rounds as you can at a steady pace',
      '2 rounds, easy pace',
    ]),
    moves: [
      ['wallBall', same(['15 reps', '15 reps', '15 reps', '10 reps'])],
      ['swing', same(['15 reps', '15 reps', '15 reps', '10 reps'])],
      ['burpeeBroadJump', same(['8 reps', '8 reps', '10 reps', '6 reps'])],
    ],
  },
};

/* ── The week ───────────────────────────────────────────────────────────── */

/**
 * Sessions on the days after the long run, by offset from it. The long run is
 * offset 0; the day after it (1) and, in every week, the day before it (6)
 * are rest. Strength comes first wherever two sessions share a day.
 */
const TEMPLATES: Record<Goal, Record<DayCount, Record<number, SessionKind[]>>> = {
  'first-hyrox': {
    3: { 2: ['strength-full'], 4: ['stations'] },
    4: { 2: ['intervals'], 3: ['strength-full'], 5: ['stations'] },
    5: { 2: ['intervals'], 3: ['strength-full'], 4: ['easy-run'], 5: ['stations'] },
  },
  'faster-hyrox': {
    3: { 2: ['strength-full'], 4: ['stations'] },
    4: { 2: ['intervals'], 3: ['strength-lower'], 5: ['stations'] },
    5: { 2: ['intervals'], 3: ['strength-lower'], 4: ['strength-upper', 'easy-run'], 5: ['stations'] },
  },
  athx: {
    3: { 2: ['athx-strength'], 4: ['athx-engine'] },
    4: { 2: ['athx-engine'], 3: ['athx-strength'], 5: ['metcon'] },
    5: { 2: ['athx-engine'], 3: ['athx-strength'], 4: ['strength-upper', 'easy-run'], 5: ['metcon'] },
  },
  '10k-strength': {
    3: { 2: ['strength-full'], 4: ['intervals'] },
    4: { 2: ['intervals'], 3: ['strength-full'], 5: ['tempo'] },
    5: { 2: ['intervals'], 3: ['strength-lower'], 4: ['strength-upper', 'easy-run'], 5: ['tempo'] },
  },
};

export interface PlannedMove {
  name: string;
  dose: string;
}

export interface PlannedSession {
  kind: SessionKind;
  title: string;
  effort: string;
  minutes: number;
  main: string;
  moves: PlannedMove[];
  notes?: string;
  hard: boolean;
  heavyLegs: boolean;
  hardRun: boolean;
  run: boolean;
  /** Equipment it uses, after the kit swaps. */
  uses: Equipment[];
}

export interface PlannedDay {
  /** 0 = Monday. */
  day: number;
  name: (typeof WEEKDAYS)[number];
  sessions: PlannedSession[];
}

export interface PlannedWeek {
  week: number;
  days: PlannedDay[];
  totalMinutes: number;
}

const tierOf = (goal: Goal): Tier => (goal === 'first-hyrox' ? 'new' : 'trained');

function session(kind: SessionKind, input: PlannerInput, week: number): PlannedSession {
  const def = SESSIONS[kind];
  const tier = tierOf(input.goal);
  const i = week - 1;
  const moves = (def.moves ?? []).map(([move, dose]) => {
    const doses = 'new' in dose ? dose[tier] : dose;
    const choice = pick(move, input.kit);
    return { name: choice.name, dose: choice.dose ?? doses[i], needs: choice.needs };
  });
  return {
    kind,
    title: def.title,
    effort: def.effort,
    minutes: def.minutes[tier][i],
    main: def.main[tier][i],
    moves: moves.map(({ name, dose }) => ({ name, dose })),
    notes: def.notes,
    hard: def.hard,
    heavyLegs: def.heavyLegs,
    hardRun: def.hardRun,
    run: def.run,
    uses: [...new Set(moves.flatMap((m) => (m.needs ? [m.needs] : [])))],
  };
}

/** One week of the plan: week 1 to 4. */
export function planWeek(input: PlannerInput, week = 1): PlannedWeek {
  const template = TEMPLATES[input.goal][input.days];
  const days: PlannedDay[] = WEEKDAYS.map((name, day) => {
    const offset = (day - input.longRunDay + 7) % 7;
    const kinds: SessionKind[] = offset === 0 ? ['long-run'] : (template[offset] ?? []);
    return { day, name, sessions: kinds.map((k) => session(k, input, week)) };
  });
  return { week, days, totalMinutes: days.reduce((n, d) => n + d.sessions.reduce((m, s) => m + s.minutes, 0), 0) };
}

/** All four weeks. */
export function planWeeks(input: PlannerInput): PlannedWeek[] {
  return Array.from({ length: WEEKS }, (_, i) => planWeek(input, i + 1));
}

/** What to tell the athlete about the rules, shown with every plan. */
export const PLANNER_RULES = [
  'Lift before you run when they share a day.',
  'Leave at least 6 to 8 hours between heavy legs and a hard run. This plan keeps a full day between them.',
  'The day after the long run is a rest day.',
  'Week 4 is lighter on purpose: it is when the first three weeks sink in.',
  'Anything that hurts, as opposed to being hard, is a reason to stop and get it looked at.',
] as const;

/* ── Inputs from a URL or a form ────────────────────────────────────────── */

/** Reads the planner's inputs from query parameters or form fields. Null if any is missing or wrong. */
export function parsePlannerInput(get: (key: string) => string | null | undefined): PlannerInput | null {
  const days = Number(get('days'));
  const goal = get('goal');
  const kit = get('kit');
  const long = WEEKDAY_KEYS.indexOf((get('long') ?? '') as WeekdayKey);
  if (!(DAY_COUNTS as readonly number[]).includes(days)) return null;
  if (!(GOALS as readonly string[]).includes(goal ?? '')) return null;
  if (!(KITS as readonly string[]).includes(kit ?? '')) return null;
  if (long < 0) return null;
  return { days: days as DayCount, goal: goal as Goal, kit: kit as Kit, longRunDay: long };
}

/** The query string for a plan, as parsePlannerInput reads it. */
export function plannerQuery(input: PlannerInput): string {
  return new URLSearchParams({ days: String(input.days), goal: input.goal, kit: input.kit, long: WEEKDAY_KEYS[input.longRunDay] }).toString();
}

/** A short, safe key for the lead record: "4-first-hyrox-full-gym-sat". */
export function plannerKey(input: PlannerInput): string {
  return `${input.days}-${input.goal}-${input.kit}-${WEEKDAY_KEYS[input.longRunDay]}`;
}

/* ── Calendar file ──────────────────────────────────────────────────────── */

const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

const bytes = (s: string) => new TextEncoder().encode(s).length;

/** Folds a content line at 75 octets, as RFC 5545 asks. Runs in the browser too. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (bytes(rest) > 75) {
    let cut = 75;
    while (bytes(rest.slice(0, cut)) > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = ' ' + rest.slice(cut);
  }
  out.push(rest);
  return out.join('\r\n');
}

const ymd = (d: Date) => `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;

/** The Monday on or after `from`, in UTC. */
export function nextMonday(from: Date): Date {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7));
  return d;
}

/** An all-day calendar event per session, from the Monday `start`. */
export function plannerIcs(weeks: PlannedWeek[], start: Date, stamp = new Date()): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HybridX//Week planner//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:HybridX training'];
  const dtstamp = stamp.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  for (const week of weeks) {
    for (const day of week.days) {
      const date = new Date(start.getTime() + ((week.week - 1) * 7 + day.day) * 86_400_000);
      const next = new Date(date.getTime() + 86_400_000);
      day.sessions.forEach((s, n) => {
        const body = [
          `${s.main} (${s.minutes} minutes, ${s.effort})`,
          ...s.moves.map((m) => `${m.name}: ${m.dose}`),
          s.notes ?? '',
          'Built with the HybridX week planner: hybridx.club/calculators/week-planner',
        ].filter(Boolean);
        lines.push(
          'BEGIN:VEVENT',
          `UID:hybridx-week-planner-${ymd(date)}-${n}-${s.kind}@hybridx.club`,
          `DTSTAMP:${dtstamp}`,
          `DTSTART;VALUE=DATE:${ymd(date)}`,
          `DTEND;VALUE=DATE:${ymd(next)}`,
          fold(`SUMMARY:${icsText(`Week ${week.week}: ${s.title}`)}`),
          fold(`DESCRIPTION:${icsText(body.join('\n'))}`),
          'END:VEVENT',
        );
      });
    }
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
