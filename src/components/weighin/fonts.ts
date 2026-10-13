import { Manrope, Poppins, Spline_Sans_Mono } from 'next/font/google';

// X Weigh-in's type. Manrope, calm and even, for everything the page says;
// Spline Sans Mono, whose zero is a plain zero, for readings, axes and the log
// file; and Poppins only inside the drawn watch, because it is the watch's own
// face (the app's screens are set in Poppins Light 60, Regular 14 and 18,
// SemiBold 20, 25 and 40).

export const manrope = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-weighin-manrope',
  display: 'swap',
});

export const splineMono = Spline_Sans_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-weighin-mono',
  display: 'swap',
});

export const watchPoppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  variable: '--font-weighin-watch',
  display: 'swap',
});
