// Motion tokens: VIDEO-PRODUCTION-SCOPE.md Section 4.4 and brief Part 2.6.
// Durations are in frames at 25 fps. Springs, bounce, overshoot and elastic
// curves are not used anywhere; every curve here stays inside [0, 1].

import {Easing} from 'remotion';

/** In-out cubic: moves that start and end at rest. */
export const easeStandard = Easing.bezier(0.65, 0, 0.35, 1);
/** Out quint: things arriving. */
export const easeEnter = Easing.bezier(0.22, 1, 0.36, 1);
/** In quint: things leaving. */
export const easeExit = Easing.bezier(0.64, 0, 0.78, 0);
/** Lines draw at a constant speed. */
export const easeLinear = Easing.linear;

export const motion = {
	/** Text in: fade from 0 and rise this many px. */
	textIn: {frames: 12, rise: 24},
	textOut: {frames: 10},
	/** Tables build row by row, this many frames apart. */
	rowStagger: 6,
	/** Numbers count up over this many frames and land exactly. */
	countUp: 20,
	/** Lines draw over 12 to 24 frames, scaled to their length within that range. */
	lineDraw: {minFrames: 12, maxFrames: 24},
	/** Dissolve between scenes. Straight cuts between shots within a scene. */
	sceneDissolve: 10,
	/** Slow push-in on cut-outs across the shot. */
	pushIn: {from: 1, to: 1.04},
	/** Cut-out reveal: rectangular mask wipe in the reading direction. */
	maskWipe: {minFrames: 12, maxFrames: 16},
	/** Hold every finished graphic at least this long before moving on (1.5 s). */
	minHoldFrames: 38,
} as const;
