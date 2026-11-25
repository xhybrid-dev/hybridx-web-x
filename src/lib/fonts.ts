import localFont from 'next/font/local';

// The site's typefaces, self-hosted from src/fonts (latin subset, SIL OFL).
//
// They were next/font/google, which downloads each file at build time and reads
// the extension off the URL Google returns. On 20 and 24 November 2026 App Hosting's
// build got a URL with no extension back and died with "Cannot read properties of
// null (reading '1')", and a local build can pass while the deploy fails, because
// the answer varies by where it is asked. Three files had already moved; these are
// the rest, including the root layout, whose failure takes the whole site down.
// See src/fonts/README.md for how to add or refresh a file.
//
// next/font/local names each family after its variable, and CSS family names are
// case-insensitive, so a font that another module also declares must have its own
// variable name (the X family's are `--font-una-*`, Trail's `--font-trail-*`).
//
// adjustFontFallback is on where Next can match a system face ('Arial' for sans,
// 'Times New Roman' for serif): the fallback is sized to the web font's metrics,
// so the page does not jump when the font arrives. It was off everywhere.

/** The site's body face. 100 to 900 in one file. */
export const inter = localFont({
  src: '../fonts/inter-latin-variable.woff2',
  weight: '100 900',
  variable: '--font-inter',
  display: 'swap',
  adjustFontFallback: 'Arial',
});

/** The site's headline face. */
export const spaceGrotesk = localFont({
  src: '../fonts/space-grotesk-latin-variable.woff2',
  weight: '300 700',
  variable: '--font-space-grotesk',
  display: 'swap',
  adjustFontFallback: 'Arial',
});

/** "Build a Bigger Engine" funnel: a condensed display face and a grotesque for labels. */
export const anton = localFont({
  src: '../fonts/anton-latin-400.woff2',
  weight: '400',
  variable: '--font-anton',
  display: 'swap',
  adjustFontFallback: 'Arial',
});

export const archivo = localFont({
  src: '../fonts/archivo-latin-variable.woff2',
  weight: '100 900',
  variable: '--font-archivo',
  display: 'swap',
  adjustFontFallback: 'Arial',
});

/** /streak: an editorial serif for headlines and a mono for trail-map labels. */
export const fraunces = localFont({
  src: '../fonts/fraunces-latin-variable.woff2',
  weight: '100 900',
  variable: '--font-fraunces',
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
});

export const plexMono = localFont({
  src: [
    { path: '../fonts/ibm-plex-mono-latin-500.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/ibm-plex-mono-latin-600.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-plex-mono',
  display: 'swap',
  adjustFontFallback: false,
});

/** Trail Quest: the pixel face the game uses on the watch. */
export const pixel = localFont({
  src: '../fonts/press-start-2p-latin-400.woff2',
  weight: '400',
  variable: '--font-tq-pixel',
  display: 'swap',
  adjustFontFallback: false,
});

/** The watch's own face, for the watch artwork on /race and /streak (the face only). */
export const watchPoppins = localFont({
  src: [
    { path: '../fonts/poppins-latin-400.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/poppins-latin-600.woff2', weight: '600', style: 'normal' },
    { path: '../fonts/poppins-latin-400-italic.woff2', weight: '400', style: 'italic' },
    { path: '../fonts/poppins-latin-600-italic.woff2', weight: '600', style: 'italic' },
  ],
  variable: '--font-watch-poppins',
  display: 'swap',
  adjustFontFallback: false,
});
