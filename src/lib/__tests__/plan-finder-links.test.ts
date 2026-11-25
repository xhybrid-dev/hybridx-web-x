import { describe, expect, it } from 'vitest';
import { funnel } from '@/lib/plan-finder/content';
import { resultHref } from '@/lib/plan-finder/links';
import { seedFromPlanFinder } from '@/lib/app-seed';

const p = (id: keyof typeof funnel.catalog) => funnel.catalog[id];

describe('where a result goes', () => {
  it('opens the app sign-up already filled in, with the race date when it is a week or more away', () => {
    const href = resultHref(p('app'), { goal: 'first', level: 'new' }, '2027-03-13', 15);
    const u = new URL(href);
    expect(u.origin + u.pathname).toBe('https://app.hybridx.club/signup');
    expect(Object.fromEntries(u.searchParams)).toEqual({ event: 'hyrox', experience: 'beginner', goal: 'hybrid', race: '2027-03-13' });
    // The plan finder is not a new "tool" for the app to know about.
    expect(u.searchParams.has('tool')).toBe(false);
  });

  it('leaves the race date out when there is none, or it is too close', () => {
    expect(new URL(resultHref(p('app'), { goal: 'faster', level: 'raced' }, '', 0)).searchParams.has('race')).toBe(false);
    expect(new URL(resultHref(p('app'), { goal: 'faster', level: 'raced' }, '2026-12-01', 0)).searchParams.has('race')).toBe(false);
  });

  it('seeds ATHX with the ATHX tool and event, and the other goals with values the app already knows', () => {
    expect(seedFromPlanFinder({ goal: 'athx', level: 'new' }, '2027-01-23', true)).toEqual({ tool: 'athx', event: 'athx', race: '2027-01-23' });
    expect(seedFromPlanFinder({ goal: 'ultra', level: 'compete' }, '', false)).toEqual({ goal: 'endurance', experience: 'advanced' });
    expect(seedFromPlanFinder({ goal: 'hybrid', level: 'regular' }, '', false)).toEqual({ goal: 'hybrid', experience: 'intermediate' });
    expect(seedFromPlanFinder({ goal: 'faster', level: 'new' }, '', false).experience).toBe('intermediate');
  });

  it('carries the race date on to the free plan', () => {
    expect(resultHref(p('free'), { goal: 'first' }, '2027-03-13', 15)).toBe('https://hybridx.club/free-hyrox-plan?race=2027-03-13');
    expect(resultHref(p('free'), { goal: 'first' }, '', 0)).toBe('https://hybridx.club/free-hyrox-plan');
  });

  it('opens the week planner on the goal the visitor named', () => {
    expect(resultHref(p('weekplan'), { goal: 'athx' }, '', 0)).toBe('https://hybridx.club/calculators/week-planner?goal=athx');
    expect(resultHref(p('weekplan'), { goal: 'faster' }, '', 0)).toBe('https://hybridx.club/calculators/week-planner?goal=faster-hyrox');
    expect(resultHref(p('weekplan'), { goal: 'hybrid' }, '', 0)).toBe('https://hybridx.club/calculators/week-planner?goal=10k-strength');
  });

  it('opens the ATHX page on its calculator for the tools answer', () => {
    expect(resultHref(p('athxpage'), { goal: 'athx', format: 'tools' }, '', 0)).toBe('https://hybridx.club/athx-2027#calculator');
    expect(resultHref(p('athxpage'), { goal: 'athx', format: 'free' }, '', 0)).toBe('https://hybridx.club/athx-2027');
  });

  it('leaves every other product where the catalog put it', () => {
    for (const id of ['vdot', 'pacer', 'ste', 'twelve', 'elite', 'ultra'] as const) {
      expect(resultHref(p(id), { goal: 'first' }, '2027-03-13', 15)).toBe(p(id).href);
    }
  });
});
