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
  async headers() {
    return [
      {
        // Gated lead magnets: keep the PDFs out of search results so visitors
        // arrive via the page (and the email capture) rather than landing on a
        // bare file. Direct links still work for anyone we send one to.
        source: '/:path*.pdf',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
      },
    ];
  },
  async redirects() {
    return [
      // Old long-form sales page — duplicated /free-hyrox-plan and split
      // ranking signals for "hyrox training plan" across three URLs.
      {
        source: '/hyrox-domination',
        destination: '/free-hyrox-plan',
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
