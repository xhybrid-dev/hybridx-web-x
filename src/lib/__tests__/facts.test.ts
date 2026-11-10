import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  APP,
  ATHLETES,
  DIVISIONS,
  LOADS_CHECK,
  RUNS,
  STATION_STANDARDS,
  STATION_WORK,
  UNCOVERED_FORMATS,
  appPriceLabel,
  division,
  type DivisionLoads,
} from '@/lib/facts';
import { STATIONS as WATCH_STATIONS } from '@/lib/race-content';

/*
 * The facts registry is only worth having if nothing else on the site says
 * something different. These tests hold it together with the two modules that
 * already describe the stations, and hold the site's hand-written copy to its
 * trial length, price and athlete count. "First month free" sat in llms.txt
 * for months after the trial became 14 days because nothing compared them.
 */

const ROOT = path.resolve(__dirname, '../../..');
const SKIP_DIRS = new Set(['__tests__', 'facts', 'node_modules']);

function copyFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(name)) out.push(...copyFiles(full));
    } else if (/\.(tsx?|json)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const COPY = [...copyFiles(path.join(ROOT, 'src')), path.join(ROOT, 'public/llms.txt')].map((file) => ({
  file: path.relative(ROOT, file),
  lines: readFileSync(file, 'utf8').split('\n'),
}));

/** Every match of `pattern` in the site's copy, with where it was found. */
function findInCopy(pattern: RegExp): { where: string; match: RegExpExecArray }[] {
  const found: { where: string; match: RegExpExecArray }[] = [];
  for (const { file, lines } of COPY) {
    lines.forEach((line, i) => {
      for (const match of line.matchAll(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'))) {
        found.push({ where: `${file}:${i + 1}`, match: match as RegExpExecArray });
      }
    });
  }
  return found;
}

describe('station work', () => {
  it('runs 1 to 8 in order', () => {
    expect(STATION_WORK.map((s) => s.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('is either a distance or a rep count, never both', () => {
    for (const s of STATION_WORK) {
      expect((s.metres === null) !== (s.reps === null), s.id).toBe(true);
    }
  });

  it('names the same stations in the same order as the 2026/27 rule guide', () => {
    const rules = [...STATION_STANDARDS].sort((a, b) => a.order - b.order);
    expect(STATION_WORK.map((s) => [s.id, s.name])).toEqual(rules.map((s) => [s.id, s.name]));
  });

  it('agrees with the completion standard the rule guide prints', () => {
    for (const s of STATION_WORK) {
      const standard = STATION_STANDARDS.find((r) => r.id === s.id)!.standard;
      const phrase = s.metres !== null ? `${s.metres.toLocaleString('en-GB')} metres` : `${s.reps} valid reps`;
      expect(standard, s.id).toContain(phrase);
    }
  });

  it('agrees with the work the watch records', () => {
    expect(WATCH_STATIONS.map((w) => w.work)).toEqual(
      STATION_WORK.map((s) => (s.metres !== null ? `${s.metres} m` : `${s.reps} reps`)),
    );
  });

  it('has eight 1 km runs', () => {
    expect(RUNS).toEqual({ count: 8, metres: 1000 });
  });
});

describe('division loads', () => {
  const LOADS: (keyof DivisionLoads)[] = ['sledPushKg', 'sledPullKg', 'farmersCarryKgEach', 'sandbagKg', 'wallBallKg'];

  it('covers the four singles divisions, once each', () => {
    expect(DIVISIONS.map((d) => d.id).sort()).toEqual(['men-open', 'men-pro', 'women-open', 'women-pro']);
  });

  it('gives Women Pro the Men Open loads', () => {
    // The ladder every source agrees on, and a check that catches a typo in
    // either row.
    for (const key of LOADS) {
      expect(division('women-pro')[key], key).toBe(division('men-open')[key]);
    }
  });

  it('makes Pro heavier than Open, and men heavier than women, at every load', () => {
    for (const key of LOADS) {
      expect(division('women-pro')[key], key).toBeGreaterThan(division('women-open')[key] as number);
      expect(division('men-pro')[key], key).toBeGreaterThan(division('men-open')[key] as number);
      expect(division('men-open')[key], key).toBeGreaterThan(division('women-open')[key] as number);
      expect(division('men-pro')[key], key).toBeGreaterThan(division('women-pro')[key] as number);
    }
  });

  it('sets the wall ball target by sex, not category', () => {
    for (const d of DIVISIONS) {
      expect(d.wallBallTargetMetres, d.id).toBe(d.sex === 'women' ? 2.7 : 3.0);
    }
  });

  it('says why doubles and relay are not stated', () => {
    expect(UNCOVERED_FORMATS.map((f) => f.format)).toEqual(['doubles', 'relay']);
    for (const f of UNCOVERED_FORMATS) expect(f.reason.length).toBeGreaterThan(20);
  });

  it('records confirmation as a date or not at all', () => {
    expect(LOADS_CHECK.confirmedOn === null || /^\d{4}-\d{2}-\d{2}$/.test(LOADS_CHECK.confirmedOn)).toBe(true);
    expect(LOADS_CHECK.agreedBy.length).toBeGreaterThanOrEqual(2);
  });
});

describe('product facts', () => {
  it('writes the price the way the copy does', () => {
    expect(appPriceLabel()).toBe('£5/month');
    expect(appPriceLabel('words')).toBe('£5 a month');
  });

  it('does not list the store apps as available while they are unpublished', () => {
    // Flip APP.availability when they are in the stores, and this with it.
    expect(APP.availability).toEqual({ web: true, ios: false, android: false });
  });
});

describe('the site copy agrees with the product facts', () => {
  it('states one trial length everywhere', () => {
    const lengths = [
      ...findInCopy(/(\d+)[- ]day free trial/gi),
      ...findInCopy(/first (\d+) days are free/gi),
    ].filter(({ match }) => Number(match[1]) !== APP.trialDays);
    const monthFree = findInCopy(/\b(?:first|1st) month (?:is )?free\b|\bfree (?:first )?month\b/gi);
    const wrong = [...lengths, ...monthFree].map(({ where, match }) => `${where}: "${match[0]}"`);
    expect(wrong, `trial is ${APP.trialDays} days (src/lib/facts/product.ts)`).toEqual([]);
  });

  it('states one monthly price everywhere', () => {
    const wrong = findInCopy(/£(\d+(?:\.\d{2})?)\s?(?:\/\s?mo(?:nth)?\b|per month|a month)/gi)
      .filter(({ match }) => Math.round(Number(match[1]) * 100) !== APP.pricePence)
      .map(({ where, match }) => `${where}: "${match[0]}"`);
    expect(wrong, `price is ${appPriceLabel()} (src/lib/facts/product.ts)`).toEqual([]);
  });

  it('states the athlete count as the registry does, and never as app users', () => {
    const counts = findInCopy(/over ([\d,]+)\+? athletes/gi)
      .filter(({ match }) => Number(match[1].replace(/,/g, '')) !== ATHLETES.count)
      .map(({ where, match }) => `${where}: "${match[0]}"`);
    expect(counts).toEqual([]);

    const asUsers = findInCopy(/([\d,]+)\+?\s+(?:app\s+)?(?:users|subscribers|members)\b/gi)
      .filter(({ match }) => Number(match[1].replace(/,/g, '')) === ATHLETES.count)
      .map(({ where, match }) => `${where}: "${match[0]}"`);
    expect(asUsers, 'the 2,000 are athletes who trained with HybridX plans, mostly book buyers').toEqual([]);
  });
});
