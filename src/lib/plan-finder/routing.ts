// src/lib/plan-finder/routing.ts
//
// The plan finder's routing rules: answers in, one product and up to two
// extras out, with a trace of every rule that fired. The single source of
// truth for which product a set of answers leads to. Copy, labels and links
// live in funnel.json.
//
// Ported from handover/entry-funnel/data/routing.js with the same behaviour.
// The rules change only together with their tests
// (src/lib/__tests__/plan-finder-routing.test.ts): update the oracle table
// there independently, update the golden examples if a documented outcome
// changes, and bump VERSION, which is sent with every result event so the
// admin can compare before and after.

import type { FormatId, Funnel, GoalId, LevelId, ObstacleId, PlaceId, ProductId } from './content';
import { findOption } from './content';

export const VERSION = '1.0.0';

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
const TOOL_BY_GOAL: Record<GoalId, ProductId> = { first: 'free', faster: 'rtp', athx: 'rtp', xenom: 'vo2', ultra: 'vdot', hybrid: 'vo2' };

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
    paper = 'elite';
    trace.push('paper:faster');
  } else if (goal === 'athx') {
    paper = 'athx';
    trace.push('paper:athx');
  } else if (goal === 'ultra') {
    paper = 'ultra';
    trace.push('paper:ultra');
  } else if (goal === 'xenom') {
    paper = advanced ? 'elite' : 'twelve';
    trace.push('paper:xenom-' + (advanced ? 'advanced' : 'default'));
  } else {
    trace.push('paper:hybrid-default');
  }
  if ((goal === 'first' || goal === 'hybrid') && advanced) {
    paper = 'elite';
    trace.push('paper:advanced-override');
  }

  // 2. Free starting point for the goal
  let freeStart: ProductId = 'free';
  if (goal === 'ultra') freeStart = 'vdot';
  else if (goal === 'faster') freeStart = 'rtp';
  trace.push('free-start:' + freeStart);

  // 3. Primary recommendation: the format (question 4) picks the column
  let primary: ProductId = paper;
  if (format === 'phone') primary = 'app';
  else if (format === 'free') primary = freeStart;
  else if (format === 'tools') primary = TOOL_BY_GOAL[goal];
  trace.push('primary:format-' + format);

  // 4. Up to two extras, chosen from what got in the way (question 3)
  const extras: ProductId[] = [];
  if (obst.includes('options')) {
    trace.push('extras:suppressed-too-many-options');
  } else {
    if (obst.includes('run')) {
      extras.push('run12', 'vdot');
      trace.push('extras:run');
    }
    if (obst.includes('structure') || obst.includes('plateau')) {
      extras.push('app');
      trace.push('extras:structure-or-plateau');
    }
    if (obst.includes('time') || obst.includes('generic')) {
      extras.push('free');
      trace.push('extras:time-or-generic');
    }
    extras.push(freeStart);
    extras.push(format === 'paper' ? 'app' : paper);
    extras.push('free');
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

  let why = `You are training for ${goal.word}, you ${level.word} and ${place.word}. You asked to follow your plan ${format.word}.`;
  if (obst.includes('run')) why += ' Running is your weak spot, so we added a running plan and the VDOT Calculator.';
  else if (obst.includes('structure') || obst.includes('plateau')) why += ' You want more structure, so the app is listed as an extra.';
  else if (obst.includes('time')) why += ' Your time is limited, so a free plan is listed as an extra.';
  else if (obst.includes('generic')) why += ' Plans felt generic before, so the free plan is included because it is built from your race and dates.';
  else if (obst.includes('options')) why += ' You said there are too many options, so we are showing one recommendation.';
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
