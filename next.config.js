const { buildHeaders } = require('./security-headers');

/** @type {import('next').NextConfig} */

const nextConfig = {
  // ✅ ENABLED: Catch TypeScript errors during build
  typescript: {
    ignoreBuildErrors: false,
  },
  // The race day card is served from /private (outside /public) so it can only
  // be reached with a signed token. Nothing imports it, so file tracing cannot
  // infer it — the download route needs it declared explicitly or the file is
  // missing from the deployed bundle.
  outputFileTracingIncludes: {
    '/api/race-card/download': ['./private/**'],
  },
  // The shop's full PDFs are kept locally in private/shop-source/ for upload
  // to Storage. Tracing would otherwise bundle them alongside the free magnet
  // files in private/ whenever a build runs on a machine that has them.
  outputFileTracingExcludes: {
    '*': ['./private/shop-source/**'],
  },
  // Every response gets the security headers; see security-headers.js.
  poweredByHeader: false,
  async headers() {
    return [
      ...buildHeaders(),
      // The guides are read from Firestore on request. Without this each view waited for
      // Firestore (430 to 1,040 ms, against 13 to 26 ms for a built page) on a single
      // instance. Five minutes at the CDN keeps that to one read in five minutes per page,
      // and is how late a scheduled article, an edit or a retirement can show.
      {
        source: '/guides',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' }],
      },
      {
        source: '/guides/:slug',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' }],
      },
    ];
  },
  async redirects() {
    return [
      // www.hybridx.club is bound to the same backend (25 November 2026). Without this the
      // site answers on two hostnames and every page is a duplicate of itself: one
      // permanent redirect keeps a single address for each page and for its links.
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.hybridx.club' }],
        destination: 'https://hybridx.club/:path*',
        permanent: true,
      },
      // Old long-form sales page — duplicated /free-hyrox-plan and split
      // ranking signals for "hyrox training plan" across three URLs.
      {
        source: '/hyrox-domination',
        destination: '/free-hyrox-plan',
        permanent: true,
      },
      // The abandoned Google Apps Script embed of the 12-week plan. It was noindex and
      // unlinked; the plan generator is the page for it.
      {
        source: '/12-week-hyrox',
        destination: '/free-hyrox-plan',
        permanent: true,
      },
      // The logo's file name had a space in it, which structured data cannot carry
      // as a plain URL. It was renamed; the old address still works.
      {
        source: '/Icon Logo.png',
        destination: '/icon-logo.png',
        permanent: true,
      },
      // The plan finder experiment's control arm. The experiment is over (the
      // plan finder is on for everyone), and the page must not be a second,
      // indexable copy of the homepage.
      {
        source: '/home-control',
        destination: '/',
        permanent: true,
      },
      // Legacy "early access" waitlist page — the app is live; /app is the
      // marketing page and app.hybridx.club is the product.
      {
        source: '/sign-up',
        destination: '/app',
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
        port: '',
        pathname: '/**',
      }
    ],
    // Performance: Enable image optimization
    formats: ['image/webp', 'image/avif'],
  },
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
};

module.exports = nextConfig;
