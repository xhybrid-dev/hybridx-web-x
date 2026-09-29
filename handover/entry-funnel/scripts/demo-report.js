#!/usr/bin/env node
/*
 * Prints what the admin will show, using synthetic traffic. No data, no database, no network.
 *   node scripts/demo-report.js            summary as text
 *   node scripts/demo-report.js --json     the full report and insights as JSON
 *   node scripts/demo-report.js --days 30 --sessions 400 --seed 7
 *
 * It runs the same three steps the real admin will run:
 *   1. rollupDay(events)      one small document per day (this is what the daily job stores)
 *   2. mergeDays(days)        add the days in the chosen date range
 *   3. report() + insights()  the numbers and the "how to improve" list the pages display
 * The synthetic data has two planted weak spots (step 3 loses about a third of the people who reach it,
 * and over half of visitors skip the entry), so the insights list shows what a problem looks like.
 * Add --healthy for the default, well-behaved traffic. Real numbers will differ.
 */
'use strict';
const { generate, splitByDay } = require('../admin/seed.js');
const { rollupDay, mergeDays, report, insights } = require('../admin/rollup.js');

const arg = (name, dflt) => { const i = process.argv.indexOf('--' + name); return i > -1 ? Number(process.argv[i + 1]) : dflt; };
const days = arg('days', 14), sessionsPerDay = arg('sessions', 300), seed = arg('seed', 11);

const model = process.argv.includes('--healthy') ? undefined : { exit: { 1: 0.05, 2: 0.05, 3: 0.32, 4: 0.05, 5: 0.08 }, skip: 0.55 };
const { events } = generate({ days, sessionsPerDay, seed, startDate: '2026-09-01', entryMode: true, model });
const daily = splitByDay(events).map((d) => rollupDay(d.events, { date: d.date }));
const merged = mergeDays(daily);
const r = report(merged);
const ins = insights(r);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ report: r, insights: ins }, null, 2));
  process.exit(0);
}

const pct = (x) => (x == null ? 'n/a' : (x * 100).toFixed(1) + '%');
console.log(`Synthetic traffic: ${days} days, ${merged.counters.sessions} visits, ${daily.length} daily rollup documents\n`);
console.log('HOW PEOPLE VISIT');
console.log('  entry section opened by  ', pct(r.rates.openRate), 'of visits');
console.log('  finished the questions   ', pct(r.rates.completionRate), 'of those who opened');
console.log('  clicked a recommendation ', pct(r.rates.clickRate), 'of results');
console.log('  skipped to the homepage  ', pct(r.rates.skipRate), 'of visits shown the entry');
console.log('  bounced under 10 seconds ', pct(r.rates.bounceRate));
console.log('\nWHERE PEOPLE DROP OUT');
r.stepFunnel.forEach((s) => console.log(`  step ${s.step} ${s.name.padEnd(20)} views ${String(s.views).padStart(5)}   left here ${pct(s.dropRate).padStart(6)}   went back ${pct(s.backRate).padStart(6)}`));
console.log('\nWHICH GOAL DRAWS PEOPLE IN (first tile chosen, including people who never finish)');
r.attractors.goalStarts.forEach((g) => console.log(`  ${g.goal.padEnd(8)} started ${String(g.started).padStart(4)}   reached a result ${pct(g.completionRate).padStart(6)}   clicked ${pct(g.clickRate).padStart(6)}`));
console.log(`\nAFTER SKIPPING: ${pct(r.skips.thenCtaRate)} clicked a homepage link, ${pct(r.skips.thenScroll50Rate)} scrolled at least halfway`);
console.log('\nWHO ARRIVES, BY SOURCE');
r.sources.slice(0, 5).forEach((s) => console.log(`  ${s.ref.padEnd(16)} ${String(s.sessions).padStart(5)} visits   opened ${pct(s.openRate).padStart(6)}   clicked ${pct(s.clickRate).padStart(6)}   skipped ${pct(s.skipRate).padStart(6)}`));
console.log('\nHOW TO IMPROVE (rule-based, most serious first)');
ins.forEach((i) => console.log(`  [${i.severity}] ${i.area}: ${i.finding}\n         evidence: ${i.evidence}\n         try: ${i.suggestion}`));
