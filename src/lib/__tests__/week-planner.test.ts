import { describe, expect, it } from 'vitest';
import {
  DAY_COUNTS,
  GOALS,
  KITS,
  KIT_EQUIPMENT,
  WEEKS,
  nextMonday,
  parsePlannerInput,
  pick,
  planWeek,
  planWeeks,
  plannerIcs,
  plannerKey,
  plannerQuery,
  type PlannerInput,
} from '../calculators/week-planner';
import { BANNED_DASHES, BANNED_PHRASES, findWordViolations } from '../guides/bible';

/*
 * The week planner's rules (src/lib/calculators/week-planner.ts), checked for
 * every combination of days, goal, kit and long-run day, in every week.
 */

const ALL: PlannerInput[] = DAY_COUNTS.flatMap((days) =>
  GOALS.flatMap((goal) => KITS.flatMap((kit) => Array.from({ length: 7 }, (_, longRunDay) => ({ days, goal, kit, longRunDay })))),
);
const label = (i: PlannerInput, week: number) => `${plannerKey(i)} week ${week}`;
const at = <T,>(xs: T[], i: number) => xs[((i % 7) + 7) % 7];

describe('every plan, every week', () => {
  it('covers all 336 combinations', () => {
    expect(ALL).toHaveLength(336);
  });

  for (const input of ALL) {
    const weeks = planWeeks(input);
    it(plannerKey(input), () => {
      expect(weeks).toHaveLength(WEEKS);
      for (const w of weeks) {
        const days = w.days;
        const where = label(input, w.week);
        const trained = days.filter((d) => d.sessions.length);
        const hard = days.map((d) => d.sessions.some((s) => s.hard));
        const heavy = days.map((d) => d.sessions.some((s) => s.heavyLegs));
        const hardRun = days.map((d) => d.sessions.some((s) => s.hardRun));
        const L = input.longRunDay;

        // 1. the chosen number of training days, the long run on its day
        expect(trained.length, where).toBe(input.days);
        expect(days[L].sessions.map((s) => s.kind), where).toEqual(['long-run']);
        expect(days.flatMap((d) => d.sessions).filter((s) => s.kind === 'long-run'), where).toHaveLength(1);

        // 2. rest the day after the long run
        expect(at(days, L + 1).sessions, where).toEqual([]);

        // 3. no touching hard days in a 3-day week; never three in a row
        for (let d = 0; d < 7; d++) {
          if (input.days === 3) expect(hard[d] && at(hard, d + 1), `${where}: ${d}`).toBe(false);
          expect(hard[d] && at(hard, d + 1) && at(hard, d + 2), `${where}: ${d}`).toBe(false);
        }

        for (let d = 0; d < 7; d++) {
          // 4. heavy legs and a hard run never share a day
          expect(heavy[d] && hardRun[d], `${where}: day ${d}`).toBe(false);
          // 5. a full day between heavy legs and the next hard run or long run
          if (heavy[d]) {
            expect(at(hardRun, d + 1), `${where}: hard run the day after heavy legs`).toBe(false);
            expect(at(days, d + 1).sessions.some((s) => s.kind === 'long-run'), `${where}: long run after heavy legs`).toBe(false);
          }
          // 6. strength before the run when they share a day
          const s = days[d].sessions;
          const firstRun = s.findIndex((x) => x.run);
          const lastLift = s.map((x) => !x.run).lastIndexOf(true);
          if (firstRun >= 0 && lastLift >= 0) expect(lastLift < firstRun, `${where}: strength first`).toBe(true);
        }

        // 7. nothing needs kit they do not have
        for (const s of days.flatMap((d) => d.sessions)) {
          for (const e of s.uses) expect(KIT_EQUIPMENT[input.kit], `${where}: ${s.title}`).toContain(e);
        }
      }

      // 8. weeks 1 to 3 build; week 4 is lighter than week 3
      const minutes = weeks.map((w) => w.totalMinutes);
      expect(minutes[1], plannerKey(input)).toBeGreaterThanOrEqual(minutes[0]);
      expect(minutes[2], plannerKey(input)).toBeGreaterThanOrEqual(minutes[1]);
      expect(minutes[3], plannerKey(input)).toBeLessThan(minutes[2]);
    });
  }
});

describe('kit swaps', () => {
  it('swaps the sled and the SkiErg for what the kit has', () => {
    expect(pick('sledPush', 'full-gym').name).toBe('Sled push');
    expect(pick('sledPush', 'no-sled').name).toMatch(/without a sled/);
    expect(pick('ski', 'basic-gym').name).toBe('Rower');
    expect(pick('ski', 'home').name).toBe('Kettlebell swings');
    expect(pick('squat', 'home').name).toBe('Goblet squat');
    expect(pick('wallBall', 'home').name).toBe('Dumbbell thrusters');
  });
});

describe('the doses', () => {
  it('never gives a distance to a move done for reps or time', () => {
    const DISTANCE = /\b(metres|lengths)\b/;
    const distanceMoves = /^(Sled push|SkiErg|Rower|Farmers carry|Carry|Walking lunges)/;
    for (const s of ALL.flatMap((i) => planWeeks(i)).flatMap((w) => w.days.flatMap((d) => d.sessions))) {
      for (const m of s.moves) {
        if (DISTANCE.test(m.dose)) expect(m.name, `${s.title}: ${m.name}: ${m.dose}`).toMatch(distanceMoves);
      }
    }
  });
});

describe('the wording', () => {
  it('follows the coaching bible: no banned phrases, no em dashes', () => {
    const text = ALL.flatMap((i) => planWeeks(i))
      .flatMap((w) => w.days.flatMap((d) => d.sessions))
      .flatMap((s) => [s.title, s.main, s.effort, s.notes ?? '', ...s.moves.flatMap((m) => [m.name, m.dose])]);
    for (const t of new Set(text)) {
      expect(findWordViolations(t, BANNED_PHRASES), t).toEqual([]);
      expect(findWordViolations(t, BANNED_DASHES), t).toEqual([]);
    }
  });
});

describe('reading the inputs', () => {
  const q = (s: string) => {
    const p = new URLSearchParams(s);
    return parsePlannerInput((k) => p.get(k));
  };

  it('round-trips through the query string', () => {
    const input: PlannerInput = { days: 4, goal: 'athx', kit: 'no-sled', longRunDay: 6 };
    expect(q(plannerQuery(input))).toEqual(input);
  });

  it('refuses anything outside the choices', () => {
    for (const bad of ['days=6&goal=athx&kit=home&long=sun', 'days=4&goal=marathon&kit=home&long=sun', 'days=4&goal=athx&kit=pool&long=sun', 'days=4&goal=athx&kit=home&long=someday', '']) {
      expect(q(bad), bad).toBeNull();
    }
  });
});

describe('the calendar file', () => {
  const input: PlannerInput = { days: 3, goal: 'first-hyrox', kit: 'home', longRunDay: 5 };

  it('starts on the next Monday', () => {
    expect(nextMonday(new Date('2026-11-11T10:00:00Z')).toISOString()).toBe('2026-11-16T00:00:00.000Z');
    expect(nextMonday(new Date('2026-11-16T10:00:00Z')).toISOString()).toBe('2026-11-16T00:00:00.000Z');
  });

  it('has one all-day event per session, on the right dates, with lines folded', () => {
    const ics = plannerIcs(planWeeks(input), nextMonday(new Date('2026-11-11T10:00:00Z')), new Date('2026-11-11T10:00:00Z'));
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3 * WEEKS);
    // Saturday 21 November is the first long run.
    expect(ics).toContain('DTSTART;VALUE=DATE:20261121\r\nDTEND;VALUE=DATE:20261122\r\nSUMMARY:Week 1: Long easy run');
    for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length, line).toBeLessThanOrEqual(75);
  });

  it('can export a single week', () => {
    const ics = plannerIcs([planWeek(input, 1)], nextMonday(new Date('2026-11-11T10:00:00Z')));
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
  });
});
