import { JetBrains_Mono, Poppins } from 'next/font/google';

// Trail's type, as the promo films set it: Poppins (the watch's own face) for
// everything big, JetBrains Mono for the small technical labels. Declared once
// here so the page and its canvases share one font face each.

export const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-trail-poppins',
  display: 'swap',
});

export const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-trail-mono',
  display: 'swap',
});
