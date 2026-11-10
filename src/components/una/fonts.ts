import { Anton, Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';

// The X family's type. On /una: Space Grotesk for headlines, Inter for
// everything read. /una/nerdy-bits adds Anton and a mono for its formulas.

export const anton = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-una-display',
  display: 'swap',
});

export const grotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-una-text',
  display: 'swap',
});

export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-una-body',
  display: 'swap',
});

export const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-una-mono',
  display: 'swap',
});
