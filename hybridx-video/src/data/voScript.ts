// The voiceover script for HYROX or ATHX?, one entry per paragraph.
//
// Verbatim from the recording script in PRODUCTION-PLAN.md, which is the brief's
// script with Gate 0 correction 4 applied to 3b ("in about two and a half hours",
// not "in one afternoon"). This is the single source for three things: which
// paragraph each shot carries (sceneTimings.ts), where VO-keyed builds land before
// the recording exists, and the SRT captions at Gate 4, which must match the read
// word for word. If Jon's read departs from it, change it here.

export type VoId =
	| '1'
	| '3a' | '3b' | '3c'
	| '4a' | '4b' | '4c'
	| '5a' | '5b'
	| '6a' | '6b' | '6c' | '6d'
	| '7a' | '7b'
	| '8a' | '8b'
	| '9'
	| '10a' | '10b' | '10c';

export type VoParagraph = {
	id: VoId;
	/** One WAV per scene in assets/audio/vo/; paragraphs are split by silence. */
	file: string;
	text: string;
};

const scene = (n: number) => `vo-s${String(n).padStart(2, '0')}.wav`;

export const voScript: readonly VoParagraph[] = [
	{
		id: '1',
		file: scene(1),
		text: "If you race HYROX, you already have a lot of what ATHX asks for. But the two events are built very differently. This video compares them side by side: how they work, how they're scored, what carries over, and what's new.",
	},
	{
		id: '3a',
		file: scene(3),
		text: "HYROX is one continuous race. You run a kilometre, do a station, and repeat that eight times. The clock doesn't stop until you finish.",
	},
	{
		id: '3b',
		file: scene(3),
		text: "ATHX is three separate tests in about two and a half hours. There's a strength zone with three heavy lifts, an endurance zone with a run and a ski, and a timed workout called MetCon X.",
	},
	{
		id: '3c',
		file: scene(3),
		text: 'So instead of one long effort, you get three shorter ones with a break between each.',
	},
	{id: '4a', file: scene(4), text: 'HYROX is scored on your total time.'},
	{
		id: '4b',
		file: scene(4),
		text: 'In ATHX, each zone is ranked on its own, and your three placings are added together. The lowest total wins.',
	},
	{
		id: '4c',
		file: scene(4),
		text: 'That means balance matters. An athlete who wins two zones but finishes fortieth in the third scores forty-two. Someone who places twelfth, fourteenth and fifteenth scores forty-one and finishes ahead.',
	},
	{
		id: '5a',
		file: scene(5),
		text: "A lot of your HYROX training transfers straight across. The SkiErg and the rower are both in ATHX. Burpees are there, over a bench instead of a broad jump. The sandbag is there too, as squats straight into a carry. Wall balls and sleds don't appear, but the leg drive and strength they build is a good base for the dumbbell work and the heavy lifts. And you're used to running when you're already tired.",
	},
	{
		id: '5b',
		file: scene(5),
		text: "If you're fit enough for HYROX, the engine side of ATHX will feel familiar.",
	},
	{
		id: '6a',
		file: scene(6),
		text: 'The biggest difference is the Strength Zone. HYROX tests strength endurance with sleds and lunges. ATHX tests maximal strength: a one-rep max overhead, a two-rep max back squat and a three-rep max deadlift, with five minutes for each, warm-up included.',
	},
	{
		id: '6b',
		file: scene(6),
		text: 'The deadlift score is the average of two one-minute windows, and a miss counts as zero. So choosing a safe first weight matters more than chasing a best.',
	},
	{
		id: '6c',
		file: scene(6),
		text: 'On the overhead you can use a split jerk, which usually lets you lift the most. Our plan builds it with short, frequent practice three times a week, alongside push press, strict press and shoulder stability work.',
	},
	{
		id: '6d',
		file: scene(6),
		text: 'And because the clock includes your warm-up, you plan every ramp-up single and attempt in advance.',
	},
	{
		id: '7a',
		file: scene(7),
		text: 'MetCon X is the zone that will feel most like HYROX: a for-time workout with a row at each end and loaded work in the middle.',
	},
	{
		id: '7b',
		file: scene(7),
		text: 'Two parts are new for most HYROX athletes. Thirty dumbbell bench presses, which nothing in HYROX trains. And thirty sandbag squats straight into a carry, where the same grip and trunk do both jobs with no break.',
	},
	{
		id: '8a',
		file: scene(8),
		text: 'In the Endurance Zone you run three kilometres, then ski until twenty-four minutes are up. Only the ski metres score.',
	},
	{
		id: '8b',
		file: scene(8),
		text: "So it's a pacing decision. A faster run gives you more time on the ski, but you arrive more tired. The book shows how to find the right balance for you.",
	},
	{
		id: '9',
		file: scene(9),
		text: "So why try it? Your fitness carries over. It gives the strength you've built a test of its own. You get three separate efforts with recovery in between, so you can give your best in each. And there's less running on the day. If you've been racing HYROX for a while, it's a different challenge that uses most of what you've already built.",
	},
	{id: '10a', file: scene(10), text: 'If you want to try it, the plan runs for twelve weeks.'},
	{
		id: '10b',
		file: scene(10),
		text: 'It adds the heavy lifting and the new MetCon movements to the kind of engine work you already do, with every day set out: the session, what to eat and drink, and how to recover.',
	},
	{
		id: '10c',
		file: scene(10),
		text: "It's in the ATHX 2027 books, in a men's and a women's edition, and in the HybridX app.",
	},
];

export const voById = Object.fromEntries(voScript.map((p) => [p.id, p])) as Record<VoId, VoParagraph>;

/** Words as spoken, for counting and for anchoring cues to a word. */
export const words = (text: string) =>
	text
		.split(/\s+/)
		.map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
		.filter(Boolean);

/** Natural read rate used to plan cuts before the recording exists. */
export const PLANNING_WPM = 150;
