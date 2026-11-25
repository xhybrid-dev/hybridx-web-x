// src/lib/plan-finder/analytics/legacy-routing.ts
//
// Version 1.0.0 of the plan finder's routing rules, frozen. The synthetic traffic
// generator (seed.ts) builds demo and test data from the routing, and its output
// is held to the reference implementation in handover/entry-funnel (see
// plan-finder-parity.test.ts), which has only these rules. The live routing is
// version 2 (../routing.ts); this copy exists so that comparison, and the demo
// data, stay reproducible. Do not use it for anything a visitor sees.

import type { FormatId, GoalId, LevelId, ObstacleId, PlaceId, ProductId } from '../content';

export const VERSION = '1.0.0';

export interface LegacyAnswers {
  goal?: GoalId | null;
  level?: LevelId | null;
  place?: PlaceId | null;
  obst?: ObstacleId[];
  format?: FormatId | null;
}

export interface LegacyRoute {
  primary: ProductId;
  secondary: ProductId[];
  paper: ProductId;
  freeStart: ProductId;
  trace: string[];
  version: string;
}

const ADVANCED: LevelId[] = ['raced', 'compete'];
const TOOL_BY_GOAL: Record<GoalId, ProductId> = { first: 'free', faster: 'rtp', athx: 'rtp', xenom: 'vo2', ultra: 'vdot', hybrid: 'vo2' };

/** Missing answers fall back to first / new / home / paper, so a result always exists. */
export function route(answers: LegacyAnswers = {}): LegacyRoute {
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

