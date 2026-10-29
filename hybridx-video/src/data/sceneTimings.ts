// Scene and shot timings for HYROX or ATHX?: the 16:9 main video and the 9:16
// cut-down.
//
// Each plan is the storyboard as planned, written in m:ss so it can be checked
// against the brief by eye: the main video is brief Part 3 with the Gate 0 retimes
// (6a-6d, 8a-8b, 10a-10c, end card 5:32-5:42); the cut-down is brief Part 4.
// Compositions never read a plan directly. They read its timeline, which is the
// plan conformed to the recorded voiceover:
//
//   - Until voTimings.json holds a paragraph, its shots keep their planned length.
//   - Once it does (written at Gate 3 from the cleaned WAVs), the shots carrying
//     that paragraph are re-cut to the read: lead-in + speech + tail, never below
//     the shot's minimum, and every later cut ripples. Shots with no voiceover
//     (the title, the end card) keep their planned length.
//
// So a new read means re-running the VO pipeline and re-rendering; nothing here is
// edited by hand. Boundaries are cut points: the composition centres each 10-frame
// scene dissolve on the boundary, so dissolves never change the running time.

import {motion} from '../easing';
import type {Aspect} from '../tokens';
import measuredJson from './voTimings.json';
import {PLANNING_WPM, voById, words, type VoId} from './voScript';

export const FPS = 25;

/** How VO sits in its shot once recorded. Tuned by ear at Gate 3. */
export const voPadding = {
	/** The cut lands, then the voice comes in. */
	leadSeconds: 0.4,
	/** After the last word: the finished graphic holds at least 1.5 s, plus a breath. */
	tailSeconds: 1.8,
} as const;

/** Time for a cue-triggered build to finish once its word is spoken. */
const CUE_SETTLE_SECONDS = 1.0;
const HOLD_SECONDS = motion.minHoldFrames / FPS;

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

/** A build that lands on a spoken word, e.g. a carry-over line on "SkiErg". */
export type Cue = {id: string; word: string; /** 1-based occurrence in the paragraph. */ nth?: number};

export type ShotPlan = {
	id: string;
	what: string;
	/** Planned in and out, m:ss. */
	start: string;
	end: string;
	/** The paragraph this shot carries. Consecutive shots may share one. */
	vo?: VoId;
	/**
	 * Shortest this shot may be cut to, in seconds: its build plus the 1.5 s hold.
	 * Estimates until the components exist; Gate 2 replaces them with measured
	 * build lengths.
	 */
	minSeconds: number;
	/** Overrides voPadding.tailSeconds where the brief asks for a longer hold. */
	tailSeconds?: number;
	cues?: Cue[];
};

export type ScenePlan = {
	id: string;
	n: number;
	title: string;
	/** YouTube chapter that starts with this scene. */
	chapter?: string;
	shots: ShotPlan[];
};

export type VideoPlan = {
	id: 'main' | 'reel';
	title: string;
	aspect: Aspect;
	/** Brief 2.7, in seconds. */
	lengthRange: {min: number; max: number};
	scenes: readonly ScenePlan[];
};

export const main: VideoPlan = {
	id: 'main',
	title: 'HYROX or ATHX? (16:9)',
	aspect: 'landscape',
	lengthRange: {min: 5 * 60 + 15, max: 5 * 60 + 45},
	scenes: [
		{
			id: 's01',
			n: 1,
			title: 'Opening',
			chapter: 'Introduction',
			shots: [
				{id: '1a', what: 'HYROX race map draws, km counter', start: '0:00', end: '0:08', vo: '1', minSeconds: 7},
				{id: '1b', what: 'ATHX day timeline, blocks rise in', start: '0:08', end: '0:16', vo: '1', minSeconds: 6},
				{id: '1c', what: 'Both hold, yellow rule draws between', start: '0:16', end: '0:20', vo: '1', minSeconds: 3},
			],
		},
		{
			id: 's02',
			n: 2,
			title: 'Title',
			shots: [{id: '2', what: 'HYROX OR ATHX? title card', start: '0:20', end: '0:26', minSeconds: 6}],
		},
		{
			id: 's03',
			n: 3,
			title: 'Two different formats',
			chapter: 'Two different formats',
			shots: [
				{id: '3a', what: 'Race map, station labels in order', start: '0:26', end: '0:45', vo: '3a', minSeconds: 12},
				{
					id: '3b',
					what: 'ATHX timeline opens into zone cards',
					start: '0:45',
					end: '1:05',
					vo: '3b',
					minSeconds: 12,
					cues: [
						{id: 'strength', word: 'strength'},
						{id: 'endurance', word: 'endurance'},
						{id: 'metconX', word: 'MetCon'},
					],
				},
				{id: '3c', what: 'Split: HYROX card / ATHX card', start: '1:05', end: '1:15', vo: '3c', minSeconds: 6},
			],
		},
		{
			id: 's04',
			n: 4,
			title: 'How each is scored',
			chapter: 'How each event is scored',
			shots: [
				{id: '4a', what: 'TOTAL TIME figure', start: '1:15', end: '1:25', vo: '4a', minSeconds: 5},
				{id: '4b', what: 'Placing boxes count up and sum', start: '1:25', end: '1:35', vo: '4b', minSeconds: 6},
				{id: '4c', what: 'p9 specialist / all-rounder table builds', start: '1:35', end: '1:50', vo: '4c', minSeconds: 10},
			],
		},
		{
			id: 's05',
			n: 5,
			title: 'What carries over',
			chapter: 'What carries over from HYROX',
			shots: [
				{
					id: '5a',
					what: 'Carry-over map, lines draw one at a time',
					start: '1:50',
					end: '2:35',
					vo: '5a',
					minSeconds: 20,
					cues: [
						{id: 'line1', word: 'SkiErg'},
						{id: 'line2', word: 'rower'},
						{id: 'line3', word: 'Burpees'},
						{id: 'line4', word: 'sandbag'},
						{id: 'line5', word: 'dumbbell'},
						{id: 'line6', word: 'heavy'},
						{id: 'line7', word: 'running'},
					],
				},
				// Brief: the finished map stays on screen for 3 seconds.
				{id: '5b', what: 'Caption under the finished map', start: '2:35', end: '2:45', vo: '5b', minSeconds: 5, tailSeconds: 3},
			],
		},
		{
			id: 's06',
			n: 6,
			title: "What's new: the Strength Zone",
			chapter: "What's new: the Strength Zone",
			shots: [
				{
					id: '6a',
					what: 'SkillCard 1: 15-minute window timeline',
					start: '2:45',
					end: '3:01',
					vo: '6a',
					minSeconds: 8,
					cues: [
						{id: 'overhead', word: 'overhead'},
						{id: 'squat', word: 'squat'},
						{id: 'deadlift', word: 'deadlift'},
					],
				},
				{id: '6b', what: 'p12 worked example, band on averages', start: '3:01', end: '3:13', vo: '6b', minSeconds: 6},
				{id: '6c', what: 'p14 focus + drills tables, parallax', start: '3:13', end: '3:28', vo: '6c', minSeconds: 8},
				{id: '6d', what: 'p144 Inside each window, overhead rows', start: '3:28', end: '3:35', vo: '6d', minSeconds: 6},
			],
		},
		{
			id: 's07',
			n: 7,
			title: "What's new: MetCon X",
			chapter: "What's new: MetCon X",
			shots: [
				{id: '7a', what: "p6 MetCon X, men's + women's; then p20", start: '3:35', end: '3:50', vo: '7a', minSeconds: 10},
				{
					id: '7b',
					what: 'SkillCards 2 and 3: DB bench, sandbag',
					start: '3:50',
					end: '4:10',
					vo: '7b',
					minSeconds: 8,
					cues: [
						{id: 'dbBench', word: 'Thirty'},
						{id: 'sandbag', word: 'sandbag'},
					],
				},
			],
		},
		{
			id: 's08',
			n: 8,
			title: "What's new: the Endurance Zone",
			chapter: "What's new: the Endurance Zone",
			shots: [
				{id: '8a', what: '24-minute split bar, ski metres count', start: '4:10', end: '4:21', vo: '8a', minSeconds: 8},
				{id: '8b', what: 'p16 run pace table, three rows', start: '4:21', end: '4:35', vo: '8b', minSeconds: 6},
			],
		},
		{
			id: 's09',
			n: 9,
			title: 'Why give it a go',
			chapter: 'Why give it a go',
			shots: [
				{
					id: '9',
					what: 'Four cards, rule lands yellow then white; p53 at 25%',
					start: '4:35',
					end: '5:05',
					vo: '9',
					minSeconds: 12,
					cues: [
						{id: 'card1', word: 'fitness'},
						{id: 'card2', word: 'strength'},
						{id: 'card3', word: 'three'},
						{id: 'card4', word: 'less'},
					],
				},
			],
		},
		{
			id: 's10',
			n: 10,
			title: 'How to prepare',
			chapter: 'How to prepare',
			shots: [
				{id: '10a', what: '12-week phase bar builds', start: '5:05', end: '5:11', vo: '10a', minSeconds: 5},
				{
					id: '10b',
					what: 'Day pages p79, p54, p90, about 3 s each',
					start: '5:11',
					end: '5:25',
					vo: '10b',
					minSeconds: 9,
					cues: [
						{id: 'heavy', word: 'heavy'},
						{id: 'triangle', word: 'MetCon'},
						{id: 'runSki', word: 'engine'},
					],
				},
				{id: '10c', what: 'Both covers, slow push-in', start: '5:25', end: '5:32', vo: '10c', minSeconds: 6},
			],
		},
		{
			id: 's11',
			n: 11,
			title: 'End card',
			shots: [{id: '11', what: 'Logo, hybridx.club, disclaimer', start: '5:32', end: '5:42', minSeconds: 10}],
		},
	],
};

/** Brief Part 4. Each beat is its own scene; burned-in captions run throughout. */
export const reel: VideoPlan = {
	id: 'reel',
	title: 'HYROX or ATHX? (9:16 cut-down)',
	aspect: 'portrait',
	lengthRange: {min: 55, max: 65},
	scenes: [
		{
			id: 'r1',
			n: 1,
			title: 'HYROX vs ATHX',
			shots: [{id: 'r1', what: 'Race map (top) and ATHX timeline (bottom) draw together', start: '0:00', end: '0:04', vo: 'r1', minSeconds: 4}],
		},
		{
			id: 'r2',
			n: 2,
			title: '3 zones, not 1 race',
			shots: [{id: 'r2', what: 'Top half collapses; ATHX timeline, three blocks labelled', start: '0:04', end: '0:12', vo: 'r2', minSeconds: 6}],
		},
		{
			id: 'r3',
			n: 3,
			title: 'Placings added together',
			shots: [{id: 'r3', what: 'Placing boxes sum to a total', start: '0:12', end: '0:20', vo: 'r3', minSeconds: 6}],
		},
		{
			id: 'r4',
			n: 4,
			title: 'Your engine carries over',
			shots: [
				{
					id: 'r4',
					what: 'Short carry-over map: SkiErg, rower, burpees, sandbag',
					start: '0:20',
					end: '0:32',
					vo: 'r4',
					minSeconds: 8,
					cues: [
						{id: 'line1', word: 'ski'},
						{id: 'line2', word: 'row'},
						{id: 'line3', word: 'burpees'},
						{id: 'line4', word: 'sandbag'},
					],
				},
			],
		},
		{
			id: 'r5',
			n: 5,
			title: 'New: max strength',
			shots: [
				{
					id: 'r5',
					what: 'Strength timeline, then the split jerk table cut-out',
					start: '0:32',
					end: '0:46',
					vo: 'r5',
					minSeconds: 10,
					cues: [
						{id: 'overhead', word: 'overhead'},
						{id: 'squat', word: 'squat'},
						{id: 'deadlift', word: 'deadlift'},
					],
				},
			],
		},
		{
			id: 'r6',
			n: 6,
			title: 'New: DB bench, squats into a carry',
			shots: [
				{
					id: 'r6',
					what: 'DB bench and sandbag squat cards',
					start: '0:46',
					end: '0:54',
					vo: 'r6',
					minSeconds: 6,
					cues: [
						{id: 'dbBench', word: 'dumbbell'},
						{id: 'sandbag', word: 'sandbag'},
					],
				},
			],
		},
		{
			id: 'r7',
			n: 7,
			title: '12-week plan. Link in bio.',
			shots: [{id: 'r7', what: 'Both covers, then the end card', start: '0:54', end: '1:02', vo: 'r7', minSeconds: 7}],
		},
	],
};

export const videos = {main, reel} as const;

// ---------------------------------------------------------------------------
// Measured voiceover (written by the Gate 3 VO pipeline)
// ---------------------------------------------------------------------------

export type MeasuredVo = {
	/** Cleaned WAV, as a staticFile path: 'audio/vo-clean/vo-s03.wav'. */
	file: string;
	/** Where the paragraph starts in that file, seconds. */
	inSeconds: number;
	durationSeconds: number;
	/** Optional: each word's start, seconds from the paragraph start, in script order. */
	wordStarts?: number[];
};

export type VoTimings = Partial<Record<VoId, MeasuredVo>>;

export const measured = measuredJson as VoTimings;

/** What a 150 wpm read would measure, for planning before the recording exists. */
export const estimateVo = (id: VoId): MeasuredVo => ({
	file: `audio/vo-clean/${voById[id].file}`,
	inSeconds: 0,
	durationSeconds: (words(voById[id].text).length * 60) / PLANNING_WPM,
});

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

export const parseTc = (tc: string): number => {
	const m = /^(\d+):([0-5]\d)$/.exec(tc);
	if (!m) throw new Error(`Bad timecode "${tc}", expected m:ss`);
	return Number(m[1]) * 60 + Number(m[2]);
};

export const formatTc = (seconds: number): string => {
	const s = Math.floor(seconds + 1e-6);
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export type VoPlacement = {
	id: VoId;
	file: string;
	/** Frames from the scene start. */
	from: number;
	/** Frames to skip into the WAV. */
	trimBefore: number;
	durationInFrames: number;
	/** False while planning: there is no WAV to play yet. */
	recorded: boolean;
};

export type TimedShot = {
	id: string;
	what: string;
	/** Absolute frame. */
	from: number;
	durationInFrames: number;
	/** Frames from the shot start. */
	cues: Record<string, number>;
};

export type TimedScene = {
	id: string;
	n: number;
	title: string;
	chapter?: string;
	from: number;
	durationInFrames: number;
	shots: TimedShot[];
	vo: VoPlacement[];
};

export type Timeline = {
	video: VideoPlan['id'];
	fps: number;
	durationInFrames: number;
	scenes: TimedScene[];
	/** Shots whose cut follows a recorded (or, with `estimate`, a projected) read. */
	conformed: string[];
};

/** Shots that carry the same paragraph are cut as one group. */
const groupShots = (shots: readonly ShotPlan[]) => {
	const groups: ShotPlan[][] = [];
	for (const shot of shots) {
		const last = groups.at(-1);
		if (last && shot.vo && last[0]?.vo === shot.vo) last.push(shot);
		else groups.push([shot]);
	}
	return groups;
};

/** Seconds from the paragraph start at which a word is spoken. */
const wordTime = (vo: VoId, cue: Cue, m: MeasuredVo | undefined): number => {
	const all = words(voById[vo].text);
	const target = cue.word.toLowerCase();
	let seen = 0;
	const index = all.findIndex((w) => w.toLowerCase() === target && ++seen === (cue.nth ?? 1));
	if (index < 0) throw new Error(`Cue "${cue.id}": "${cue.word}" is not in VO ${vo}`);
	const exact = m?.wordStarts?.[index];
	if (exact !== undefined) return exact;
	if (m) return (index / all.length) * m.durationSeconds;
	return (index * 60) / PLANNING_WPM;
};

/**
 * Build a video's timeline. With `estimate`, every paragraph without a recording
 * is conformed to a 150 wpm read instead: a projection of the cut, used by
 * `npm run check`, never rendered.
 */
export const buildTimeline = (video: VideoPlan, vo: VoTimings = measured, {estimate = false} = {}): Timeline => {
	const toFrames = (s: number) => Math.round(s * FPS);
	const outScenes: TimedScene[] = [];
	const conformed: string[] = [];
	let cursor = 0; // seconds; frames are rounded from running boundaries so nothing drifts

	for (const scene of video.scenes) {
		const sceneStart = cursor;
		const shots: TimedShot[] = [];
		const placements: VoPlacement[] = [];

		for (const group of groupShots(scene.shots)) {
			const voId = group[0]?.vo;
			const m = voId ? (vo[voId] ?? (estimate ? estimateVo(voId) : undefined)) : undefined;
			const planned = group.map((s) => parseTc(s.end) - parseTc(s.start));
			const plannedTotal = planned.reduce((a, b) => a + b, 0);

			// Group length: planned, or the read plus padding once there is one.
			let lengths = planned;
			if (voId && m) {
				const tail = group.at(-1)?.tailSeconds ?? voPadding.tailSeconds;
				const cueNeeds = group.flatMap((s) =>
					(s.cues ?? []).map((c) => voPadding.leadSeconds + wordTime(voId, c, m) + CUE_SETTLE_SECONDS + HOLD_SECONDS),
				);
				const needed = Math.max(voPadding.leadSeconds + m.durationSeconds + tail, ...cueNeeds);
				lengths = planned.map((p, i) => Math.max(group[i]?.minSeconds ?? 0, (p / plannedTotal) * needed));
				conformed.push(...group.map((s) => s.id));
			}

			const groupStart = cursor;
			if (voId) {
				const placement = m ?? estimateVo(voId);
				placements.push({
					id: voId,
					file: placement.file,
					from: toFrames(groupStart + voPadding.leadSeconds) - toFrames(sceneStart),
					trimBefore: toFrames(placement.inSeconds),
					durationInFrames: toFrames(placement.durationSeconds),
					recorded: Boolean(vo[voId]),
				});
			}

			group.forEach((shot, i) => {
				const start = cursor;
				cursor += lengths[i] ?? 0;
				const cues: Record<string, number> = {};
				for (const cue of shot.cues ?? []) {
					// Cue times are measured from the group start, where the paragraph begins.
					const t = groupStart + voPadding.leadSeconds + wordTime(voId as VoId, cue, m) - start;
					cues[cue.id] = toFrames(t);
				}
				shots.push({
					id: shot.id,
					what: shot.what,
					from: toFrames(start),
					durationInFrames: toFrames(cursor) - toFrames(start),
					cues,
				});
			});
		}

		outScenes.push({
			id: scene.id,
			n: scene.n,
			title: scene.title,
			chapter: scene.chapter,
			from: toFrames(sceneStart),
			durationInFrames: toFrames(cursor) - toFrames(sceneStart),
			shots,
			vo: placements,
		});
	}

	return {video: video.id, fps: FPS, durationInFrames: toFrames(cursor), scenes: outScenes, conformed};
};

/** What the compositions render. */
export const timelines = {
	main: buildTimeline(main),
	reel: buildTimeline(reel),
} as const;

/** YouTube chapters for the description, from the conformed timeline. */
export const chapters = (t: Timeline = timelines.main) =>
	t.scenes.filter((s) => s.chapter).map((s) => `${formatTc(s.from / t.fps)} ${s.chapter}`);
