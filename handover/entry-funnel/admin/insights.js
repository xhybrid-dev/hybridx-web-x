/*
 * HybridX admin: rule-based insights. Pure, no I/O.
 *
 *   insights(report, { thresholds, minSessions })
 *     -> [{ id, severity: 'high'|'medium'|'low'|'info', area, finding, evidence, suggestion }]
 *
 * Each rule is explicit and reads a threshold from DEFAULT_THRESHOLDS (override any of them with
 * opts.thresholds). Below `minSessions` sessions the only insight is an "info" saying so.
 * `evidence` always quotes the numbers behind the finding.
 */
'use strict';

const { STEP_NAMES, BUCKETS } = require('./model.js');

const DEFAULT_THRESHOLDS = {
  minSessions: 100, // below this, one "not enough data yet" insight and nothing else
  minOpened: 30, // sample guards for rules that divide by opens / results / entry views
  minResults: 30,
  minEntryShown: 30,
  stepDropRate: 0.25, // step exits / views
  stepDropHigh: 0.4, // ... at or above this the drop is "high" instead of "medium"
  stepMinViews: 30,
  slowMedianBucket: '60-120s', // median time on a step at this bucket or slower
  backRate: 0.15,
  skipRate: 0.5,
  completionRate: 0.4,
  clickRate: 0.3,
  cellMinResults: 10, // goal x format cell
  cellClickRate: 0.25,
  maxCellInsights: 5,
  productNoRate: 0.3,
  productMinFeedback: 10,
  deviceGap: 0.15, // phone completion this far (as a fraction) below desktop
  deviceMinOpened: 30,
  sourceMinSessions: 50,
  sourceOpenGap: 0.15, // referrer open rate this far below the site average
  sourceSkipRate: 0.5,
  sectionMinReach: 0.2, // reach among sessions that scrolled >= 50%
  minScrolled: 30,
  maxSectionInsights: 5,
  liftSignificantZ: 1.96
};

const STEP_HINTS = {
  1: 'Check the goal wording: every visitor should recognise themselves in one of the options without thinking.',
  2: 'Simplify the level and place questions, or default to the most common answer so the step is one tap.',
  3: 'Make this step optional, preselect "none" or shorten the list. Long multi-select lists make people stall.',
  4: 'Explain what each format means and show a price or "free" hint so the choice feels safe.',
  5: 'Make it obvious this step is optional and add a "Show my plan" button that skips it.'
};

const EPS = 1e-9; // subtracting two rates can land a hair under an exact 15-point gap
const SEVERITY_RANK = { high: 0, medium: 1, low: 2, info: 3 };
const pct = (x) => (x * 100).toFixed(1) + '%';
const pts = (x) => Math.abs(x * 100).toFixed(1) + ' points';
const have = (x) => x !== null && x !== undefined;

function insights(rep, opts) {
  const o = opts || {};
  const th = Object.assign({}, DEFAULT_THRESHOLDS, o.thresholds || {});
  if (typeof o.minSessions === 'number') th.minSessions = o.minSessions;
  const r = rep || {};
  const sessions = r.sessions || 0;

  if (sessions < th.minSessions) {
    return [{
      id: 'not-enough-data', severity: 'info', area: 'funnel',
      finding: 'There is not enough data yet to draw conclusions.',
      evidence: sessions + ' sessions recorded so far; insights start at ' + th.minSessions + '.',
      suggestion: 'Check back once more visitors have come through. The numbers on the other tabs are already live.'
    }];
  }

  const out = [];
  const add = (x) => out.push(x);
  const rates = r.rates || {};
  const totals = r.totals || {};
  const stepName = (s) => 'step ' + s + ' (' + STEP_NAMES[s - 1] + ')';

  // Funnel: where people leave, where they stall, where they go back
  (r.stepFunnel || []).forEach((s) => {
    if (s.views >= th.stepMinViews && s.dropRate !== null && s.dropRate >= th.stepDropRate) {
      add({
        id: 'step-drop-' + s.step, severity: s.dropRate >= th.stepDropHigh ? 'high' : 'medium', area: 'funnel',
        finding: 'Visitors are leaving at ' + stepName(s.step) + ' without a result.',
        evidence: s.exits + ' of ' + s.views + ' visitors who saw ' + stepName(s.step) + ' left there (' + pct(s.dropRate) + '); threshold ' + pct(th.stepDropRate) + '.',
        suggestion: STEP_HINTS[s.step]
      });
    }
    if (s.views >= th.stepMinViews && s.backRate !== null && s.backRate >= th.backRate) {
      add({
        id: 'back-step-' + s.step, severity: 'low', area: 'funnel',
        finding: 'Many visitors go back from ' + stepName(s.step) + ', which suggests the question or its options are unclear.',
        evidence: s.back + ' of ' + s.views + ' visitors pressed back from ' + stepName(s.step) + ' (' + pct(s.backRate) + '); threshold ' + pct(th.backRate) + '.',
        suggestion: 'Read the copy on this step and the one before it. Check that the options match what people expected to be asked.'
      });
    }
  });
  const slowIdx = BUCKETS.timeOnStep.indexOf(th.slowMedianBucket);
  Object.keys((r.medianBuckets || {}).timeOnStep || {}).forEach((key) => {
    const b = r.medianBuckets.timeOnStep[key];
    const step = Number(key.slice(1));
    if (b.n >= th.stepMinViews && b.median !== null && BUCKETS.timeOnStep.indexOf(b.median) >= slowIdx) {
      add({
        id: 'slow-step-' + step, severity: 'medium', area: 'funnel',
        finding: 'People spend a long time on ' + stepName(step) + '.',
        evidence: 'Median time on ' + stepName(step) + ' is ' + b.median + ' (90th percentile ' + b.p90 + ', ' + b.n + ' answers); slow means ' + th.slowMedianBucket + ' or longer.',
        suggestion: 'Long dwell means the question is hard to answer. Shorten the copy, cut options or add a recommended default.'
      });
    }
  });
  if (have(rates.completionRate) && totals.sessionsOpened >= th.minOpened && rates.completionRate < th.completionRate) {
    add({
      id: 'low-completion', severity: 'high', area: 'funnel',
      finding: 'Fewer than ' + pct(th.completionRate) + ' of people who open the plan finder reach a result.',
      evidence: totals.sessionsResult + ' of ' + totals.sessionsOpened + ' openers reached a result (' + pct(rates.completionRate) + ').',
      suggestion: 'Look at the step-by-step drop rates first: the biggest leak is the quickest win.'
    });
  }

  // Skips
  const topSkip = ((r.putOffs || {}).skipReasons || [])[0];
  if (have(rates.skipRate) && totals.sessionsEntryShown >= th.minEntryShown && rates.skipRate >= th.skipRate) {
    add({
      id: 'skip-rate', severity: 'high', area: 'skip',
      finding: 'Most visitors skip the plan finder and go straight to the homepage.',
      evidence: totals.sessionsSkipped + ' of ' + totals.sessionsEntryShown + ' visitors who saw the entry section skipped it (' + pct(rates.skipRate) + '); top reason: ' +
        (topSkip ? '"' + topSkip.key + '" (' + topSkip.count + ' answers)' : 'not recorded') + '.',
      suggestion: 'Make the entry section shorter or lower-commitment, and make the promise clearer (what they get, how long it takes).'
    });
  }

  // Routing and results
  if (have(rates.clickRate) && totals.sessionsResult >= th.minResults && rates.clickRate < th.clickRate) {
    add({
      id: 'low-click-rate', severity: 'high', area: 'routing',
      finding: 'Most people who see a result do not click through to anything.',
      evidence: totals.sessionsClicked + ' of ' + totals.sessionsResult + ' results were clicked (' + pct(rates.clickRate) + '); threshold ' + pct(th.clickRate) + '.',
      suggestion: 'Review the result card: the recommendation, price, button label and whether the next step is obvious.'
    });
  }
  const demand = r.demand || {};
  (demand.cells || [])
    .filter((c) => c.results >= th.cellMinResults && c.clickRate !== null && c.clickRate < th.cellClickRate)
    .sort((a, b) => a.clickRate - b.clickRate || b.results - a.results)
    .slice(0, th.maxCellInsights)
    .forEach((c) => {
      add({
        id: 'cell-' + c.goal + '-' + c.format, severity: c.results >= 30 ? 'medium' : 'low', area: 'routing',
        finding: 'People who want "' + c.goal + '" in the "' + c.format + '" format rarely click their recommendation.',
        evidence: c.clicks + ' of ' + c.results + ' results clicked (' + pct(c.clickRate) + '); threshold ' + pct(th.cellClickRate) + '; ' + c.feedbackNo + ' said it did not fit.',
        suggestion: 'Check what routing.js recommends for this combination. It may need a different product or clearer copy.'
      });
    });
  (r.products || []).forEach((p) => {
    if (p.feedbackN >= th.productMinFeedback && p.feedbackNoRate !== null && p.feedbackNoRate >= th.productNoRate) {
      add({
        id: 'product-feedback-' + p.id, severity: 'medium', area: 'routing',
        finding: 'Visitors often say the recommendation "' + (p.title || p.id) + '" is not right for them.',
        evidence: p.feedbackNo + ' of ' + p.feedbackN + ' feedback answers were "no" (' + pct(p.feedbackNoRate) + '); threshold ' + pct(th.productNoRate) + '.',
        suggestion: 'Look at the feedback reasons for this product and at which answers lead to it (rule paths).'
      });
    }
  });

  // Device
  const devs = r.devices || [];
  const phone = devs.find((d) => d.vw === 'phone');
  const desktop = devs.find((d) => d.vw === 'desktop');
  if (phone && desktop && phone.opened >= th.deviceMinOpened && desktop.opened >= th.deviceMinOpened &&
      have(phone.completionRate) && have(desktop.completionRate) && desktop.completionRate - phone.completionRate + EPS >= th.deviceGap) {
    add({
      id: 'phone-completion-gap', severity: 'medium', area: 'device',
      finding: 'Phone visitors finish the plan finder much less often than desktop visitors.',
      evidence: 'Completion on phone ' + pct(phone.completionRate) + ' (' + phone.result + ' of ' + phone.opened + ') vs desktop ' + pct(desktop.completionRate) + ' (' + desktop.result + ' of ' + desktop.opened +
        '), a gap of ' + pts(desktop.completionRate - phone.completionRate) + '.',
      suggestion: 'Test the dialog on a small screen: tap targets, keyboard covering the button, long option lists.'
    });
  }

  // Acquisition
  const siteOpen = rates.openRate;
  (r.sources || []).forEach((s) => {
    if (s.ref === '_other' || s.sessions < th.sourceMinSessions) return;
    if (have(siteOpen) && have(s.openRate) && siteOpen - s.openRate + EPS >= th.sourceOpenGap) {
      add({
        id: 'source-open-gap-' + s.ref, severity: 'medium', area: 'acquisition',
        finding: 'Visitors from ' + s.ref + ' open the plan finder far less than average.',
        evidence: s.ref + ': ' + s.opened + ' of ' + s.sessions + ' sessions opened it (' + pct(s.openRate) + ') vs ' + pct(siteOpen) + ' site-wide, ' + pts(siteOpen - s.openRate) + ' lower.',
        suggestion: 'These visitors may want something else. Match the landing message to what that source promised.'
      });
    }
    if (have(s.skipRate) && s.skipRate >= th.sourceSkipRate) {
      add({
        id: 'ref-skips-' + s.ref, severity: 'medium', area: 'acquisition',
        finding: 'Most visitors from ' + s.ref + ' skip the plan finder.',
        evidence: s.ref + ': ' + s.skipped + ' of ' + s.sessions + ' sessions skipped (' + pct(s.skipRate) + '); threshold ' + pct(th.sourceSkipRate) + '.',
        suggestion: 'Consider a different entry treatment for this source, or a link that lands them where they were heading.'
      });
    }
  });

  // Homepage: entry vs control, and sections that few people reach
  ((r.variants || {}).lift || []).forEach((l) => {
    if (l.absolute < 0) {
      const sig = l.z !== null && l.z <= -th.liftSignificantZ;
      add({
        id: 'lift-negative-' + l.variant, severity: sig ? 'medium' : 'low', area: 'homepage',
        finding: 'Arm ' + l.variant + ' (entry section) sends fewer visitors onwards than the control page' + (sig ? '.' : ', though the difference may be noise.'),
        evidence: 'Visitors clicking any call to action: ' + l.variant + ' ' + pct(l.rate) + ' (' + l.sessions + ' sessions) vs control ' + pct(l.controlRate) + ' (' + l.controlSessions + '), ' +
          pts(l.absolute) + ' lower' + (l.z !== null ? ', z=' + l.z.toFixed(2) : '') + '.',
        suggestion: sig ? 'The entry section may be costing clicks. Consider a lighter version or moving it lower.' : 'Keep the test running until the gap is clear one way or the other.'
      });
    }
  });
  const attr = r.attractors || {};
  if (attr.scrolled50 >= th.minScrolled) {
    (attr.sections || [])
      .filter((s) => have(s.reachOfScrolled) && s.reachOfScrolled < th.sectionMinReach)
      .sort((a, b) => a.reachOfScrolled - b.reachOfScrolled)
      .slice(0, th.maxSectionInsights)
      .forEach((s) => {
        add({
          id: 'section-low-reach-' + s.id, severity: 'low', area: 'homepage',
          finding: 'The "' + s.id + '" section is rarely seen even by people who scroll well down the page.',
          evidence: s.sessions + ' sessions saw "' + s.id + '" vs ' + attr.scrolled50 + ' that scrolled at least 50% (' + pct(s.reachOfScrolled) + '); threshold ' + pct(th.sectionMinReach) + '.',
          suggestion: 'Move it higher, or check whether the section before it ends the page visually.'
        });
      });
  }

  return out
    .map((x, i) => ({ x, i }))
    .sort((a, b) => SEVERITY_RANK[a.x.severity] - SEVERITY_RANK[b.x.severity] || a.i - b.i)
    .map((p) => p.x);
}

module.exports = { insights, DEFAULT_THRESHOLDS };
