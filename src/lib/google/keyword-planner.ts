// src/lib/google/keyword-planner.ts
//
// Keyword Planner volumes, read by the server (docs/content-engine-plan.md,
// step 10 and section 4.4): how many people search for a phrase each month in
// the UK, in English, including for topics the site does not rank for yet.
// Search Console only sees searches that already found us; this sees demand.
//
// One call, KeywordPlanIdeaService.GenerateKeywordHistoricalMetrics, over REST.
// It reads only: it creates no campaign, spends nothing, and the Ads account it
// runs under should have no campaigns or billing.
//
// Off until every credential below exists. The secrets are created and granted
// first, then bound in apphosting.yaml (CLAUDE.md, "Deploy gotchas"):
//   GOOGLE_ADS_DEVELOPER_TOKEN   secret: from the Ads account's API Center
//   GOOGLE_ADS_CLIENT_SECRET     secret: the OAuth client's secret
//   GOOGLE_ADS_REFRESH_TOKEN     secret: from scripts/google-ads-auth.ts
//   GOOGLE_ADS_CLIENT_ID         plain: the OAuth client's id
//   GOOGLE_ADS_CUSTOMER_ID       plain: the Ads account, 10 digits
//   GOOGLE_ADS_LOGIN_CUSTOMER_ID plain, optional: the manager account, if
//                                the access comes through one
//
// The network is passed in (KeywordPlannerDeps), so the request, the paging of
// errors and the parsing are tested without Google.

/**
 * Google retires Ads API versions on a schedule (about a year each). v26 was
 * released on 14 October 2026; its sunset is expected around November 2027.
 * When a call starts failing with "version deprecated", bump this, run the
 * tests, and check /api/admin/keyword-planner-check.
 */
export const ADS_API_VERSION = 'v26';

/** United Kingdom. */
export const GEO_UK = 'geoTargetConstants/2826';
/** English. */
export const LANGUAGE_EN = 'languageConstants/1000';
/** Keywords per request: Google allows 10,000; we never need many. */
export const MAX_KEYWORDS = 1000;

export interface AdsConfig {
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  /** Digits only. */
  customerId: string;
  loginCustomerId?: string;
}

const REQUIRED = {
  developerToken: 'GOOGLE_ADS_DEVELOPER_TOKEN',
  clientId: 'GOOGLE_ADS_CLIENT_ID',
  clientSecret: 'GOOGLE_ADS_CLIENT_SECRET',
  refreshToken: 'GOOGLE_ADS_REFRESH_TOKEN',
  customerId: 'GOOGLE_ADS_CUSTOMER_ID',
} as const;

const digits = (s: string | undefined) => (s ?? '').replace(/\D/g, '');

/** The credentials, or the names of the ones that are missing. Never the values. */
export function adsConfig(env: Record<string, string | undefined> = process.env): { ok: true; config: AdsConfig } | { ok: false; missing: string[] } {
  const missing: string[] = Object.values(REQUIRED).filter((name) => !env[name]?.trim());
  const customerId = digits(env.GOOGLE_ADS_CUSTOMER_ID);
  if (env.GOOGLE_ADS_CUSTOMER_ID?.trim() && customerId.length !== 10) missing.push('GOOGLE_ADS_CUSTOMER_ID (10 digits)');
  if (missing.length) return { ok: false, missing };
  const login = digits(env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);
  return {
    ok: true,
    config: {
      developerToken: env.GOOGLE_ADS_DEVELOPER_TOKEN!.trim(),
      clientId: env.GOOGLE_ADS_CLIENT_ID!.trim(),
      clientSecret: env.GOOGLE_ADS_CLIENT_SECRET!.trim(),
      refreshToken: env.GOOGLE_ADS_REFRESH_TOKEN!.trim(),
      customerId,
      ...(login ? { loginCustomerId: login } : {}),
    },
  };
}

export interface KeywordPlannerDeps {
  fetch: typeof fetch;
}

export const liveKeywordPlanner: KeywordPlannerDeps = { fetch: (...args) => fetch(...args) };

export class KeywordPlannerError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

/** What to do about a failure, from Google's error code. */
export function explainAds(code: string | undefined, googleMessage: string): string {
  switch (code) {
    case 'invalid_grant':
      return 'The refresh token was refused: it has expired or been revoked. If the OAuth consent screen is in "Testing", Google expires it after seven days; set it to "In production" and run scripts/google-ads-auth.ts again.';
    case 'invalid_client':
    case 'unauthorized_client':
      return 'The OAuth client id or secret was refused. Check GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET match the client the refresh token was made with.';
    case 'DEVELOPER_TOKEN_NOT_APPROVED':
      return 'The developer token only has Test access, which cannot read real accounts. Apply for Basic access in the Ads API Center.';
    case 'DEVELOPER_TOKEN_PROHIBITED':
    case 'DEVELOPER_TOKEN_INVALID':
      return 'The developer token was refused. Copy it again from the Ads API Center into GOOGLE_ADS_DEVELOPER_TOKEN.';
    case 'USER_PERMISSION_DENIED':
      return 'The signed-in Google user cannot reach that Ads account. If access comes through a manager account, set GOOGLE_ADS_LOGIN_CUSTOMER_ID to it.';
    case 'CUSTOMER_NOT_ENABLED':
    case 'CUSTOMER_NOT_FOUND':
      return 'Google does not know that Ads account, or it is not enabled. Check GOOGLE_ADS_CUSTOMER_ID.';
    case 'RESOURCE_EXHAUSTED':
    case 'RESOURCE_TEMPORARILY_EXHAUSTED':
      return 'Google asked us to slow down. The next run will try again.';
    case 'UNSUPPORTED_VERSION':
    case 'VERSION_DEPRECATED':
      return `Ads API ${ADS_API_VERSION} is retired. Bump ADS_API_VERSION in src/lib/google/keyword-planner.ts.`;
    default:
      return googleMessage || 'Keyword Planner answered with an error.';
  }
}

/** A fresh access token from the refresh token. */
export async function accessToken(deps: KeywordPlannerDeps, config: AdsConfig): Promise<string> {
  const response = await deps.fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
    }).toString(),
  });
  const body = (await response.json().catch(() => ({}))) as { access_token?: string; error?: string; error_description?: string };
  if (!response.ok || !body.access_token) throw new KeywordPlannerError(explainAds(body.error, body.error_description ?? ''), body.error);
  return body.access_token;
}

/**
 * A phrase Keyword Planner accepts: lower case, letters, digits and spaces, at
 * most ten words and 80 characters. Anything else it refuses for the whole
 * request.
 */
export function asKeyword(text: string): string {
  const words = text
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 10);
  let out = words.join(' ');
  while (out.length > 80) out = out.slice(0, out.lastIndexOf(' '));
  return out;
}

const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

export interface KeywordVolume {
  keyword: string;
  /** Average monthly searches over the last twelve months. */
  avgMonthly: number;
  /** Month by month, oldest first. */
  months: { year: number; month: number; searches: number }[];
  /** Average of the latest three months: a season's peak or trough shows here. */
  recent: number;
}

interface RawResult {
  text?: string;
  closeVariants?: string[];
  keywordMetrics?: {
    avgMonthlySearches?: string | number;
    monthlySearchVolumes?: { year?: number | string; month?: string; monthlySearches?: string | number }[];
  };
}

/** Parses one result. int64 fields arrive as strings in JSON. */
export function parseVolume(r: RawResult): KeywordVolume | null {
  if (!r.text) return null;
  const months = (r.keywordMetrics?.monthlySearchVolumes ?? [])
    .map((m) => ({ year: Number(m.year), month: MONTHS.indexOf(m.month ?? '') + 1, searches: Number(m.monthlySearches ?? 0) }))
    .filter((m) => m.year > 0 && m.month > 0)
    .sort((a, b) => a.year - b.year || a.month - b.month);
  const last3 = months.slice(-3);
  return {
    keyword: r.text,
    avgMonthly: Number(r.keywordMetrics?.avgMonthlySearches ?? 0),
    months,
    recent: last3.length ? Math.round(last3.reduce((n, m) => n + m.searches, 0) / last3.length) : 0,
  };
}

/** Monthly UK search volumes for up to MAX_KEYWORDS phrases. */
export async function historicalMetrics(deps: KeywordPlannerDeps, config: AdsConfig, keywords: string[]): Promise<KeywordVolume[]> {
  const unique = [...new Set(keywords.map(asKeyword).filter(Boolean))].slice(0, MAX_KEYWORDS);
  if (!unique.length) return [];
  const token = await accessToken(deps, config);
  const response = await deps.fetch(
    `https://googleads.googleapis.com/${ADS_API_VERSION}/customers/${config.customerId}:generateKeywordHistoricalMetrics`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'developer-token': config.developerToken,
        'content-type': 'application/json',
        ...(config.loginCustomerId ? { 'login-customer-id': config.loginCustomerId } : {}),
      },
      body: JSON.stringify({
        keywords: unique,
        language: LANGUAGE_EN,
        geoTargetConstants: [GEO_UK],
        keywordPlanNetwork: 'GOOGLE_SEARCH',
        includeAdultKeywords: false,
      }),
    },
  );
  const text = await response.text();
  if (!response.ok) {
    let code: string | undefined;
    let googleMessage = text.slice(0, 300);
    try {
      const err = (JSON.parse(text) as {
        error?: { status?: string; message?: string; details?: { errors?: { errorCode?: Record<string, string>; message?: string }[] }[] };
      }).error;
      const first = err?.details?.flatMap((d) => d.errors ?? [])[0];
      code = first?.errorCode ? Object.values(first.errorCode)[0] : err?.status;
      googleMessage = first?.message ?? err?.message ?? googleMessage;
    } catch {
      // not JSON: keep the text
    }
    throw new KeywordPlannerError(explainAds(code, googleMessage), code);
  }
  const body = JSON.parse(text) as { results?: RawResult[] };
  return (body.results ?? []).map(parseVolume).filter((v): v is KeywordVolume => v !== null);
}

/* ── Phrases for a topic ────────────────────────────────────────────────── */

/** Question words and filler that nobody types into a search box. */
const FILLER = new Set(
  'how do does did i my me should can could would will what which when why is are was the a an to of for on in at with your you it its am be'.split(' '),
);

/**
 * The phrases to ask about for a topic: the search people actually used, if
 * Search Console has one, then the question as asked, then its core words in
 * order ("How do I train the sled push without a sled?" becomes "train sled
 * push without sled").
 */
export function topicKeywords(topic: { question: string; search?: { queries?: string[] } }): string[] {
  const core = asKeyword(topic.question)
    .split(' ')
    .filter((w) => !FILLER.has(w))
    .join(' ');
  return [...new Set([topic.search?.queries?.[0] ?? '', asKeyword(topic.question), core].map(asKeyword).filter((k) => k.split(' ').length >= 2))];
}
