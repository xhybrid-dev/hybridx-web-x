import type { MetadataRoute } from 'next';

// The web app manifest: how the site appears if someone adds it to their home
// screen, and what browsers and crawlers read for its name and icons. It uses the
// icons already in this folder (icon.png is 512 x 512, apple-icon.png 180 x 180).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HybridX Hub',
    short_name: 'HybridX',
    description: 'Training plans, calculators, books and a coaching app for hybrid athletes.',
    start_url: '/',
    scope: '/',
    display: 'browser',
    background_color: '#ffffff',
    theme_color: '#000000',
    lang: 'en-GB',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
