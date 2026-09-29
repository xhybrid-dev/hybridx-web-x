/* eslint-disable @typescript-eslint/no-explicit-any */
// Turn a merged rollup doc into human-usable numbers. Pure, no I/O. Ported
// from handover/entry-funnel/admin/report.js with the same behaviour.
//
//   report(merged, { catalog })  ->  { days, sessions, totals, rates, stepFunnel, medianBuckets, answerShares,
//                                     products, sources, devices, variants, attractors, skips, putOffs, demand }
//
// Every rate is null (never NaN or Infinity) when its denominator is zero.
//
// Differences from the written brief, all deliberate (carried over):
//  - entryToResult = sessions with entry_shown AND a result / sessions with
//    entry_shown. Dividing all results by entry_shown would count results from
//    the control arm, which never sees the entry section.
//  - sources[].skipRate = skipped / sessions (byRef has no entry_shown count);
//    identical to the site skipRate when every visitor sees the entry section.
//  - variants.lift is a list, one row per non-control arm compared with
//    control, not a single number.

import { BUCKETS, STEPS, STEP_NAMES, div, isObj, num } from './model';

export const MIN_ARM_SESSIONS = 30; // both arms need this many sessions before a lift is computed
const CELL_MIN_RESULTS = 10;
const CELL_MAX_CLICK_RATE = 0.25;
const CROSS_TABS = new Set(['byGoalFormat', 'byGoalStart', 'byRef', 'byVw', 'byVariant', 'byPrimary', 'byRulePath', 'bounceByVw']);

const obj = (x: unknown): Record<string, any> => (isObj(x) ? x : {});
const sumMap = (map: Record<string, any>) => Object.keys(map).reduce((a, k) => a + num(map[k]), 0);
const byCountDesc = (a: Share, b: Share) => b.count - a.count || (a.key < b.key ? -1 : 1);

export interface Share {
  key: string;
  count: number;
  share: number | null;
}

/** A map of counts as [{key,count,share}] sorted by count. share = count / base (default: sum of counts). */
export function shares(map: unknown, base?: number): Share[] {
  const m = obj(map);
  const total = base === undefined ? sumMap(m) : base;
  return Object.keys(m)
    .filter((k) => typeof m[k] === 'number')
    .map((k) => ({ key: k, count: m[k], share: div(m[k], total) }))
    .sort(byCountDesc);
}

// Smallest bucket whose cumulative count reaches pct% of the total. Integer maths, no float edge cases.
function percentileLabel(counts: Record<string, any>, labels: string[], pct: number): string | null {
  const total = labels.reduce((a, l) => a + num(counts[l]), 0);
  if (!total) return null;
  let cum = 0;
  for (const l of labels) {
    cum += num(counts[l]);
    if (cum * 100 >= pct * total) return l;
  }
  return labels[labels.length - 1];
}
function bucketSummary(counts: unknown, labels: string[]) {
  const c = obj(counts);
  return { n: labels.reduce((a, l) => a + num(c[l]), 0), median: percentileLabel(c, labels, 50), p90: percentileLabel(c, labels, 90) };
}

// Two-proportion z statistic (pooled). null when it is undefined.
function zScore(x1: number, n1: number, x2: number, n2: number): number | null {
  const p = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
  return se > 0 ? (x1 / n1 - x2 / n2) / se : null;
}

export type Report = ReturnType<typeof report>;

export function report(merged: unknown, opts?: { catalog?: Record<string, { title?: string }> }) {
  const o = opts || {};
  const catalog = obj(o.catalog);
  const m = obj(merged);
  const c = obj(m.counters);
  const hist = obj(m.hist);
  const maps = obj(m.maps);
  const answers = obj(maps.answers);
  const n = (k: string) => num(c[k]);
  const sessions = n('sessions');
  const result = n('sessionsResult');

  const totals: Record<string, number> = {};
  Object.keys(c).forEach((k) => {
    if (typeof c[k] === 'number') totals[k] = c[k];
  });

  const rates = {
    openRate: div(n('sessionsOpened'), sessions),
    completionRate: div(result, n('sessionsOpened')),
    entryToResult: div(n('sessionsEntryResult'), n('sessionsEntryShown')),
    clickRate: div(n('sessionsClicked'), result),
    skipRate: div(n('sessionsSkipped'), n('sessionsEntryShown')),
    talkRate: div(n('sessionsTalkSent'), result),
    bounceRate: div(n('bounces'), sessions),
    noInteractionRate: div(n('sessionsNoInteraction'), sessions),
  };

  // Step funnel: exits/views is the drop rate, back/views the back rate
  const step = (name: string, s: number) => num(obj(c[name])['s' + s]);
  const stepFunnel = STEPS.map((s) => {
    const views = step('stepViews', s);
    const exits = step('stepExit', s);
    const back = step('stepBack', s);
    return { step: s, name: STEP_NAMES[s - 1], views, answered: step('stepAnswered', s), back, exits, dropRate: div(exits, views), backRate: div(back, views) };
  });

  // Median and p90 bucket labels for every histogram
  const medianBuckets = {
    timeOnStep: {} as Record<string, ReturnType<typeof bucketSummary>>,
    timeToResult: bucketSummary(hist.timeToResult, BUCKETS.timeToResult),
    visibleTime: bucketSummary(hist.visibleTime, BUCKETS.visibleTime),
  };
  STEPS.forEach((s) => {
    medianBuckets.timeOnStep['s' + s] = bucketSummary(obj(hist.timeOnStep)['s' + s], BUCKETS.timeOnStep);
  });

  // Shares of every map (multi-select maps use the number of sessions that could have picked them as base)
  const feedbackN = sumMap(obj(maps.feedbackFit));
  const answerShares: Record<string, any> & { answers: Record<string, Share[]> } = { answers: {} };
  Object.keys(answers).forEach((k) => {
    answerShares.answers[k] = shares(answers[k], k === 'obst' ? result : undefined);
  });
  const BASES: Record<string, number> = {
    secondary: result, rulePath: result, clickByProduct: n('sessionsClicked'), clickBySlot: n('sessionsClicked'),
    feedbackReasons: feedbackN, sectionViews: sessions, faqOpens: sessions, ctaClicks: sessions, scrollReach: sessions,
  };
  Object.keys(maps).forEach((k) => {
    if (k === 'answers' || CROSS_TABS.has(k)) return; // cross-tabs are reported in their own sections below
    answerShares[k] = shares(maps[k], BASES[k]);
  });

  // Products (by primary recommendation)
  const products = Object.keys(obj(maps.byPrimary))
    .map((id) => {
      const p = obj(maps.byPrimary[id]);
      const fy = num(p.feedbackYes);
      const fp = num(p.feedbackPartly);
      const fno = num(p.feedbackNo);
      const fn = fy + fp + fno;
      const row: {
        id: string; results: number; clicks: number; ctr: number | null; feedbackYes: number; feedbackPartly: number;
        feedbackNo: number; feedbackN: number; feedbackNoRate: number | null; title?: string;
      } = { id, results: num(p.results), clicks: num(p.clicks), ctr: div(num(p.clicks), num(p.results)), feedbackYes: fy, feedbackPartly: fp, feedbackNo: fno, feedbackN: fn, feedbackNoRate: div(fno, fn) };
      if (catalog[id] && catalog[id].title) row.title = catalog[id].title;
      return row;
    })
    .sort((a, b) => b.results - a.results || (a.id < b.id ? -1 : 1));

  // Traffic sources
  const sources = Object.keys(obj(maps.byRef))
    .map((ref) => {
      const r = obj(maps.byRef[ref]);
      return {
        ref, sessions: num(r.sessions), opened: num(r.opened), result: num(r.result), clicked: num(r.clicked), skipped: num(r.skipped),
        openRate: div(num(r.opened), num(r.sessions)), completionRate: div(num(r.result), num(r.opened)),
        clickRate: div(num(r.clicked), num(r.result)), skipRate: div(num(r.skipped), num(r.sessions)),
      };
    })
    .sort((a, b) => b.sessions - a.sessions || (a.ref < b.ref ? -1 : 1));

  // Devices
  const bounceByVw = obj(maps.bounceByVw);
  const devices = Object.keys(obj(maps.byVw))
    .map((vw) => {
      const r = obj(maps.byVw[vw]);
      return {
        vw, sessions: num(r.sessions), opened: num(r.opened), result: num(r.result), clicked: num(r.clicked), bounces: num(bounceByVw[vw]),
        openRate: div(num(r.opened), num(r.sessions)), completionRate: div(num(r.result), num(r.opened)),
        clickRate: div(num(r.clicked), num(r.result)), bounceRate: div(num(bounceByVw[vw]), num(r.sessions)),
      };
    })
    .sort((a, b) => b.sessions - a.sessions || (a.vw < b.vw ? -1 : 1));
  const dev = (vw: string) => devices.find((d) => d.vw === vw) || null;

  // Experiment arms. Lift = share of sessions with any cta_click, arm vs control, in points and relative.
  const arms = Object.keys(obj(maps.byVariant))
    .map((variant) => {
      const r = obj(maps.byVariant[variant]);
      return {
        variant, sessions: num(r.sessions), opened: num(r.opened), result: num(r.result), clicked: num(r.clicked), skipped: num(r.skipped), ctaClicks: num(r.ctaClicks),
        openRate: div(num(r.opened), num(r.sessions)), completionRate: div(num(r.result), num(r.opened)), ctaRate: div(num(r.ctaClicks), num(r.sessions)),
      };
    })
    .sort((a, b) => (a.variant < b.variant ? -1 : 1));
  const control = arms.find((a) => a.variant === 'control');
  let lift: {
    variant: string; sessions: number; controlSessions: number; rate: number | null; controlRate: number | null;
    absolute: number; relative: number | null; z: number | null;
  }[] | null = null;
  if (control && control.sessions >= MIN_ARM_SESSIONS) {
    lift = arms
      .filter((a) => a.variant !== 'control' && a.variant !== 'none' && a.sessions >= MIN_ARM_SESSIONS)
      .map((a) => ({
        variant: a.variant, sessions: a.sessions, controlSessions: control.sessions, rate: a.ctaRate, controlRate: control.ctaRate,
        absolute: (a.ctaRate as number) - (control.ctaRate as number),
        relative: (control.ctaRate as number) > 0 ? ((a.ctaRate as number) - (control.ctaRate as number)) / (control.ctaRate as number) : null,
        z: zScore(a.ctaClicks, a.sessions, control.ctaClicks, control.sessions),
      }));
    if (!lift.length) lift = null;
  }

  // What attracts visitors
  const scrollReach = obj(maps.scrollReach);
  const scrolled50 = num(scrollReach['50']);
  const attractors = {
    sections: Object.keys(obj(maps.sectionViews))
      .map((id) => ({
        id, sessions: num(maps.sectionViews[id]), reach: div(num(maps.sectionViews[id]), sessions), reachOfScrolled: div(num(maps.sectionViews[id]), scrolled50),
      }))
      .sort((a, b) => b.sessions - a.sessions || (a.id < b.id ? -1 : 1)),
    ctas: shares(maps.ctaClicks, sessions),
    faq: shares(maps.faqOpens, sessions).sort((a, b) => b.count - a.count || Number(a.key) - Number(b.key)),
    scroll: Object.keys(scrollReach)
      .map(Number)
      .sort((a, b) => a - b)
      .map((p) => ({ pct: p, sessions: num(scrollReach[p]), reach: div(num(scrollReach[p]), sessions) })),
    scrolled50,
    // The goal people picked first, for everyone who started (not only those who reached a result)
    goalStarts: Object.keys(obj(maps.byGoalStart))
      .map((goal) => {
        const g = obj(maps.byGoalStart[goal]);
        return { goal, started: num(g.started), result: num(g.result), clicked: num(g.clicked), completionRate: div(num(g.result), num(g.started)), clickRate: div(num(g.clicked), num(g.result)) };
      })
      .sort((a, b) => b.started - a.started || (a.goal < b.goal ? -1 : 1)),
  };

  // What skippers did next (rates over skipped sessions)
  const skips = {
    skipped: n('sessionsSkipped'),
    thenCtaRate: div(n('sessionsSkippedThenCta'), n('sessionsSkipped')),
    thenScroll50Rate: div(n('sessionsSkippedThenScroll50'), n('sessionsSkipped')),
  };

  // What puts visitors off
  const withViews = stepFunnel.filter((s) => s.views > 0);
  const biggest = withViews.slice().sort((a, b) => (b.dropRate as number) - (a.dropRate as number) || a.step - b.step)[0];
  const backMost = withViews.slice().sort((a, b) => (b.backRate as number) - (a.backRate as number) || a.step - b.step)[0];
  const slow = STEPS.map((s) => Object.assign({ step: s, name: STEP_NAMES[s - 1] }, medianBuckets.timeOnStep['s' + s]))
    .filter((s) => s.n > 0)
    .sort(
      (a, b) =>
        BUCKETS.timeOnStep.indexOf(b.median as string) - BUCKETS.timeOnStep.indexOf(a.median as string) ||
        BUCKETS.timeOnStep.indexOf(b.p90 as string) - BUCKETS.timeOnStep.indexOf(a.p90 as string) ||
        a.step - b.step,
    )[0];
  const phone = dev('phone');
  const desktop = dev('desktop');
  const tablet = dev('tablet');
  const putOffs = {
    biggestStepDrop: biggest ? { step: biggest.step, name: biggest.name, views: biggest.views, exits: biggest.exits, dropRate: biggest.dropRate } : null,
    slowestStep: slow || null,
    highestBackStep: backMost ? { step: backMost.step, name: backMost.name, views: backMost.views, back: backMost.back, backRate: backMost.backRate } : null,
    skipReasons: shares(maps.skipReason),
    feedbackReasons: shares(maps.feedbackReasons, feedbackN),
    talkInvalidFields: shares(maps.talkInvalidField),
    bounceByDevice: { phone: phone ? phone.bounceRate : null, tablet: tablet ? tablet.bounceRate : null, desktop: desktop ? desktop.bounceRate : null },
    bounceGapPhoneVsDesktop:
      phone && desktop && phone.bounceRate !== null && desktop.bounceRate !== null ? phone.bounceRate - desktop.bounceRate : null,
  };

  // Unmet demand: talk requests after results, unhappy goals, goal x format cells that do not get clicked
  const cells: { goal: string; format: string; results: number; clicks: number; clickRate: number | null; feedbackNo: number }[] = [];
  const goalNo: Record<string, { goal: string; results: number; feedbackNo: number }> = {};
  Object.keys(obj(maps.byGoalFormat)).forEach((goal) => {
    Object.keys(obj(maps.byGoalFormat[goal])).forEach((format) => {
      const x = obj(maps.byGoalFormat[goal][format]);
      cells.push({ goal, format, results: num(x.results), clicks: num(x.clicks), clickRate: div(num(x.clicks), num(x.results)), feedbackNo: num(x.feedbackNo) });
      const g = goalNo[goal] || (goalNo[goal] = { goal, results: 0, feedbackNo: 0 });
      g.results += num(x.results);
      g.feedbackNo += num(x.feedbackNo);
    });
  });
  cells.sort((a, b) => b.results - a.results || (a.goal + a.format < b.goal + b.format ? -1 : 1));
  const demand = {
    noMatch: {
      talkAfterResult: n('sessionsTalkAfterResult'),
      talkAfterResultRate: div(n('sessionsTalkAfterResult'), result),
      talkFromResult: num(obj(maps.talkFrom).result),
    },
    feedbackNoByGoal: Object.keys(goalNo)
      .map((g) => Object.assign({ rate: div(goalNo[g].feedbackNo, goalNo[g].results) }, goalNo[g]))
      .sort((a, b) => b.feedbackNo - a.feedbackNo || (a.goal < b.goal ? -1 : 1)),
    cells,
    lowClickCells: cells
      .filter((x) => x.results >= CELL_MIN_RESULTS && (x.clickRate as number) < CELL_MAX_CLICK_RATE)
      .sort((a, b) => (a.clickRate as number) - (b.clickRate as number) || b.results - a.results),
  };

  return {
    days: typeof m.days === 'number' ? (m.days as number) : null,
    sessions,
    totals,
    rates,
    stepFunnel,
    medianBuckets,
    answerShares,
    products,
    sources,
    devices,
    variants: { arms, lift },
    attractors,
    skips,
    putOffs,
    demand,
  };
}
