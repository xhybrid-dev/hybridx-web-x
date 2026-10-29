// Local font files only, never a font CDN (scope 1.2). The variable fonts are the
// Google Fonts builds that hybridx.club serves, so the video and the site set type
// identically; they cover the scope's four weights (Space Grotesk 500/700, Inter
// 400/600). loadFont holds the render until the files have loaded.

import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

export const fontsLoaded = Promise.all([
	loadFont({
		family: 'Space Grotesk',
		url: staticFile('fonts/SpaceGrotesk-Variable.ttf'),
		weight: '300 700',
		format: 'truetype',
	}),
	loadFont({
		family: 'Inter',
		url: staticFile('fonts/Inter-Variable.ttf'),
		weight: '100 900',
		format: 'truetype',
	}),
]);
