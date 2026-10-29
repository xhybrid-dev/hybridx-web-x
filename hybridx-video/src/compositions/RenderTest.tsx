// Gate 0 render test: one second, in both aspect ratios. Exercises the fonts,
// the type scale, the plate, the easing tokens and an image from assets/, and
// shows the colour tokens as swatches. Not part of any video.

import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {easeEnter, easeLinear, motion} from '../easing';
import {athx, hyrox} from '../data/facts';
import {type Aspect, colour, css, layout, space, stroke, type} from '../tokens';

const Swatch = ({hex, name, note, aspect}: {hex: string; name: string; note: string; aspect: Aspect}) => (
	<div style={{display: 'flex', alignItems: 'center', gap: space(2)}}>
		<div style={{width: space(8), height: space(8), background: hex}} />
		<div>
			<div style={{...css(type[aspect].label), color: colour.text}}>{name}</div>
			<div style={{...css(type[aspect].small), color: colour.textMuted}}>
				{hex.toUpperCase()} {note}
			</div>
		</div>
	</div>
);

export const RenderTest = ({aspect}: {aspect: Aspect}) => {
	const frame = useCurrentFrame();
	const t = type[aspect];
	const {margin, width, height} = layout[aspect];
	const textIn = interpolate(frame, [0, motion.textIn.frames], [0, 1], {
		easing: easeEnter,
		extrapolateRight: 'clamp',
	});
	const rule = interpolate(frame, [6, 6 + motion.lineDraw.maxFrames - 6], [0, 1], {
		easing: easeLinear,
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const firstStation = hyrox.stations[0];
	const portrait = aspect === 'portrait';
	// Portrait text stays inside the Reels safe zone.
	const top = portrait ? layout.portrait.safeZone.y0 : margin;

	return (
		<AbsoluteFill style={{background: colour.bg, padding: `${top}px ${margin}px`, justifyContent: 'center'}}>
			<Img
				src={staticFile('brand/hybridx-logo-full-white.png')}
				style={{position: 'absolute', top, right: margin, width: portrait ? 240 : 200}}
			/>
			<div style={{opacity: textIn, transform: `translateY(${(1 - textIn) * motion.textIn.rise}px)`}}>
				<div style={{...css(t.display), color: colour.text}}>HYROX or ATHX?</div>
				<div style={{...css(t.label), color: colour.textMuted, marginTop: space(3)}}>
					How the two events compare
				</div>
			</div>
			<div
				style={{
					height: stroke.titleRule,
					width: (portrait ? 480 : 640) * rule,
					background: colour.accent,
					marginTop: space(4),
				}}
			/>
			<div style={{...css(t.table), color: colour.text, marginTop: space(8)}}>
				Inter 400 tabular: 0123456789 · {firstStation?.shortName} {firstStation?.amount.toLocaleString('en-GB')} m ·{' '}
				{athx.format.zoneCount} zones, {athx.clock.onTheClockMinutes} min on the clock
			</div>
			<div
				style={{
					display: 'flex',
					flexWrap: 'wrap',
					flexDirection: portrait ? 'column' : 'row',
					gap: space(portrait ? 4 : 6),
					marginTop: space(8),
				}}
			>
				<Swatch aspect={aspect} hex={colour.accent} name="accent" note="HybridX yellow" />
				<Swatch aspect={aspect} hex={colour.hyroxNeutral} name="hyroxNeutral" note="HYROX content" />
				<Swatch aspect={aspect} hex={colour.mens} name="mens" note="cut-outs only" />
				<Swatch aspect={aspect} hex={colour.womens} name="womens" note="cut-outs only" />
			</div>
			<div
				style={{
					...css(t.small),
					color: colour.textMuted,
					position: 'absolute',
					left: margin,
					bottom: portrait ? height - layout.portrait.safeZone.y1 : space(6),
				}}
			>
				Gate 0 render test · {width} x {height} · 25 fps · frame {frame}
			</div>
		</AbsoluteFill>
	);
};
