import { Press_Start_2P } from 'next/font/google';

// Trail Quest's type: Press Start 2P, the face the game itself uses on the
// watch, for the headings, labels and the playable duel. Body text stays in the
// site's Inter, because a whole paragraph in a pixel face is hard to read.

export const pixel = Press_Start_2P({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-tq-pixel',
  display: 'swap',
});
