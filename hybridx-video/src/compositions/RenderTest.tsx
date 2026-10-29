// Gate 0 render test: one second at 1920 x 1080. Exercises the fonts, the type
// scale, the plate and the easing tokens, and shows the two candidate yellows
// side by side for the brand decision. Not part of any video.

import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {easeEnter, easeLinear, motion} from '../easing';
import {athx, hyrox} from '../data/facts';
import {colour, css, layout, space, stroke, type} from '../tokens';

const t = type.landscape;
const {margin} = layout.landscape;

const Swatch = ({hex, name, note}: {hex: string; name: string; note: string}) => (
	<div style={{display: 'flex', alignItems: 'center', gap: space(2)}}>
		<div style={{width: space(8), height: space(8), background: hex}} />
		<div>
			<div style={{...css(t.label), color: colour.text}}>{name}</div>
			<div style={{...css(t.small), color: colour.textMuted}}>
				{hex.toUpperCase()} {note}
			</div>
		</div>
	</div>
);

export const RenderTest = () => {
	const frame = useCurrentFrame();
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

	return (
		<AbsoluteFill style={{background: colour.bg, padding: margin, justifyContent: 'center'}}>
			<div style={{opacity: textIn, transform: `translateY(${(1 - textIn) * motion.textIn.rise}px)`}}>
				<div style={{...css(t.display), color: colour.text}}>HYROX or ATHX?</div>
				<div style={{...css(t.label), color: colour.textMuted, marginTop: space(3)}}>
					How the two events compare
				</div>
			</div>
			<div
				style={{
					height: stroke.titleRule,
					width: 640 * rule,
					background: colour.accent,
					marginTop: space(4),
				}}
			/>
			<div style={{...css(t.table), color: colour.text, marginTop: space(8)}}>
				Inter 400 tabular: 0123456789 · {firstStation?.shortName} {firstStation?.amount.toLocaleString('en-GB')} m ·{' '}
				{athx.format.zoneCount} zones, {athx.clock.onTheClockMinutes} min on the clock
			</div>
			<div style={{display: 'flex', gap: space(6), marginTop: space(8)}}>
				<Swatch hex={colour.accent} name="accent (set)" note="hybridx.club CSS" />
				<Swatch hex="#C8FF00" name="brief expected" note="not in site or logos" />
				<Swatch hex={colour.hyroxNeutral} name="hyroxNeutral" note="HYROX content" />
				<Swatch hex={colour.mens} name="mens" note="cut-outs only" />
				<Swatch hex={colour.womens} name="womens" note="cut-outs only" />
			</div>
			<div style={{...css(t.small), color: colour.textMuted, position: 'absolute', left: margin, bottom: space(6)}}>
				Gate 0 render test · Space Grotesk 500/700 · Inter 400/600 · 1920 x 1080 · 25 fps · frame {frame}
			</div>
		</AbsoluteFill>
	);
};
