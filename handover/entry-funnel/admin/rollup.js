/*
 * HybridX admin: daily rollups. Pure functions, no I/O, no dependencies.
 *
 *   rollupDay(events, { date, maxKeys })  -> small JSON doc { v, date, counters, hist, maps }
 *   mergeDays([docA, docB, ...])          -> the same shape, every leaf summed (date:null, days:n)
 *   report(merged, opts)                  -> derived rates, funnel, sources, ... (report.js)
 *   insights(report, opts)                -> rule-based findings with evidence (insights.js)
 *
 * Input events are flat stored events { sid, n, t, q, ...props, ctx } for ALL sessions that STARTED
 * on the day (the caller groups by session start so a session never straddles two docs). Every leaf
 * of the doc is a number, so mergeDays is a plain recursive sum: associative, commutative, and
 * merge(rollup(A), rollup(B)) equals rollup(A + B) whenever A and B hold whole sessions.
 *
 * Counting rules, all per session (one sid = one page load) unless stated:
 *  - Result-based numbers (answers, primary, secondary, rulePath, cross-tabs) use the FIRST result_view.
 *    Clicks, feedback and talk after it are attributed to that result.
 *  - A click is counted once per session per product (and once per slot); "clicked" = any result_click.
 *  - Feedback: the LAST result_feedback in the session is the visitor's answer.
 *  - Step counters are distinct sessions. q_back.step is the step the visitor was on when going back.
 *  - Exit step: only sessions with no result_view; the latest of dialog_close / page_hide / q_view that
 *    carries a step 1..8 wins, and it counts if that step is 1..5. (page_hide.step 0 = dialog closed.)
 *  - hist.timeOnStep counts every q_answer.ms (one per answer event); the other hists are per session.
 *  - Goal at start: the FIRST q_answer with key "goal" in the session (results or not) feeds goalStarted and
 *    byGoalStart; sessions with no goal answer are ignored there.
 *  - Skippers: sessionsSkippedThenCta / sessionsSkippedThenScroll50 need a cta_click / scroll_depth (pct >= 50)
 *    that comes after the first entry_skip in (t, q) order.
 * Deviations from the brief (extra counters and maps) are listed in the header of report.js.
 */
'use strict';

const M = require('./model.js');
const { STEPS, mapKey, bucketFor, TIME_BUCKETS, VISIBLE_BUCKETS, TIME_EDGES_S, VISIBLE_EDGES_S, isObj } = M;

const COUNTERS = [
  'sessions', 'sessionsEntered', 'sessionsEntryShown', 'sessionsEntryResult', 'sessionsOpened', 'sessionsResult',
  'sessionsClicked', 'sessionsSkipped', 'sessionsTalkOpen', 'sessionsTalkAfterResult', 'sessionsTalkSent',
  'sessionsCtaClick', 'sessionsNoInteraction', 'bounces', 'sessionsSkippedThenCta', 'sessionsSkippedThenScroll50'
];
const STEP_COUNTERS = ['stepViews', 'stepAnswered', 'stepBack', 'stepExit'];
const ANSWER_KEYS = ['goal', 'level', 'place', 'obst', 'format', 'race'];
const MAP_NAMES = [
  'primary', 'secondary', 'clickByProduct', 'clickBySlot', 'viewByProduct', 'feedbackFit', 'feedbackReasons',
  'skipFrom', 'skipReason', 'refHost', 'utmSource', 'utmCampaign', 'vw', 'variant', 'mode', 'closeReason',
  'talkFrom', 'talkInvalidField', 'sectionViews', 'scrollDepth', 'scrollReach', 'faqOpens', 'ctaClicks',
  'rulePath', 'bounceByVw', 'goalStarted', 'byGoalStart', 'byGoalFormat', 'byRef', 'byVw', 'byVariant', 'byPrimary', 'byRulePath'
];
// Maps keyed by values a client controls (slugs, hostnames): cap distinct keys so a hostile
// client cannot grow a daily doc without limit. The tail is folded into "_other".
const CAPPED = ['primary', 'secondary', 'clickByProduct', 'viewByProduct', 'refHost', 'utmSource', 'utmCampaign',
  'sectionViews', 'ctaClicks', 'rulePath', 'byRef', 'byRulePath', 'byPrimary', 'goalStarted', 'byGoalStart'];
const DEFAULT_MAX_KEYS = 100;

const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const unsafe = (k) => k === '__proto__' || k === 'constructor' || k === 'prototype';

function zeros(keys) { const o = {}; keys.forEach((k) => { o[k] = 0; }); return o; }

/** A doc with every counter and histogram bucket present at zero. */
function emptyDoc(date) {
  const counters = zeros(COUNTERS);
  STEP_COUNTERS.forEach((k) => { counters[k] = zeros(STEPS.map((s) => 's' + s)); });
  const hist = { timeOnStep: {}, timeToResult: zeros(TIME_BUCKETS), visibleTime: zeros(VISIBLE_BUCKETS) };
  STEPS.forEach((s) => { hist.timeOnStep['s' + s] = zeros(TIME_BUCKETS); });
  const maps = { answers: {} };
  ANSWER_KEYS.forEach((k) => { maps.answers[k] = {}; });
  MAP_NAMES.forEach((k) => { maps[k] = {}; });
  return { v: 1, date: date == null ? null : date, counters, hist, maps };
}

// ---------------------------------------------------------------------------------------------
// Merging
// ---------------------------------------------------------------------------------------------

function addValue(target, key, v) {
  if (unsafe(key)) return;
  if (typeof v === 'number' && Number.isFinite(v)) {
    target[key] = (hasOwn(target, key) && typeof target[key] === 'number' ? target[key] : 0) + v;
  } else if (isObj(v)) {
    if (!hasOwn(target, key) || !isObj(target[key])) target[key] = {};
    addInto(target[key], v);
  } // strings, null, undefined and arrays are not part of the sum
}
function addInto(target, src) {
  Object.keys(src).forEach((k) => addValue(target, k, src[k]));
}

/** Recursive sum of daily (or already merged) docs. Undefined/null entries are ignored. */
function mergeDays(days) {
  const out = { v: 1, date: null, days: 0, counters: {}, hist: {}, maps: {} };
  (days || []).forEach((d) => {
    if (!isObj(d)) return;
    out.days += typeof d.days === 'number' ? d.days : 1; // a daily doc is one day, a merged doc carries its count
    ['counters', 'hist', 'maps'].forEach((sec) => { if (isObj(d[sec])) addInto(out[sec], d[sec]); });
  });
  return out;
}

const deepSum = (v) => (typeof v === 'number' ? v : isObj(v) ? Object.keys(v).reduce((a, k) => a + deepSum(v[k]), 0) : 0);

// Keep the top (max-1) keys of a map by weight and fold the rest into "_other".
function capMap(map, max) {
  const keys = Object.keys(map);
  if (keys.length <= max) return;
  keys.sort((a, b) => deepSum(map[b]) - deepSum(map[a]) || (a < b ? -1 : 1));
  const rest = keys.slice(max - 1);
  const tail = {};
  rest.forEach((k) => { addValue(tail, k, map[k]); delete map[k]; });
  rest.forEach((k) => addValue(map, '_other', tail[k]));
}

// ---------------------------------------------------------------------------------------------
// One session
// ---------------------------------------------------------------------------------------------

const stepOk = (x) => Number.isInteger(x) && x >= 1 && x <= 5;
const str = (x) => (typeof x === 'string' && x !== '' ? x : null);
const uniq = (a) => (Array.isArray(a) ? a.filter((v, i) => typeof v === 'string' && a.indexOf(v) === i) : []);

// Walk a session's events in (t, q) order and pull out the facts the rollup needs.
function summarise(list) {
  const s = {
    ctx: null, entryShown: false, opened: false, skipped: false, skipFrom: null, skipReason: null,
    result: null, startT: null, resultT: null, views: new Set(), answered: new Set(), back: new Set(), answerMs: [],
    lastStep: null, closeReason: null, visible: null, clicked: false, clickProducts: new Set(), clickSlots: new Set(),
    feedback: null, talkOpen: false, talkAfterResult: false, talkFrom: null, talkInvalid: new Set(), talkSent: false,
    sections: new Set(), maxScroll: 0, ctaIds: new Set(), faq: new Set(), goal: null, skipThenCta: false, skipThenScroll50: false
  };
  for (const e of list) {
    if (!s.ctx && isObj(e.ctx)) s.ctx = e.ctx;
    // the step the visitor was last seen on: dialog_close, page_hide and q_view all carry one
    if ((e.n === 'dialog_close' || e.n === 'page_hide' || e.n === 'q_view') && Number.isInteger(e.step) && e.step >= 1) s.lastStep = e.step;
    switch (e.n) {
      case 'entry_shown': s.entryShown = true; break;
      case 'entry_skip': s.skipped = true; if (!s.skipFrom) s.skipFrom = str(e.from); break;
      case 'skip_reason': if (str(e.reason)) s.skipReason = e.reason; break;
      case 'finder_open': s.opened = true; if (s.startT === null) s.startT = e.t; break;
      case 'q_view': if (stepOk(e.step)) s.views.add(e.step); if (s.startT === null) s.startT = e.t; break;
      case 'q_answer':
        if (stepOk(e.step)) { s.answered.add(e.step); if (Number.isFinite(e.ms) && e.ms >= 0) s.answerMs.push([e.step, e.ms]); }
        if (e.key === 'goal' && s.goal === null && str(e.value)) s.goal = e.value; // first goal answer wins
        break;
      case 'q_back': if (stepOk(e.step)) s.back.add(e.step); break;
      case 'dialog_close': if (str(e.reason)) s.closeReason = e.reason; break;
      case 'result_view': if (!s.result) { s.result = e; s.resultT = e.t; } break;
      case 'result_click':
        s.clicked = true;
        if (str(e.product)) s.clickProducts.add(e.product);
        if (str(e.slot)) s.clickSlots.add(e.slot);
        break;
      case 'result_feedback': if (str(e.fit)) s.feedback = e; break; // last one wins
      case 'talk_open':
        s.talkOpen = true;
        if (s.result) s.talkAfterResult = true;
        if (!s.talkFrom) s.talkFrom = str(e.from);
        break;
      case 'talk_invalid': uniq(e.fields).forEach((f) => s.talkInvalid.add(f)); break;
      case 'talk_submit': if (e.ok === true) s.talkSent = true; break;
      case 'section_view': if (str(e.id)) s.sections.add(e.id); break;
      case 'scroll_depth':
        if (Number.isFinite(e.pct)) { s.maxScroll = Math.max(s.maxScroll, e.pct); if (s.skipped && e.pct >= 50) s.skipThenScroll50 = true; }
        break;
      case 'cta_click': if (str(e.id)) s.ctaIds.add(e.id); if (s.skipped) s.skipThenCta = true; break; // s.skipped is only true once entry_skip has been passed
      case 'faq_open': if (Number.isInteger(e.i)) s.faq.add(e.i); break;
      case 'page_hide': if (Number.isFinite(e.ms) && e.ms >= 0) s.visible = s.visible === null ? e.ms : Math.max(s.visible, e.ms); break;
      default: break;
    }
  }
  return s;
}

const bump = (map, key, by) => { map[key] = (hasOwn(map, key) ? map[key] : 0) + (by === undefined ? 1 : by); };
const cell = (map, key, fields) => (hasOwn(map, key) ? map[key] : (map[key] = zeros(fields)));

function applySession(doc, s) {
  const c = doc.counters, m = doc.maps, h = doc.hist;
  const ctx = s.ctx || {};
  const ref = str(ctx.ref) ? mapKey(ctx.ref) : 'direct';
  const vw = str(ctx.vw) ? mapKey(ctx.vw) : 'unknown';
  const variant = str(ctx.variant) ? mapKey(ctx.variant) : 'none';
  const utm = isObj(ctx.utm) ? ctx.utm : {};
  const interacted = s.opened || s.skipped || s.ctaIds.size > 0 || s.maxScroll >= 50;
  const bounce = !interacted && s.visible !== null && s.visible < 10000;
  const fit = s.feedback ? s.feedback.fit : null;
  const clicked = s.clicked ? 1 : 0;

  // session-level counters
  c.sessions++;
  if (s.entryShown || s.opened) c.sessionsEntered++;
  if (s.entryShown) c.sessionsEntryShown++;
  if (s.entryShown && s.result) c.sessionsEntryResult++;
  if (s.opened) c.sessionsOpened++;
  if (s.result) c.sessionsResult++;
  if (s.clicked) c.sessionsClicked++;
  if (s.skipped) c.sessionsSkipped++;
  if (s.talkOpen) c.sessionsTalkOpen++;
  if (s.talkAfterResult) c.sessionsTalkAfterResult++;
  if (s.talkSent) c.sessionsTalkSent++;
  if (s.ctaIds.size) c.sessionsCtaClick++;
  if (!interacted) c.sessionsNoInteraction++;
  if (bounce) { c.bounces++; bump(m.bounceByVw, vw); }
  if (s.skipThenCta) c.sessionsSkippedThenCta++;
  if (s.skipThenScroll50) c.sessionsSkippedThenScroll50++;

  // step funnel
  s.views.forEach((n) => c.stepViews['s' + n]++);
  s.answered.forEach((n) => c.stepAnswered['s' + n]++);
  s.back.forEach((n) => c.stepBack['s' + n]++);
  if (!s.result && stepOk(s.lastStep)) c.stepExit['s' + s.lastStep]++;

  // histograms
  s.answerMs.forEach((p) => h.timeOnStep['s' + p[0]][bucketFor(p[1], TIME_BUCKETS, TIME_EDGES_S)]++);
  if (s.result && s.startT !== null && Number.isFinite(s.resultT)) {
    h.timeToResult[bucketFor(Math.max(0, s.resultT - s.startT), TIME_BUCKETS, TIME_EDGES_S)]++;
  }
  if (s.visible !== null) h.visibleTime[bucketFor(s.visible, VISIBLE_BUCKETS, VISIBLE_EDGES_S)]++;

  // context maps
  bump(m.refHost, ref);
  bump(m.vw, vw);
  bump(m.variant, variant);
  bump(m.mode, str(ctx.mode) ? mapKey(ctx.mode) : 'unknown');
  if (str(utm.utm_source)) bump(m.utmSource, mapKey(utm.utm_source));
  if (str(utm.utm_campaign)) bump(m.utmCampaign, mapKey(utm.utm_campaign));
  if (s.skipFrom) bump(m.skipFrom, mapKey(s.skipFrom));
  if (s.skipReason) bump(m.skipReason, mapKey(s.skipReason));
  if (s.closeReason) bump(m.closeReason, mapKey(s.closeReason));
  if (s.talkFrom) bump(m.talkFrom, mapKey(s.talkFrom));
  s.talkInvalid.forEach((f) => bump(m.talkInvalidField, mapKey(f)));
  s.sections.forEach((id) => bump(m.sectionViews, mapKey(id)));
  s.ctaIds.forEach((id) => bump(m.ctaClicks, mapKey(id)));
  s.faq.forEach((i) => bump(m.faqOpens, String(i)));
  if (s.maxScroll > 0) bump(m.scrollDepth, String(s.maxScroll));
  [25, 50, 75, 100].forEach((p) => { if (s.maxScroll >= p) bump(m.scrollReach, String(p)); });
  s.clickProducts.forEach((p) => bump(m.clickByProduct, mapKey(p)));
  s.clickSlots.forEach((p) => bump(m.clickBySlot, mapKey(p)));
  if (s.feedback) {
    bump(m.feedbackFit, mapKey(fit));
    uniq(s.feedback.reasons).forEach((r) => bump(m.feedbackReasons, mapKey(r)));
  }

  // the goal each session started with, whether or not it reached a result
  if (s.goal) {
    const g = mapKey(s.goal);
    bump(m.goalStarted, g);
    const gs = cell(m.byGoalStart, g, ['started', 'result', 'clicked']);
    gs.started++;
    if (s.result) gs.result++;
    if (s.clicked) gs.clicked++;
  }

  // cross-tabs by traffic source, device and experiment arm
  const byRef = cell(m.byRef, ref, ['sessions', 'opened', 'result', 'clicked', 'skipped']);
  const byVw = cell(m.byVw, vw, ['sessions', 'opened', 'result', 'clicked']);
  const byVar = cell(m.byVariant, variant, ['sessions', 'opened', 'result', 'clicked', 'skipped', 'ctaClicks']);
  byRef.sessions++; byVw.sessions++; byVar.sessions++;
  if (s.opened) { byRef.opened++; byVw.opened++; byVar.opened++; }
  if (s.result) { byRef.result++; byVw.result++; byVar.result++; }
  if (s.clicked) { byRef.clicked++; byVw.clicked++; byVar.clicked++; }
  if (s.skipped) { byRef.skipped++; byVar.skipped++; }
  if (s.ctaIds.size) byVar.ctaClicks++;

  // everything below hangs off the first result
  if (!s.result) return;
  const r = s.result;
  const a = isObj(r.answers) ? r.answers : {};
  ['goal', 'level', 'place', 'format', 'race'].forEach((k) => { if (str(a[k])) bump(m.answers[k], mapKey(a[k])); });
  uniq(a.obst).forEach((v) => bump(m.answers.obst, mapKey(v)));
  const primary = str(r.primary) ? mapKey(r.primary) : 'unknown';
  bump(m.primary, primary);
  bump(m.viewByProduct, primary); // "primary shown"; same tally as `primary`, kept because the admin names it separately
  uniq(r.secondary).forEach((p) => bump(m.secondary, mapKey(p)));

  const goalKey = str(a.goal) ? mapKey(a.goal) : 'unknown';
  if (!hasOwn(m.byGoalFormat, goalKey)) m.byGoalFormat[goalKey] = {};
  const gf = cell(m.byGoalFormat[goalKey], str(a.format) ? mapKey(a.format) : 'unknown', ['results', 'clicks', 'feedbackNo']);
  gf.results++; gf.clicks += clicked; if (fit === 'no') gf.feedbackNo++;

  const bp = cell(m.byPrimary, primary, ['results', 'clicks', 'feedbackYes', 'feedbackPartly', 'feedbackNo']);
  bp.results++; bp.clicks += clicked;
  if (fit === 'yes') bp.feedbackYes++;
  if (fit === 'partly') bp.feedbackPartly++;
  if (fit === 'no') bp.feedbackNo++;

  uniq(r.trace).forEach((item) => {
    const k = mapKey(item);
    bump(m.rulePath, k);
    const br = cell(m.byRulePath, k, ['results', 'clicks']);
    br.results++; br.clicks += clicked;
  });
}

/** Roll one day's sessions into a mergeable doc. */
function rollupDay(events, opts) {
  const o = opts || {};
  const doc = emptyDoc(o.date);
  const bySid = new Map();
  (events || []).forEach((e) => {
    if (!e || typeof e.sid !== 'string') return;
    if (!bySid.has(e.sid)) bySid.set(e.sid, []);
    bySid.get(e.sid).push(e);
  });
  bySid.forEach((list) => {
    list.sort((x, y) => (x.t - y.t) || ((x.q || 0) - (y.q || 0))); // stable: arrival order breaks exact ties
    applySession(doc, summarise(list));
  });
  const max = o.maxKeys > 1 ? o.maxKeys : DEFAULT_MAX_KEYS;
  CAPPED.forEach((k) => capMap(doc.maps[k], max));
  return doc;
}

const { report } = require('./report.js');
const { insights, DEFAULT_THRESHOLDS } = require('./insights.js');

module.exports = {
  rollupDay, mergeDays, emptyDoc, report, insights, DEFAULT_THRESHOLDS,
  STEP_NAMES: M.STEP_NAMES, BUCKETS: M.BUCKETS
};
