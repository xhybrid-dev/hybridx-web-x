/*
 * HybridX plan finder: routing rules. Framework-free, no dependencies.
 *
 * Works as a browser global (window.HXRouting), a CommonJS module (require) and can be
 * pasted into TypeScript with types added. It is the single source of truth for which
 * product a set of answers leads to. Copy, labels and links live in funnel.json.
 *
 * route(answers)  -> { primary, secondary[], paper, freeStart, trace[], version }
 * explain(answers, funnel, opts) -> { why, chips[] }     (visitor-facing sentence and recap chips)
 *
 * answers = { goal, level, place, obst: string[], format }
 *   goal:   first | faster | athx | xenom | ultra | hybrid
 *   level:  new | regular | raced | compete
 *   place:  home | gym | both
 *   obst:   any of structure | generic | run | plateau | injury | time | options | none
 *   format: free | paper | phone | tools
 * Missing answers fall back to first / new / home / paper, so a result always exists.
 *
 * The trace lists every rule that fired. Store it with each result so the admin can
 * explain why a visitor saw a product, and can find rule paths that lead to "talk to us".
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HXRouting = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '1.0.0';
  var ADVANCED = ['raced', 'compete'];
  var TOOL_BY_GOAL = { first: 'free', faster: 'rtp', athx: 'rtp', xenom: 'vo2', ultra: 'vdot', hybrid: 'vo2' };

  function has(list, v) { return list.indexOf(v) > -1; }

  function route(answers) {
    var a = answers || {};
    var goal = a.goal || 'first';
    var lvl = a.level || 'new';
    var place = a.place || 'home';
    var fmt = a.format || 'paper';
    var ob = a.obst || [];
    var adv = has(ADVANCED, lvl);
    var trace = [];

    // 1. Which paperback fits the goal (used when the visitor wants paper, and as an extra otherwise)
    var paper = 'twelve';
    if (goal === 'first') { paper = place === 'gym' ? 'twelve' : 'home'; trace.push('paper:first-' + (place === 'gym' ? 'gym' : 'home-or-both')); }
    else if (goal === 'faster') { paper = 'elite'; trace.push('paper:faster'); }
    else if (goal === 'athx') { paper = 'athx'; trace.push('paper:athx'); }
    else if (goal === 'ultra') { paper = 'ultra'; trace.push('paper:ultra'); }
    else if (goal === 'xenom') { paper = adv ? 'elite' : 'twelve'; trace.push('paper:xenom-' + (adv ? 'advanced' : 'default')); }
    else { trace.push('paper:hybrid-default'); }
    if ((goal === 'first' || goal === 'hybrid') && adv) { paper = 'elite'; trace.push('paper:advanced-override'); }

    // 2. Free starting point for the goal
    var freeStart = 'free';
    if (goal === 'ultra') freeStart = 'vdot';
    else if (goal === 'faster') freeStart = 'rtp';
    trace.push('free-start:' + freeStart);

    // 3. Primary recommendation: the format (Q4) picks the column
    var primary = paper;
    if (fmt === 'phone') primary = 'app';
    else if (fmt === 'free') primary = freeStart;
    else if (fmt === 'tools') primary = TOOL_BY_GOAL[goal];
    trace.push('primary:format-' + fmt);

    // 4. Up to two extras, chosen from what got in the way (Q3)
    var extras = [];
    if (has(ob, 'options')) {
      trace.push('extras:suppressed-too-many-options');
    } else {
      if (has(ob, 'run')) { extras.push('run12', 'vdot'); trace.push('extras:run'); }
      if (has(ob, 'structure') || has(ob, 'plateau')) { extras.push('app'); trace.push('extras:structure-or-plateau'); }
      if (has(ob, 'time') || has(ob, 'generic')) { extras.push('free'); trace.push('extras:time-or-generic'); }
      extras.push(freeStart);
      extras.push(fmt === 'paper' ? 'app' : paper);
      extras.push('free');
    }
    var secondary = [];
    extras.forEach(function (id) {
      if (id !== primary && !has(secondary, id) && secondary.length < 2) secondary.push(id);
    });

    return { primary: primary, secondary: secondary, paper: paper, freeStart: freeStart, trace: trace, version: VERSION };
  }

  function find(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  // opts.weeks: whole weeks until the race date (0 or undefined when none was given)
  function explain(answers, funnel, opts) {
    var a = answers || {};
    var ob = a.obst || [];
    var weeks = (opts && opts.weeks) || 0;
    var goal = a.goal || 'first', lvl = a.level || 'new', place = a.place || 'home', fmt = a.format || 'paper';

    var why = 'You are training for ' + find(funnel.goals, goal).word + ', you ' + find(funnel.levels, lvl).word + ' and ' + find(funnel.places, place).word + '. You asked to follow your plan ' + find(funnel.formats, fmt).word + '.';
    if (has(ob, 'run')) why += ' Running is your weak spot, so we added a running plan and the VDOT Calculator.';
    else if (has(ob, 'structure') || has(ob, 'plateau')) why += ' You want more structure, so the app is listed as an extra.';
    else if (has(ob, 'time')) why += ' Your time is limited, so a free plan is listed as an extra.';
    else if (has(ob, 'generic')) why += ' Plans felt generic before, so the free plan is included because it is built from your race and dates.';
    else if (has(ob, 'options')) why += ' You said there are too many options, so we are showing one recommendation.';
    if (weeks) {
      why += weeks >= 12
        ? ' You have ' + weeks + ' weeks until your race, which is enough for a full 12-week plan.'
        : ' You have ' + weeks + (weeks === 1 ? ' week' : ' weeks') + ' until your race, so start this week rather than waiting for a perfect week one.';
    }

    var chips = [find(funnel.goals, goal).label, find(funnel.levels, lvl).label, 'Trains: ' + find(funnel.places, place).label.toLowerCase(), find(funnel.formats, fmt).label];
    ob.filter(function (o) { return o !== 'none'; }).slice(0, 3).forEach(function (o) { chips.push(find(funnel.obstacles, o).label); });
    if (weeks) chips.push('Race in ' + weeks + (weeks === 1 ? ' week' : ' weeks'));
    return { why: why, chips: chips };
  }

  return { route: route, explain: explain, VERSION: VERSION };
});
