// src/lib/plan-finder/routing.ts
//
// The plan finder's routing rules: answers in, one product and up to two
// extras out, with a trace of every rule that fired. The single source of
// truth for which product a set of answers leads to. Copy, labels and links
// live in funnel.json.
//
// Version 2.0.0 (25 November 2026). Version 1 (kept, frozen, in
// analytics/legacy-routing.ts for the demo-data generator) was ported from the
// hand-over and sent people to the wrong places:
//   - ATHX never reached the ATHX page, and its free and tools answers went to the
//     free HYROX plan and to a road-running race time predictor;
//   - "a faster HYROX time" went to the road-running predictor, not the HYROX tools;
//   - "general hybrid fitness, no race" went to a plan whose form needed a booked race;
//   - "calculators and free guides only" went to an email-gated plan;
//   - an injury answer did nothing;
//   - the explanation could say something the result did not do ("running is your weak
//     spot, so we added a running plan" with "too many options" also ticked).
// The rules change only together with their tests
// (src/lib/__tests__/plan-finder-routing.test.ts): update the oracle table
// there independently, update the golden examples if a documented outcome
// changes, and bump VERSION, which is sent with every result event so the
// admin can compare before and after.

import type { FormatId, Funnel, GoalId, LevelId, ObstacleId, PlaceId, ProductId } from './content';
import { findOption } from './content';

export const VERSION = '2.0.0';

export interface Answers {
  goal?: GoalId | null;
  level?: LevelId | null;
  place?: PlaceId | null;
  obst?: ObstacleId[];
  format?: FormatId | null;
}

export interface Route {
  primary: ProductId;
  secondary: ProductId[];
  paper: ProductId;
  freeStart: ProductId;
  /** Every rule that fired, e.g. `paper:first-gym`. Stored with each result. */
  trace: string[];
  version: string;
}

const ADVANCED: LevelId[] = ['raced', 'compete'];

/** The free thing to start with, by goal: a tool or a page, never an email form unless the goal is a first race. */
const FREE_START: Record<GoalId, ProductId> = {
  first: 'free',
  faster: 'ste',
  athx: 'athxpage',
  xenom: 'weekplan',
  ultra: 'vdot',
  hybrid: 'weekplan',
};

/** What "calculators and free guides only" leads to, by goal. Nothing here asks for an email address. */
const TOOL_BY_GOAL: Record<GoalId, ProductId> = {
  first: 'howto',
  faster: 'pacer',
  athx: 'athxpage',
  xenom: 'ste',
  ultra: 'vdot',
  hybrid: 'hybridprog',
};

/** Missing answers fall back to first / new / home / paper, so a result always exists. */
export function route(answers: Answers = {}): Route {
  const goal = answers.goal || 'first';
  const level = answers.level || 'new';
  const place = answers.place || 'home';
  const format = answers.format || 'paper';
  const obst = answers.obst || [];
  const advanced = ADVANCED.includes(level);
  const trace: string[] = [];

  // 1. Which paperback fits the goal (the primary when the visitor wants paper, an extra otherwise)
  let paper: ProductId = 'twelve';
  if (goal === 'first') {
    paper = place === 'gym' ? 'twelve' : 'home';
    trace.push('paper:first-' + (place === 'gym' ? 'gym' : 'home-or-both'));
  } else if (goal === 'faster') {
    // Someone with only a home set-up cannot use the gym book, so the home book it is.
    paper = place === 'home' ? 'home' : 'elite';
    trace.push('paper:faster-' + (place === 'home' ? 'home' : 'gym-or-both'));
  } else if (goal === 'athx') {
    paper = 'athx';
    trace.push('paper:athx');
  } else if (goal === 'ultra') {
    paper = 'ultra';
    trace.push('paper:ultra');
  } else {
    // xenom and hybrid have no book of their own: the nearest is chosen by level and kit.
    paper = advanced ? 'elite' : place === 'home' ? 'home' : 'twelve';
    trace.push(`paper:${goal}-${advanced ? 'advanced' : place === 'home' ? 'home' : 'default'}`);
  }
  if (goal === 'first' && advanced) {
    paper = 'elite';
    trace.push('paper:advanced-override');
  }

  // 2. Free starting point for the goal
  const freeStart = FREE_START[goal];
  trace.push('free-start:' + freeStart);

  // 3. Primary recommendation: the format (question 4) picks the column
  let primary: ProductId = paper;
  if (format === 'phone') primary = 'app';
  else if (format === 'free') primary = freeStart;
  else if (format === 'tools') primary = TOOL_BY_GOAL[goal];
  trace.push('primary:format-' + format);

  // 4. Up to two extras, chosen from what got in the way (question 3). "Too many
  //    options" is checked first and wins: it asks for one recommendation.
  const extras: ProductId[] = [];
  if (obst.includes('options')) {
    trace.push('extras:suppressed-too-many-options');
  } else {
    if (obst.includes('run')) {
      extras.push('run12', 'vdot');
      trace.push('extras:run');
    }
    if (obst.includes('injury')) {
      // The week planner keeps a full day between heavy legs and a hard run.
      extras.push('weekplan');
      trace.push('extras:injury');
    }
    if (obst.includes('plateau')) {
      extras.push('ste', 'app');
      trace.push('extras:plateau');
    } else if (obst.includes('structure')) {
      extras.push('app');
      trace.push('extras:structure');
    }
    if (obst.includes('time')) {
      extras.push('weekplan');
      trace.push('extras:time');
    }
    // The free plan is a HYROX plan: it is not offered to someone training for ATHX or an ultra.
    const freePlanFits = goal !== 'athx' && goal !== 'ultra';
    if (obst.includes('generic') && freePlanFits) {
      extras.push('free');
      trace.push('extras:generic');
    }
    extras.push(freeStart);
    extras.push(format === 'paper' ? 'app' : paper);
    extras.push(goal === 'faster' ? 'rules' : freePlanFits ? 'free' : 'weekplan');
    extras.push(freePlanFits ? 'free' : 'weekplan');
  }
  const secondary: ProductId[] = [];
  for (const id of extras) {
    if (id !== primary && !secondary.includes(id) && secondary.length < 2) secondary.push(id);
  }

  return { primary, secondary, paper, freeStart, trace, version: VERSION };
}

/**
 * The sentence under the result heading and the recap chips. It only restates
 * what the visitor said and what was added because of it: no persuasion, no
 * claims. `weeks` is whole weeks to the race, 0 when none was given.
 */
export function explain(answers: Answers, funnel: Funnel, opts: { weeks?: number } = {}): { why: string; chips: string[] } {
  const obst = answers.obst || [];
  const weeks = opts.weeks || 0;
  const goal = findOption(funnel.goals, answers.goal || 'first')!;
  const level = findOption(funnel.levels, answers.level || 'new')!;
  const place = findOption(funnel.places, answers.place || 'home')!;
  const format = findOption(funnel.formats, answers.format || 'paper')!;
  // Said about what the result actually contains, never about what an answer would
  // usually add: version 1 described a running plan that "too many options" had removed.
  const shown = new Set<ProductId>(route(answers).secondary);

  let why = `You are training for ${goal.word}, you ${level.word} and ${place.word}. You asked to follow your plan ${format.word}.`;
  // There is no XENOM plan. Say so, rather than hand over HYROX material as if it were one.
  if (answers.goal === 'xenom') why += ' There is no XENOM plan yet, so this is the closest we have.';
  if (obst.includes('options')) {
    why += ' You said there are too many options, so we are showing one recommendation.';
  } else {
    if (obst.includes('run') && (shown.has('run12') || shown.has('vdot'))) {
      const parts = [shown.has('run12') ? 'a running plan' : '', shown.has('vdot') ? 'the VDOT Calculator' : ''].filter(Boolean);
      why += ` Running is your weak spot, so we added ${parts.join(' and ')}.`;
    }
    if (obst.includes('injury') && shown.has('weekplan')) {
      why += ' You are working around an injury, so the week planner is listed: it keeps heavy leg days and hard runs apart. Pain is a reason to see a professional, not to train through it.';
    }
    if (obst.includes('plateau') && shown.has('ste')) {
      why += ' You have plateaued, so the Strength and Engine Test is listed to find what is holding you back.';
    }
    if ((obst.includes('structure') || obst.includes('plateau')) && shown.has('app')) {
      why += ' You want more structure, so the app is listed as an extra.';
    }
    if (obst.includes('time') && shown.has('weekplan')) {
      why += ' Your time is limited, so the week planner is listed: it builds a week around the days you have.';
    }
    if (obst.includes('generic') && shown.has('free')) {
      why += ' Plans felt generic before, so the free plan is included because it is built from your race and dates.';
    }
  }
  if (weeks) {
    why +=
      weeks >= 12
        ? ` You have ${weeks} weeks until your race, which is enough for a full 12-week plan.`
        : ` You have ${weeks}${weeks === 1 ? ' week' : ' weeks'} until your race, so start this week rather than waiting for a perfect week one.`;
  }

  const chips = [goal.label, level.label, 'Trains: ' + place.label.toLowerCase(), format.label];
  obst
    .filter((o) => o !== 'none')
    .slice(0, 3)
    .forEach((o) => chips.push(findOption(funnel.obstacles, o)!.label));
  if (weeks) chips.push(`Race in ${weeks}${weeks === 1 ? ' week' : ' weeks'}`);
  return { why, chips };
}

/**
 * Whole weeks from `today` to a `YYYY-MM-DD` race date, counted in local
 * calendar days. 0 means "no usable date": empty, malformed, today or earlier,
 * or more than two years (730 days) ahead. A race tomorrow counts as 1 week.
 */
export function raceWeeks(race: string, today: Date = new Date()): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(race)) return 0;
  const [y, m, d] = race.split('-').map(Number);
  const raceDay = new Date(y, m - 1, d);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((raceDay.getTime() - start.getTime()) / 86_400_000);
  if (days < 1 || days > 730) return 0;
  return Math.max(1, Math.round(days / 7));
}

export type RaceBucket = 'none' | '1-4' | '5-11' | '12-23' | '24+';

/** The race date leaves the browser only as one of these buckets, never as a date. */
export function raceBucket(weeks: number): RaceBucket {
  if (!weeks) return 'none';
  if (weeks <= 4) return '1-4';
  if (weeks <= 11) return '5-11';
  if (weeks <= 23) return '12-23';
  return '24+';
}
