// src/lib/app-links.ts
//
// Links into the app (app.hybridx.club), and the `src` they carry so a
// sign-up there can be credited to the article, tool or page that sent it
// (docs/content-engine-plan.md, step 11 and section 7.3).
//
// The app records the src of a visitor's first landing on the user it
// creates (`acquisitionSrc`) and reports sign-ups, trials and paying users per
// src back over the bridge (getAppSignupsBySrc in marketing-bridge.ts), which
// /admin/guides/performance shows next to clicks and leads.
//
// Why a src and not UTM tags: UTM tags on links between our own two domains
// would start a new GA4 session as if from a campaign (GA4's linker already
// joins the two sites), and the app would count them as email campaigns,
// whose report keys on utm_campaign.
//
// The shapes:
//   guide-<slug>   an article (guideSrc), carried by /api/guides/out
//   page-<path>    any other page: its path, slashes as hyphens
//
// The app declares the same rule in its src/lib/acquisition-src.ts. The two
// are pinned together by src/lib/__tests__/cross-repo-agreement.test.ts here
// and src/lib/__tests__/acquisition-src.test.ts there.

// Imported by client components (TrackedLink): nothing here may reach the
// server-only module graph, so the product facts come from their own file.
import { APP } from '@/lib/facts/product';

export const SRC_PARAM = 'src';
/** Lowercase letters, digits and single hyphens, at most 90 characters. */
export const SRC_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SRC_MAX_LENGTH = 90;

/** The src an article carries: on its call-to-action and tool links, and so on a lead or app sign-up from it. */
export const guideSrc = (slug: string) => `guide-${slug}`;

/** A src as the app will accept it, or undefined. */
export function parseSrc(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  return v.length <= SRC_MAX_LENGTH && SRC_PATTERN.test(v) ? v : undefined;
}

/** The src naming a page on this site: guide-<slug> for an article, page-<path> otherwise. */
export function pageSrc(pathname: string): string {
  const article = /^\/guides\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(pathname);
  if (article) return parseSrc(guideSrc(article[1])) ?? 'page-guides';
  const words = pathname
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `page-${words || 'home'}`.slice(0, SRC_MAX_LENGTH).replace(/-+$/, '');
}

/**
 * The src for a link into the app from the page the visitor is on: the src
 * that brought them here, when it is one of ours (an article's call to action
 * lands on /app?src=guide-<slug>), otherwise this page's own.
 */
export function srcForPage(search: string, pathname: string): string {
  return parseSrc(new URLSearchParams(search).get(SRC_PARAM)) ?? pageSrc(pathname);
}

/** Whether an href points into the app. */
export function isAppHref(href: string): boolean {
  return href === APP.url || href.startsWith(`${APP.url}/`) || href.startsWith(`${APP.url}?`);
}

/** An href into the app with a src added, unless it already carries one. */
export function withSrc(href: string, src: string): string {
  const url = new URL(href);
  if (!url.searchParams.has(SRC_PARAM)) url.searchParams.set(SRC_PARAM, src);
  return url.toString();
}

/** Where a trial starts. The app's own landing page repeats /app, so a sign-up link skips it. */
export const APP_SIGNUP_URL = `${APP.url}/signup`;

const KEPT = [SRC_PARAM, 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

/**
 * A tool's own query string, with the visitor's src and UTM tags kept. The
 * calculators rewrite the address bar as answers change (so a result can be
 * shared); without this the rewrite dropped src=guide-<slug>, and a sign-up
 * after the first change was no longer credited to the article.
 */
export function withTracking(query: string, currentSearch: string): string {
  const next = new URLSearchParams(query);
  const current = new URLSearchParams(currentSearch);
  for (const key of KEPT) {
    const value = current.get(key);
    if (value && !next.has(key)) next.set(key, value);
  }
  return next.toString();
}
