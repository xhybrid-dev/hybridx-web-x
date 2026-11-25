import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { funnel } from '@/lib/plan-finder/content';
import type { Answers } from '@/lib/plan-finder/routing';
import { explain, raceBucket, raceWeeks, route, VERSION } from '@/lib/plan-finder/routing';
import { route as legacyRoute, VERSION as LEGACY_VERSION } from '@/lib/plan-finder/analytics/legacy-routing';

// The routing table changes only with this file. The oracles below are written
// as data on purpose, independently of routing.ts, so a mistake in the code and
// a mistake in the test cannot agree by accident. They restate version 2 of the
// rules (see the note at the top of routing.ts for what version 1 got wrong).

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

function isAdvanced(a: Answers) {
  return a.level === 'raced' || a.level === 'compete';
}

// Steps 1 to 3: the primary product.
function oraclePaper(a: Answers): string {
  const place = a.place!;
  switch (a.goal) {
    case 'first':
      if (isAdvanced(a)) return 'elite';
      return place === 'gym' ? 'twelve' : 'home';
    case 'faster':
      return place === 'home' ? 'home' : 'elite';
    case 'athx':
      return 'athx';
    case 'ultra':
      return 'ultra';
    default: // xenom, hybrid: no book of their own
      return isAdvanced(a) ? 'elite' : place === 'home' ? 'home' : 'twelve';
  }
}
const FREE: Record<string, string> = { first: 'free', faster: 'ste', athx: 'athxpage', xenom: 'weekplan', ultra: 'vdot', hybrid: 'weekplan' };
const TOOLS: Record<string, string> = { first: 'howto', faster: 'pacer', athx: 'athxpage', xenom: 'ste', ultra: 'vdot', hybrid: 'hybridprog' };

function oraclePrimary(a: Answers): string {
  if (a.format === 'phone') return 'app';
  if (a.format === 'free') return FREE[a.goal!];
  if (a.format === 'tools') return TOOLS[a.goal!];
  return oraclePaper(a);
}

// Step 4: the extras, an ordered list of products, then the first two that are not the primary.
function oracleSecondary(a: Answers): string[] {
  if (a.obst!.includes('options')) return [];
  const has = (o: string) => (a.obst as string[]).includes(o);
  const primary = oraclePrimary(a);
  const freePlanFits = a.goal !== 'athx' && a.goal !== 'ultra';
  const list: string[] = [];
  if (has('run')) list.push('run12', 'vdot');
  if (has('injury')) list.push('weekplan');
  if (has('plateau')) list.push('ste', 'app');
  else if (has('structure')) list.push('app');
  if (has('time')) list.push('weekplan');
  if (has('generic') && freePlanFits) list.push('free');
  list.push(FREE[a.goal!]);
  list.push(a.format === 'paper' ? 'app' : oraclePaper(a));
  list.push(a.goal === 'faster' ? 'rules' : freePlanFits ? 'free' : 'weekplan');
  list.push(freePlanFits ? 'free' : 'weekplan');
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

  // The failures the audit found in version 1, each held as a rule over every combination.
  describe('what version 1 got wrong', () => {
    const everything = () => [...allAnswers()];

    it('sends an ATHX athlete to ATHX things, never to the free HYROX plan or a road-running tool', () => {
      for (const a of everything().filter((x) => x.goal === 'athx')) {
        const r = route(a);
        const shown = [r.primary, ...r.secondary];
        for (const id of shown) {
          if (['free', 'rtp', 'run12'].includes(id) && !(id === 'run12' && a.obst!.includes('run'))) {
            expect.fail(`${id} shown to an ATHX athlete: ${JSON.stringify(a)}`);
          }
        }
        if (!a.obst!.includes('options') && a.format !== 'phone' && !shown.some((id) => ['athx', 'athxpage'].includes(id))) {
          expect.fail(`no ATHX product for ${JSON.stringify(a)}`);
        }
      }
    });

    it('gives both ATHX editions on the one card when the book is the answer', () => {
      const r = route({ goal: 'athx', level: 'new', place: 'gym', format: 'paper', obst: [] });
      expect(r.primary).toBe('athx');
      const card = funnel.catalog.athx;
      expect(card.href).toBe('https://link.amazon/B0g5sdBgd');
      expect(card.altCta).toEqual({ label: "Women's edition on Amazon", href: 'https://link.amazon/B09UkaF2U' });
      expect(card.affiliate).toBe(true);
    });

    it('sends a faster-HYROX athlete to the HYROX tools, not the road-running predictor', () => {
      for (const a of everything().filter((x) => x.goal === 'faster' && (x.format === 'free' || x.format === 'tools'))) {
        const r = route(a);
        expect(['ste', 'pacer']).toContain(r.primary);
        expect(r.primary).not.toBe('rtp');
        expect(r.secondary).not.toContain('rtp');
      }
    });

    it('never sends "calculators and free guides only" to an email-gated plan', () => {
      for (const a of everything().filter((x) => x.format === 'tools')) {
        expect(funnel.catalog[route(a).primary].destinationType, JSON.stringify(a)).not.toBe('amazon-affiliate');
        expect(route(a).primary).not.toBe('free');
        expect(route(a).primary).not.toBe('app');
      }
    });

    it('does not send "general hybrid fitness" to the plan that needs a booked race, as its tools or free answer', () => {
      for (const a of everything().filter((x) => x.goal === 'hybrid' && (x.format === 'free' || x.format === 'tools'))) {
        expect(route(a).primary).not.toBe('free');
      }
    });

    it('gives a home-only athlete the home book rather than the gym one', () => {
      for (const goal of ['faster', 'xenom', 'hybrid'] as const) {
        const r = route({ goal, level: 'new', place: 'home', format: 'paper', obst: [] });
        expect(r.primary).toBe('home');
      }
    });

    it('does something with an injury answer: lists the week planner', () => {
      const r = route({ goal: 'first', level: 'new', place: 'gym', format: 'paper', obst: ['injury'] });
      expect(r.secondary[0]).toBe('weekplan');
      expect(r.trace).toContain('extras:injury');
    });

    it('lists the strength and engine test for a plateau', () => {
      const r = route({ goal: 'first', level: 'regular', place: 'gym', format: 'paper', obst: ['plateau'] });
      expect(r.secondary).toEqual(['ste', 'app']);
    });
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
      'extras:structure',
    ]);
  });

  const GOLDEN: [Answers, string, string[]][] = [
    [{ goal: 'first', level: 'new', place: 'home', obst: ['run'], format: 'paper' }, 'home', ['run12', 'vdot']],
    [{ goal: 'first', level: 'new', place: 'gym', obst: ['structure'], format: 'paper' }, 'twelve', ['app', 'free']],
    [{ goal: 'faster', level: 'raced', place: 'gym', obst: ['plateau'], format: 'phone' }, 'app', ['ste', 'elite']],
    [{ goal: 'ultra', level: 'regular', place: 'both', obst: ['time'], format: 'free' }, 'vdot', ['weekplan', 'ultra']],
    [{ goal: 'xenom', level: 'compete', place: 'gym', obst: ['options'], format: 'tools' }, 'ste', []],
    [{ goal: 'athx', level: 'new', place: 'home', obst: [], format: 'paper' }, 'athx', ['athxpage', 'app']],
    [{ goal: 'hybrid', level: 'raced', place: 'both', obst: ['injury'], format: 'paper' }, 'elite', ['weekplan', 'app']],
    [{ goal: 'first', level: 'new', place: 'home', obst: ['generic', 'time'], format: 'free' }, 'free', ['weekplan', 'home']],
    [{ goal: 'faster', level: 'compete', place: 'gym', obst: ['run', 'plateau'], format: 'tools' }, 'pacer', ['run12', 'vdot']],
    [{ goal: 'hybrid', level: 'new', place: 'both', obst: ['none'], format: 'phone' }, 'app', ['weekplan', 'twelve']],
    [{ goal: 'athx', level: 'regular', place: 'gym', obst: ['generic'], format: 'free' }, 'athxpage', ['athx', 'weekplan']],
  ];
  it.each(GOLDEN)('golden example %#', (a, primary, secondary) => {
    const r = route(a);
    expect(r.primary).toBe(primary);
    expect(r.secondary).toEqual(secondary);
  });
});

// Version 1 is kept, frozen, for the demo-data generator, whose output is held to the
// reference implementation. This is the only place that comparison is made now.
// If handover/entry-funnel is ever removed, remove this describe with it.
describe('legacy routing (version 1)', () => {
  it('still agrees with the reference implementation on every combination', () => {
    const require = createRequire(import.meta.url);
    const ref = require('../../../handover/entry-funnel/data/routing.js');
    for (const a of allAnswers()) {
      const mine = legacyRoute(a);
      const theirs = ref.route(a);
      if (JSON.stringify(mine) !== JSON.stringify(theirs)) expect.fail(`route differs for ${JSON.stringify(a)}`);
    }
    expect(LEGACY_VERSION).toBe(ref.VERSION);
    expect(VERSION).not.toBe(LEGACY_VERSION);
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

  it('only describes what the result contains', () => {
    // "Too many options" removes the extras, so no extra is explained.
    const e = explain({ goal: 'first', obst: ['run', 'options'], format: 'paper' }, funnel, {});
    expect(e.why).toContain('too many options');
    expect(e.why).not.toMatch(/running plan|VDOT/);
    // The app is the primary here, so it is not "listed as an extra".
    const app = explain({ goal: 'first', obst: ['structure'], format: 'phone' }, funnel, {});
    expect(app.why).not.toMatch(/listed as an extra/);
    // A running weak spot that does add the running plan says so.
    expect(explain({ goal: 'first', place: 'gym', obst: ['run'], format: 'paper' }, funnel, {}).why).toMatch(/added a running plan and the VDOT Calculator/);
  });

  it('says there is no XENOM plan, and says the injury advice sensibly', () => {
    expect(explain({ goal: 'xenom', obst: [] }, funnel, {}).why).toContain('There is no XENOM plan yet');
    const injury = explain({ goal: 'first', place: 'gym', obst: ['injury'], format: 'paper' }, funnel, {});
    expect(injury.why).toContain('heavy leg days and hard runs apart');
    expect(injury.why).toMatch(/see a professional/);
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
