import localFont from 'next/font/local';

// The X family's type. On /una: Space Grotesk for headlines, Inter for
// everything read. /una/nerdy-bits adds Anton and a mono for its formulas.
//
// Self-hosted from src/fonts (latin subset, SIL OFL), not next/font/google:
// on 20 November 2026 the deploy build failed because Google returned a font
// URL with no file extension and Next's loader crashed on it. See
// src/fonts/README.md.
//
// next/font/local names each font family after its variable, and CSS family
// names are case-insensitive, so these are declared under prefixed names
// (`unaInter`, not `inter`) to stay clear of the site's Google `Inter`.

const unaAnton = localFont({
  src: '../../fonts/anton-latin-400.woff2',
  weight: '400',
  variable: '--font-una-display',
  display: 'swap',
  adjustFontFallback: false,
});

const unaGrotesk = localFont({
  src: '../../fonts/space-grotesk-latin-variable.woff2',
  weight: '300 700',
  variable: '--font-una-text',
  display: 'swap',
  adjustFontFallback: false,
});

const unaInter = localFont({
  src: '../../fonts/inter-latin-variable.woff2',
  weight: '100 900',
  variable: '--font-una-body',
  display: 'swap',
  adjustFontFallback: false,
});

const unaMono = localFont({
  src: '../../fonts/jetbrains-mono-latin-variable.woff2',
  weight: '100 800',
  variable: '--font-una-mono',
  display: 'swap',
  adjustFontFallback: false,
});

export const anton = unaAnton;
export const grotesk = unaGrotesk;
export const inter = unaInter;
export const mono = unaMono;
