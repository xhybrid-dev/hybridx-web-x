// src/lib/site-health/analyse.ts
//
// What a search engine would make of one page, read from its HTML and headers: pure, so the
// hourly job and the tests share it. It is the same set of checks as scripts/seo-crawl.mjs (which
// gates a release from a developer's machine); this one runs against the live site on a schedule
// and tells Jon when a page breaks, because the day a deploy turns a page noindex or drops its
// canonical, nobody is crawling it by hand.
//
// Two severities. An error is something that costs the page its place in search or sends a reader
// to a broken page. A warning is something to tidy: a title over 60 characters, a missing social
// image. Only errors send an email.

export type Severity = 'error' | 'warn';

export interface HealthIssue {
  code: string;
  severity: Severity;
  message: string;
}

export interface Headers {
  get(name: string): string | null;
}

export interface PageSnapshot {
  path: string;
  status: number;
  /** The Location header of a redirect. */
  location: string | null;
  headers: Headers;
  html: string;
}

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

function metaContent(html: string, name: string, attr: 'name' | 'property' = 'name'): string {
  const m = html.match(new RegExp(`<meta[^>]*${attr}="${name}"[^>]*content="([^"]*)"`, 'i')) || html.match(new RegExp(`<meta[^>]*content="([^"]*)"[^>]*${attr}="${name}"`, 'i'));
  return m ? decode(m[1]) : '';
}

const issue = (severity: Severity, code: string, message: string): HealthIssue => ({ severity, code, message });

/** `https://hybridx.club/` and `https://hybridx.club` are the same page. */
const sameUrl = (a: string, b: string) => a.replace(/\/$/, '') === b.replace(/\/$/, '');

/** A page the sitemap lists: it must be there, indexable, and say what it is. */
export function analyseIndexablePage(origin: string, snap: PageSnapshot): HealthIssue[] {
  const issues: HealthIssue[] = [];
  const { status, html, headers } = snap;

  if (status >= 300 && status < 400) {
    issues.push(issue('error', 'redirect', `Answers ${status} and redirects to ${snap.location ?? 'somewhere'}. A page in the sitemap should not redirect.`));
    return issues;
  }
  if (status !== 200) {
    issues.push(issue('error', 'status', `Answers ${status}.`));
    return issues;
  }

  const robots = [...html.matchAll(/<meta[^>]*name="robots"[^>]*content="([^"]*)"/gi)].map((m) => m[1]);
  if (robots.some((r) => /noindex/i.test(r)) || /noindex/i.test(headers.get('x-robots-tag') ?? '')) {
    issues.push(issue('error', 'noindex', 'Is marked noindex but is in the sitemap.'));
  }

  const titles = [...html.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/g)].map((m) => decode(m[1]).trim());
  if (titles.length === 0 || !titles[0]) issues.push(issue('error', 'title-missing', 'Has no <title>.'));
  else {
    if (titles.length > 1) issues.push(issue('warn', 'title-twice', `${titles.length} <title> tags.`));
    if (titles[0].length > 60) issues.push(issue('warn', 'title-long', `Title is ${titles[0].length} characters (60 or fewer shows in full).`));
  }

  const description = metaContent(html, 'description');
  if (!description) issues.push(issue('warn', 'description-missing', 'Has no meta description.'));
  else if (description.length < 70 || description.length > 160) issues.push(issue('warn', 'description-length', `Description is ${description.length} characters (70 to 160 reads best).`));

  const canonical = (html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/i) || [])[1] ?? '';
  const wanted = `${origin}${snap.path}`;
  if (!canonical) issues.push(issue('error', 'canonical-missing', 'Has no canonical URL.'));
  else if (!canonical.startsWith(origin)) issues.push(issue('error', 'canonical-offsite', `Canonical points off the site: ${canonical}`));
  else if (!sameUrl(canonical, wanted)) issues.push(issue('warn', 'canonical-other', `Canonical is ${canonical}, not this page.`));

  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) issues.push(issue('warn', 'h1', `Has ${h1s} <h1> elements (one is right).`));

  if (!metaContent(html, 'og:image', 'property')) issues.push(issue('warn', 'og-image', 'Has no social image (og:image).'));

  const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  if (blocks.length === 0) issues.push(issue('warn', 'jsonld-missing', 'Has no structured data in its HTML.'));
  for (const b of blocks) {
    try {
      JSON.parse(b);
    } catch {
      issues.push(issue('error', 'jsonld-invalid', 'A structured data block is not valid JSON, so search engines ignore it.'));
      break;
    }
  }
  return issues;
}

/* ── Checks about the site as a whole ───────────────────────────────────── */

export interface SiteTarget {
  id: string;
  label: string;
  url: (origin: string) => string;
  /** Do not follow redirects: the redirect is the thing being checked. */
  manualRedirect?: boolean;
  check: (r: { status: number; location: string | null; headers: Headers; body: string }, origin: string) => HealthIssue[];
}

const SECURITY_HEADERS = ['strict-transport-security', 'content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy'];

export const SITE_TARGETS: readonly SiteTarget[] = [
  {
    id: 'www',
    label: 'www.hybridx.club redirects to hybridx.club',
    url: () => 'https://www.hybridx.club/',
    manualRedirect: true,
    check: (r, origin) => {
      if (r.status !== 301 && r.status !== 308) return [issue('error', 'www', `www.hybridx.club answers ${r.status}, not a permanent redirect to ${origin}.`)];
      return r.location && sameUrl(r.location, origin) ? [] : [issue('error', 'www', `www.hybridx.club redirects to ${r.location}, not ${origin}.`)];
    },
  },
  {
    id: 'robots',
    label: 'robots.txt names the sitemap',
    url: (o) => `${o}/robots.txt`,
    check: (r) => (r.status !== 200 ? [issue('error', 'robots', `robots.txt answers ${r.status}.`)] : /^sitemap:\s*\S+/im.test(r.body) ? [] : [issue('error', 'robots', 'robots.txt has no Sitemap line.')]),
  },
  {
    id: 'sitemap',
    label: 'sitemap.xml lists the site',
    url: (o) => `${o}/sitemap.xml`,
    check: (r) => {
      if (r.status !== 200) return [issue('error', 'sitemap', `sitemap.xml answers ${r.status}.`)];
      const n = (r.body.match(/<loc>/g) || []).length;
      return n >= 20 ? [] : [issue('error', 'sitemap', `sitemap.xml lists only ${n} URLs.`)];
    },
  },
  {
    id: 'llms',
    label: 'llms.txt is served',
    url: (o) => `${o}/llms.txt`,
    check: (r) => (r.status === 200 && r.body.length > 200 ? [] : [issue('warn', 'llms', `llms.txt answers ${r.status} with ${r.body.length} characters.`)]),
  },
  {
    id: 'not-found',
    label: 'A missing page is a 404 and not indexed',
    url: (o) => `${o}/does-not-exist-404-check`,
    check: (r) => {
      if (r.status !== 404) return [issue('error', 'not-found', `A page that does not exist answers ${r.status}, not 404 (a "soft 404" wastes crawl budget and confuses indexing).`)];
      return /noindex/i.test(r.body) || /noindex/i.test(r.headers.get('x-robots-tag') ?? '') ? [] : [issue('warn', 'not-found', 'The 404 page is not marked noindex.')];
    },
  },
  {
    id: 'headers',
    label: 'The security headers are sent',
    url: (o) => `${o}/`,
    check: (r) => {
      const missing = SECURITY_HEADERS.filter((h) => !r.headers.get(h));
      const out: HealthIssue[] = missing.length ? [issue('error', 'headers', `The homepage is missing: ${missing.join(', ')}.`)] : [];
      if (r.headers.get('x-powered-by')) out.push(issue('warn', 'powered-by', 'x-powered-by is set; it tells a visitor what the site runs on.'));
      return out;
    },
  },
];

export function errorsOf(issues: readonly HealthIssue[]): HealthIssue[] {
  return issues.filter((i) => i.severity === 'error');
}
