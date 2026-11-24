import localFont from 'next/font/local';

// X Weigh-in's type. Manrope, calm and even, for everything the page says;
// Spline Sans Mono, whose zero is a plain zero, for readings, axes and the log
// file; and Poppins only inside the drawn watch, because it is the watch's own
// face (the app's screens are set in Poppins Light 60, Regular 14 and 18,
// SemiBold 20, 25 and 40).
//
// Self-hosted from src/fonts, not next/font/google: on 24 November 2026 the
// deploy build failed on this file the way it did on /una and Trail on the
// 20th (src/fonts/README.md). Declared under prefixed names so the generated
// font families do not collide with the site's Google fonts.

const weighinManrope = localFont({
  src: '../../fonts/manrope-latin-variable.woff2',
  weight: '200 800',
  variable: '--font-weighin-manrope',
  display: 'swap',
  adjustFontFallback: false,
});

const weighinMono = localFont({
  src: '../../fonts/spline-sans-mono-latin-variable.woff2',
  weight: '300 700',
  variable: '--font-weighin-mono',
  display: 'swap',
  adjustFontFallback: false,
});

const weighinPoppins = localFont({
  src: [
    { path: '../../fonts/poppins-latin-300.woff2', weight: '300', style: 'normal' },
    { path: '../../fonts/poppins-latin-400.woff2', weight: '400', style: 'normal' },
    { path: '../../fonts/poppins-latin-600.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-weighin-watch',
  display: 'swap',
  adjustFontFallback: false,
});

export const manrope = weighinManrope;
export const splineMono = weighinMono;
export const watchPoppins = weighinPoppins;
