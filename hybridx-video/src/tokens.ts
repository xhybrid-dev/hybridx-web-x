// HybridX design system for video: VIDEO-PRODUCTION-SCOPE.md Section 4, with the
// cut-out and diagram rules from Part 2 of VIDEO-BRIEF-HYROX-ATHX.md. Every
// component reads its colours, type, spacing and strokes from here, so a brand
// correction is a one-line change. Motion lives in easing.ts.

// ---------------------------------------------------------------------------
// Colour (scope 4.1, brief 2.2)
// ---------------------------------------------------------------------------

export const colour = {
	/** Graphic plates. */
	bg: '#1C1117',
	/** Title and end cards. */
	black: '#000000',
	/** Primary text: headings, key numbers. */
	text: '#FFFFFF',
	/** Secondary text: labels, sources, small print. */
	textMuted: 'rgba(255,255,255,0.6)',
	/** Table rules and hairlines. */
	rule: 'rgba(255,255,255,0.22)',
	/** Table header fill, card fill. */
	panel: 'rgba(255,255,255,0.06)',
	/**
	 * HybridX yellow. One highlight per shot at most.
	 *
	 * PENDING CONFIRMATION (Gate 0). The logo files hold no yellow: every logo in
	 * the website repo is #131313 on transparent. #FADB5C is the yellow hybridx.club
	 * uses throughout its CSS (globals.css, tailwind.config.ts, 39 uses); the
	 * brief's expected #C8FF00 appears nowhere. See EDIT-LOG.md.
	 */
	accent: '#FADB5C',
	/** HYROX content in the comparison video only. Never yellow. */
	hyroxNeutral: '#A3A3A3',
	/** Only as printed on Men's Edition cut-outs and covers. */
	mens: '#EA580C',
	/** Only as printed on Women's Edition cut-outs and covers. */
	womens: '#7C3AED',
	/** Emphasis band behind a line of a cut-out (brief 2.4). */
	highlightBand: 'rgba(255,255,255,0.10)',
	/** Cut-out drop shadow colour (brief 2.4). */
	shadow: 'rgba(0,0,0,0.35)',
} as const;

// ---------------------------------------------------------------------------
// Type (scope 4.2, brief 2.3)
// ---------------------------------------------------------------------------

export const font = {
	/** Headings and labels: Space Grotesk 500 and 700, all caps, tight tracking. */
	display: '"Space Grotesk", sans-serif',
	/** Sentences and data: Inter 400 and 600, tabular figures. */
	text: '"Inter", sans-serif',
} as const;

export const weight = {
	displayMedium: 500,
	displayBold: 700,
	textRegular: 400,
	textSemiBold: 600,
} as const;

export type Aspect = 'landscape' | 'portrait';

export type TypeStyle = {
	family: string;
	weight: number;
	/** px at the composition's native size (1920 x 1080 or 1080 x 1920). */
	size: number;
	/** CSS letter-spacing in em. */
	tracking: number;
	caps: boolean;
	tabular: boolean;
	lineHeight: number;
};

const style = (s: TypeStyle): TypeStyle => s;

/** Scope 4.2. Nothing on screen is smaller than `minSize` at 1080p. */
export const type: Record<Aspect, Record<'display' | 'heading' | 'label' | 'body' | 'table' | 'small', TypeStyle>> = {
	landscape: {
		display: style({family: font.display, weight: 700, size: 96, tracking: -0.01, caps: true, tabular: false, lineHeight: 1.0}),
		heading: style({family: font.display, weight: 700, size: 56, tracking: -0.01, caps: true, tabular: false, lineHeight: 1.05}),
		label: style({family: font.display, weight: 500, size: 22, tracking: 0.1, caps: true, tabular: false, lineHeight: 1.2}),
		body: style({family: font.text, weight: 600, size: 36, tracking: 0, caps: false, tabular: true, lineHeight: 1.3}),
		table: style({family: font.text, weight: 400, size: 28, tracking: 0, caps: false, tabular: true, lineHeight: 1.3}),
		small: style({family: font.text, weight: 400, size: 20, tracking: 0, caps: false, tabular: true, lineHeight: 1.4}),
	},
	portrait: {
		display: style({family: font.display, weight: 700, size: 84, tracking: -0.01, caps: true, tabular: false, lineHeight: 1.0}),
		heading: style({family: font.display, weight: 700, size: 52, tracking: -0.01, caps: true, tabular: false, lineHeight: 1.05}),
		label: style({family: font.display, weight: 500, size: 26, tracking: 0.1, caps: true, tabular: false, lineHeight: 1.2}),
		body: style({family: font.text, weight: 600, size: 48, tracking: 0, caps: false, tabular: true, lineHeight: 1.3}),
		table: style({family: font.text, weight: 400, size: 32, tracking: 0, caps: false, tabular: true, lineHeight: 1.3}),
		small: style({family: font.text, weight: 400, size: 24, tracking: 0, caps: false, tabular: true, lineHeight: 1.4}),
	},
};

export const minTextSize = 20;

/** Brief 2.3: on-screen sentences outside tables. */
export const maxWordsOnScreen = 8;

/** A TypeStyle as React inline CSS. */
export const css = (s: TypeStyle) =>
	({
		fontFamily: s.family,
		fontWeight: s.weight,
		fontSize: s.size,
		letterSpacing: `${s.tracking}em`,
		lineHeight: s.lineHeight,
		textTransform: s.caps ? 'uppercase' : 'none',
		fontVariantNumeric: s.tabular ? 'tabular-nums' : 'normal',
	}) as const;

// ---------------------------------------------------------------------------
// Layout (scope 4.3)
// ---------------------------------------------------------------------------

/** Spacing comes in steps of 8 px. */
export const space = (steps: number) => steps * 8;

export const layout = {
	landscape: {
		width: 1920,
		height: 1080,
		columns: 12,
		margin: 96,
		gutter: 24,
		/** Title-safe area as a fraction of the frame. */
		titleSafe: 0.9,
	},
	portrait: {
		width: 1080,
		height: 1920,
		columns: 6,
		margin: 60,
		gutter: 24,
		/** Reels safe zone: text sits only inside this box. */
		safeZone: {x0: 60, y0: 250, x1: 960, y1: 1480},
	},
} as const;

/** Left edge and width of a column span on the 12- or 6-column grid. */
export const grid = (aspect: Aspect, startCol: number, span: number) => {
	const g = layout[aspect];
	const colWidth = (g.width - 2 * g.margin - (g.columns - 1) * g.gutter) / g.columns;
	return {
		x: g.margin + startCol * (colWidth + g.gutter),
		width: span * colWidth + (span - 1) * g.gutter,
	};
};

// ---------------------------------------------------------------------------
// Lines and strokes (brief 2.4, 2.5)
// ---------------------------------------------------------------------------

export const stroke = {
	/** Table rules, hairlines. */
	hairline: 1,
	/** Diagram lines: race map, timelines, carry-over map, pictograms. */
	line: 2,
	/** Emphasis rule drawn under a line of a cut-out. */
	underline: 3,
	/** Rule under a title card. */
	titleRule: 4,
	/** Dash pattern for partial carry-over lines, in px. */
	dash: [10, 8] as const,
} as const;

/** Monoline equipment pictograms (brief 2.5). */
export const pictogram = {
	grid: 48,
	stroke: 2,
	lineCap: 'square',
	colour: colour.text,
} as const;

// ---------------------------------------------------------------------------
// Document cut-outs, "paper on black" (brief 2.4)
// ---------------------------------------------------------------------------

export const cutout = {
	/** Flat card, very soft shadow, no border or rounded corners. */
	shadow: `0 12px 32px ${colour.shadow}`,
	borderRadius: 0,
	maxTiltDeg: 2,
	/** Back layer moves at this fraction of the front layer's speed. */
	parallaxBack: 0.6,
	/** A whole page used as texture behind a headline. */
	textureOpacity: 0.3,
	/** Cut-outs are never scaled above the 300 dpi render's native size. */
	maxScale: 1,
	/** Render resolution of the source pages. */
	dpi: 300,
	/** Margin crop_cutouts.py keeps around each element, in px at 300 dpi. */
	trimMargin: 8,
} as const;
