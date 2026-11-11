import { describe, expect, it } from 'vitest';
import {
  ADS_API_VERSION,
  GEO_UK,
  LANGUAGE_EN,
  adsConfig,
  asKeyword,
  historicalMetrics,
  parseVolume,
  topicKeywords,
  type AdsConfig,
  type KeywordPlannerDeps,
} from '../google/keyword-planner';

/*
 * The Keyword Planner client (plan step 10), against a fake Google: the
 * credentials it needs, the request it sends, how it reads the answer, and
 * what it says when Google refuses.
 */

const ENV = {
  GOOGLE_ADS_DEVELOPER_TOKEN: 'dev-token',
  GOOGLE_ADS_CLIENT_ID: 'client.apps.googleusercontent.com',
  GOOGLE_ADS_CLIENT_SECRET: 'shh',
  GOOGLE_ADS_REFRESH_TOKEN: 'refresh',
  GOOGLE_ADS_CUSTOMER_ID: '123-456-7890',
};
const config = (adsConfig(ENV) as { ok: true; config: AdsConfig }).config;

/** A fake Google: the token endpoint, then the Ads endpoint. */
function fake(ads: (body: Record<string, unknown>, headers: Headers) => Response, token: () => Response = () => Response.json({ access_token: 'access' })) {
  const calls: { url: string; body: unknown; headers: Headers }[] = [];
  const deps: KeywordPlannerDeps = {
    fetch: (async (url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (url.startsWith('https://oauth2.googleapis.com/token')) {
        calls.push({ url, body: String(init?.body), headers });
        return token();
      }
      const body = JSON.parse(String(init?.body));
      calls.push({ url, body, headers });
      return ads(body, headers);
    }) as typeof fetch,
  };
  return { deps, calls };
}

const volumes = (text: string, avg: number, months: [number, string, number][] = []) => ({
  text,
  keywordMetrics: { avgMonthlySearches: String(avg), monthlySearchVolumes: months.map(([year, month, n]) => ({ year, month, monthlySearches: String(n) })) },
});

describe('the credentials', () => {
  it('names what is missing, never the values', () => {
    expect(adsConfig({})).toEqual({
      ok: false,
      missing: ['GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET', 'GOOGLE_ADS_REFRESH_TOKEN', 'GOOGLE_ADS_CUSTOMER_ID'],
    });
    expect(adsConfig({ ...ENV, GOOGLE_ADS_CUSTOMER_ID: '12345' })).toEqual({ ok: false, missing: ['GOOGLE_ADS_CUSTOMER_ID (10 digits)'] });
  });

  it('takes the customer ids with or without dashes', () => {
    expect(config.customerId).toBe('1234567890');
    const withManager = adsConfig({ ...ENV, GOOGLE_ADS_LOGIN_CUSTOMER_ID: '987-654-3210' });
    expect(withManager.ok && withManager.config.loginCustomerId).toBe('9876543210');
  });
});

describe('the request', () => {
  it('asks for UK, English, Google Search volumes, with the developer token, on the pinned version', async () => {
    const { deps, calls } = fake(() => Response.json({ results: [volumes('hyrox training plan', 2900)] }));
    const [v] = await historicalMetrics(deps, { ...config, loginCustomerId: '9876543210' }, ['HYROX training plan?', 'hyrox training plan']);
    expect(v).toMatchObject({ keyword: 'hyrox training plan', avgMonthly: 2900 });
    expect(String(calls[0].body)).toContain('grant_type=refresh_token');
    const ads = calls[1];
    expect(ads.url).toBe(`https://googleads.googleapis.com/${ADS_API_VERSION}/customers/1234567890:generateKeywordHistoricalMetrics`);
    expect(ads.body).toEqual({ keywords: ['hyrox training plan'], language: LANGUAGE_EN, geoTargetConstants: [GEO_UK], keywordPlanNetwork: 'GOOGLE_SEARCH', includeAdultKeywords: false });
    expect(ads.headers.get('developer-token')).toBe('dev-token');
    expect(ads.headers.get('login-customer-id')).toBe('9876543210');
    expect(ads.headers.get('authorization')).toBe('Bearer access');
  });

  it('makes no call at all for nothing to ask', async () => {
    const { deps, calls } = fake(() => Response.json({}));
    expect(await historicalMetrics(deps, config, ['', '???'])).toEqual([]);
    expect(calls).toEqual([]);
  });
});

describe('the answer', () => {
  it('reads int64 strings and the months, oldest first, with the latest three averaged', () => {
    const v = parseVolume(volumes('sled push', 1000, [[2026, 'OCTOBER', 1300], [2026, 'AUGUST', 700], [2026, 'SEPTEMBER', 1000], [2026, 'JULY', 400]]));
    expect(v?.months.map((m) => `${m.year}-${m.month}`)).toEqual(['2026-7', '2026-8', '2026-9', '2026-10']);
    expect(v?.recent).toBe(1000);
  });
});

describe('when Google refuses', () => {
  const refuse = (status: number, errorCode: Record<string, string>, message = 'refused') =>
    fake(() => Response.json({ error: { code: status, status: 'PERMISSION_DENIED', message: 'outer', details: [{ errors: [{ errorCode, message }] }] } }, { status }));

  it.each([
    [{ authorizationError: 'DEVELOPER_TOKEN_NOT_APPROVED' }, 'Test access'],
    [{ authorizationError: 'USER_PERMISSION_DENIED' }, 'GOOGLE_ADS_LOGIN_CUSTOMER_ID'],
    [{ requestError: 'UNSUPPORTED_VERSION' }, 'Bump ADS_API_VERSION'],
  ])('explains %o', async (errorCode, says) => {
    await expect(historicalMetrics(refuse(403, errorCode).deps, config, ['sled push'])).rejects.toThrow(says);
  });

  it('explains an expired refresh token, which is what a consent screen left in Testing does', async () => {
    const { deps } = fake(() => Response.json({}), () => Response.json({ error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }, { status: 400 }));
    await expect(historicalMetrics(deps, config, ['sled push'])).rejects.toThrow('"In production"');
  });
});

describe('phrases for a topic', () => {
  it('keeps what Google accepts: lower case, plain words, ten at most', () => {
    expect(asKeyword('Open or Pro: which HYROX division should I enter?')).toBe('open or pro which hyrox division should i enter');
    expect(asKeyword('one two three four five six seven eight nine ten eleven')).toBe('one two three four five six seven eight nine ten');
  });

  it('asks about the search people used, the question, and its core words', () => {
    expect(topicKeywords({ question: 'How do I train the sled push without a sled?', search: { queries: ['sled push alternative'] } })).toEqual([
      'sled push alternative',
      'how do i train the sled push without a sled',
      'train sled push without sled',
    ]);
  });
});
