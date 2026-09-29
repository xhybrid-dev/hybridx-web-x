import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { funnel } from '@/lib/plan-finder/content';
import type { Answers } from '@/lib/plan-finder/routing';
import { explain, raceBucket, raceWeeks, route, VERSION } from '@/lib/plan-finder/routing';

// The routing table changes only with this file. The oracles below are written
// as data on purpose, independently of routing.ts, so a mistake in the code and
// a mistake in the test cannot agree by accident. They restate the tables in
// handover/entry-funnel/docs/02-funnel-spec.md.

const ids = (list: { id: string }[]) => list.map((x) => x.id);
const GOALS = ids(funnel.goals);
const LEVELS = ids(funnel.levels);
const PLACES = ids(funnel.places);
const FORMATS = ids(funnel.formats);
const OBST = ids(funnel.obstacles);

function* allAnswers(): Generator<Answers> {
  for (const goal of GOALS)
    for (const level of LEVELS)
      for (const place of PLACES)
        for (const format of FORMATS)
          for (let mask = 0; mask < 1 << OBST.length; mask++) {
            const obst = OBST.filter((_, i) => mask & (1 << i));
            yield { goal, level, place, format, obst } as Answers;
          }
}

// docs/02, steps 1 to 3: the primary product.
const PAPER: Record<string, string | Record<string, string>> = {
  first: { gym: 'twelve', home: 'home', both: 'home' },
  faster: 'elite',
  athx: 'athx',
  ultra: 'ultra',
  xenom: { adv: 'elite', std: 'twelve' },
  hybrid: { adv: 'elite', std: 'twelve' },
};
const FREE: Record<string, string> = { first: 'free', faster: 'rtp', athx: 'free', xenom: 'free', ultra: 'vdot', hybrid: 'free' };
const TOOLS: Record<string, string> = { first: 'free', faster: 'rtp', athx: 'rtp', xenom: 'vo2', ultra: 'vdot', hybrid: 'vo2' };

function isAdvanced(a: Answers) {
  return a.level === 'raced' || a.level === 'compete';
}
function oraclePaper(a: Answers): string {
  if ((a.goal === 'first' || a.goal === 'hybrid') && isAdvanced(a)) return 'elite';
  const p = PAPER[a.goal!];
  if (typeof p === 'string') return p;
  return a.goal === 'first' ? p[a.place!] : p[isAdvanced(a) ? 'adv' : 'std'];
}
function oraclePrimary(a: Answers): string {
  if (a.format === 'phone') return 'app';
  if (a.format === 'free') return FREE[a.goal!];
  if (a.format === 'tools') return TOOLS[a.goal!];
  return oraclePaper(a);
}

// docs/02, step 4: the extras, as an ordered list of [condition, products].
const EXTRAS_ORDER: [(a: Answers) => boolean, (a: Answers) => string[]][] = [
  [(a) => a.obst!.includes('run'), () => ['run12', 'vdot']],
  [(a) => a.obst!.includes('structure') || a.obst!.includes('plateau'), () => ['app']],
  [(a) => a.obst!.includes('time') || a.obst!.includes('generic'), () => ['free']],
  [() => true, (a) => [FREE[a.goal!]]],
  [() => true, (a) => [a.format === 'paper' ? 'app' : oraclePaper(a)]],
  [() => true, () => ['free']],
];
function oracleSecondary(a: Answers): string[] {
  if (a.obst!.includes('options')) return [];
  const primary = oraclePrimary(a);
  const list = EXTRAS_ORDER.filter(([when]) => when(a)).flatMap(([, give]) => give(a));
  return [...new Set(list.filter((id) => id !== primary))].slice(0, 2);
}

describe('plan finder routing', () => {
  it('matches the documented primary product for every one of the 73,728 combinations', () => {
    let n = 0;
    for (const a of allAnswers()) {
      const r = route(a);
      if (r.primary !== oraclePrimary(a)) expect.fail(`primary ${r.primary} for ${JSON.stringify(a)}`);
      n++;
    }
    expect(n).toBe(6 * 4 * 3 * 4 * 256);
    expect(n).toBe(73_728);
  });

  it('matches the documented extras for every combination', () => {
    for (const a of allAnswers()) {
      const got = route(a).secondary;
      const want = oracleSecondary(a);
      if (JSON.stringify(got) !== JSON.stringify(want)) expect.fail(`extras ${JSON.stringify(got)} ≠ ${JSON.stringify(want)} for ${JSON.stringify(a)}`);
    }
  });

  it('keeps the structural rules for every combination', () => {
    for (const a of allAnswers()) {
      const r = route(a);
      const where = JSON.stringify(a);
      if (!funnel.catalog[r.primary]) expect.fail(`primary not in catalog: ${r.primary}`);
      if (r.secondary.length > 2) expect.fail(`more than two extras: ${where}`);
      if (new Set(r.secondary).size !== r.secondary.length) expect.fail(`duplicate extras: ${where}`);
      if (r.secondary.includes(r.primary)) expect.fail(`extra repeats the primary: ${where}`);
      for (const id of r.secondary) if (!funnel.catalog[id]) expect.fail(`extra not in catalog: ${id}`);
      if (a.obst!.includes('options')) {
        if (r.secondary.length) expect.fail(`too many options must show one recommendation: ${where}`);
      } else if (r.secondary.length < 1) {
        expect.fail(`expected at least one extra: ${where}`);
      }
      if (a.obst!.includes('run') && !a.obst!.includes('options')) {
        const expected = ['run12', 'vdot'].filter((x) => x !== r.primary);
        if (JSON.stringify(r.secondary.slice(0, expected.length)) !== JSON.stringify(expected)) {
          expect.fail(`running weak spot must lead the extras: ${where}`);
        }
      }
      if (r.trace.length < 3) expect.fail(`trace too short: ${where}`);
      if (r.version !== VERSION) expect.fail('version missing');
    }
  });

  it('falls back to a valid result when answers are missing', () => {
    const r = route({});
    expect(r.primary).toBe('home');
    expect(route().secondary).toEqual(r.secondary);
  });

  it('records the rules that fired', () => {
    expect(route({ goal: 'first', level: 'new', place: 'gym', obst: ['structure'], format: 'phone' }).trace).toEqual([
      'paper:first-gym',
      'free-start:free',
      'primary:format-phone',
      'extras:structure-or-plateau',
    ]);
  });

  const GOLDEN: [Answers, string, string[]][] = [
    [{ goal: 'first', level: 'new', place: 'home', obst: ['run'], format: 'paper' }, 'home', ['run12', 'vdot']],
    [{ goal: 'first', level: 'new', place: 'gym', obst: ['structure'], format: 'paper' }, 'twelve', ['app', 'free']],
    [{ goal: 'faster', level: 'raced', place: 'gym', obst: ['plateau'], format: 'phone' }, 'app', ['rtp', 'elite']],
    [{ goal: 'ultra', level: 'regular', place: 'both', obst: ['time'], format: 'free' }, 'vdot', ['free', 'ultra']],
    [{ goal: 'xenom', level: 'compete', place: 'gym', obst: ['options'], format: 'tools' }, 'vo2', []],
    [{ goal: 'athx', level: 'new', place: 'home', obst: [], format: 'paper' }, 'athx', ['free', 'app']],
    [{ goal: 'hybrid', level: 'raced', place: 'both', obst: ['injury'], format: 'paper' }, 'elite', ['free', 'app']],
    [{ goal: 'first', level: 'new', place: 'home', obst: ['generic', 'time'], format: 'free' }, 'free', ['home']],
    [{ goal: 'faster', level: 'compete', place: 'gym', obst: ['run', 'plateau'], format: 'tools' }, 'rtp', ['run12', 'vdot']],
    [{ goal: 'hybrid', level: 'new', place: 'both', obst: ['none'], format: 'phone' }, 'app', ['free', 'twelve']],
  ];
  it.each(GOLDEN)('golden example %#', (a, primary, secondary) => {
    const r = route(a);
    expect(r.primary).toBe(primary);
    expect(r.secondary).toEqual(secondary);
  });

  // The port must behave exactly as the reference it came from. If
  // handover/entry-funnel is ever removed, remove this test with it.
  it('agrees with the reference implementation on every combination', () => {
    const require = createRequire(import.meta.url);
    const ref = require('../../../handover/entry-funnel/data/routing.js');
    for (const a of allAnswers()) {
      const mine = route(a);
      const theirs = ref.route(a);
      if (JSON.stringify(mine) !== JSON.stringify(theirs)) expect.fail(`route differs for ${JSON.stringify(a)}`);
    }
    for (const goal of GOALS)
      for (const level of LEVELS)
        for (const place of PLACES)
          for (const format of FORMATS)
            for (const obst of [[], ['run'], ['structure'], ['time'], ['generic'], ['options'], ['none'], ['injury', 'plateau']])
              for (const weeks of [0, 1, 5, 12, 40]) {
                const a = { goal, level, place, format, obst } as Answers;
                expect(explain(a, funnel, { weeks })).toEqual(ref.explain(a, funnel, { weeks }));
              }
    expect(VERSION).toBe(ref.VERSION);
  });
});

describe('explain', () => {
  it('works for every combination and restates the answers', () => {
    for (const goal of GOALS)
      for (const level of LEVELS)
        for (const place of PLACES)
          for (const format of FORMATS) {
            const e = explain({ goal, level, place, format, obst: ['run'] } as Answers, funnel, { weeks: 0 });
            expect(e.why).toMatch(/^You are training for /);
            expect(e.chips.length).toBeGreaterThanOrEqual(5);
          }
  });

  it('describes the weeks to the race', () => {
    expect(explain({ goal: 'first', obst: [] }, funnel, { weeks: 20 }).why).toMatch(/20 weeks until your race, which is enough for a full 12-week plan/);
    expect(explain({ goal: 'first', obst: [] }, funnel, { weeks: 1 }).why).toMatch(/1 week until your race, so start this week/);
    expect(explain({ goal: 'first', obst: [] }, funnel, { weeks: 1 }).chips).toContain('Race in 1 week');
  });
});

describe('race date', () => {
  const today = new Date(2026, 8, 29); // 29 September 2026, local time

  it('turns a date into whole weeks', () => {
    expect(raceWeeks('2026-12-22', today)).toBe(12); // 84 days
    expect(raceWeeks('2026-09-30', today)).toBe(1); // tomorrow still counts as a week
    expect(raceWeeks('2026-10-13', today)).toBe(2);
  });

  it('ignores dates in the past, today, and more than two years ahead', () => {
    expect(raceWeeks('2026-09-28', today)).toBe(0);
    expect(raceWeeks('2026-09-29', today)).toBe(0);
    expect(raceWeeks('2028-09-28', today)).toBe(104); // 730 days: the last date accepted
    expect(raceWeeks('2028-09-29', today)).toBe(0); // 731 days
  });

  it('ignores anything that is not a YYYY-MM-DD date', () => {
    for (const bad of ['', '29/09/2027', '2027-9-1', 'soon', '2027-01-01T00:00']) expect(raceWeeks(bad, today)).toBe(0);
  });

  it('is independent of the time of day', () => {
    expect(raceWeeks('2026-12-22', new Date(2026, 8, 29, 23, 59))).toBe(12);
    expect(raceWeeks('2026-12-22', new Date(2026, 8, 29, 0, 1))).toBe(12);
  });

  it('buckets the weeks, so no date leaves the browser', () => {
    expect([0, 1, 4, 5, 11, 12, 23, 24, 104].map(raceBucket)).toEqual(['none', '1-4', '1-4', '5-11', '5-11', '12-23', '12-23', '24+', '24+']);
  });
});

describe('funnel.json', () => {
  it('has unique option ids', () => {
    for (const list of [funnel.goals, funnel.levels, funnel.places, funnel.obstacles, funnel.formats]) {
      expect(new Set(ids(list)).size).toBe(list.length);
    }
  });

  it('has a complete catalog entry for every product', () => {
    for (const [id, c] of Object.entries(funnel.catalog)) {
      expect(c.id).toBe(id);
      expect(c.href, `${id} has an https link`).toMatch(/^https:\/\//);
      for (const k of ['kind', 'badge', 'head', 'title', 'meta', 'price', 'cta', 'status', 'destinationType'] as const) {
        expect(c[k], `${id} has ${k}`).toBeTruthy();
      }
      expect(['live', 'confirm']).toContain(c.status);
      expect(typeof c.affiliate).toBe('boolean');
    }
  });

  it('has no product still waiting on confirmation', () => {
    // docs/08 A10: every result link goes to a live page. A `confirm` row came
    // from notes, not from the live site, and must not ship.
    const waiting = Object.values(funnel.catalog).filter((c) => c.status !== 'live').map((c) => c.id);
    expect(waiting).toEqual([]);
  });

  it('keeps affiliate links and the affiliate destination type together', () => {
    for (const c of Object.values(funnel.catalog)) {
      expect(c.destinationType === 'amazon-affiliate', c.id).toBe(c.affiliate);
    }
  });

  it('has copy for all five stations and steps', () => {
    expect(funnel.stations).toHaveLength(5);
    for (const s of ['1', '2', '3', '4', '5'] as const) expect(funnel.steps[s].title).toBeTruthy();
  });

  it('defines every product the routing can return', () => {
    const reachable = new Set<string>();
    for (const a of allAnswers()) {
      const r = route(a);
      reachable.add(r.primary);
      r.secondary.forEach((id) => reachable.add(id));
    }
    for (const id of reachable) expect(funnel.catalog).toHaveProperty(id);
  });
});
