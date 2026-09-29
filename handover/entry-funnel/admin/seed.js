/*
 * HybridX admin: deterministic synthetic traffic, so the admin can be built and tested before real
 * data exists. Pure, no I/O, seeded (mulberry32): the same options always give the same events.
 *
 *   generate({ days, sessionsPerDay, seed, startDate, entryMode, model })
 *     -> { events, truth }
 *   toBatches(events, maxPerBatch)  -> collector request bodies (one or more per sid)
 *   splitByDay(events)              -> [{ date, events }] grouped by the day each session STARTED
 *
 * events are flat stored-event shape: { sid, n, t, q, ...props, ctx }. All events use real names and
 * props from data/events.schema.json, and results come from data/routing.js route(), so every
 * batch passes validateBatch with nothing dropped.
 *
 * truth is counted by the generator itself while it makes decisions. It never looks at events or at
 * rollup.js, so comparing it with a rollup is a real cross-check. truth.byDay[i] has the same shape
 * for day i.
 *
 * Behaviour model (override any part with opts.model): refs google 45 / instagram 20 / direct 20 /
 * reddit 10 / hybridx.club 5; entryMode gives each session an arm (control 15% sees no entry section);
 * 25% of entry viewers skip, 70% of the rest open the finder; per-step exit chance (step 3 = 0.12,
 * step 5 = 0.08, others 0.05); 8% back-navigation; 45% click the primary product; 20% give feedback;
 * 8% of results open the talk form; 60% phone viewports. Skippers carry on with the homepage after
 * skipping: 40% click a call to action (model.skipCta) and 55% scroll to 50% or further, always after the
 * skip. Sessions start before 22:30 UTC and last minutes, so no session crosses midnight.
 */
'use strict';

const { route, VERSION: ROUTE_VERSION } = require('../data/routing.js');
const funnel = require('../data/funnel.json');
const schema = require('../data/events.schema.json');

const AV = schema.answerValues;
const DAY_MS = 86400000;

const DEFAULT_MODEL = {
  refs: [['google.com', 0.45], ['instagram.com', 0.2], [null, 0.2], ['reddit.com', 0.1], ['hybridx.club', 0.05]], // null = direct
  phone: 0.6,
  tablet: 0.1,
  controlShare: 0.15, // entryMode: sessions that never see the entry section
  skip: 0.25, // entry arms: skip straight to the homepage
  open: 0.7, // entry arms (of non-skippers) and page mode: open the finder
  openControl: 0.12, // control arm opens the finder from the nav or a tile
  exit: { 1: 0.05, 2: 0.05, 3: 0.12, 4: 0.05, 5: 0.08 },
  back: 0.08, // chance of pressing back on steps 2..5
  click: 0.45, // click the primary product
  clickSecondary: 0.1,
  feedback: 0.2,
  talk: 0.08,
  skipCta: 0.4 // skippers clicking a call to action afterwards (everyone else: 0.32 after opening the finder, 0.18 otherwise)
};

const GOAL_W = [['first', 0.35], ['faster', 0.2], ['athx', 0.1], ['xenom', 0.05], ['ultra', 0.1], ['hybrid', 0.2]];
const LEVEL_W = [['new', 0.3], ['regular', 0.35], ['raced', 0.25], ['compete', 0.1]];
const PLACE_W = [['home', 0.3], ['gym', 0.45], ['both', 0.25]];
const FORMAT_W = [['free', 0.3], ['paper', 0.3], ['phone', 0.25], ['tools', 0.15]];
const RACE_W = [['none', 0.4], ['1-4', 0.05], ['5-11', 0.15], ['12-23', 0.25], ['24+', 0.15]];
const RACE_WEEKS = { none: [0, 0], '1-4': [1, 4], '5-11': [5, 11], '12-23': [12, 23], '24+': [24, 52] };
const FIT_W = [['yes', 0.55], ['partly', 0.25], ['no', 0.2]];
const SKIP_REASONS = ['know', 'toomany', 'notfor', 'browsing', 'other'];
const FEEDBACK_REASONS = ['wrong', 'else', 'basic', 'advanced', 'price', 'format'];
const NOTES = ['Want to finish under 90 minutes', 'First race is in the spring', 'I train around shift work', 'Mostly at home with kettlebells', 'Aiming for a personal best'];
// Homepage sections by how far down the page they sit (percent scrolled at which they come into view)
const SECTIONS = [['hero', 0], ['plans', 25], ['tools', 25], ['books', 50], ['proof', 50], ['faq', 75], ['footer', 100]];
const CTAS = [
  { id: 'hero-start', kind: 'hero' }, { id: 'nav-app', kind: 'nav', host: 'app.hybridx.club' }, { id: 'tool-vdot', kind: 'tool' },
  { id: 'footer-books', kind: 'footer', host: 'amazon.co.uk' }, { id: 'start-today', kind: 'startToday' }, { id: 'section-plans', kind: 'section' }
];
const UTM = {
  'instagram.com': [0.7, { utm_source: 'instagram', utm_medium: 'social', utm_campaign: 'launch' }],
  'google.com': [0.15, { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'hyrox-plan' }],
  'reddit.com': [0.2, { utm_source: 'reddit', utm_medium: 'social', utm_campaign: 'community' }]
};

/** Small seeded PRNG, returns floats in [0, 1). */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------------------------
// Ground truth
// ---------------------------------------------------------------------------------------------

function newTruth() {
  const steps = () => ({ s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 });
  return {
    sessions: 0, entryShown: 0, opened: 0, results: 0, clicks: 0, skipped: 0, talkOpen: 0, talkAfterResult: 0, talkSent: 0,
    ctaSessions: 0, noInteraction: 0, bounces: 0, skippedThenCta: 0, skippedThenScroll50: 0,
    stepViews: steps(), stepAnswered: steps(), stepBack: steps(), exits: steps(),
    clicksByProduct: {}, clickBySlot: {}, resultsByPrimary: {}, clickedByPrimary: {}, feedbackFit: {},
    refSessions: {}, vwSessions: {}, variantSessions: {},
    goalStarted: {}, byGoalStart: {} // goal -> sessions that answered it / { started, result, clicked }
  };
}
function addTruth(into, from) {
  Object.keys(from).forEach((k) => {
    if (typeof from[k] === 'number') into[k] = (into[k] || 0) + from[k];
    else if (k !== 'byDay') addTruth(into[k] || (into[k] = {}), from[k]);
  });
}
const inc = (map, key) => { map[key] = (map[key] || 0) + 1; };

// ---------------------------------------------------------------------------------------------
// One session
// ---------------------------------------------------------------------------------------------

function makeSession(rng, model, entryMode, sid, startT, tr, out) {
  const p = (x) => rng() < x;
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const int = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
  const weighted = (pairs) => { let r = rng(); for (const [v, w] of pairs) { if ((r -= w) < 0) return v; } return pairs[pairs.length - 1][0]; };

  // --- context
  const ref = weighted(model.refs);
  const vwR = rng();
  const vw = vwR < model.phone ? 'phone' : vwR < model.phone + model.tablet ? 'tablet' : 'desktop';
  const arm = !entryMode ? null : p(model.controlShare) ? 'control' : p(0.5) ? 'A' : 'B';
  const ctx = { site: '1.0.0', route: ROUTE_VERSION, catalog: funnel.catalogVersion, mode: entryMode ? 'entry' : 'page' };
  if (arm) ctx.variant = arm;
  ctx.path = entryMode ? '/' : '/plan-finder';
  if (ref) ctx.ref = ref;
  if (ref && UTM[ref] && p(UTM[ref][0])) ctx.utm = Object.assign({}, UTM[ref][1]);
  ctx.vw = vw;
  ctx.lang = 'en-GB';

  // --- event emitter: t moves forward by `gap` ms, q counts events in the session
  let t = startT, q = 0;
  const emit = (n, props, gap) => { t += gap === undefined ? int(150, 900) : gap; out.push(Object.assign({ sid, n, t, q: q++ }, props, { ctx })); };

  const showEntry = entryMode && arm !== 'control';
  let skipped = false, opened = false, openSource = 'hash';
  emit('page_view', {}, 0);
  if (showEntry) emit('entry_shown', {});
  if (showEntry && p(model.skip)) {
    skipped = true;
    emit('entry_skip', { from: weighted([['bar', 0.7], ['startToday', 0.3]]), step: 0, ms: int(1500, 20000) });
    if (p(0.4)) emit('skip_reason', { reason: pick(SKIP_REASONS) });
  } else if (showEntry ? p(model.open) : entryMode ? p(model.openControl) : p(model.open)) {
    opened = true;
    openSource = showEntry ? 'entry' : entryMode ? pick(['nav', 'tile', 'prompt', 'band']) : 'hash';
  }

  // --- the plan finder
  let exitStep = null, hideStep = 0, hasResult = false, clickedAny = false;
  const answers = {};
  if (opened) {
    emit('finder_open', { source: openSource, step: 1 });
    const onStep = { 1: [2000, 8000], 2: [4000, 15000], 3: [5000, 25000], 4: [3000, 10000], 5: [4000, 30000] };
    const dwell = (s) => { const [lo, hi] = onStep[s]; return int(lo, hi) * (p(0.08) ? 4 : 1); };
    for (let s = 1; s <= 5; s++) {
      emit('q_view', { step: s });
      tr.stepViews['s' + s]++;
      if (p(model.exit[s])) { // abandons on this step
        exitStep = s;
        tr.exits['s' + s]++;
        const ms = dwell(s);
        if (p(0.6)) {
          emit('dialog_close', { step: s, reason: pick(['button', 'esc', 'backdrop']), result: false, ms }, ms);
        } else {
          emit('dialog_close', { step: s, reason: 'pagehide', result: false, ms }, ms);
          hideStep = s;
        }
        break;
      }
      if (s >= 2 && p(model.back)) { // back one step, re-confirm it, return
        emit('q_back', { step: s });
        tr.stepBack['s' + s]++;
        emit('q_view', { step: s - 1 });
        emit('q_answer', Object.assign({ step: s - 1, ms: int(1000, 5000) }, s - 1 === 1 ? { key: 'goal', value: answers.goal } : s - 1 === 2 ? { key: 'level', value: answers.level } : s - 1 === 3 ? { key: 'obst', value: answers.obst } : { key: 'format', value: answers.format }));
        emit('q_view', { step: s });
      }
      // answers for this step (step 2 has two questions, step 5 an optional note)
      const ms = dwell(s);
      if (s === 1) { answers.goal = weighted(GOAL_W); emit('q_answer', { step: 1, key: 'goal', value: answers.goal, ms }, ms); }
      if (s === 2) {
        answers.level = weighted(LEVEL_W); answers.place = weighted(PLACE_W);
        emit('q_answer', { step: 2, key: 'level', value: answers.level, ms: Math.round(ms * 0.6) }, Math.round(ms * 0.6));
        emit('q_answer', { step: 2, key: 'place', value: answers.place, ms }, Math.round(ms * 0.4));
      }
      if (s === 3) {
        const k = weighted([[0, 0.15], [1, 0.4], [2, 0.3], [3, 0.15]]);
        const pool = AV.obst.filter((o) => o !== 'none');
        const chosen = [];
        while (chosen.length < k) { const o = pick(pool); if (chosen.indexOf(o) < 0) chosen.push(o); }
        answers.obst = k === 0 ? ['none'] : pool.filter((o) => chosen.indexOf(o) > -1);
        emit('q_answer', { step: 3, key: 'obst', value: answers.obst, ms }, ms);
      }
      if (s === 4) { answers.format = weighted(FORMAT_W); emit('q_answer', { step: 4, key: 'format', value: answers.format, ms }, ms); }
      if (s === 5) {
        answers.race = weighted(RACE_W);
        emit('q_answer', { step: 5, key: 'race', value: answers.race, ms }, ms);
        if (p(0.12)) emit('q_answer', { step: 5, key: 'note', value: pick(NOTES), ms: ms + int(2000, 15000) }, int(2000, 15000));
      }
      tr.stepAnswered['s' + s]++;
    }
  }

  if (opened && exitStep === null) {
    hasResult = true;
    const r = route({ goal: answers.goal, level: answers.level, place: answers.place, obst: answers.obst, format: answers.format });
    const [wLo, wHi] = RACE_WEEKS[answers.race];
    emit('result_view', { answers: Object.assign({}, answers), primary: r.primary, secondary: r.secondary, trace: r.trace, weeks: int(wLo, wHi) }, int(400, 1200));
    tr.results++;
    inc(tr.resultsByPrimary, r.primary);

    // clicks: primary with model.click, secondary with model.clickSecondary; counted once per product and slot
    const clicks = [];
    if (p(model.click)) clicks.push(['primary', r.primary]);
    if (r.secondary.length && p(model.clickSecondary)) clicks.push(['secondary', r.secondary[0]]);
    clicks.forEach(([slot, product]) => {
      const dest = funnel.catalog[product].destinationType;
      emit('result_click', { product, slot, dest, affiliate: dest === 'amazon-affiliate' }, int(2000, 20000));
      inc(tr.clicksByProduct, product);
      inc(tr.clickBySlot, slot);
    });
    if (clicks.length) { tr.clicks++; clickedAny = true; inc(tr.clickedByPrimary, r.primary); }

    if (p(model.feedback)) {
      const fit = weighted(FIT_W);
      const props = { fit };
      if (fit !== 'yes') {
        const n = fit === 'no' ? int(1, 2) : int(0, 1);
        const reasons = [];
        while (reasons.length < n) { const x = pick(FEEDBACK_REASONS); if (reasons.indexOf(x) < 0) reasons.push(x); }
        if (reasons.length) props.reasons = reasons;
      }
      emit('result_feedback', props, int(1500, 8000));
      inc(tr.feedbackFit, fit);
    }
    if (p(model.talk)) {
      emit('talk_open', { from: 'result' }, int(1000, 6000));
      tr.talkOpen++; tr.talkAfterResult++;
      if (p(0.3)) emit('talk_invalid', { fields: p(0.5) ? ['email'] : ['name', 'email'] }, int(2000, 9000));
      if (p(0.65)) {
        const ok = p(0.9);
        emit('talk_submit', { ok, attached: p(0.3) }, int(3000, 20000));
        if (ok) tr.talkSent++;
      }
    }
    if (p(0.5)) emit('dialog_close', { step: 6, reason: pick(['button', 'esc', 'backdrop']), result: true, ms: int(10000, 120000) }, int(1000, 8000));
  } else if (!opened && p(0.01)) { // rare: talk opened from the nav without using the finder
    emit('talk_open', { from: pick(['nav', 'band']) }, int(1000, 9000));
    tr.talkOpen++;
  }

  // --- homepage behaviour: scrolling, sections, faq, calls to action
  const maxScroll = weighted([[0, 0.2], [25, 0.25], [50, 0.2], [75, 0.15], [100, 0.2]]);
  SECTIONS.forEach(([id, at]) => { if (maxScroll >= at && p(0.92)) emit('section_view', { id }); });
  [25, 50, 75, 100].forEach((pct) => { if (maxScroll >= pct) emit('scroll_depth', { pct }); });
  if (maxScroll >= 75 && p(0.25)) emit('faq_open', { i: int(0, 5) });
  const ctaClicked = p(opened ? 0.32 : skipped ? model.skipCta : 0.18);
  if (ctaClicked) {
    const c = pick(CTAS);
    emit('cta_click', Object.assign({ id: c.id, kind: c.kind }, c.host ? { host: c.host } : {}), int(500, 4000));
  }

  // --- page_hide: last event of the page load
  const interacted = opened || skipped || ctaClicked || maxScroll >= 50;
  const elapsed = t - startT;
  const visible = interacted ? elapsed + int(2000, 30000) : p(0.6) ? int(1500, 9500) : int(10000, 60000);
  emit('page_hide', Object.assign({ ms: visible, scroll: Math.min(100, maxScroll + int(0, 20)), step: hideStep }, hasResult ? { result: true } : {}), int(200, 1500));

  // --- ground truth for this session
  tr.sessions++;
  if (showEntry) tr.entryShown++;
  if (opened) tr.opened++;
  if (skipped) tr.skipped++;
  if (ctaClicked) tr.ctaSessions++;
  // skip decisions come first in the session, so every CTA click and scroll above happens after the skip
  if (skipped && ctaClicked) tr.skippedThenCta++;
  if (skipped && maxScroll >= 50) tr.skippedThenScroll50++;
  if (answers.goal) { // first goal answer of the session; visitors who left before answering step 1 have none
    inc(tr.goalStarted, answers.goal);
    const gs = tr.byGoalStart[answers.goal] || (tr.byGoalStart[answers.goal] = { started: 0, result: 0, clicked: 0 });
    gs.started++;
    if (hasResult) gs.result++;
    if (clickedAny) gs.clicked++;
  }
  if (!interacted) { tr.noInteraction++; if (visible < 10000) tr.bounces++; }
  inc(tr.refSessions, ref || 'direct');
  inc(tr.vwSessions, vw);
  inc(tr.variantSessions, arm || 'none');
}

// ---------------------------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------------------------

function generate(opts) {
  const o = opts || {};
  const days = o.days > 0 ? o.days : 1;
  const per = o.sessionsPerDay >= 0 ? o.sessionsPerDay : 100;
  const seed = Number.isFinite(o.seed) ? o.seed >>> 0 : 1;
  const start = Date.parse((o.startDate || '2026-01-05') + 'T00:00:00Z');
  const entryMode = o.entryMode !== false;
  const model = Object.assign({}, DEFAULT_MODEL, o.model || {});
  model.exit = Object.assign({}, DEFAULT_MODEL.exit, (o.model || {}).exit || {});

  const rng = mulberry32(seed);
  const events = [];
  const truth = newTruth();
  truth.byDay = [];
  for (let d = 0; d < days; d++) {
    const dayTruth = newTruth();
    const dayStart = start + d * DAY_MS;
    for (let i = 0; i < per; i++) {
      let salt = '';
      for (let k = 0; k < 8; k++) salt += Math.floor(rng() * 36).toString(36);
      const sid = 'sess-' + seed.toString(36) + '-' + d + '-' + i + '-' + salt;
      const startT = dayStart + Math.floor(rng() * (22.5 * 3600 * 1000));
      makeSession(rng, model, entryMode, sid, startT, dayTruth, events);
    }
    addTruth(truth, dayTruth);
    truth.byDay.push(dayTruth);
  }
  events.sort((a, b) => a.t - b.t); // arrival order; stable, so a session's events keep q order on ties
  return { events, truth };
}

/** Collector request bodies: one per sid, split into chunks of at most maxPerBatch events (default 50). */
function toBatches(events, maxPerBatch) {
  const size = maxPerBatch > 0 ? maxPerBatch : schema.limits.maxBatchEvents;
  const bySid = new Map();
  events.forEach((e) => { if (!bySid.has(e.sid)) bySid.set(e.sid, []); bySid.get(e.sid).push(e); });
  const bodies = [];
  bySid.forEach((list, sid) => {
    list.sort((a, b) => a.q - b.q);
    for (let i = 0; i < list.length; i += size) {
      const chunk = list.slice(i, i + size);
      bodies.push({
        v: 1, sid, ctx: list[0].ctx,
        events: chunk.map((e) => { const { sid: _sid, ctx: _ctx, ...rest } = e; return rest; })
      });
    }
  });
  return bodies;
}

/** Group flat events by the UTC day their session started: [{ date: 'YYYY-MM-DD', events }], oldest first. */
function splitByDay(events) {
  const first = new Map();
  events.forEach((e) => { if (!first.has(e.sid) || e.t < first.get(e.sid)) first.set(e.sid, e.t); });
  const days = new Map();
  events.forEach((e) => {
    const date = new Date(first.get(e.sid)).toISOString().slice(0, 10);
    if (!days.has(date)) days.set(date, []);
    days.get(date).push(e);
  });
  return [...days.keys()].sort().map((date) => ({ date, events: days.get(date) }));
}

module.exports = { generate, toBatches, splitByDay, mulberry32, DEFAULT_MODEL };
