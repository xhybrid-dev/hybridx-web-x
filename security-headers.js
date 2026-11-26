// Security headers, applied by next.config.js to every response.
//
// These used to live in middleware.ts at the repository root. With the app in
// src/app, Next.js ignores a root middleware file, so the live site sent none
// of them (and the experiment and subdomain routing in it never ran). Headers
// set here are applied by Next to prerendered pages as well, so they also reach
// the CDN's cached copies.
//
// Plain CommonJS, because next.config.js loads it and a test imports it.

const isProduction = process.env.NODE_ENV === 'production';

/** Sent on every response. */
const globalHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // The directives that cannot break a page: no plugins, no <base> hijack, and
  // only this site may frame it. The full policy below is report-only.
  { key: 'Content-Security-Policy', value: "object-src 'none'; base-uri 'self'; frame-ancestors 'self'" },
  // One year, this host only. includeSubDomains and preload are deliberately
  // left off: train. (the mail sender) and app. are other services, and a
  // preload entry cannot be taken back quickly.
  ...(isProduction ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }] : []),
];

// The full policy, in report-only until /api/csp-report has shown a quiet week.
// Move it to Content-Security-Policy then, and keep the three directives above.
// 'unsafe-inline' stays for scripts because Next writes inline bootstrap
// scripts and nothing here issues nonces; there is no 'unsafe-eval' outside
// development.
const reportOnlyPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"} https://www.googletagmanager.com https://www.google-analytics.com https://app.ecwid.com https://*.ecwid.com https://*.cloudfront.net`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  // GA4 reports to region-specific hosts as well as googletagmanager.com.
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.ecwid.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
  "frame-src 'self' https://*.ecwid.com",
  "form-action 'self' https://checkout.stripe.com",
  'report-uri /api/csp-report',
].join('; ');

const reportOnlyHeader = { key: 'Content-Security-Policy-Report-Only', value: reportOnlyPolicy };

/** Pages whose address is itself a secret: the shop's download and thanks pages. */
const secretPageHeaders = [
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'Cache-Control', value: 'private, no-store' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
];

/** Where a shop event's thanks page lives. Keep in step with SHOP_EVENTS in src/lib/shop/config.ts (a test checks). */
const SECRET_PAGE_SOURCES = ['/d/:path*', '/hyrox-glasgow-2027/thanks'];

function buildHeaders() {
  return [
    { source: '/:path*', headers: [...globalHeaders, reportOnlyHeader] },
    // Later rules override earlier ones for the same header.
    ...SECRET_PAGE_SOURCES.map((source) => ({ source, headers: secretPageHeaders })),
    {
      // Gated lead magnets: keep the files out of search results so visitors
      // arrive via the page (and the email capture) rather than landing on a
      // bare file. Direct links still work for anyone we send one to.
      source: '/:path*.pdf',
      headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
    },
    {
      source: '/:path*.csv',
      headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
    },
  ];
}

module.exports = { buildHeaders, globalHeaders, reportOnlyPolicy, secretPageHeaders, SECRET_PAGE_SOURCES };
