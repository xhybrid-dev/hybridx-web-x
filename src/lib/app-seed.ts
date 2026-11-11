// src/lib/app-seed.ts
//
// Sign-up links that carry a tool's answers into the app, so its sign-up form
// opens already filled in and the athlete starts on the plan their answers
// point to (docs/content-engine-plan.md, step 11 and section 7.3).
//
// Plain parameters on app.hybridx.club/signup, not a signed seed: everything
// here is an answer the athlete gives on that form anyway, shown to them and
// changeable before anything is saved. The app checks each value against its
// own choices and ignores the rest (its src/lib/signup-seed.ts). The values
// are pinned on both sides: the cross-repo test here, signup-seed.test.ts there.
//
// The coaching mapping (which answers mean which programme) lives here, next
// to the tools; the programme catalogue lives in the app.
//
// Imported by client components: nothing here may reach the server-only graph.

import type { PlannerInput } from '@/lib/calculators/week-planner';
import type { Division, Verdict } from '@/lib/calculators/strength-engine';
import { APP_SIGNUP_URL } from '@/lib/app-links';

export const SEED_TOOLS = ['week-planner', 'strength-engine-test', 'athx', 'free-plan'] as const;
export type SeedTool = (typeof SEED_TOOLS)[number];

export const SEED_EVENTS = ['hyrox', 'athx'] as const;
export const ATHX_EDITIONS = ['men', 'women'] as const;
export type AthxEdition = (typeof ATHX_EDITIONS)[number];
export const ATHX_DIVISIONS = ['lite', 'athx', 'pro'] as const;
export type AthxDivision = (typeof ATHX_DIVISIONS)[number];

export interface AppSeed {
  tool?: SeedTool;
  event?: (typeof SEED_EVENTS)[number];
  experience?: 'beginner' | 'intermediate' | 'advanced';
  /** Training days a week, 1 to 7. The app folds 5 and up into "5+". */
  days?: number;
  goal?: 'strength' | 'endurance' | 'hybrid';
  edition?: AthxEdition;
  division?: AthxDivision;
  /** YYYY-MM-DD, at least a week away. */
  race?: string;
}

/** The parameter order is fixed so a link reads the same every time. */
const KEYS: (keyof AppSeed)[] = ['tool', 'event', 'experience', 'days', 'goal', 'edition', 'division', 'race'];

/** app.hybridx.club/signup with the seed. TrackedLink adds the src. */
export function appSignupHref(seed: AppSeed): string {
  const q = new URLSearchParams();
  for (const k of KEYS) {
    const v = seed[k];
    if (v !== undefined && v !== '') q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `${APP_SIGNUP_URL}?${s}` : APP_SIGNUP_URL;
}

/**
 * The week planner's answers. Days carry straight over; the goal sets the
 * event and a starting level the athlete can change on the form:
 *   first HYROX       beginner, strength and engine together (First Steps)
 *   a faster HYROX    intermediate, strength and engine together
 *   ATHX              the ATHX 2027 plans; edition and division are asked
 *   faster 10k, stronger  strength and engine together; level left to them
 * Kit and long-run day have no question in the app, so they stay behind.
 */
export function seedFromPlanner(input: Pick<PlannerInput, 'days' | 'goal'>): AppSeed {
  const base: AppSeed = { tool: 'week-planner', days: input.days };
  switch (input.goal) {
    case 'first-hyrox':
      return { ...base, event: 'hyrox', experience: 'beginner', goal: 'hybrid' };
    case 'faster-hyrox':
      return { ...base, event: 'hyrox', experience: 'intermediate', goal: 'hybrid' };
    case 'athx':
      return { ...base, event: 'athx' };
    case '10k-strength':
      return { ...base, event: 'hyrox', goal: 'hybrid' };
  }
}

/**
 * The strength and engine test's verdict, as a goal: train the limiter.
 * Someone who has just tested three lifts and a 5 km is past beginner; a Pro
 * division is the advanced level.
 */
export function seedFromStrengthTest(division: Division, verdict: Verdict): AppSeed {
  return {
    tool: 'strength-engine-test',
    event: 'hyrox',
    experience: division.endsWith('-pro') ? 'advanced' : 'intermediate',
    goal: verdict === 'force-limited' ? 'strength' : verdict === 'engine-limited' ? 'endurance' : 'hybrid',
  };
}

/**
 * The free 12-week plan's success screen: the race date the reader has just
 * given, so the app plan finishes on race day too. Only the date: the free
 * plan runs on three or four days, so it says nothing about level or days.
 */
export function seedFromFreePlan(raceDate: string): AppSeed {
  return { tool: 'free-plan', event: 'hyrox', ...(/^\d{4}-\d{2}-\d{2}$/.test(raceDate) ? { race: raceDate } : {}) };
}

/** The ATHX page: the ATHX 2027 plans, in the edition the athlete picks there. */
export function seedForAthx(edition?: AthxEdition): AppSeed {
  return { tool: 'athx', event: 'athx', ...(edition ? { edition } : {}) };
}
