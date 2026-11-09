import { Anton, JetBrains_Mono, Space_Grotesk } from 'next/font/google';

// The X family's type, as its store art sets it: Anton for the one big
// uppercase phrase, Space Grotesk for everything read, and a mono for the
// numbers the apps pass each other.

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

export const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-una-mono',
  display: 'swap',
});
