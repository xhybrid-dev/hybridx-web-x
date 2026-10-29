// Every figure that can appear on screen in HYROX or ATHX?
//
// Written from Part 6 of VIDEO-BRIEF-HYROX-ATHX.md (the fact sheet), with the
// corrections agreed in PRODUCTION-PLAN.md and the Gate 0 kick-off. Components
// never hard-code a number: they read it from here. A figure that is not in this
// file does not go on screen; ask rather than add.
//
// Text is stored in sentence case and set in caps by the type style. No em
// dashes. British spelling. Ranges use "to" or a hyphen, as the brief does.
//
// `npm run check` re-derives every total in this file (8 x 1 km, the scoring
// example, the 69 minutes, the phase weeks) and fails on anything that no
// longer adds up.

export const sources = {
	hyroxRulebook: {
		label: 'HYROX 26/27 Singles Rulebook',
		url: 'https://hyroxbenelux.com/wp-content/uploads/2026/06/26_27_HYROX_RulebookSingles_EN_FINAL.pdf',
	},
	athxWorkouts: {label: 'ATHX 2027 Workouts', url: 'https://athxgames.com/workouts/2027'},
	athxStandards: {label: 'ATHX 2027 Movement Standards', url: 'https://athxgames.com/movement-standards/2027'},
	hybridxKnowledgeBase: {label: 'HybridX knowledge base', url: null},
	blkBox2027: {
		label: 'BLK BOX, ATHX 2027 Workouts: Everything You Need to Know (cited by PRODUCTION-PLAN.md)',
		url: 'https://www.blkboxfitness.com/blogs/education/athx-2027-workouts-everything-you-need-to-know',
	},
} as const;

// ---------------------------------------------------------------------------
// HYROX (2026/27 Singles rulebook)
// ---------------------------------------------------------------------------

export type Unit = 'm' | 'reps' | 'cal' | 'kg' | 'km';

export type Station = {
	id: string;
	/** As the fact sheet names it. */
	name: string;
	/** As the storyboard labels it on screen (Scene 3 race map). */
	shortName: string;
	amount: number;
	unit: Unit;
};

export const hyrox = {
	season: '2026/27',
	source: sources.hyroxRulebook,

	format: {
		/** A 1 km run followed by one station, repeated 8 times. */
		rounds: 8,
		runKmPerRound: 1,
		totalRunKm: 8,
		stationCount: 8,
		fixedOrder: true,
		/** The clock runs from start to finish without stopping. */
		continuous: true,
	},

	/** In race order. */
	stations: [
		{id: 'skierg', name: 'SkiErg', shortName: 'SkiErg', amount: 1000, unit: 'm'},
		{id: 'sledPush', name: 'Sled Push', shortName: 'Sled Push', amount: 50, unit: 'm'},
		{id: 'sledPull', name: 'Sled Pull', shortName: 'Sled Pull', amount: 50, unit: 'm'},
		{id: 'burpeeBroadJumps', name: 'Burpee Broad Jumps', shortName: 'Burpee Broad Jumps', amount: 80, unit: 'm'},
		{id: 'row', name: 'Rowing', shortName: 'Row', amount: 1000, unit: 'm'},
		{id: 'farmersCarry', name: 'Kettlebell Farmers Carry', shortName: 'Farmers Carry', amount: 200, unit: 'm'},
		{id: 'sandbagLunges', name: 'Sandbag Lunges', shortName: 'Sandbag Lunges', amount: 100, unit: 'm'},
		{id: 'wallBalls', name: 'Wall Balls', shortName: 'Wall Balls', amount: 100, unit: 'reps'},
	] as const satisfies readonly Station[],

	scoring: {
		basis: 'Total time',
		includes: ['runs', 'stations', 'Roxzone transitions', 'any time penalties'],
		ranking: 'Fastest time within each division, with age-group rankings',
	},

	divisions: {
		singles: ['Open', 'Pro'],
		teams: ['Doubles', 'Relay'],
	},

	/** "Loads (if shown)". Sled weights include the sled. */
	loads: {
		columns: ['Women Open', 'Women Pro / Men Open', 'Men Pro'],
		rows: [
			{station: 'sledPush', label: 'Sled Push (incl. sled)', values: [102, 152, 202], unit: 'kg', count: 1},
			{station: 'sledPull', label: 'Sled Pull (incl. sled)', values: [78, 103, 153], unit: 'kg', count: 1},
			{station: 'farmersCarry', label: 'Farmers Carry', values: [16, 24, 32], unit: 'kg', count: 2},
			{station: 'sandbagLunges', label: 'Sandbag Lunges', values: [10, 20, 30], unit: 'kg', count: 1},
			{station: 'wallBalls', label: 'Wall Balls', values: [4, 6, 9], unit: 'kg', count: 1},
		],
		wallBallTargetM: {women: 2.7, men: 3.0},
	},

	/**
	 * A range for typical age-group athletes, not a claim about every finisher.
	 * The video uses this range only, with no record times.
	 */
	typicalDuration: {
		minMinutes: 60,
		maxMinutes: 100,
		who: 'most age-group athletes',
		source: sources.hybridxKnowledgeBase,
	},
} as const;

// ---------------------------------------------------------------------------
// ATHX 2027 (published workout specifications and movement standards)
// ---------------------------------------------------------------------------

export type StrengthWindow = {
	id: 'overhead' | 'squat' | 'deadlift';
	fromMin: number;
	toMin: number;
	/** Rep max tested: 1RM, 2RM, 3RM. */
	repMax: number;
	lift: string;
};

export const athx = {
	season: '2027',
	source: sources.athxWorkouts,

	format: {
		zoneCount: 3,
		/** "Three separately scored zones in about 2.5 hours, with recovery between them." */
		aboutHours: 2.5,
		recoveryBetweenZones: true,
		/** Set by each event, so never drawn as fixed. */
		zoneOrderSetByEvent: true,
		gapLengthsSetByEvent: true,
	},

	strength: {
		name: 'Strength',
		minutes: {individual: 15, pairs: 20},
		windowMinutes: 5,
		windows: [
			{id: 'overhead', fromMin: 0, toMin: 5, repMax: 1, lift: 'Shoulder to Overhead'},
			{id: 'squat', fromMin: 5, toMin: 10, repMax: 2, lift: 'Back Squat'},
			{id: 'deadlift', fromMin: 10, toMin: 15, repMax: 3, lift: 'Deadlift'},
		] as const satisfies readonly StrengthWindow[],
		overhead: {
			options: ['press', 'push press', 'push jerk', 'split jerk'],
			rule: 'Feet must finish in line',
		},
		deadlift: {
			/** Two 1-minute windows, averaged. */
			attemptWindows: 2,
			attemptWindowMinutes: 1,
			averaged: true,
			missedWindowScores: 0,
		},
		/** The clock includes the warm-up (VO 6a, 6d). */
		warmUpInsideWindow: true,
		score: 'Total kilograms',
	},

	endurance: {
		name: 'Endurance',
		capMinutes: 24,
		runKm: 3,
		/** Verbatim from the fact sheet. Not used on screen. */
		runNote: 'Lite 2.4 km for pairs',
		then: 'Max SkiErg distance',
		score: 'Ski metres only',
	},

	metconX: {
		name: 'MetCon X',
		capMinutes: 25,
		format: 'For time',
		/** In order. The row is done at the start and again at the end. */
		sequence: [
			{id: 'rowIn', label: 'Row', amount: {men: 45, women: 35}, unit: 'cal'},
			{id: 'dbGroundToOverhead', label: 'DB ground to overhead', amount: 30, unit: 'reps'},
			{id: 'dbBench', label: 'DB bench press', amount: 30, unit: 'reps'},
			{id: 'sandbagSquats', label: 'Sandbag squats', amount: 30, unit: 'reps'},
			{id: 'sandbagCarry', label: 'Sandbag carry', amount: 30, unit: 'm'},
			{id: 'burpeesOverBench', label: 'Burpees over a bench', amount: 30, unit: 'reps'},
			{id: 'rowOut', label: 'Row', amount: {men: 45, women: 35}, unit: 'cal'},
		],
		/** The row calories are for individual ATHX division. */
		rowCaloriesApplyTo: 'individual ATHX',
		/**
		 * ATHX division loads. The fact sheet gives each pair as "a / b"; read as
		 * men / women, the order it states explicitly for the row. Not on screen
		 * in the storyboard; confirm before any shot shows them.
		 */
		loadsKg: {
			dumbbell: {men: 20, women: 12.5},
			sandbag: {men: 50, women: 30},
		},
	},

	scoring: {
		basis: 'Placings added together',
		lowestTotalWins: true,
		/** Each zone is ranked on its own. */
		perZoneRanking: true,
		example: {
			/** Wins two zones, fortieth in the third. */
			specialist: [1, 1, 40],
			/** Places twelfth, fourteenth and fifteenth, and finishes ahead. */
			allRounder: [12, 14, 15],
		},
	},

	divisions: {
		levels: ['Lite', 'ATHX', 'Pro'],
		entries: ['Individuals', 'Pairs'],
	},

	clock: {
		/**
		 * Scene 3c summary card reads "3 ZONES, 69 MIN ON THE CLOCK" (Gate 0
		 * correction 3). The fact sheet's "about 69 minutes of work" overstated an
		 * individual's work: 69 is the sum of the zone slots below, and individuals
		 * lift for 15 of the Strength Zone's 20.
		 */
		onTheClockMinutes: 69,
		/** Source: PRODUCTION-PLAN.md, which cites BLK BOX's 2027 summary. */
		zoneSlotMinutes: {strength: 20, endurance: 24, metconX: 25},
		zoneSlotSource: sources.blkBox2027,
	},
} as const;

// ---------------------------------------------------------------------------
// The HybridX plan
// ---------------------------------------------------------------------------

export type Phase = {id: string; name: string; fromWeek: number; toWeek: number};

export const plan = {
	title: 'ATHX 2027: The Complete Training System',
	editions: ["Men's Edition", "Women's Edition"],
	/** What the women's edition adds. */
	womensEditionAdds: 'cycle-aligned blocks',
	alsoIn: 'the HybridX app',

	weeks: 12,
	phases: [
		{id: 'base', name: 'Base', fromWeek: 1, toWeek: 4},
		{id: 'development', name: 'Development', fromWeek: 5, toWeek: 8},
		{id: 'specific', name: 'Specific', fromWeek: 9, toWeek: 11},
		{id: 'taper', name: 'Taper', fromWeek: 12, toWeek: 12},
	] as const satisfies readonly Phase[],
	deloadWeeks: [4, 8],

	splitJerkSessionsPerWeek: 3,
	athxTriangleBenchmarkWeeks: [2, 10],
	benchmarkWeeks: [1, 9],

	/** What every day sets out. */
	everyDay: ['session', 'fuel', 'hydration', 'recovery', 'teaching note', 'log'],

	url: 'hybridx.club',
} as const;

// ---------------------------------------------------------------------------
// Never on screen
// ---------------------------------------------------------------------------

export const doNotState = [
	'event dates',
	'venues',
	'prices',
	'prize money',
	'participant numbers',
	'world records',
	'any endorsement by either event',
] as const;

export const disclaimer =
	'HybridX Club is independent. Not affiliated with or endorsed by HYROX, ATHX Games or adidas. HYROX and ATHX are trademarks of their respective owners.';
