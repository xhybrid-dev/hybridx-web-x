// npm run check: facts and timings sanity checks, plus a VO fit report.
//
// Fails (exit 1) on anything that contradicts the brief or no longer adds up.
// Warnings are things to look at, not errors. Run after any edit to facts.ts,
// voScript.ts or sceneTimings.ts.

import * as facts from '../src/data/facts';
import {voScript, words, PLANNING_WPM, type VoId} from '../src/data/voScript';
import {
	FPS,
	buildTimeline,
	chapters,
	formatTc,
	main,
	parseTc,
	reel,
	timelines,
	voPadding,
	type VideoPlan,
} from '../src/data/sceneTimings';
import {motion} from '../src/easing';

const failures: string[] = [];
const warnings: string[] = [];
const expect = (ok: boolean, msg: string) => void (ok || failures.push(msg));
const warn = (ok: boolean, msg: string) => void (ok || warnings.push(msg));
const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
const fmt = (n: number) => n.toLocaleString('en-GB');

// ---------------------------------------------------------------------------
// Facts
// ---------------------------------------------------------------------------

const {hyrox, athx, plan} = facts;

expect(hyrox.stations.length === hyrox.format.stationCount, 'HYROX: station count');
expect(hyrox.format.rounds === hyrox.format.stationCount, 'HYROX: one station per run');
expect(hyrox.format.rounds * hyrox.format.runKmPerRound === hyrox.format.totalRunKm, 'HYROX: 8 x 1 km = 8 km');

// The Scene 3 race map labels, as the brief writes them.
const briefScene3 =
	'SkiErg 1,000 m, Sled Push 50 m, Sled Pull 50 m, Burpee Broad Jumps 80 m, Row 1,000 m, Farmers Carry 200 m, Sandbag Lunges 100 m, Wall Balls 100';
const ours = hyrox.stations
	.map((s) => `${s.shortName} ${fmt(s.amount)}${s.unit === 'reps' ? '' : ` ${s.unit}`}`)
	.join(', ');
expect(ours === briefScene3, `HYROX: station labels differ from brief Scene 3\n    ours:  ${ours}\n    brief: ${briefScene3}`);
expect(hyrox.loads.rows.every((r) => r.values.length === hyrox.loads.columns.length), 'HYROX: load table shape');
expect(hyrox.typicalDuration.minMinutes < hyrox.typicalDuration.maxMinutes, 'HYROX: duration range');

const windows = athx.strength.windows;
expect(windows[0]?.fromMin === 0, 'ATHX: strength starts at 0');
expect(windows.at(-1)?.toMin === athx.strength.minutes.individual, 'ATHX: strength windows end at 15');
windows.forEach((w, i) => {
	expect(w.toMin - w.fromMin === athx.strength.windowMinutes, `ATHX: window ${w.id} is 5 min`);
	expect(w.repMax === i + 1, `ATHX: window ${w.id} is ${i + 1}RM`);
	if (i > 0) expect(windows[i - 1]?.toMin === w.fromMin, `ATHX: window ${w.id} follows on`);
});
expect(windows.length === athx.format.zoneCount, 'ATHX: three lifts');

const spec = sum(athx.scoring.example.specialist);
const allRounder = sum(athx.scoring.example.allRounder);
expect(spec === 42, `ATHX: specialist totals 42 (got ${spec})`);
expect(allRounder === 41, `ATHX: all-rounder totals 41 (got ${allRounder})`);
expect(allRounder < spec, 'ATHX: all-rounder finishes ahead');

const slots = athx.clock.zoneSlotMinutes;
expect(slots.strength + slots.endurance + slots.metconX === athx.clock.onTheClockMinutes, 'ATHX: zone slots sum to 69');
expect(slots.endurance === athx.endurance.capMinutes, 'ATHX: endurance slot = cap');
expect(slots.metconX === athx.metconX.capMinutes, 'ATHX: MetCon X slot = cap');
expect(slots.strength === athx.strength.minutes.pairs, 'ATHX: strength slot is the 20-minute pairs length');
const individualWork = athx.strength.minutes.individual + athx.endurance.capMinutes + athx.metconX.capMinutes;

const seq = athx.metconX.sequence;
expect(seq[0]?.label === 'Row' && seq.at(-1)?.label === 'Row', 'ATHX: MetCon X rows at both ends');
expect(seq.length === 7, 'ATHX: MetCon X has 7 elements');

const phases = plan.phases;
expect(phases[0]?.fromWeek === 1 && phases.at(-1)?.toWeek === plan.weeks, 'Plan: phases cover weeks 1 to 12');
phases.forEach((p, i) => {
	if (i > 0) expect(phases[i - 1]?.toWeek === p.fromWeek - 1, `Plan: ${p.name} follows on`);
});
const inPlan = (w: number) => w >= 1 && w <= plan.weeks;
expect([...plan.deloadWeeks, ...plan.athxTriangleBenchmarkWeeks, ...plan.benchmarkWeeks].every(inPlan), 'Plan: weeks in range');

// On-screen and caption text: no em dashes; British spelling.
const allStrings = (v: unknown): string[] =>
	typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(allStrings) : [];
const onScreenText = [...allStrings(facts), ...voScript.map((p) => p.text)];
for (const s of onScreenText) expect(!s.includes('\u2014'), `Em dash in: "${s.slice(0, 60)}..."`);
const american = /\b(color|center|meters?|kilometers?|program|favor|labeled|organiz\w*|practic(?:ed|ing)?)\b/i;
for (const s of onScreenText) {
	const m = american.exec(s);
	// "practice" is the British noun; only the verb forms are flagged.
	warn(!m || m[0].toLowerCase() === 'practice', `Possible American spelling "${m?.[0]}" in: "${s.slice(0, 60)}..."`);
}

// ---------------------------------------------------------------------------
// Timings, per video, with a VO fit report against the planned cuts
// ---------------------------------------------------------------------------

const pad = (s: string | number, n: number) => String(s).padEnd(n);
const padL = (s: string | number, n: number) => String(s).padStart(n);
const carriers = new Map<VoId, string[]>();
const range = (v: VideoPlan) => `${formatTc(v.lengthRange.min)}-${formatTc(v.lengthRange.max)}`;

const checkVideo = (video: VideoPlan, expectedEnd: string) => {
	const plannedShots = video.scenes.flatMap((s) => s.shots);
	const label = video.title;
	expect(plannedShots[0]?.start === '0:00', `${label}: starts at 0:00`);
	plannedShots.forEach((shot, i) => {
		const next = plannedShots[i + 1];
		if (next) expect(shot.end === next.start, `${label}: gap or overlap between ${shot.id} and ${next.id}`);
		const len = parseTc(shot.end) - parseTc(shot.start);
		expect(len >= shot.minSeconds, `${label}: ${shot.id} planned ${len}s is under its ${shot.minSeconds}s minimum`);
		if (shot.vo) carriers.set(shot.vo, [...(carriers.get(shot.vo) ?? []), `${video.id}/${shot.id}`]);
	});
	const plannedEnd = parseTc(plannedShots.at(-1)!.end);
	expect(plannedEnd === parseTc(expectedEnd), `${label}: planned end is ${expectedEnd} (got ${formatTc(plannedEnd)})`);
	expect(
		plannedEnd >= video.lengthRange.min && plannedEnd <= video.lengthRange.max,
		`${label}: planned ${formatTc(plannedEnd)} is outside ${range(video)}`,
	);
	const rendered = timelines[video.id];
	expect(rendered.durationInFrames === plannedEnd * FPS || rendered.conformed.length > 0, `${label}: frame total`);

	const planned = buildTimeline(video, {});
	const projected = buildTimeline(video, {}, {estimate: true});
	const projectedShot = new Map(projected.scenes.flatMap((s) => s.shots.map((x) => [x.id, x])));
	const plannedShot = new Map(planned.scenes.flatMap((s) => s.shots.map((x) => [x.id, x])));

	console.log(`\n${label}: VO fit at ${PLANNING_WPM} wpm (lead ${voPadding.leadSeconds}s, tail ${voPadding.tailSeconds}s unless the shot sets one)\n`);
	console.log(`${pad('shot', 10)}${pad('planned', 14)}${padL('len', 5)}  ${pad('vo', 4)}${padL('words', 6)}${padL('read', 7)}${padL('+pad', 7)}${padL('slack', 7)}   ${pad('projected', 14)}`);
	let words_ = 0;
	for (const scene of video.scenes) {
		const groups = new Map<string, typeof scene.shots>();
		for (const s of scene.shots) groups.set(s.vo ?? s.id, [...(groups.get(s.vo ?? s.id) ?? []), s]);
		for (const [, group] of groups) {
			const first = group[0]!;
			const last = group.at(-1)!;
			const len = sum(group.map((s) => parseTc(s.end) - parseTc(s.start)));
			const p0 = projectedShot.get(first.id)!;
			const p1 = projectedShot.get(last.id)!;
			const proj = `${formatTc(p0.from / FPS)}-${formatTc((p1.from + p1.durationInFrames) / FPS)}`;
			const ids = group.map((s) => s.id).join('+');
			if (!first.vo) {
				console.log(`${pad(ids, 10)}${pad(`${first.start}-${last.end}`, 14)}${padL(`${len}s`, 5)}  ${pad('-', 4)}${padL('', 33)}   ${proj}`);
				continue;
			}
			const n = words(voScript.find((p) => p.id === first.vo)!.text).length;
			words_ += n;
			const read = (n * 60) / PLANNING_WPM;
			const needed = voPadding.leadSeconds + read + (last.tailSeconds ?? voPadding.tailSeconds);
			const slack = len - needed;
			console.log(
				`${pad(ids, 10)}${pad(`${first.start}-${last.end}`, 14)}${padL(`${len}s`, 5)}  ${pad(first.vo, 4)}${padL(n, 6)}${padL(`${read.toFixed(1)}s`, 7)}${padL(`${needed.toFixed(1)}s`, 7)}${padL(`${slack >= 0 ? '+' : ''}${slack.toFixed(1)}s`, 7)}   ${proj}`,
			);
			warn(slack >= 0, `${video.id}: VO ${first.vo} at ${PLANNING_WPM} wpm needs ${needed.toFixed(1)}s with padding; shot ${ids} is ${len}s`);
		}
	}

	// Cue positions in the planned cut: each build must land, settle and hold inside its shot.
	for (const shot of plannedShots) {
		const timed = plannedShot.get(shot.id)!;
		for (const [id, f] of Object.entries(timed.cues)) {
			const latest = timed.durationInFrames - motion.minHoldFrames - FPS;
			warn(f >= 0 && f <= latest, `${video.id}: cue ${shot.id}/${id} at ${(f / FPS).toFixed(1)}s leaves under 2.5s to build and hold in a ${timed.durationInFrames / FPS}s shot`);
		}
	}

	const projectedSeconds = projected.durationInFrames / FPS;
	console.log(`\nScript:        ${words_} words, ${formatTc((words_ * 60) / PLANNING_WPM)} of speech at ${PLANNING_WPM} wpm`);
	console.log(`Planned cut:   ${formatTc(planned.durationInFrames / FPS)} (${planned.durationInFrames} frames), target ${range(video)}`);
	console.log(`Projected cut: ${formatTc(projectedSeconds)} (${projected.durationInFrames} frames) if read at ${PLANNING_WPM} wpm`);
	console.log(`Rendered now:  ${formatTc(rendered.durationInFrames / FPS)}, ${rendered.conformed.length} shots conformed to recorded VO`);
	warn(
		projectedSeconds >= video.lengthRange.min && projectedSeconds <= video.lengthRange.max,
		`${video.id}: projected cut ${formatTc(projectedSeconds)} is outside ${range(video)}`,
	);
	return {plannedShots, planned};
};

// Main video, plus the two things only it has: the Gate 0 retimes and the chapters.
const mainChecked = checkVideo(main, '5:42');
const retimes: Record<string, [string, string]> = {
	'6a': ['2:45', '3:01'], '6b': ['3:01', '3:13'], '6c': ['3:13', '3:28'], '6d': ['3:28', '3:35'],
	'8a': ['4:10', '4:21'], '8b': ['4:21', '4:35'],
	'10a': ['5:05', '5:11'], '10b': ['5:11', '5:25'], '10c': ['5:25', '5:32'],
	'11': ['5:32', '5:42'],
};
for (const [id, [start, end]] of Object.entries(retimes)) {
	const s = mainChecked.plannedShots.find((x) => x.id === id);
	expect(s?.start === start && s?.end === end, `Correction 5: ${id} should be ${start}-${end} (got ${s?.start}-${s?.end})`);
}
const briefChapters = [
	'0:00 Introduction', '0:26 Two different formats', '1:15 How each event is scored',
	'1:50 What carries over from HYROX', "2:45 What's new: the Strength Zone", "3:35 What's new: MetCon X",
	"4:10 What's new: the Endurance Zone", '4:35 Why give it a go', '5:05 How to prepare',
];
expect(JSON.stringify(chapters(mainChecked.planned)) === JSON.stringify(briefChapters), 'Main video: chapters differ from the brief');

checkVideo(reel, '1:02');

// Every paragraph is carried by exactly one run of shots, in exactly one video.
for (const p of voScript) {
	const where = carriers.get(p.id) ?? [];
	expect(where.length > 0, `VO ${p.id} is not carried by any shot`);
	expect(new Set(where.map((w) => w.split('/')[0])).size <= 1, `VO ${p.id} is used in both videos: ${where.join(', ')}`);
}

console.log(`\nATHX on the clock: ${athx.clock.onTheClockMinutes} min (zone slots); individual working time ${individualWork} min`);
console.log('\nYouTube chapters (rendered main timeline):');
for (const c of chapters()) console.log(`  ${c}`);

if (warnings.length) {
	console.log(`\n${warnings.length} warning(s):`);
	for (const w of warnings) console.log(`  ! ${w}`);
}
if (failures.length) {
	console.log(`\n${failures.length} FAILURE(S):`);
	for (const f of failures) console.log(`  x ${f}`);
	process.exit(1);
}
console.log('\nAll checks passed.');
