import localFont from 'next/font/local';

// Trail's type, as the promo films set it: Poppins (the watch's own face) for
// everything big, JetBrains Mono for the small technical labels. Declared once
// here so the page and its canvases share one font face each.
//
// Self-hosted from src/fonts, not next/font/google, for the reason in
// src/fonts/README.md. Declared under prefixed names so the generated font
// family does not collide with the site's Google `Poppins`.

const trailPoppins = localFont({
  src: [
    { path: '../../fonts/poppins-latin-300.woff2', weight: '300', style: 'normal' },
    { path: '../../fonts/poppins-latin-400.woff2', weight: '400', style: 'normal' },
    { path: '../../fonts/poppins-latin-500.woff2', weight: '500', style: 'normal' },
    { path: '../../fonts/poppins-latin-600.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-trail-poppins',
  display: 'swap',
  adjustFontFallback: false,
});

const trailMono = localFont({
  src: '../../fonts/jetbrains-mono-latin-variable.woff2',
  weight: '100 800',
  variable: '--font-trail-mono',
  display: 'swap',
  adjustFontFallback: false,
});

export const poppins = trailPoppins;
export const mono = trailMono;
