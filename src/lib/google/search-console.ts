// src/lib/google/search-console.ts
//
// Search Console, read by the server (docs/content-engine-plan.md, step 6 and
// section 4.4). Three read-only calls: search analytics (query × page), URL
// inspection, and the list of properties the account can see.
//
// The identity is the App Hosting backend's own service account, through
// Application Default Credentials: no key exists anywhere. It is added to the
// property as a Restricted user, so it cannot change anything in Search
// Console whatever this code does; the scope asked for is read-only too.
//
// The network and the token are passed in (SearchConsoleDeps), so the paging
// and the error handling are tested without Google.

import { GoogleAuth } from 'google-auth-library';

export const SC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const API = 'https://searchconsole.googleapis.com';
/** The most rows Search Console returns per request. */
export const PAGE_ROWS = 25_000;
/** A ceiling on rows per harvest, far above what this site gets. */
const MAX_ROWS = 100_000;

/** The property: a Domain property unless SEARCH_CONSOLE_SITE says otherwise. */
export function searchConsoleSite(): string {
  return process.env.SEARCH_CONSOLE_SITE?.trim() || 'sc-domain:hybridx.club';
}

export interface ScRow {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface Inspection {
  url: string;
  /** PASS means indexed. */
  verdict: string;
  coverageState?: string;
  lastCrawlTime?: string;
  googleCanonical?: string;
}

export interface SearchConsoleDeps {
  fetch: typeof fetch;
  token(): Promise<string>;
}

export class SearchConsoleError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

/** What to tell Jon about a failed call, from Google's status. */
export function explain(status: number | undefined, googleMessage: string): string {
  if (status === 403 && /has not been used|is disabled|SERVICE_DISABLED/i.test(googleMessage)) {
    return 'The Search Console API is not enabled in the hybridx-hub project.';
  }
  if (status === 403) return "The site's service account has no access to this Search Console property: add it as a Restricted user.";
  if (status === 401) return 'The service account could not get a Search Console token.';
  if (status === 404) return 'Search Console does not know that property. Check SEARCH_CONSOLE_SITE.';
  if (status === 429) return 'Search Console asked us to slow down. The next run will try again.';
  return googleMessage || `Search Console answered ${status ?? 'with an error'}.`;
}

let auth: GoogleAuth | null = null;

/** The live dependencies: global fetch and a read-only token from the runtime's identity. */
export const liveSearchConsole: SearchConsoleDeps = {
  fetch: (...args) => fetch(...args),
  async token() {
    auth ??= new GoogleAuth({ scopes: [SC_SCOPE] });
    const token = await auth.getAccessToken();
    if (!token) throw new SearchConsoleError('No access token from the runtime identity', 401);
    return token;
  },
};

/** The service account's email, for the diagnostic. Null when it cannot be read. */
export async function identity(): Promise<string | null> {
  try {
    auth ??= new GoogleAuth({ scopes: [SC_SCOPE] });
    return (await auth.getCredentials()).client_email ?? null;
  } catch {
    return null;
  }
}

async function call<T>(deps: SearchConsoleDeps, method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const response = await deps.fetch(`${API}${path}`, {
    method,
    headers: { authorization: `Bearer ${await deps.token()}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    let googleMessage = text.slice(0, 300);
    try {
      googleMessage = (JSON.parse(text) as { error?: { message?: string } }).error?.message ?? googleMessage;
    } catch {
      // not JSON: keep the text
    }
    throw new SearchConsoleError(explain(response.status, googleMessage), response.status);
  }
  return (await response.json()) as T;
}

const sitePath = (site: string) => `/webmasters/v3/sites/${encodeURIComponent(site)}`;

/** Every query × page row in the window, page by page. */
export async function searchAnalytics(
  deps: SearchConsoleDeps,
  site: string,
  window: { startDate: string; endDate: string },
): Promise<ScRow[]> {
  const rows: ScRow[] = [];
  for (let startRow = 0; startRow < MAX_ROWS; startRow += PAGE_ROWS) {
    const page = await call<{ rows?: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }[] }>(
      deps,
      'POST',
      `${sitePath(site)}/searchAnalytics/query`,
      { ...window, dimensions: ['query', 'page'], type: 'web', rowLimit: PAGE_ROWS, startRow },
    );
    for (const r of page.rows ?? []) {
      rows.push({ query: r.keys[0], page: r.keys[1], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position });
    }
    if ((page.rows?.length ?? 0) < PAGE_ROWS) break;
  }
  return rows;
}

/** Whether Google has indexed one URL. Reports only: it never asks Google to index. */
export async function inspectUrl(deps: SearchConsoleDeps, site: string, url: string): Promise<Inspection> {
  const result = await call<{
    inspectionResult?: { indexStatusResult?: { verdict?: string; coverageState?: string; lastCrawlTime?: string; googleCanonical?: string } };
  }>(deps, 'POST', '/v1/urlInspection/index:inspect', { inspectionUrl: url, siteUrl: site, languageCode: 'en-GB' });
  const s = result.inspectionResult?.indexStatusResult ?? {};
  return { url, verdict: s.verdict ?? 'VERDICT_UNSPECIFIED', coverageState: s.coverageState, lastCrawlTime: s.lastCrawlTime, googleCanonical: s.googleCanonical };
}

/** The properties the account can see, with its permission on each. */
export async function listSites(deps: SearchConsoleDeps): Promise<{ siteUrl: string; permissionLevel: string }[]> {
  return (await call<{ siteEntry?: { siteUrl: string; permissionLevel: string }[] }>(deps, 'GET', '/webmasters/v3/sites')).siteEntry ?? [];
}

const day = (d: Date) => d.toISOString().slice(0, 10);

/** The 28 days ending three days ago: Search Console's data takes about that long to settle. */
export function harvestWindow(now: Date): { startDate: string; endDate: string } {
  const end = new Date(now.getTime() - 3 * 86_400_000);
  const start = new Date(end.getTime() - 27 * 86_400_000);
  return { startDate: day(start), endDate: day(end) };
}
