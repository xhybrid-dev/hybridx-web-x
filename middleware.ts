
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { CONTROL_PATH, planFinderMode } from '@/lib/plan-finder/launch';

/*
 * The app subdomains — race., streak. and trail.hybridx.club — are this same
 * app. A subdomain's root is served from its page by rewrite (the address bar
 * keeps the subdomain), the page's own path on the subdomain folds back to its
 * root, and every other page on the subdomain goes to the same path on the
 * main site, so the rest of hybridx.club is never indexed twice. Static files,
 * /_next and /api are outside the matcher below and are served as they are on
 * any host.
 *
 * Matched on the first label, so http://streak.localhost:9002 works in
 * development exactly as the real subdomain does.
 */
const APP_SUBDOMAINS: Record<string, string> = {
  race: '/race',
  streak: '/streak',
  trail: '/trail',
};

function requestHost(request: NextRequest) {
  // App Hosting sits behind a proxy; the host the visitor typed is forwarded.
  const raw = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
  return raw.split(',')[0].trim().toLowerCase();
}

function routeAppSubdomain(request: NextRequest): NextResponse | null {
  const host = requestHost(request);
  const label = host.split('.')[0];
  const pagePath = Object.hasOwn(APP_SUBDOMAINS, label) ? APP_SUBDOMAINS[label] : undefined;
  if (!pagePath || !host.includes('.')) return null;

  const { pathname, search } = request.nextUrl;

  if (pathname === '/') {
    return NextResponse.rewrite(new URL(`${pagePath}${search}`, request.url));
  }

  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0].trim() ?? request.nextUrl.protocol.replace(':', '');

  if (pathname === pagePath || pathname === `${pagePath}/`) {
    return NextResponse.redirect(`${proto}://${host}/${search}`, 308);
  }

  const mainHost = host.slice(label.length + 1);
  return NextResponse.redirect(`${proto}://${mainHost}${pathname}${search}`, 308);
}

/*
 * The plan finder experiment (PLAN_FINDER_MODE=experiment): each page load of
 * the main site's "/" is served either the homepage with the plan finder in
 * front (arm A) or the homepage alone (control), at random, with no cookie.
 * Both answers must reach the visitor uncached: a shared cache in front of
 * this middleware would otherwise hand one arm to everybody.
 */
function routeExperiment(request: NextRequest): NextResponse | null {
  const { pathname, search } = request.nextUrl;
  // The control page is only ever reached through the rewrite below.
  if (pathname === CONTROL_PATH) return NextResponse.redirect(new URL('/' + search, request.url), 307);
  if (pathname !== '/' || planFinderMode() !== 'experiment') return null;
  const response = Math.random() < 0.5
    ? NextResponse.rewrite(new URL(CONTROL_PATH + search, request.url))
    : NextResponse.next();
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export function middleware(request: NextRequest) {
  // Clone the response to add headers
  const response = routeAppSubdomain(request) ?? routeExperiment(request) ?? NextResponse.next();

  const isDevelopment = process.env.NODE_ENV === 'development';

  // Security headers
  const headers = [
    { key: 'X-DNS-Prefetch-Control', value: 'on' },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-XSS-Protection', value: '1; mode=block' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' }
  ];

  // Conditionally add HSTS header only in production
  if (!isDevelopment) {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload'
    });
  }

  headers.forEach(({ key, value }) => {
    response.headers.set(key, value);
  });
  
  // Content-Security-Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://app.ecwid.com https://script.google.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: http:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.google-analytics.com https://www.google-analytics.com https://app.ecwid.com https://script.google.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
    "frame-src 'self' https://app.ecwid.com https://script.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://script.google.com",
    "frame-ancestors 'self' https://*.cloudworkstations.dev https://*.idx.google.com",
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
  ];

  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));

  return response;
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt (public files)
     * - and common image, video and asset extensions (and .gpx, for Trail's demo route)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.webp|.*\\.mp4|.*\\.webm|.*\\.gpx).*)',
  ],
};
