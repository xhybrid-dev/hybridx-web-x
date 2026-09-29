// The reference analytics' own tests (handover/entry-funnel/admin/rollup.test.js), run
// against the TypeScript port. Kept as JavaScript and changed only where the imports are,
// so a diff against the original shows the port was tested with the same cases.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { rollupDay, mergeDays, emptyDoc, report, insights, STEP_NAMES, BUCKETS, DEFAULT_THRESHOLDS } from '@/lib/plan-finder/analytics';
import { bucketFor, mapKey, TIME_BUCKETS, TIME_EDGES_S, VISIBLE_BUCKETS, VISIBLE_EDGES_S } from '@/lib/plan-finder/analytics/model';
import { generate, toBatches, splitByDay, mulberry32 } from '@/lib/plan-finder/analytics/seed';
import { validateBatch, IDENTIFYING_KEYS, findIdentifyingKey } from '@/lib/plan-finder/collect-core';
import { route } from '@/lib/plan-finder/routing';
import funnel from '@/lib/plan-finder/funnel.json';
import schema from '@/lib/plan-finder/events.schema.json';

// ---------------------------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------------------------

const strip = (d) => ({ v: d.v, counters: d.counters, hist: d.hist, maps: d.maps }); // ignore date and days
const merged = (events, date) => mergeDays(splitByDay(events).map((d) => rollupDay(d.events, { date: date || d.date })));
const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);

// Fill a zeroed bucket list from a sparse object
const zeroed = (labels, sparse) => labels.reduce((o, l) => { o[l] = (sparse && sparse[l]) || 0; return o; }, {});
const tb = (s) => zeroed(TIME_BUCKETS, s);
const vb = (s) => zeroed(VISIBLE_BUCKETS, s);

// Set numbers in a doc by nested patch: docFrom({ counters: { sessions: 500 } }) -> merged doc
function deepAssign(t, patch) {
  Object.keys(patch).forEach((k) => {
    if (isObj(patch[k])) deepAssign(isObj(t[k]) ? t[k] : (t[k] = {}), patch[k]); else t[k] = patch[k];
  });
  return t;
}
const docFrom = (patch) => mergeDays([deepAssign(emptyDoc('2026-01-01'), patch)]);
const repFrom = (patch) => report(docFrom(patch), { catalog: funnel.catalog });
const ids = (list) => list.map((i) => i.id);
const BASE = { counters: { sessions: 1000 } }; // enough sessions to clear the minimum sample guard

// Every leaf number in a doc/report is finite (no NaN or Infinity anywhere)
function assertFinite(x, path) {
  if (typeof x === 'number') assert.ok(Number.isFinite(x), 'finite at ' + path);
  else if (Array.isArray(x)) x.forEach((v, i) => assertFinite(v, path + '[' + i + ']'));
  else if (isObj(x)) Object.keys(x).forEach((k) => assertFinite(x[k], path + '.' + k));
}

// ---------------------------------------------------------------------------------------------
// (a) rollupDay counts equal the seed ground truth
// ---------------------------------------------------------------------------------------------

function assertMatchesTruth(doc, tr, label) {
  const c = doc.counters, m = doc.maps;
  const pairs = [
    ['sessions', 'sessions'], ['sessionsEntryShown', 'entryShown'], ['sessionsOpened', 'opened'], ['sessionsResult', 'results'],
    ['sessionsClicked', 'clicks'], ['sessionsSkipped', 'skipped'], ['sessionsTalkOpen', 'talkOpen'], ['sessionsTalkAfterResult', 'talkAfterResult'],
    ['sessionsTalkSent', 'talkSent'], ['sessionsCtaClick', 'ctaSessions'], ['sessionsNoInteraction', 'noInteraction'], ['bounces', 'bounces'],
    ['sessionsSkippedThenCta', 'skippedThenCta'], ['sessionsSkippedThenScroll50', 'skippedThenScroll50']
  ];
  pairs.forEach(([counter, truthKey]) => assert.equal(c[counter], tr[truthKey], label + ' ' + counter));
  assert.deepEqual(c.stepViews, tr.stepViews, label + ' stepViews');
  assert.deepEqual(c.stepAnswered, tr.stepAnswered, label + ' stepAnswered');
  assert.deepEqual(c.stepBack, tr.stepBack, label + ' stepBack');
  assert.deepEqual(c.stepExit, tr.exits, label + ' stepExit');
  assert.deepEqual(m.clickByProduct, tr.clicksByProduct, label + ' clickByProduct');
  assert.deepEqual(m.clickBySlot, tr.clickBySlot, label + ' clickBySlot');
  assert.deepEqual(m.primary, tr.resultsByPrimary, label + ' primary');
  assert.deepEqual(m.feedbackFit, tr.feedbackFit, label + ' feedbackFit');
  assert.deepEqual(m.refHost, tr.refSessions, label + ' refHost');
  assert.deepEqual(m.vw, tr.vwSessions, label + ' vw');
  assert.deepEqual(m.variant, tr.variantSessions, label + ' variant');
  assert.deepEqual(m.goalStarted, tr.goalStarted, label + ' goalStarted');
  assert.deepEqual(m.byGoalStart, tr.byGoalStart, label + ' byGoalStart');
  Object.keys(tr.resultsByPrimary).forEach((p) => {
    assert.equal(m.byPrimary[p].results, tr.resultsByPrimary[p], label + ' byPrimary.results ' + p);
    assert.equal(m.byPrimary[p].clicks, tr.clickedByPrimary[p] || 0, label + ' byPrimary.clicks ' + p);
  });
}

test('(a) rollupDay counts equal the generator ground truth: 3 days x 300 sessions', () => {
  const g = generate({ days: 3, sessionsPerDay: 300, seed: 2026, startDate: '2026-03-02' });
  const days = splitByDay(g.events);
  assert.equal(days.length, 3);
  assert.deepEqual(days.map((d) => d.date), ['2026-03-02', '2026-03-03', '2026-03-04']);
  // the data must be rich enough that the comparison means something
  const t = g.truth;
  assert.equal(t.sessions, 900);
  assert.ok(t.opened > 250 && t.results > 150 && t.clicks > 50 && t.skipped > 100 && t.talkSent > 3, JSON.stringify([t.opened, t.results, t.clicks, t.skipped, t.talkSent]));
  assert.ok(Object.keys(t.clicksByProduct).length >= 4);
  assert.ok(t.stepBack.s3 > 0 && t.exits.s3 > 0 && t.bounces > 0);
  // goal starts and skip follow-ups are non-trivial: some skippers act afterwards, some starters never reach a result
  assert.ok(t.skippedThenCta > 20 && t.skippedThenCta < t.skipped && t.skippedThenScroll50 > 20 && t.skippedThenScroll50 < t.skipped, JSON.stringify([t.skipped, t.skippedThenCta, t.skippedThenScroll50]));
  assert.equal(Object.keys(t.goalStarted).length, 6);
  assert.ok(t.opened > Object.values(t.goalStarted).reduce((a, b) => a + b, 0), 'sessions that left before answering step 1 have no goal');
  assert.ok(Object.keys(t.byGoalStart).every((g) => t.byGoalStart[g].started > t.byGoalStart[g].result && t.byGoalStart[g].result > t.byGoalStart[g].clicked && t.byGoalStart[g].clicked > 0), 'started > result > clicked for every goal');

  const docs = days.map((d, i) => {
    const doc = rollupDay(d.events, { date: d.date });
    assert.equal(doc.date, d.date);
    assertMatchesTruth(doc, g.truth.byDay[i], 'day ' + i);
    return doc;
  });
  assertMatchesTruth(mergeDays(docs), g.truth, 'all days');
  assert.equal(mergeDays(docs).days, 3);
});

test('(a) also holds in page mode (stand-alone finder, no entry section) and for other seeds', () => {
  for (const seed of [5, 6]) {
    const g = generate({ days: 2, sessionsPerDay: 200, seed, entryMode: false, model: { exit: { 2: 0.2 } } });
    assert.equal(g.truth.entryShown, 0);
    assert.equal(g.truth.skipped, 0);
    assert.ok(g.events.every((e) => e.ctx.mode === 'page' && !('variant' in e.ctx)));
    assertMatchesTruth(merged(g.events), g.truth, 'page mode seed ' + seed);
  }
});

test('seed is deterministic and mulberry32 is uniform enough', () => {
  const a = generate({ days: 1, sessionsPerDay: 50, seed: 9 });
  const b = generate({ days: 1, sessionsPerDay: 50, seed: 9 });
  const c = generate({ days: 1, sessionsPerDay: 50, seed: 10 });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.events, c.events);
  const r = mulberry32(1);
  let sum = 0;
  for (let i = 0; i < 10000; i++) { const x = r(); assert.ok(x >= 0 && x < 1); sum += x; }
  assert.ok(Math.abs(sum / 10000 - 0.5) < 0.02);
  // sessions never cross midnight: each session's events fall on one UTC date
  const seen = new Map();
  generate({ days: 3, sessionsPerDay: 200, seed: 4 }).events.forEach((e) => {
    const day = new Date(e.t).toISOString().slice(0, 10);
    assert.equal(seen.get(e.sid) || day, day);
    seen.set(e.sid, day);
  });
});

test('seed behaviour model is roughly what the brief describes', () => {
  const t = generate({ days: 5, sessionsPerDay: 400, seed: 77 }).truth;
  const ref = (k) => t.refSessions[k] / t.sessions;
  assert.ok(Math.abs(ref('google.com') - 0.45) < 0.04 && Math.abs(ref('instagram.com') - 0.2) < 0.04 && Math.abs(ref('direct') - 0.2) < 0.04);
  assert.ok(Math.abs(ref('reddit.com') - 0.1) < 0.03 && Math.abs(ref('hybridx.club') - 0.05) < 0.03);
  assert.ok(Math.abs(t.vwSessions.phone / t.sessions - 0.6) < 0.04);
  assert.ok(Math.abs(t.skipped / t.entryShown - 0.25) < 0.04);
  assert.ok(Math.abs(t.clickBySlot.primary / t.results - 0.45) < 0.06);
  assert.ok(Math.abs(t.exits.s3 / t.stepViews.s3 - 0.12) < 0.04);
  assert.ok(Math.abs(t.exits.s5 / t.stepViews.s5 - 0.08) < 0.04);
  assert.ok(Math.abs((t.feedbackFit.yes + t.feedbackFit.partly + t.feedbackFit.no) / t.results - 0.2) < 0.05);
});

// ---------------------------------------------------------------------------------------------
// (b) merging days equals rolling up the union
// ---------------------------------------------------------------------------------------------

test('(b) mergeDays(rollupDay(d1), rollupDay(d2)) deep-equals rollupDay(d1 + d2): property over 3 seeds', () => {
  for (const seed of [101, 202, 303]) {
    const g = generate({ days: 2, sessionsPerDay: 150, seed });
    const [d1, d2] = splitByDay(g.events);
    const union = d1.events.concat(d2.events);
    const viaMerge = mergeDays([rollupDay(d1.events, { date: d1.date }), rollupDay(d2.events, { date: d2.date })]);
    assert.deepEqual(strip(viaMerge), strip(rollupDay(union, { date: 'union' })), 'split by day, seed ' + seed);
    assert.equal(viaMerge.date, null);
    assert.equal(viaMerge.days, 2);

    // any partition of whole sessions works, not just by day
    const rng = mulberry32(seed);
    const side = new Map();
    const a = [], b = [];
    g.events.forEach((e) => { if (!side.has(e.sid)) side.set(e.sid, rng() < 0.4); (side.get(e.sid) ? a : b).push(e); });
    assert.ok(a.length > 100 && b.length > 100);
    assert.deepEqual(strip(mergeDays([rollupDay(a), rollupDay(b)])), strip(rollupDay(g.events)), 'random partition, seed ' + seed);
  }
});

test('(b) rollupDay does not depend on input order or on JSON round trips', () => {
  const g = generate({ days: 1, sessionsPerDay: 120, seed: 8 });
  const shuffled = g.events.slice();
  const rng = mulberry32(8);
  for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
  const doc = rollupDay(g.events, { date: 'x' });
  assert.deepEqual(rollupDay(shuffled, { date: 'x' }), doc);
  assert.deepEqual(JSON.parse(JSON.stringify(doc)), doc, 'doc is plain JSON');
  assert.deepEqual(JSON.parse(JSON.stringify(rollupDay(JSON.parse(JSON.stringify(g.events)), { date: 'x' }))), doc);
});

// ---------------------------------------------------------------------------------------------
// (c) merge algebra
// ---------------------------------------------------------------------------------------------

test('(c) mergeDays is associative, commutative and ignores undefined', () => {
  const g = generate({ days: 3, sessionsPerDay: 100, seed: 12 });
  const [a, b, c] = splitByDay(g.events).map((d) => rollupDay(d.events, { date: d.date }));
  const m = mergeDays;
  assert.deepEqual(m([a, b]), m([b, a]));
  assert.deepEqual(m([m([a, b]), c]), m([a, m([b, c])]));
  assert.deepEqual(m([m([a, b]), c]), m([a, b, c]));
  assert.deepEqual(m([c, a, b]), m([a, b, c]));
  assert.deepEqual(m([a, undefined, null, b]), m([a, b]));
  assert.deepEqual(m([m([a, b]), m([c])]), m([a, b, c]));
  assert.equal(m([m([a, b]), c]).days, 3, 'day counts add up across nested merges');
  assert.equal(m([]).days, 0);
  assert.equal(m(undefined).days, 0);
  assert.equal(m([a, b, c]).counters.sessions, a.counters.sessions + b.counters.sessions + c.counters.sessions);
  // inputs are not mutated
  const before = JSON.stringify(a);
  m([a, b]);
  assert.equal(JSON.stringify(a), before);
});

test('(c) mergeDays sums only numbers and is safe against hostile keys', () => {
  const evil = JSON.parse('{"counters":{"__proto__":{"polluted":1},"constructor":5,"sessions":2,"note":"text"},"hist":{},"maps":{"refHost":{"__proto__":3,"constructor":1,"toString":2}}}');
  const out = mergeDays([evil, evil]);
  assert.equal(({}).polluted, undefined);
  assert.equal(out.counters.sessions, 4);
  assert.equal('note' in out.counters, false);
  assert.equal(out.maps.refHost.toString, 4);
  assert.equal(Object.prototype.hasOwnProperty.call(out.maps.refHost, '__proto__'), false);
});

// ---------------------------------------------------------------------------------------------
// (d) hand-built fixture: 6 sessions written out explicitly
// ---------------------------------------------------------------------------------------------

const T0 = Date.UTC(2026, 0, 5, 10, 0, 0);
// rows are [ms since session start, event name, props]; q is the row index
function session(sid, ctx, rows) {
  return rows.map((r, q) => Object.assign({ sid, n: r[1], t: T0 + r[0], q }, r[2] || {}, { ctx }));
}
const ANS_S3 = { goal: 'first', level: 'new', place: 'home', obst: ['run', 'time'], format: 'paper', race: '12-23' };
const ANS_S5 = { goal: 'hybrid', level: 'regular', place: 'both', obst: ['plateau'], format: 'phone', race: 'none' };
const ANS_S6 = { goal: 'first', level: 'new', place: 'home', obst: ['none'], format: 'paper', race: '12-23' };
const TRACE_S3 = ['paper:first-home-or-both', 'free-start:free', 'primary:format-paper', 'extras:run', 'extras:time-or-generic'];
const TRACE_S5 = ['paper:hybrid-default', 'free-start:free', 'primary:format-phone', 'extras:structure-or-plateau'];
const TRACE_S6 = ['paper:first-home-or-both', 'free-start:free', 'primary:format-paper'];

const FIXTURE = [].concat(
  // 1. bounce: saw the entry section, left after 4 seconds, did nothing
  session('fix-bounce-000001', { mode: 'entry', variant: 'A', ref: 'google.com', vw: 'phone' }, [
    [0, 'page_view'], [200, 'entry_shown'], [4000, 'page_hide', { ms: 4000, scroll: 0, step: 0 }]
  ]),
  // 2. skip with a reason, and one call to action click on the homepage
  session('fix-skip-0000002', { mode: 'entry', variant: 'B', ref: 'instagram.com', utm: { utm_source: 'instagram', utm_campaign: 'launch' }, vw: 'phone' }, [
    [0, 'page_view'], [300, 'entry_shown'], [2500, 'entry_skip', { from: 'bar', step: 0, ms: 2500 }], [3000, 'skip_reason', { reason: 'know' }],
    [3500, 'cta_click', { id: 'nav-app', kind: 'nav', host: 'app.hybridx.club' }], [20000, 'page_hide', { ms: 20000, scroll: 10, step: 0 }]
  ]),
  // 3. full path, primary clicked, feedback yes
  session('fix-full-0000003', { mode: 'entry', variant: 'A', ref: 'google.com', vw: 'desktop' }, [
    [0, 'page_view'], [300, 'entry_shown'], [5000, 'finder_open', { source: 'entry', step: 1 }],
    [5200, 'q_view', { step: 1 }], [9200, 'q_answer', { step: 1, key: 'goal', value: 'first', ms: 4000 }],
    [9400, 'q_view', { step: 2 }], [17400, 'q_answer', { step: 2, key: 'level', value: 'new', ms: 8000 }], [17600, 'q_answer', { step: 2, key: 'place', value: 'home', ms: 8200 }],
    [17800, 'q_view', { step: 3 }], [37800, 'q_answer', { step: 3, key: 'obst', value: ['run', 'time'], ms: 20000 }],
    [38000, 'q_view', { step: 4 }], [41000, 'q_answer', { step: 4, key: 'format', value: 'paper', ms: 3000 }],
    [41200, 'q_view', { step: 5 }], [47200, 'q_answer', { step: 5, key: 'race', value: '12-23', ms: 6000 }],
    [47600, 'result_view', { answers: ANS_S3, primary: 'home', secondary: ['run12', 'vdot'], trace: TRACE_S3, weeks: 14 }],
    [60000, 'result_click', { product: 'home', slot: 'primary', dest: 'amazon-affiliate', affiliate: true }],
    [65000, 'result_feedback', { fit: 'yes' }],
    [66000, 'section_view', { id: 'hero' }], [66500, 'section_view', { id: 'plans' }],
    [67000, 'scroll_depth', { pct: 25 }], [68000, 'scroll_depth', { pct: 50 }],
    [95000, 'page_hide', { ms: 95000, scroll: 60, step: 0, result: true }]
  ]),
  // 4. abandons on step 3: closes the dialog
  session('fix-abandon-000004', { mode: 'entry', variant: 'B', ref: 'google.com', vw: 'phone' }, [
    [0, 'page_view'], [300, 'entry_shown'], [3000, 'finder_open', { source: 'entry', step: 1 }],
    [3200, 'q_view', { step: 1 }], [6200, 'q_answer', { step: 1, key: 'goal', value: 'faster', ms: 3000 }],
    [6400, 'q_view', { step: 2 }], [14400, 'q_answer', { step: 2, key: 'level', value: 'raced', ms: 8000 }], [15000, 'q_answer', { step: 2, key: 'place', value: 'gym', ms: 8600 }],
    [15200, 'q_view', { step: 3 }],
    [45000, 'dialog_close', { step: 3, reason: 'button', result: false, ms: 30000 }],
    [46000, 'page_hide', { ms: 40000, scroll: 0, step: 0 }]
  ]),
  // 5. full path with a back press on step 4, slow step 5, primary NOT clicked, feedback "no" with reasons
  session('fix-no-000000005', { mode: 'entry', variant: 'A', ref: 'reddit.com', vw: 'desktop' }, [
    [0, 'page_view'], [300, 'entry_shown'], [4000, 'finder_open', { source: 'entry', step: 1 }],
    [4200, 'q_view', { step: 1 }], [8700, 'q_answer', { step: 1, key: 'goal', value: 'hybrid', ms: 4500 }],
    [8900, 'q_view', { step: 2 }], [15900, 'q_answer', { step: 2, key: 'level', value: 'regular', ms: 7000 }], [16100, 'q_answer', { step: 2, key: 'place', value: 'both', ms: 7200 }],
    [16300, 'q_view', { step: 3 }], [28300, 'q_answer', { step: 3, key: 'obst', value: ['plateau'], ms: 12000 }],
    [28500, 'q_view', { step: 4 }], [30000, 'q_back', { step: 4 }], [30200, 'q_view', { step: 3 }],
    [32200, 'q_answer', { step: 3, key: 'obst', value: ['plateau'], ms: 2000 }], [32400, 'q_view', { step: 4 }],
    [35900, 'q_answer', { step: 4, key: 'format', value: 'phone', ms: 3500 }],
    [36100, 'q_view', { step: 5 }], [166100, 'q_answer', { step: 5, key: 'race', value: 'none', ms: 130000 }],
    [166500, 'result_view', { answers: ANS_S5, primary: 'app', secondary: ['free', 'twelve'], trace: TRACE_S5, weeks: 0 }],
    [172000, 'result_feedback', { fit: 'no', reasons: ['wrong', 'price'] }],
    [173000, 'faq_open', { i: 2 }], [173500, 'section_view', { id: 'hero' }],
    [175000, 'page_hide', { ms: 55000, scroll: 20, step: 0, result: true }]
  ]),
  // 6. control arm (no entry section): opens the finder from the nav, finishes, sends the talk form
  session('fix-talk-000000006', { mode: 'entry', variant: 'control', vw: 'phone' }, [
    [0, 'page_view'], [1000, 'finder_open', { source: 'nav', step: 1 }],
    [1200, 'q_view', { step: 1 }], [3700, 'q_answer', { step: 1, key: 'goal', value: 'first', ms: 2500 }],
    [3900, 'q_view', { step: 2 }], [9900, 'q_answer', { step: 2, key: 'level', value: 'new', ms: 6000 }], [10400, 'q_answer', { step: 2, key: 'place', value: 'home', ms: 6500 }],
    [10600, 'q_view', { step: 3 }], [14600, 'q_answer', { step: 3, key: 'obst', value: ['none'], ms: 4000 }],
    [14800, 'q_view', { step: 4 }], [16800, 'q_answer', { step: 4, key: 'format', value: 'paper', ms: 2000 }],
    [17000, 'q_view', { step: 5 }], [20000, 'q_answer', { step: 5, key: 'race', value: '12-23', ms: 3000 }],
    [29000, 'result_view', { answers: ANS_S6, primary: 'home', secondary: ['free', 'app'], trace: TRACE_S6, weeks: 16 }],
    [31000, 'talk_open', { from: 'result' }], [33000, 'talk_invalid', { fields: ['email'] }], [40000, 'talk_submit', { ok: true, attached: false }],
    [45000, 'page_hide', { ms: 25000, scroll: 0, step: 0, result: true }]
  ])
);

test('(d) the fixture matches routing.js and the events schema (so it stays honest)', () => {
  [[ANS_S3, 'home', ['run12', 'vdot'], TRACE_S3], [ANS_S5, 'app', ['free', 'twelve'], TRACE_S5], [ANS_S6, 'home', ['free', 'app'], TRACE_S6]].forEach(([a, primary, secondary, trace]) => {
    const r = route(a);
    assert.equal(r.primary, primary);
    assert.deepEqual(r.secondary, secondary);
    assert.deepEqual(r.trace, trace);
  });
  const toBatch = (sid) => {
    const evs = FIXTURE.filter((e) => e.sid === sid);
    return { v: 1, sid, ctx: evs[0].ctx, events: evs.map((e) => { const { sid: _s, ctx: _c, ...rest } = e; return rest; }) };
  };
  new Set(FIXTURE.map((e) => e.sid)).forEach((sid) => {
    const b = toBatch(sid);
    const res = validateBatch(b, { now: T0 + 200000 });
    assert.equal(res.ok, true, sid + ' ' + res.error);
    assert.deepEqual(res.dropped, { events: 0, props: 0 }, sid);
  });
  assert.equal(new Set(FIXTURE.map((e) => e.sid)).size, 6);
});

test('(d) rollupDay on the six-session fixture gives exactly the hand-counted numbers', () => {
  const doc = rollupDay(FIXTURE, { date: '2026-01-05' });
  assert.equal(doc.v, 1);
  assert.equal(doc.date, '2026-01-05');
  assert.deepEqual(doc.counters, {
    sessions: 6, sessionsEntered: 6, sessionsEntryShown: 5, sessionsEntryResult: 2, sessionsOpened: 4, sessionsResult: 3,
    sessionsClicked: 1, sessionsSkipped: 1, sessionsTalkOpen: 1, sessionsTalkAfterResult: 1, sessionsTalkSent: 1,
    sessionsCtaClick: 1, sessionsNoInteraction: 1, bounces: 1, sessionsSkippedThenCta: 1, sessionsSkippedThenScroll50: 0,
    stepViews: { s1: 4, s2: 4, s3: 4, s4: 3, s5: 3 },
    stepAnswered: { s1: 4, s2: 4, s3: 3, s4: 3, s5: 3 },
    stepBack: { s1: 0, s2: 0, s3: 0, s4: 1, s5: 0 },
    stepExit: { s1: 0, s2: 0, s3: 1, s4: 0, s5: 0 }
  });
  assert.deepEqual(doc.hist, {
    timeOnStep: {
      s1: tb({ '0-5s': 4 }),
      s2: tb({ '5-15s': 8 }),
      s3: tb({ '0-5s': 2, '5-15s': 1, '15-30s': 1 }),
      s4: tb({ '0-5s': 3 }),
      s5: tb({ '0-5s': 1, '5-15s': 1, '120s+': 1 })
    },
    timeToResult: tb({ '15-30s': 1, '30-60s': 1, '120s+': 1 }),
    visibleTime: vb({ '0-10s': 1, '10-30s': 2, '30-60s': 2, '1-3m': 1 })
  });
  const m = doc.maps;
  assert.deepEqual(m.answers, {
    goal: { first: 2, hybrid: 1 }, level: { new: 2, regular: 1 }, place: { home: 2, both: 1 },
    obst: { run: 1, time: 1, plateau: 1, none: 1 }, format: { paper: 2, phone: 1 }, race: { '12-23': 2, none: 1 }
  });
  assert.deepEqual(m.primary, { home: 2, app: 1 });
  assert.deepEqual(m.viewByProduct, { home: 2, app: 1 });
  assert.deepEqual(m.secondary, { run12: 1, vdot: 1, free: 2, twelve: 1, app: 1 });
  assert.deepEqual(m.clickByProduct, { home: 1 });
  assert.deepEqual(m.clickBySlot, { primary: 1 });
  assert.deepEqual(m.feedbackFit, { yes: 1, no: 1 });
  assert.deepEqual(m.feedbackReasons, { wrong: 1, price: 1 });
  assert.deepEqual(m.skipFrom, { bar: 1 });
  assert.deepEqual(m.skipReason, { know: 1 });
  assert.deepEqual(m.refHost, { 'google.com': 3, 'instagram.com': 1, 'reddit.com': 1, direct: 1 });
  assert.deepEqual(m.utmSource, { instagram: 1 });
  assert.deepEqual(m.utmCampaign, { launch: 1 });
  assert.deepEqual(m.vw, { phone: 4, desktop: 2 });
  assert.deepEqual(m.variant, { A: 3, B: 2, control: 1 });
  assert.deepEqual(m.mode, { entry: 6 });
  assert.deepEqual(m.closeReason, { button: 1 });
  assert.deepEqual(m.talkFrom, { result: 1 });
  assert.deepEqual(m.talkInvalidField, { email: 1 });
  assert.deepEqual(m.sectionViews, { hero: 2, plans: 1 });
  assert.deepEqual(m.scrollDepth, { 50: 1 });
  assert.deepEqual(m.scrollReach, { 25: 1, 50: 1 });
  assert.deepEqual(m.faqOpens, { 2: 1 });
  assert.deepEqual(m.ctaClicks, { 'nav-app': 1 });
  assert.deepEqual(m.rulePath, {
    'paper:first-home-or-both': 2, 'free-start:free': 3, 'primary:format-paper': 2, 'extras:run': 1, 'extras:time-or-generic': 1,
    'paper:hybrid-default': 1, 'primary:format-phone': 1, 'extras:structure-or-plateau': 1
  });
  assert.deepEqual(m.bounceByVw, { phone: 1 });
  assert.deepEqual(m.goalStarted, { first: 2, faster: 1, hybrid: 1 }); // sessions 3 and 6, 4, 5
  assert.deepEqual(m.byGoalStart, {
    first: { started: 2, result: 2, clicked: 1 }, // session 3 clicked, session 6 did not
    faster: { started: 1, result: 0, clicked: 0 }, // session 4 abandoned on step 3
    hybrid: { started: 1, result: 1, clicked: 0 } // session 5 saw a result and did not click
  });
  assert.deepEqual(m.byGoalFormat, { first: { paper: { results: 2, clicks: 1, feedbackNo: 0 } }, hybrid: { phone: { results: 1, clicks: 0, feedbackNo: 1 } } });
  assert.deepEqual(m.byRef, {
    'google.com': { sessions: 3, opened: 2, result: 1, clicked: 1, skipped: 0 },
    'instagram.com': { sessions: 1, opened: 0, result: 0, clicked: 0, skipped: 1 },
    'reddit.com': { sessions: 1, opened: 1, result: 1, clicked: 0, skipped: 0 },
    direct: { sessions: 1, opened: 1, result: 1, clicked: 0, skipped: 0 }
  });
  assert.deepEqual(m.byVw, { phone: { sessions: 4, opened: 2, result: 1, clicked: 0 }, desktop: { sessions: 2, opened: 2, result: 2, clicked: 1 } });
  assert.deepEqual(m.byVariant, {
    A: { sessions: 3, opened: 2, result: 2, clicked: 1, skipped: 0, ctaClicks: 0 },
    B: { sessions: 2, opened: 1, result: 0, clicked: 0, skipped: 1, ctaClicks: 1 },
    control: { sessions: 1, opened: 1, result: 1, clicked: 0, skipped: 0, ctaClicks: 0 }
  });
  assert.deepEqual(m.byPrimary, {
    home: { results: 2, clicks: 1, feedbackYes: 1, feedbackPartly: 0, feedbackNo: 0 },
    app: { results: 1, clicks: 0, feedbackYes: 0, feedbackPartly: 0, feedbackNo: 1 }
  });
  assert.deepEqual(m.byRulePath, {
    'paper:first-home-or-both': { results: 2, clicks: 1 }, 'free-start:free': { results: 3, clicks: 1 }, 'primary:format-paper': { results: 2, clicks: 1 },
    'extras:run': { results: 1, clicks: 1 }, 'extras:time-or-generic': { results: 1, clicks: 1 },
    'paper:hybrid-default': { results: 1, clicks: 0 }, 'primary:format-phone': { results: 1, clicks: 0 }, 'extras:structure-or-plateau': { results: 1, clicks: 0 }
  });
});

test('(d) report() rates and tables match hand-computed values on the fixture', () => {
  const rep = report(mergeDays([rollupDay(FIXTURE, { date: 'x' })]), { catalog: funnel.catalog });
  const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-12, msg + ': ' + a + ' vs ' + b);
  assert.equal(rep.sessions, 6);
  assert.equal(rep.days, 1);
  close(rep.rates.openRate, 4 / 6, 'openRate');
  close(rep.rates.completionRate, 3 / 4, 'completionRate');
  close(rep.rates.entryToResult, 2 / 5, 'entryToResult'); // the control session's result is not counted against entry_shown
  close(rep.rates.clickRate, 1 / 3, 'clickRate');
  close(rep.rates.skipRate, 1 / 5, 'skipRate');
  close(rep.rates.talkRate, 1 / 3, 'talkRate');
  close(rep.rates.bounceRate, 1 / 6, 'bounceRate');
  close(rep.rates.noInteractionRate, 1 / 6, 'noInteractionRate');

  assert.deepEqual(rep.stepFunnel.map((s) => [s.step, s.name, s.views, s.answered, s.back, s.exits, s.dropRate, s.backRate]), [
    [1, 'Goal', 4, 4, 0, 0, 0, 0], [2, 'Starting point', 4, 4, 0, 0, 0, 0], [3, 'What got in the way', 4, 3, 0, 1, 0.25, 0],
    [4, 'How you train', 3, 3, 1, 0, 0, 1 / 3], [5, 'Anything else', 3, 3, 0, 0, 0, 0]
  ]);
  assert.deepEqual(rep.medianBuckets.timeOnStep.s1, { n: 4, median: '0-5s', p90: '0-5s' });
  assert.deepEqual(rep.medianBuckets.timeOnStep.s2, { n: 8, median: '5-15s', p90: '5-15s' });
  assert.deepEqual(rep.medianBuckets.timeOnStep.s3, { n: 4, median: '0-5s', p90: '15-30s' });
  assert.deepEqual(rep.medianBuckets.timeOnStep.s5, { n: 3, median: '5-15s', p90: '120s+' });
  assert.deepEqual(rep.medianBuckets.timeToResult, { n: 3, median: '30-60s', p90: '120s+' });
  assert.deepEqual(rep.medianBuckets.visibleTime, { n: 6, median: '10-30s', p90: '1-3m' });

  assert.deepEqual(rep.products.map((p) => [p.id, p.title, p.results, p.clicks, p.ctr, p.feedbackN, p.feedbackNoRate]), [
    ['home', 'Train for Hyrox at Home', 2, 1, 0.5, 1, 0],
    ['app', 'The HybridX app', 1, 0, 0, 1, 1]
  ]);
  assert.deepEqual(rep.sources.map((s) => [s.ref, s.sessions, s.openRate, s.completionRate, s.clickRate, s.skipRate]), [
    ['google.com', 3, 2 / 3, 1 / 2, 1, 0],
    ['direct', 1, 1, 1, 0, 0],
    ['instagram.com', 1, 0, null, null, 1],
    ['reddit.com', 1, 1, 1, 0, 0]
  ]);
  assert.deepEqual(rep.devices.map((d) => [d.vw, d.sessions, d.openRate, d.completionRate, d.clickRate, d.bounceRate]), [
    ['phone', 4, 0.5, 0.5, 0, 0.25], ['desktop', 2, 1, 1, 0.5, 0]
  ]);
  assert.equal(rep.variants.lift, null, 'arms under 30 sessions: no lift is computed');
  assert.deepEqual(rep.variants.arms.map((a) => [a.variant, a.sessions, a.ctaClicks]), [['A', 3, 0], ['B', 2, 1], ['control', 1, 0]]);

  assert.deepEqual(rep.putOffs.biggestStepDrop, { step: 3, name: 'What got in the way', views: 4, exits: 1, dropRate: 0.25 });
  assert.equal(rep.putOffs.highestBackStep.step, 4);
  assert.equal(rep.putOffs.slowestStep.step, 5, 'ties on the median are broken by the p90');
  assert.deepEqual(rep.putOffs.skipReasons, [{ key: 'know', count: 1, share: 1 }]);
  assert.deepEqual(rep.putOffs.feedbackReasons, [{ key: 'price', count: 1, share: 0.5 }, { key: 'wrong', count: 1, share: 0.5 }]);
  assert.deepEqual(rep.putOffs.talkInvalidFields, [{ key: 'email', count: 1, share: 1 }]);
  assert.deepEqual(rep.putOffs.bounceByDevice, { phone: 0.25, tablet: null, desktop: 0 });
  assert.equal(rep.putOffs.bounceGapPhoneVsDesktop, 0.25);
  assert.deepEqual(rep.demand.noMatch, { talkAfterResult: 1, talkAfterResultRate: 1 / 3, talkFromResult: 1 });
  assert.deepEqual(rep.demand.feedbackNoByGoal, [{ goal: 'hybrid', results: 1, feedbackNo: 1, rate: 1 }, { goal: 'first', results: 2, feedbackNo: 0, rate: 0 }]);
  assert.deepEqual(rep.demand.lowClickCells, [], 'no cell has 10 results yet');
  assert.equal(rep.demand.cells.length, 2);
  assert.deepEqual(rep.attractors.sections.map((s) => [s.id, s.sessions, s.reach]), [['hero', 2, 2 / 6], ['plans', 1, 1 / 6]]);
  assert.equal(rep.attractors.scrolled50, 1);
  assert.deepEqual(rep.attractors.scroll, [{ pct: 25, sessions: 1, reach: 1 / 6 }, { pct: 50, sessions: 1, reach: 1 / 6 }]);
  assert.deepEqual(rep.attractors.goalStarts, [
    { goal: 'first', started: 2, result: 2, clicked: 1, completionRate: 1, clickRate: 0.5 },
    { goal: 'faster', started: 1, result: 0, clicked: 0, completionRate: 0, clickRate: null },
    { goal: 'hybrid', started: 1, result: 1, clicked: 0, completionRate: 1, clickRate: 0 }
  ]);
  assert.deepEqual(rep.skips, { skipped: 1, thenCtaRate: 1, thenScroll50Rate: 0 });
  assert.deepEqual(rep.attractors.ctas, [{ key: 'nav-app', count: 1, share: 1 / 6 }]);
  assert.deepEqual(rep.attractors.faq, [{ key: '2', count: 1, share: 1 / 6 }]);
  assert.deepEqual(rep.answerShares.answers.goal, [{ key: 'first', count: 2, share: 2 / 3 }, { key: 'hybrid', count: 1, share: 1 / 3 }]);
  assert.deepEqual(rep.answerShares.answers.obst.map((x) => x.share), [1 / 3, 1 / 3, 1 / 3, 1 / 3], 'obst is multi-select: share of results, not of picks');
  assert.deepEqual(rep.answerShares.refHost[0], { key: 'google.com', count: 3, share: 0.5 });
  assertFinite(rep, 'report');
});

test('(d) exit step rules: only sessions without a result, latest step-carrying event wins, page_hide step 0 is ignored', () => {
  const cx = { vw: 'desktop' };
  const mk = (sid, rows) => session(sid, cx, rows);
  const events = [].concat(
    mk('exit-a-00000000001', [[0, 'finder_open', {}], [10, 'q_view', { step: 1 }], [20, 'q_view', { step: 2 }], [30, 'page_hide', { ms: 5000, step: 2 }]]), // pagehide on 2
    mk('exit-b-00000000002', [[0, 'finder_open', {}], [10, 'q_view', { step: 1 }], [20, 'dialog_close', { step: 1, reason: 'esc', result: false }], [30, 'page_hide', { ms: 5000, step: 0 }]]), // closed on 1
    mk('exit-c-00000000003', [[0, 'finder_open', {}], [10, 'q_view', { step: 1 }], [20, 'dialog_close', { step: 1, reason: 'esc', result: false }], [30, 'finder_open', {}], [40, 'q_view', { step: 4 }], [50, 'page_hide', { ms: 5000, step: 4 }]]), // reopened, left on 4
    mk('exit-d-00000000004', [[0, 'finder_open', {}], [10, 'q_view', { step: 5 }], [20, 'result_view', { answers: {}, primary: 'free' }], [30, 'page_hide', { ms: 5000, step: 0 }]]), // result: no exit
    mk('exit-e-00000000005', [[0, 'finder_open', {}], [10, 'q_view', { step: 7 }], [20, 'page_hide', { ms: 5000, step: 7 }]]), // step outside 1..5: not counted
    mk('exit-f-00000000006', [[0, 'page_view'], [10, 'page_hide', { ms: 5000, step: 0 }]]) // never opened
  );
  const c = rollupDay(events).counters;
  assert.deepEqual(c.stepExit, { s1: 1, s2: 1, s3: 0, s4: 1, s5: 0 });
  assert.equal(c.sessions, 6);
});

// Hand-built fixture for the two later additions: what skippers did next, and the goal everyone started with.
// Rows are [ms, name, props, q?]; q defaults to the row index. Events go in shuffled order on purpose: rollupDay sorts by (t, q).
function sessionQ(sid, ctx, rows) {
  return rows.map((r, i) => Object.assign({ sid, n: r[1], t: T0 + r[0], q: r[3] === undefined ? i : r[3] }, r[2] || {}, { ctx }));
}
const SKIP = { from: 'bar', step: 0, ms: 1000 };
const CTA = { id: 'hero-start', kind: 'hero' };
const GOAL = (value, ms) => ({ step: 1, key: 'goal', value, ms: ms || 3000 });
const RESULT = { answers: { goal: 'first' }, primary: 'free' };
const FOLLOW_UPS = [].concat(
  // S1: skip, later CTA, later scroll 75: counts for both
  sessionQ('skip-both-0000000001', { vw: 'phone' }, [[0, 'page_view'], [100, 'entry_skip', SKIP], [500, 'scroll_depth', { pct: 25 }], [600, 'scroll_depth', { pct: 75 }], [900, 'cta_click', CTA], [1000, 'cta_click', { id: 'nav-app', kind: 'nav' }]]),
  // S2: skip, later CTA only (scroll 25 does not reach 50)
  sessionQ('skip-cta-000000000002', { vw: 'phone' }, [[0, 'page_view'], [100, 'entry_skip', SKIP], [300, 'scroll_depth', { pct: 25 }], [400, 'cta_click', CTA]]),
  // S3: skip, later scroll 50 only
  sessionQ('skip-scroll-0000000003', { vw: 'desktop' }, [[0, 'page_view'], [100, 'entry_skip', SKIP], [300, 'scroll_depth', { pct: 25 }], [400, 'scroll_depth', { pct: 50 }]]),
  // S4: CTA and scroll 100 BEFORE the skip: nothing counts
  sessionQ('acted-first-000000004', { vw: 'desktop' }, [[0, 'page_view'], [100, 'cta_click', CTA], [200, 'scroll_depth', { pct: 100 }], [300, 'entry_skip', SKIP]]),
  // S5: skip and nothing else
  sessionQ('skip-only-0000000005', { vw: 'phone' }, [[0, 'page_view'], [100, 'entry_skip', SKIP], [200, 'skip_reason', { reason: 'know' }], [900, 'page_hide', { ms: 900, step: 0 }]]),
  // S6: CTA and scroll 50 with no skip at all
  sessionQ('no-skip-000000000006', { vw: 'phone' }, [[0, 'page_view'], [100, 'cta_click', CTA], [200, 'scroll_depth', { pct: 50 }]]),
  // S7: same timestamp, decided by q. The CTA has the lower q so it is NOT later; the scroll has the higher q so it IS later.
  sessionQ('tie-by-q-00000000007', { vw: 'tablet' }, [[0, 'page_view'], [500, 'cta_click', CTA, 2], [500, 'entry_skip', SKIP, 3], [500, 'scroll_depth', { pct: 50 }, 4]]),
  // S8: same timestamp, CTA has the higher q: later, so it counts
  sessionQ('tie-by-q-00000000008', { vw: 'tablet' }, [[0, 'page_view'], [500, 'entry_skip', SKIP, 3], [500, 'cta_click', CTA, 4]])
);

test('skippers: a CTA click or scroll >= 50 only counts when it comes after the entry_skip, ordered by t then q', () => {
  const doc = rollupDay(FOLLOW_UPS.slice().reverse()); // reversed input: order must come from (t, q), not array order
  assert.equal(doc.counters.sessions, 8);
  assert.equal(doc.counters.sessionsSkipped, 7); // every session except S6
  assert.equal(doc.counters.sessionsSkippedThenCta, 3, 'S1, S2 and S8');
  assert.equal(doc.counters.sessionsSkippedThenScroll50, 3, 'S1, S3 and S7');
  assert.deepEqual(rollupDay(FOLLOW_UPS).counters, doc.counters);
  const rep = report(mergeDays([doc]));
  assert.deepEqual(rep.skips, { skipped: 7, thenCtaRate: 3 / 7, thenScroll50Rate: 3 / 7 });
  assert.equal(rep.totals.sessionsSkippedThenCta, 3);
});

// Goal at start: first goal answer per session, results or not
const GOAL_SESSIONS = [].concat(
  // G1: goal 'faster' first, later re-answered 'first' after pressing back: the FIRST answer wins; result and click
  sessionQ('goal-first-wins-0001', {}, [[0, 'finder_open', { source: 'entry', step: 1 }], [10, 'q_view', { step: 1 }], [20, 'q_answer', GOAL('faster')], [30, 'q_view', { step: 2 }], [40, 'q_back', { step: 2 }], [50, 'q_answer', GOAL('first')], [60, 'result_view', RESULT], [70, 'result_click', { product: 'free', slot: 'primary' }]]),
  // G2: goal 'faster', result, no click
  sessionQ('goal-result-000000002', {}, [[0, 'q_answer', GOAL('faster')], [10, 'result_view', RESULT]]),
  // G3: goal 'faster', leaves before a result
  sessionQ('goal-abandon-00000003', {}, [[0, 'q_view', { step: 1 }], [10, 'q_answer', GOAL('faster')], [20, 'q_view', { step: 2 }], [30, 'dialog_close', { step: 2, reason: 'button', result: false }]]),
  // G4: goal 'ultra', leaves before a result, but a stray click event exists: clicked counts on its own
  sessionQ('goal-click-000000004', {}, [[0, 'q_answer', GOAL('ultra')], [10, 'result_click', { product: 'vdot', slot: 'primary' }]]),
  // G5: q_view only, never answered a goal: ignored
  sessionQ('goal-none-0000000005', {}, [[0, 'q_view', { step: 1 }], [10, 'dialog_close', { step: 1, reason: 'esc', result: false }]]),
  // G6: a result with no goal answer event (lost): ignored by goal maps
  sessionQ('goal-lost-0000000006', {}, [[0, 'result_view', RESULT]]),
  // G7: an answer for another key at step 1 and a non-string goal value: ignored
  sessionQ('goal-bad-00000000007', {}, [[0, 'q_answer', { step: 1, key: 'level', value: 'new', ms: 1000 }], [10, 'q_answer', { step: 1, key: 'goal', value: ['first'], ms: 1000 }]])
);

test('goal at start: first goal answer per session, counted whether or not the session reached a result', () => {
  const doc = rollupDay(GOAL_SESSIONS);
  assert.deepEqual(doc.maps.goalStarted, { faster: 3, ultra: 1 });
  assert.deepEqual(doc.maps.byGoalStart, {
    faster: { started: 3, result: 2, clicked: 1 }, // G1 (result+click), G2 (result), G3 (abandoned)
    ultra: { started: 1, result: 0, clicked: 1 } // G4
  });
  // and the rest of the doc still sees G6's result
  assert.equal(doc.counters.sessionsResult, 3);
  const rep = report(mergeDays([doc]));
  assert.deepEqual(rep.attractors.goalStarts, [
    { goal: 'faster', started: 3, result: 2, clicked: 1, completionRate: 2 / 3, clickRate: 0.5 },
    { goal: 'ultra', started: 1, result: 0, clicked: 1, completionRate: 0, clickRate: null }
  ]);
  // null-safe on empty data
  const empty = report(mergeDays([rollupDay([])]));
  assert.deepEqual(empty.attractors.goalStarts, []);
  assert.deepEqual(empty.skips, { skipped: 0, thenCtaRate: null, thenScroll50Rate: null });
  assertFinite(rep, 'goal report');
});

test('goal starts and skip follow-ups are plain sums: merging matches rolling up the union', () => {
  const first3 = new Set(['goal-first-wins-0001', 'goal-result-000000002', 'goal-abandon-00000003']); // whole sessions, never half of one
  const a = FOLLOW_UPS.concat(GOAL_SESSIONS.filter((e) => first3.has(e.sid)));
  const b = GOAL_SESSIONS.filter((e) => !first3.has(e.sid));
  assert.ok(a.length > 0 && b.length > 0);
  assert.deepEqual(strip(mergeDays([rollupDay(a), rollupDay(b)])), strip(rollupDay(a.concat(b))));
  const two = mergeDays([rollupDay(a), rollupDay(a)]);
  assert.equal(two.counters.sessionsSkippedThenCta, 6);
  assert.deepEqual(two.maps.byGoalStart.faster, { started: 6, result: 4, clicked: 2 }); // G1-G3 twice
});

test('histogram bucket edges, JSON key order independence, and the empty doc', () => {
  assert.equal(bucketFor(0, TIME_BUCKETS, TIME_EDGES_S), '0-5s');
  assert.equal(bucketFor(4999, TIME_BUCKETS, TIME_EDGES_S), '0-5s');
  assert.equal(bucketFor(5000, TIME_BUCKETS, TIME_EDGES_S), '5-15s');
  assert.equal(bucketFor(119999, TIME_BUCKETS, TIME_EDGES_S), '60-120s');
  assert.equal(bucketFor(120000, TIME_BUCKETS, TIME_EDGES_S), '120s+');
  assert.equal(bucketFor(9999, VISIBLE_BUCKETS, VISIBLE_EDGES_S), '0-10s');
  assert.equal(bucketFor(10000, VISIBLE_BUCKETS, VISIBLE_EDGES_S), '10-30s');
  assert.equal(bucketFor(179999, VISIBLE_BUCKETS, VISIBLE_EDGES_S), '1-3m');
  assert.equal(bucketFor(600000, VISIBLE_BUCKETS, VISIBLE_EDGES_S), '10m+');
  assert.deepEqual(BUCKETS.timeOnStep, ['0-5s', '5-15s', '15-30s', '30-60s', '60-120s', '120s+']);
  assert.deepEqual(BUCKETS.visibleTime, ['0-10s', '10-30s', '30-60s', '1-3m', '3-10m', '10m+']);
  assert.deepEqual(STEP_NAMES, ['Goal', 'Starting point', 'What got in the way', 'How you train', 'Anything else']);

  // Reverse every hist object's key order (as a database might): medians must not change
  const rep1 = report(mergeDays([rollupDay(FIXTURE)]));
  const doc = mergeDays([rollupDay(FIXTURE)]);
  const reverse = (o) => (isObj(o) ? Object.keys(o).reverse().reduce((r, k) => { r[k] = reverse(o[k]); return r; }, {}) : o);
  doc.hist = reverse(doc.hist);
  assert.deepEqual(report(doc).medianBuckets, rep1.medianBuckets);

  // Empty input: zero doc, every rate null, nothing NaN
  const empty = rollupDay([], { date: 'd' });
  assert.deepEqual(empty, emptyDoc('d'));
  assert.equal(empty.counters.sessions, 0);
  const rep = report(mergeDays([empty]));
  Object.keys(rep.rates).forEach((k) => assert.equal(rep.rates[k], null, k));
  assertFinite(rep, 'empty report');
  assert.deepEqual(insights(rep), [{ id: 'not-enough-data', severity: 'info', area: 'funnel', finding: insights(rep)[0].finding, evidence: '0 sessions recorded so far; insights start at 100.', suggestion: insights(rep)[0].suggestion }]);
  assert.doesNotThrow(() => report(undefined));
  assert.doesNotThrow(() => report({}));
  assert.doesNotThrow(() => insights(undefined));
});

test('hostile or unbounded keys: escaped, capped, and the totals are preserved', () => {
  const cx = (ref) => ({ mode: 'entry', ref, vw: 'phone' });
  const rows = [[0, 'page_view'], [10, 'page_hide', { ms: 20000, scroll: 0, step: 0 }]];
  const hostile = ['constructor', '__proto__', 'toString', '__x__', 'hasOwnProperty'];
  const events = hostile.reduce((a, r, i) => a.concat(session('hostile-sid-' + String(i).padStart(4, '0'), cx(r), rows)), []);
  const doc = rollupDay(events);
  assert.equal(({}).polluted, undefined);
  assert.equal(doc.maps.refHost.constructor, 1);
  assert.equal(doc.maps.refHost.toString, 1);
  assert.equal(doc.maps.refHost.hasOwnProperty, 1);
  assert.equal(doc.maps.refHost[mapKey('__proto__')], 1);
  assert.equal(mapKey('__x__'), '___x__');
  assert.equal(Object.keys(doc.maps.refHost).length, 5);
  assert.equal(mapKey('a'.repeat(100)).length, 60);

  // 300 distinct referrers, cap at 20 keys: nothing is lost, the tail lands in _other
  const many = [];
  for (let i = 0; i < 300; i++) many.push.apply(many, session('many-sid-' + String(i).padStart(6, '0'), cx('site' + i + '.example.com'), rows));
  const capped = rollupDay(many, { maxKeys: 20 });
  assert.ok(Object.keys(capped.maps.refHost).length <= 20);
  assert.ok('_other' in capped.maps.refHost);
  assert.equal(Object.values(capped.maps.refHost).reduce((a, b) => a + b, 0), 300);
  assert.equal(Object.values(capped.maps.byRef).reduce((a, b) => a + b.sessions, 0), 300);
  assert.equal(capped.counters.sessions, 300);
  // the goal maps are capped the same way, and nothing is lost
  const goals = [];
  for (let i = 0; i < 300; i++) goals.push.apply(goals, session('goal-sid-' + String(i).padStart(6, '0'), cx('google.com'), [[0, 'q_answer', { step: 1, key: 'goal', value: 'goal' + i, ms: 1000 }], [10, 'page_hide', { ms: 20000, step: 0 }]]));
  const gd = rollupDay(goals, { maxKeys: 20 });
  assert.ok(Object.keys(gd.maps.goalStarted).length <= 20 && Object.keys(gd.maps.byGoalStart).length <= 20);
  assert.equal(Object.values(gd.maps.goalStarted).reduce((a, b) => a + b, 0), 300);
  assert.equal(Object.values(gd.maps.byGoalStart).reduce((a, b) => a + b.started, 0), 300);
  assert.equal(gd.maps.byGoalStart._other.started, gd.maps.goalStarted._other);
  // default cap keeps a doc small even for 300 unique referrers
  assert.ok(Object.keys(rollupDay(many).maps.refHost).length <= 100);
});

// ---------------------------------------------------------------------------------------------
// (e) insights
// ---------------------------------------------------------------------------------------------

test('(e) crafted data: step 3 exit rate 0.3 produces the step-drop insight for step 3 only', () => {
  const g = generate({ days: 3, sessionsPerDay: 300, seed: 7, model: { exit: { 3: 0.3 } } });
  const rep = report(merged(g.events), { catalog: funnel.catalog });
  const s3 = rep.stepFunnel[2];
  assert.ok(s3.dropRate > 0.25 && s3.dropRate < 0.36, 'step 3 drop rate ' + s3.dropRate);
  const out = insights(rep);
  const drop = out.filter((i) => i.id.indexOf('step-drop') === 0);
  assert.deepEqual(ids(drop), ['step-drop-3']);
  assert.equal(drop[0].area, 'funnel');
  assert.ok(['high', 'medium'].includes(drop[0].severity));
  assert.match(drop[0].finding, /step 3 \(What got in the way\)/);
  assert.ok(drop[0].evidence.indexOf(s3.exits + ' of ' + s3.views) === 0, drop[0].evidence);
  assert.match(drop[0].evidence, /\(\d+\.\d%\)/);
  assert.ok(drop[0].suggestion.length > 20);
  out.forEach((i) => {
    assert.deepEqual(Object.keys(i).sort(), ['area', 'evidence', 'finding', 'id', 'severity', 'suggestion']);
    assert.ok(['high', 'medium', 'low', 'info'].includes(i.severity));
    assert.ok(['funnel', 'routing', 'acquisition', 'homepage', 'skip', 'device'].includes(i.area), i.area);
    assert.match(i.evidence, /\d/, 'evidence quotes numbers: ' + i.id);
  });
  // sorted most severe first
  const rank = { high: 0, medium: 1, low: 2, info: 3 };
  for (let i = 1; i < out.length; i++) assert.ok(rank[out[i - 1].severity] <= rank[out[i].severity]);
});

test('(e) fewer than 100 sessions: only the not-enough-data insight, whatever the numbers say', () => {
  const g = generate({ days: 1, sessionsPerDay: 60, seed: 3, model: { exit: { 3: 0.9 } } });
  const out = insights(report(merged(g.events)));
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'not-enough-data');
  assert.equal(out[0].severity, 'info');
  assert.match(out[0].evidence, /^60 sessions/);
  // 99 vs 100 sessions with a brutal step-3 problem
  const patch = (n) => ({ counters: { sessions: n, stepViews: { s3: 60 }, stepExit: { s3: 50 } } });
  assert.deepEqual(ids(insights(repFrom(patch(99)))), ['not-enough-data']);
  assert.ok(insights(repFrom(patch(100))).some((i) => i.id === 'step-drop-3'));
});

test('(e) a healthy dataset yields no high-severity insights', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const g = generate({ days: 3, sessionsPerDay: 300, seed });
    const out = insights(report(merged(g.events), { catalog: funnel.catalog }));
    assert.deepEqual(out.filter((i) => i.severity === 'high').map((i) => i.id), [], 'seed ' + seed);
    assert.ok(out.every((i) => i.id !== 'not-enough-data'));
    assert.ok(out.every((i) => i.id.indexOf('step-drop') !== 0), 'no step leaks in healthy data, seed ' + seed);
  }
  // one specific seed is fully clean
  assert.deepEqual(insights(report(merged(generate({ days: 3, sessionsPerDay: 300, seed: 1 }).events))), []);
});

test('(e) thresholds override works, and so does minSessions', () => {
  const g = generate({ days: 3, sessionsPerDay: 300, seed: 7, model: { exit: { 3: 0.3 } } });
  const rep = report(merged(g.events), { catalog: funnel.catalog });
  assert.ok(ids(insights(rep)).includes('step-drop-3'));
  assert.ok(!ids(insights(rep, { thresholds: { stepDropRate: 0.5 } })).includes('step-drop-3'), 'raising the threshold removes it');
  assert.equal(ids(insights(rep, { thresholds: { stepDropRate: 0.03 } })).filter((i) => i.indexOf('step-drop') === 0).length, 5, 'lowering it finds every step');
  assert.ok(ids(insights(rep, { thresholds: { completionRate: 0.95 } })).includes('low-completion'));
  assert.ok(!ids(insights(rep)).includes('low-completion'));
  assert.deepEqual(ids(insights(rep, { minSessions: 5000 })), ['not-enough-data']);
  assert.deepEqual(ids(insights(rep, { thresholds: { minSessions: 5000 } })), ['not-enough-data']);
  const small = report(merged(generate({ days: 1, sessionsPerDay: 60, seed: 3, model: { exit: { 3: 0.9 } } }).events));
  assert.ok(!ids(insights(small, { minSessions: 20 })).includes('not-enough-data'));
  assert.ok(!ids(insights(small, { minSessions: 20 })).includes('step-drop-3'), 'too few views on the step: the per-rule sample guard still applies');
  assert.ok(ids(insights(small, { minSessions: 20, thresholds: { stepMinViews: 5 } })).includes('step-drop-3'), 'both guards are thresholds');
  assert.equal(DEFAULT_THRESHOLDS.minSessions, 100);
  const before = JSON.stringify(DEFAULT_THRESHOLDS);
  insights(rep, { thresholds: { stepDropRate: 0.9 } });
  assert.equal(JSON.stringify(DEFAULT_THRESHOLDS), before, 'defaults are never mutated');
});

// One case per rule: fires at the threshold, stays quiet just under it, and quotes the numbers.
const RULES = [
  {
    id: 'step-drop-3', area: 'funnel',
    on: { counters: { stepViews: { s3: 100 }, stepExit: { s3: 25 } } }, off: { counters: { stepViews: { s3: 100 }, stepExit: { s3: 24 } } },
    quote: ['25 of 100', '25.0%']
  },
  {
    id: 'step-drop-2', area: 'funnel', what: 'needs 30+ views',
    on: { counters: { stepViews: { s2: 30 }, stepExit: { s2: 30 } } }, off: { counters: { stepViews: { s2: 29 }, stepExit: { s2: 29 } } },
    quote: ['30 of 30']
  },
  {
    id: 'slow-step-2', area: 'funnel',
    on: { hist: { timeOnStep: { s2: { '60-120s': 40, '15-30s': 10 } } } }, off: { hist: { timeOnStep: { s2: { '30-60s': 40, '120s+': 10 } } } },
    quote: ['60-120s', '50 answers']
  },
  {
    id: 'back-step-4', area: 'funnel',
    on: { counters: { stepViews: { s4: 100 }, stepBack: { s4: 15 } } }, off: { counters: { stepViews: { s4: 100 }, stepBack: { s4: 14 } } },
    quote: ['15 of 100', '15.0%']
  },
  {
    id: 'skip-rate', area: 'skip',
    on: { counters: { sessionsEntryShown: 100, sessionsSkipped: 50 }, maps: { skipReason: { toomany: 20, know: 10 } } },
    off: { counters: { sessionsEntryShown: 100, sessionsSkipped: 49 } },
    quote: ['50 of 100', '50.0%', 'toomany']
  },
  {
    id: 'low-completion', area: 'funnel',
    on: { counters: { sessionsOpened: 100, sessionsResult: 39 } }, off: { counters: { sessionsOpened: 100, sessionsResult: 40 } },
    quote: ['39 of 100', '39.0%']
  },
  {
    id: 'low-click-rate', area: 'routing',
    on: { counters: { sessionsResult: 100, sessionsClicked: 29 } }, off: { counters: { sessionsResult: 100, sessionsClicked: 30 } },
    quote: ['29 of 100', '29.0%']
  },
  {
    id: 'cell-first-paper', area: 'routing',
    on: { maps: { byGoalFormat: { first: { paper: { results: 10, clicks: 2, feedbackNo: 1 } } } } }, off: { maps: { byGoalFormat: { first: { paper: { results: 9, clicks: 0, feedbackNo: 0 } } } } },
    quote: ['2 of 10', '20.0%']
  },
  {
    id: 'product-feedback-app', area: 'routing',
    on: { maps: { byPrimary: { app: { results: 50, feedbackYes: 5, feedbackPartly: 2, feedbackNo: 3 } } } },
    off: { maps: { byPrimary: { app: { results: 50, feedbackYes: 5, feedbackPartly: 1, feedbackNo: 3 } } } }, // 9 feedback events
    quote: ['3 of 10', '30.0%'], finding: 'The HybridX app'
  },
  {
    id: 'phone-completion-gap', area: 'device',
    on: { maps: { byVw: { phone: { sessions: 200, opened: 100, result: 60 }, desktop: { sessions: 100, opened: 100, result: 75 } } } },
    off: { maps: { byVw: { phone: { sessions: 200, opened: 100, result: 61 }, desktop: { sessions: 100, opened: 100, result: 75 } } } }, // 14-point gap
    quote: ['60.0%', '75.0%', '15.0 points']
  },
  {
    id: 'source-open-gap-reddit.com', area: 'acquisition',
    on: { counters: { sessionsOpened: 500 }, maps: { byRef: { 'reddit.com': { sessions: 100, opened: 35 } } } }, // site 50%, reddit 35%
    off: { counters: { sessionsOpened: 500 }, maps: { byRef: { 'reddit.com': { sessions: 49, opened: 5 } } } }, // too few sessions
    quote: ['35.0%', '50.0%', '15.0 points']
  },
  {
    id: 'ref-skips-google.com', area: 'acquisition',
    on: { maps: { byRef: { 'google.com': { sessions: 100, opened: 30, skipped: 50 } } } }, off: { maps: { byRef: { 'google.com': { sessions: 100, opened: 30, skipped: 49 } } } },
    quote: ['50 of 100', '50.0%']
  },
  {
    id: 'lift-negative-A', area: 'homepage',
    on: { maps: { byVariant: { A: { sessions: 100, ctaClicks: 20 }, control: { sessions: 100, ctaClicks: 30 } } } },
    off: { maps: { byVariant: { A: { sessions: 100, ctaClicks: 30 }, control: { sessions: 100, ctaClicks: 30 } } } },
    quote: ['20.0%', '30.0%', '10.0 points']
  },
  {
    id: 'section-low-reach-books', area: 'homepage',
    on: { maps: { scrollReach: { 50: 100 }, sectionViews: { books: 19 } } }, off: { maps: { scrollReach: { 50: 100 }, sectionViews: { books: 20 } } },
    quote: ['19 sessions', '100', '19.0%']
  }
];

test('(e) every rule fires at its threshold, stays quiet just below it, and quotes its numbers', () => {
  RULES.forEach((rule) => {
    const on = insights(repFrom(deepAssign(JSON.parse(JSON.stringify(BASE)), rule.on)));
    const hit = on.find((i) => i.id === rule.id);
    assert.ok(hit, rule.id + ' should fire; got ' + ids(on).join(','));
    assert.equal(hit.area, rule.area, rule.id);
    rule.quote.forEach((q) => assert.ok(hit.evidence.indexOf(q) > -1, rule.id + ' evidence should quote "' + q + '": ' + hit.evidence));
    if (rule.finding) assert.ok(hit.finding.indexOf(rule.finding) > -1, rule.id + ' finding should name "' + rule.finding + '": ' + hit.finding);
    const off = insights(repFrom(deepAssign(JSON.parse(JSON.stringify(BASE)), rule.off)));
    assert.ok(!ids(off).includes(rule.id), rule.id + ' should not fire below the threshold');
  });
});

test('(e) lift rule needs 30+ sessions in both arms and is only "medium" when it is statistically clear', () => {
  const lift = (a, ctl) => repFrom({ counters: { sessions: 1000 }, maps: { byVariant: { A: a, control: ctl } } });
  assert.equal(lift({ sessions: 29, ctaClicks: 1 }, { sessions: 100, ctaClicks: 50 }).variants.lift, null);
  assert.equal(lift({ sessions: 100, ctaClicks: 1 }, { sessions: 29, ctaClicks: 20 }).variants.lift, null);
  const noisy = insights(lift({ sessions: 40, ctaClicks: 10 }, { sessions: 40, ctaClicks: 12 })).find((i) => i.id === 'lift-negative-A');
  assert.equal(noisy.severity, 'low');
  assert.match(noisy.finding, /noise/);
  const clear = insights(lift({ sessions: 400, ctaClicks: 80 }, { sessions: 400, ctaClicks: 160 })).find((i) => i.id === 'lift-negative-A');
  assert.equal(clear.severity, 'medium');
  const rep = lift({ sessions: 100, ctaClicks: 30 }, { sessions: 100, ctaClicks: 20 });
  assert.equal(rep.variants.lift[0].variant, 'A');
  assert.ok(Math.abs(rep.variants.lift[0].absolute - 0.1) < 1e-12);
  assert.ok(Math.abs(rep.variants.lift[0].relative - 0.5) < 1e-12);
  assert.ok(!ids(insights(rep)).includes('lift-negative-A'));
});

test('(e) cell insights are capped and sorted worst first; only cells with enough results count', () => {
  const cells = {};
  ['first', 'faster', 'athx', 'xenom', 'ultra', 'hybrid'].forEach((g, i) => { cells[g] = { paper: { results: 20, clicks: i, feedbackNo: 0 }, free: { results: 8, clicks: 0, feedbackNo: 0 } }; });
  const out = insights(repFrom({ counters: { sessions: 1000 }, maps: { byGoalFormat: cells } }));
  const c = out.filter((i) => i.id.indexOf('cell-') === 0);
  assert.equal(c.length, 5, 'capped at maxCellInsights');
  assert.equal(c[0].id, 'cell-first-paper', 'lowest click rate first');
  assert.ok(c.every((i) => i.id.slice(-6) === '-paper'), 'cells under 10 results are ignored');
  const rep = repFrom({ counters: { sessions: 1000 }, maps: { byGoalFormat: cells } });
  assert.equal(rep.demand.lowClickCells.length, 5, 'report lists cells with >= 10 results and click rate < 25%');
});

test('(e) a high-traffic referrer that mostly skips also triggers the site-wide skip rule when it dominates', () => {
  const rep = repFrom({
    counters: { sessions: 1000, sessionsEntryShown: 1000, sessionsSkipped: 600, sessionsOpened: 300 },
    maps: { byRef: { 'google.com': { sessions: 700, opened: 200, skipped: 450 } }, skipReason: { know: 100, toomany: 300, other: 5 } }
  });
  const out = insights(rep);
  assert.ok(ids(out).includes('skip-rate'));
  assert.ok(ids(out).includes('ref-skips-google.com'));
  assert.match(out.find((i) => i.id === 'skip-rate').evidence, /"toomany" \(300 answers\)/);
});

// ---------------------------------------------------------------------------------------------
// (f) no identifying keys anywhere
// ---------------------------------------------------------------------------------------------

// Value-keyed maps use DATA VALUES as keys ("phone" is a viewport and a format option, "email" a
// failed form field). So the rollup scan covers structural keys only: doc and section names,
// counters, hist buckets, map names and the field names inside cross-tabs.
const CROSS_ONE = ['byRef', 'byVw', 'byVariant', 'byPrimary', 'byRulePath'];
function structuralKeyProblem(doc) {
  const shell = { v: doc.v, date: doc.date, days: doc.days, counters: doc.counters, hist: doc.hist };
  const names = { maps: {} };
  Object.keys(doc.maps).forEach((name) => { names.maps[name] = 1; });
  let found = findIdentifyingKey(shell) || findIdentifyingKey(names);
  CROSS_ONE.forEach((name) => Object.keys(doc.maps[name]).forEach((k) => { found = found || findIdentifyingKey(doc.maps[name][k], 'maps.' + name); }));
  Object.keys(doc.maps.byGoalFormat).forEach((g) => Object.keys(doc.maps.byGoalFormat[g]).forEach((f) => { found = found || findIdentifyingKey(doc.maps.byGoalFormat[g][f], 'maps.byGoalFormat'); }));
  return found;
}
function assertAllLeavesNumeric(x, path) {
  if (isObj(x)) Object.keys(x).forEach((k) => assertAllLeavesNumeric(x[k], path + '.' + k));
  else assert.equal(typeof x, 'number', 'leaf at ' + path);
}

test('(f) no event, batch or rollup doc contains an identifying key', () => {
  const g = generate({ days: 3, sessionsPerDay: 300, seed: 55 });
  assert.equal(IDENTIFYING_KEYS.length, 8);
  // flat events (with their copied ctx), every one
  g.events.forEach((e) => assert.equal(findIdentifyingKey(e), null, JSON.stringify(e).slice(0, 80)));
  // no free text at all in seeded events except the scrubbed-style notes, and nothing that looks like an email or number
  const strings = (x) => (typeof x === 'string' ? [x] : Array.isArray(x) ? [].concat(...x.map(strings)) : isObj(x) ? [].concat(...Object.keys(x).map((k) => strings(x[k]))) : []);
  g.events.forEach((e) => strings(e).forEach((v) => assert.doesNotMatch(v, /@|\d{7,}/, v)));
  // request bodies
  toBatches(g.events).forEach((b) => assert.equal(findIdentifyingKey(b), null));
  // what the collector stores
  toBatches(g.events).slice(0, 300).forEach((b) => {
    const res = validateBatch(b, { now: b.events[b.events.length - 1].t + 1 });
    assert.equal(findIdentifyingKey(res), null);
  });
  // rollup docs: structural keys are clean and every leaf is a number
  const docs = splitByDay(g.events).map((d) => rollupDay(d.events, { date: d.date }));
  docs.concat(mergeDays(docs), rollupDay(FIXTURE)).forEach((doc) => {
    assert.equal(structuralKeyProblem(doc), null);
    ['counters', 'hist', 'maps'].forEach((sec) => assertAllLeavesNumeric(doc[sec], sec));
  });
  // the scan itself is not vacuous: the talk-form fields "name" and "email" DO appear as map keys, "phone" as a viewport
  const talk = rollupDay(session('talk-invalid-0000001', { vw: 'phone' }, [[0, 'talk_invalid', { fields: ['name', 'email'] }], [10, 'page_hide', { ms: 100, step: 0 }]]));
  assert.deepEqual(talk.maps.talkInvalidField, { name: 1, email: 1 });
  assert.notEqual(findIdentifyingKey(talk), null, 'a naive whole-doc key scan would trip on those data values');
  assert.equal(structuralKeyProblem(talk), null);
});

test('(f) an identifying key smuggled into an event is not carried into a rollup', () => {
  const dirty = FIXTURE.map((e) => Object.assign({}, e, { email: 'a@b.com', ip: '1.2.3.4', ua: 'x', userAgent: 'y', name: 'Jo', phone: '07700900123', message: 'hi', msg: 'yo' }));
  const doc = rollupDay(dirty);
  assert.deepEqual(strip(doc), strip(rollupDay(FIXTURE)));
  assert.equal(structuralKeyProblem(doc), null);
  assert.equal(JSON.stringify(doc).indexOf('a@b.com'), -1);
});

// ---------------------------------------------------------------------------------------------
// (g) the seed feeds the collector cleanly, and the whole pipeline agrees with itself
// ---------------------------------------------------------------------------------------------

test('(g) every generated batch validates with nothing dropped, at most 50 events, under the size limit', () => {
  const g = generate({ days: 3, sessionsPerDay: 300, seed: 31337 });
  const batches = toBatches(g.events);
  assert.equal(new Set(batches.map((b) => b.sid)).size, 900);
  assert.ok(batches.length >= 900);
  const names = new Set();
  let total = 0;
  batches.forEach((b) => {
    assert.ok(b.events.length >= 1 && b.events.length <= schema.limits.maxBatchEvents);
    const body = JSON.stringify(b);
    assert.ok(Buffer.byteLength(body) <= schema.limits.maxBodyBytes, 'body size ' + Buffer.byteLength(body));
    const now = Math.max.apply(null, b.events.map((e) => e.t)) + 500;
    const res = validateBatch(body, { now });
    assert.equal(res.ok, true, res.error);
    assert.deepEqual(res.dropped, { events: 0, props: 0 }, b.sid);
    assert.equal(res.skewed, false);
    assert.deepEqual(res.events, b.events, 'the collector keeps every generated event unchanged');
    assert.deepEqual(res.ctx, b.ctx);
    res.events.forEach((e) => names.add(e.n));
    total += res.events.length;
  });
  assert.equal(total, g.events.length);
  // the seed exercises a wide slice of the schema
  ['page_view', 'entry_shown', 'entry_skip', 'skip_reason', 'finder_open', 'q_view', 'q_answer', 'q_back', 'dialog_close', 'result_view', 'result_click',
    'result_feedback', 'talk_open', 'talk_invalid', 'talk_submit', 'section_view', 'scroll_depth', 'cta_click', 'faq_open', 'page_hide'].forEach((n) => assert.ok(names.has(n), 'seed emits ' + n));
  names.forEach((n) => assert.ok(schema.events[n], n + ' is a schema event'));
});

test('(g) toBatches splits a long session into chunks of the requested size and keeps q order', () => {
  const g = generate({ days: 1, sessionsPerDay: 20, seed: 2 });
  const batches = toBatches(g.events, 5);
  batches.forEach((b) => assert.ok(b.events.length <= 5));
  const bySid = {};
  batches.forEach((b) => { bySid[b.sid] = (bySid[b.sid] || []).concat(b.events.map((e) => e.q)); });
  Object.keys(bySid).forEach((sid) => assert.deepEqual(bySid[sid], bySid[sid].slice().sort((a, b) => a - b)));
  assert.ok(batches.length > 20);
  assert.equal(toBatches(g.events).length, 20, 'default keeps a whole session (about 10-50 events) in one body');
});

test('(g) pipeline: seed -> toBatches -> validateBatch -> rollup equals rollup of the raw events', () => {
  const g = generate({ days: 2, sessionsPerDay: 200, seed: 4242 });
  const stored = [];
  toBatches(g.events, 17).forEach((b) => {
    const res = validateBatch(JSON.stringify(b), { now: b.events[b.events.length - 1].t + 1 });
    assert.equal(res.ok, true);
    res.events.forEach((e) => stored.push(Object.assign({ sid: res.sid, ctx: res.ctx }, e)));
  });
  assert.equal(stored.length, g.events.length);
  assert.deepEqual(merged(stored), merged(g.events));
  assertMatchesTruth(merged(stored), g.truth, 'pipeline');
});
