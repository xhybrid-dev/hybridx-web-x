import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeFirestore } from './helpers/fake-firestore';

const db = new FakeFirestore();
vi.mock('@/lib/firebase-admin', () => ({ adminFirestore: db, adminApp: {}, adminAuth: {} }));

const sc = await import('../google/search-console');
const { analyse, asQuestion, fit, groupQueries, opportunity, pillarFor, routeGroup, scoreGroup } = await import('../guides/harvest/analyse');
const harvest = await import('../guides/harvest/run');
const queue = await import('../guides/queue');
const store = await import('../guides/store');
const { buildSummaryEmail } = await import('../guides/email');
const { SAMPLE_GUIDES } = await import('../guides/fixtures');
import type { ScRow, SearchConsoleDeps } from '../google/search-console';
import type { SummaryEmail } from '../guides/email';
import type { Topic } from '../guides/queue';

/*
 * Step 6: reading Search Console and turning what people search for into the
 * topic queue. A fake Search Console stands in for Google; nothing here calls
 * the real API.
 */

const row = (query: string, page: string, impressions: number, position: number, clicks = 0): ScRow => ({
  query,
  page: page.startsWith('http') ? page : `https://hybridx.club${page}`,
  clicks,
  impressions,
  ctr: impressions ? clicks / impressions : 0,
  position,
});

/** A fake Search Console: answers analytics with `rows`, inspections with PASS unless told otherwise. */
function fakeSc(rows: ScRow[], opts: { fail?: { status: number; message: string }; notIndexed?: string[] } = {}) {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const deps: SearchConsoleDeps = {
    token: async () => 'token',
    fetch: (async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      calls.push({ url, body });
      if (opts.fail) return new Response(JSON.stringify({ error: { message: opts.fail.message } }), { status: opts.fail.status });
      if (url.includes('searchAnalytics')) {
        const page = rows.slice(body.startRow, body.startRow + body.rowLimit);
        return Response.json({ rows: page.map((r) => ({ keys: [r.query, r.page], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })) });
      }
      if (url.includes('urlInspection')) {
        const indexed = !opts.notIndexed?.some((s) => String(body.inspectionUrl).endsWith(s));
        return Response.json({ inspectionResult: { indexStatusResult: indexed ? { verdict: 'PASS', coverageState: 'Submitted and indexed' } : { verdict: 'NEUTRAL', coverageState: 'Discovered - currently not indexed' } } });
      }
      return Response.json({ siteEntry: [{ siteUrl: 'sc-domain:hybridx.club', permissionLevel: 'siteRestrictedUser' }] });
    }) as typeof fetch,
  };
  return { deps, calls };
}

beforeEach(() => {
  db.reset();
  store.invalidateGuideCache();
  process.env.CONTENT_ENGINE_MODE = 'on';
  process.env.ADMIN_EMAILS = 'coach@example.com';
  delete process.env.SEARCH_CONSOLE_SITE;
});

describe('the Search Console client', () => {
  it('pages through analytics until a short page, for the Domain property', async () => {
    const rows = Array.from({ length: sc.PAGE_ROWS + 3 }, (_, i) => row(`query ${i}`, '/', 1, 10));
    const { deps, calls } = fakeSc(rows);
    expect(await sc.searchAnalytics(deps, sc.searchConsoleSite(), { startDate: '2026-10-11', endDate: '2026-11-07' })).toHaveLength(sc.PAGE_ROWS + 3);
    expect(calls.map((c) => c.body.startRow)).toEqual([0, sc.PAGE_ROWS]);
    expect(calls[0].url).toBe('https://searchconsole.googleapis.com/webmasters/v3/sites/sc-domain%3Ahybridx.club/searchAnalytics/query');
    expect(calls[0].body).toMatchObject({ dimensions: ['query', 'page'], type: 'web', rowLimit: sc.PAGE_ROWS });
  });

  it('says what to do when access is missing', async () => {
    const disabled = fakeSc([], { fail: { status: 403, message: 'Google Search Console API has not been used in project 123 before or it is disabled.' } });
    await expect(sc.listSites(disabled.deps)).rejects.toThrow('The Search Console API is not enabled in the hybridx-hub project.');
    const denied = fakeSc([], { fail: { status: 403, message: 'User does not have sufficient permission for site' } });
    await expect(sc.listSites(denied.deps)).rejects.toThrow('add it as a Restricted user');
  });

  it('reads 28 days ending three days ago', () => {
    expect(sc.harvestWindow(new Date('2026-11-10T09:00:00Z'))).toEqual({ startDate: '2026-10-11', endDate: '2026-11-07' });
  });

  it('uses SEARCH_CONSOLE_SITE for a URL-prefix property', () => {
    process.env.SEARCH_CONSOLE_SITE = 'https://hybridx.club/';
    expect(sc.searchConsoleSite()).toBe('https://hybridx.club/');
  });
});

describe('grouping searches', () => {
  it('puts the same search in different words together, and leaves out the brand', () => {
    const groups = groupQueries([
      row('hyrox sled push weight', '/how-to-train-for-hyrox', 30, 12),
      row('sled push weights hyrox', '/how-to-train-for-hyrox', 10, 8),
      row('hybridx', '/', 100, 1, 40),
      row('hyrox', '/', 50, 30),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ key: 'push sled weight', top: 'hyrox sled push weight', impressions: 40, position: 11 });
    expect(groups[0].pages[0].page).toBe('/how-to-train-for-hyrox');
  });

  it('keeps pages on other hosts as full addresses', () => {
    const [g] = groupQueries([row('hyrox race time predictor', 'https://race.hybridx.club/', 20, 4)]);
    expect(g.pages[0].page).toBe('https://race.hybridx.club/');
  });
});

describe('scoring', () => {
  it('values the bottom of page one most, and the top three least', () => {
    expect(opportunity(2)).toBeLessThan(opportunity(15));
    expect(opportunity(15)).toBeLessThan(opportunity(7));
  });

  it('counts only our subject', () => {
    expect(fit('how to pace wall balls')).toBe(1);
    expect(fit('pizza near me')).toBeLessThan(1);
    expect(scoreGroup({ top: 'wall ball pacing', impressions: 100, position: 7 })).toBe(100);
  });
});

describe('routing a search', () => {
  const ctx = {
    guides: [{ slug: 'sled-push-without-a-sled', title: 'How do I train the sled push without a sled?', point: 'Train the push as two skills.', pillar: 'hyrox' as const }],
    topics: [{ id: 't1', question: 'How should I break up 100 wall balls?', status: 'queued' }],
  };
  const route = (rows: ScRow[]) => routeGroup(groupQueries(rows)[0], ctx);

  it('leaves alone what an article already ranks in the top three for', () => {
    expect(route([row('sled push without a sled', '/guides/sled-push-without-a-sled', 50, 2)]).kind).toBe('owned');
  });

  it('asks to improve an article ranking 4 to 20', () => {
    const r = route([row('train sled push without sled', '/guides/sled-push-without-a-sled', 50, 9)]);
    expect([r.kind, r.guideSlug]).toEqual(['refresh', 'sled-push-without-a-sled']);
  });

  it('notes an article that answers it when searchers land elsewhere', () => {
    const r = route([row('sled push without a sled', '/how-to-train-for-hyrox', 50, 14)]);
    expect([r.kind, r.guideSlug]).toEqual(['covered', 'sled-push-without-a-sled']);
    expect(r.why).toContain('land on /how-to-train-for-hyrox');
  });

  it('gives a queued topic the numbers for a search it covers', () => {
    expect(route([row('how to break up wall balls', '/', 40, 30)])).toMatchObject({ kind: 'covered', topicId: 't1' });
  });

  it('asks to improve a specific page for a plain search, but wants an article for a question landing on the home page', () => {
    expect(route([row('hyrox rule changes 2026', '/hyrox-rule-changes-2026', 80, 6)]).kind).toBe('refresh');
    expect(route([row('what shoes for hyrox', '/', 80, 9)]).kind).toBe('new');
  });

  it('files a new article under the right pillar', () => {
    expect(pillarFor({ top: 'athx zone pacing', pages: [] }, [])).toBe('athx');
    expect(pillarFor({ top: 'squats before running', pages: [] }, [])).toBe('running-lifting');
    expect(pillarFor({ top: 'anything', pages: [{ page: '/athx-2027', clicks: 0, impressions: 1, position: 9 }] }, [])).toBe('athx');
  });

  it('turns a search into a topic question', () => {
    expect(asQuestion('should i do hyrox open or pro')).toBe('Should i do hyrox open or pro?');
    expect(asQuestion('how to pace wall balls')).toBe('How to pace wall balls');
  });

  it('sorts everything by score', () => {
    const routed = analyse([row('what shoes for hyrox', '/', 10, 9), row('best hyrox gloves', '/', 300, 15)], ctx);
    expect(routed.map((g) => g.top)).toEqual(['best hyrox gloves', 'what shoes for hyrox']);
  });
});

describe('the queue in bands', () => {
  const t = (id: string, rank: number, extra: Partial<Topic> = {}): Topic =>
    ({ id, question: id, pillar: 'hyrox', proof: 'any', rank, status: 'queued', source: 'list', createdAt: '', updatedAt: '', ...extra }) as Topic;
  const search = (score: number) => ({ harvest: 'x', impressions: score, clicks: 0, position: 9, score, queries: [] });

  it('puts Jon first, then search demand by score, then the rest, then what he moved down', () => {
    const order = queue.bandOrder([
      t('list-a', 10),
      t('down', 20, { held: 'down' }),
      t('searched-low', 30, { search: search(5) }),
      t('jon', 40, { source: 'jon' }),
      t('searched-high', 50, { source: 'search', search: search(90) }),
      t('moved-up', 60, { held: 'up' }),
      t('list-b', 70),
    ]);
    expect(order.map((x) => x.id)).toEqual(['jon', 'moved-up', 'searched-high', 'searched-low', 'list-a', 'list-b', 'down']);
  });
});

describe('the weekly harvest, tick by tick', () => {
  const NOW = '2026-11-10T09:00:00Z';
  const rows = [
    row('what shoes for hyrox', '/', 60, 18),
    row('best hyrox shoes', '/', 20, 22),
    row('how to break up wall balls', '/how-to-train-for-hyrox', 40, 25),
    row('pizza near me', '/', 500, 60),
    row('sled push without a sled', '/guides/sled-push-without-a-sled', 30, 6, 3),
  ];

  async function setUp() {
    await queue.ensureQueueSeeded(new Date(NOW));
    await store.saveGuide({ ...SAMPLE_GUIDES[0], publishedAt: '2026-11-01T07:00:00Z' });
  }

  function harness(rs: ScRow[] = rows, opts: Parameters<typeof fakeSc>[1] = {}) {
    const fake = fakeSc(rs, opts);
    const sent: SummaryEmail[] = [];
    const clock = { at: NOW };
    const deps = { sc: fake.deps, send: async (e: SummaryEmail) => void sent.push(e), now: () => new Date(clock.at) };
    return { ...fake, sent, clock, tick: () => harvest.runSearchHarvest(deps) };
  }

  it('does nothing while the engine is off', async () => {
    process.env.CONTENT_ENGINE_MODE = 'off';
    expect((await harness().tick()).skipped).toBe('CONTENT_ENGINE_MODE is not "on"');
  });

  it('adds what people search for that nothing answers, and only our subject', async () => {
    await setUp();
    const h = harness();
    await h.tick();
    const topics = await queue.listTopics();
    const added = topics.filter((x) => x.source === 'search');
    expect(added.map((x) => [x.question, x.pillar, x.search?.impressions])).toEqual([['What shoes for hyrox?', 'hyrox', 80]]);
    expect(added[0].note).toContain('"what shoes for hyrox", "best hyrox shoes"');
    expect(topics.some((x) => /pizza/.test(x.question))).toBe(false);
  });

  it('gives a matched topic its numbers, and moves search demand up the queue behind nothing but Jon', async () => {
    await setUp();
    await queue.addTopic('How long should I rest between wall ball sets?', 'hyrox', new Date(NOW));
    await harness().tick();
    const queued = (await queue.listTopics()).filter((x) => x.status === 'queued');
    expect(queued[0].source).toBe('jon');
    const wallBalls = queued.find((x) => x.question === 'How should I break up 100 wall balls?')!;
    expect(wallBalls.search).toMatchObject({ impressions: 40, position: 25 });
    expect(queued.slice(1, 3).map((x) => x.question).sort()).toEqual(['How should I break up 100 wall balls?', 'What shoes for hyrox?'].sort());
  });

  it('never re-adds a topic Jon skipped', async () => {
    await setUp();
    const id = await queue.addTopic('What shoes for HYROX?', 'hyrox', new Date(NOW));
    await queue.skipTopic(id, 'Not our area');
    await harness().tick();
    expect((await queue.listTopics()).filter((x) => x.source === 'search')).toEqual([]);
  });

  it('records each article’s numbers, then checks indexing, then emails the summary, a tick each', async () => {
    await setUp();
    const h = harness(rows, { notIndexed: ['sled-push-without-a-sled'] });
    await h.tick();
    let [m] = await harvest.listMetrics();
    expect(m).toMatchObject({ slug: 'sled-push-without-a-sled', clicks: 3, impressions: 30, position: 6, queries: ['sled push without a sled'] });
    expect((await harvest.getHarvestState()).inspect).toEqual(['sled-push-without-a-sled']);

    h.clock.at = '2026-11-10T10:00:00Z';
    await h.tick();
    [m] = await harvest.listMetrics();
    expect(m.index).toMatchObject({ verdict: 'NEUTRAL', coverageState: 'Discovered - currently not indexed' });
    expect(h.sent).toEqual([]);

    h.clock.at = '2026-11-10T11:00:00Z';
    await h.tick();
    expect(h.sent).toHaveLength(1);
    expect(h.sent[0]).toMatchObject({ to: 'coach@example.com', added: [{ question: 'What shoes for hyrox?', impressions: 80 }] });
    // Published nine days before the harvest and still not indexed.
    expect(h.sent[0].notIndexed).toEqual([{ slug: 'sled-push-without-a-sled', state: 'Discovered - currently not indexed' }]);

    h.clock.at = '2026-11-10T12:00:00Z';
    expect((await h.tick()).skipped).toBe('not due');
    h.clock.at = '2026-11-17T09:00:00Z';
    await h.tick();
    expect((await harvest.getHarvestState()).lastHarvestId).toBe('2026-11-17');
  });

  it('waits a day after a failed harvest, and says why', async () => {
    await setUp();
    const h = harness([], { fail: { status: 403, message: 'User does not have sufficient permission for site' } });
    expect((await h.tick()).log?.[0]).toContain('add it as a Restricted user');
    expect((await harvest.getHarvestState()).error).toContain('Restricted user');
    const calls = h.calls.length;
    h.clock.at = '2026-11-10T20:00:00Z';
    await h.tick();
    expect(h.calls.length).toBe(calls);
    h.clock.at = '2026-11-11T09:30:00Z';
    await h.tick();
    expect(h.calls.length).toBeGreaterThan(calls);
  });

  it('holds the summary until the email hours', async () => {
    await setUp();
    const h = harness(rows.slice(0, 2));
    h.clock.at = '2026-11-10T21:00:00Z';
    await h.tick();
    await h.tick(); // inspections
    await h.tick(); // summary: outside the hours
    expect(h.sent).toEqual([]);
    h.clock.at = '2026-11-11T08:00:00Z';
    await h.tick();
    expect(h.sent).toHaveLength(1);
  });
});

describe('the summary email', () => {
  it('lists what happened, with one link to the search page, and leaves out empty sections', () => {
    const { subject, html, text } = buildSummaryEmail({
      kind: 'summary',
      to: 'coach@example.com',
      harvest: { id: '2026-11-10', window: { startDate: '2026-10-11', endDate: '2026-11-07' }, clicks: 1234, impressions: 56789 },
      published: ['How do I train the sled push without a sled?'],
      scheduled: [],
      added: [{ question: 'What shoes for hyrox?', impressions: 80 }],
      next: ['What shoes for hyrox?'],
      refresh: [{ page: '/hyrox-rule-changes-2026', query: 'hyrox rule changes', position: 6.2, impressions: 400 }],
      notIndexed: [],
    });
    expect(subject).toBe('This week in search: 1,234 clicks');
    expect(text).toContain('Search, 2026-10-11 to 2026-11-07: 1,234 clicks from 56,789 impressions across the site.');
    expect(text).toContain('- What shoes for hyrox? (80 impressions)');
    expect(text).not.toContain('Scheduled');
    expect(text).not.toContain('Not indexed');
    expect([...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1])).toEqual(['https://hybridx.club/admin/guides/search', 'https://hybridx.club/admin/guides/settings']);
  });
});

describe('Keyword Planner volumes, after the harvest (step 10)', () => {
  const NOW = '2026-11-10T09:00:00Z';
  const ENV = {
    GOOGLE_ADS_DEVELOPER_TOKEN: 'dev',
    GOOGLE_ADS_CLIENT_ID: 'id',
    GOOGLE_ADS_CLIENT_SECRET: 'secret',
    GOOGLE_ADS_REFRESH_TOKEN: 'refresh',
    GOOGLE_ADS_CUSTOMER_ID: '1234567890',
  };

  /** Search Console as above; Keyword Planner answering `volumes` (phrase to monthly searches), or failing. */
  function harness(volumes: Record<string, number> | 'fail', env: Record<string, string> = ENV) {
    const sc = fakeSc([row('what shoes for hyrox', '/', 60, 18)]);
    const asked: string[][] = [];
    const ads = {
      fetch: (async (url: string, init?: RequestInit) => {
        if (url.startsWith('https://oauth2')) return Response.json({ access_token: 'a' });
        const { keywords } = JSON.parse(String(init?.body)) as { keywords: string[] };
        asked.push(keywords);
        if (volumes === 'fail') {
          return Response.json({ error: { details: [{ errors: [{ errorCode: { authorizationError: 'DEVELOPER_TOKEN_NOT_APPROVED' }, message: 'no' }] }] } }, { status: 403 });
        }
        return Response.json({ results: keywords.map((k) => ({ text: k, keywordMetrics: { avgMonthlySearches: String(volumes[k] ?? 0) } })) });
      }) as typeof fetch,
    };
    const sent: SummaryEmail[] = [];
    const clock = { at: NOW };
    const deps = { sc: sc.deps, ads, env, send: async (e: SummaryEmail) => void sent.push(e), now: () => new Date(clock.at) };
    return { sent, asked, clock, tick: () => harvest.runSearchHarvest(deps) };
  }

  beforeEach(async () => {
    await queue.ensureQueueSeeded(new Date(NOW));
  });

  it('does nothing until the credentials exist', async () => {
    const h = harness({}, {});
    await h.tick();
    expect((await harvest.getHarvestState()).volumes).toBeUndefined();
    expect(h.asked).toEqual([]);
  });

  it('asks once for the whole queue on the tick after the harvest, and moves searched-for topics up', async () => {
    const h = harness({ 'how should i break up 100 wall balls': 2400 });
    await h.tick();
    expect((await harvest.getHarvestState()).volumes).toBe(true);
    h.clock.at = '2026-11-10T10:00:00Z';
    expect((await h.tick()).log?.[0]).toMatch(/^keyword planner: \d+ topic\(s\) checked/);
    expect(h.asked).toHaveLength(1);

    const topics = await queue.listTopics();
    const wallBalls = topics.find((t) => t.question === 'How should I break up 100 wall balls?')!;
    expect(wallBalls.volume).toMatchObject({ keyword: 'how should i break up 100 wall balls', avgMonthly: 2400, score: 720 });
    // 2,400 searches a month outranks the 80 impressions behind "What shoes for hyrox?".
    const queued = topics.filter((t) => t.status === 'queued');
    expect(queued[0].question).toBe('How should I break up 100 wall balls?');
    expect(queue.demandScore(wallBalls)).toBe(720);
  });

  it('puts the result in the summary, and a failure too', async () => {
    for (const [answer, says] of [[{}, /checked for \d+ topics/], ['fail', /Test access/]] as const) {
      db.reset();
      await queue.ensureQueueSeeded(new Date(NOW));
      const h = harness(answer);
      for (const at of ['09:00', '10:00', '11:00']) {
        h.clock.at = `2026-11-10T${at}:00Z`;
        await h.tick();
      }
      expect(h.sent).toHaveLength(1);
      expect(buildSummaryEmail(h.sent[0]).text).toMatch(says);
    }
  });

  it('checks a topic again only after four weeks, and only while it is queued', async () => {
    const { needsVolume } = await import('../guides/harvest/volumes');
    const now = new Date('2026-12-08T09:00:00Z');
    const vol = (checkedAt: string) => ({ keyword: 'k', avgMonthly: 1, recent: 1, score: 0.3, checkedAt });
    expect(needsVolume({ status: 'queued' }, now)).toBe(true);
    expect(needsVolume({ status: 'queued', volume: vol('2026-11-11T09:00:00Z') }, now)).toBe(false);
    expect(needsVolume({ status: 'queued', volume: vol('2026-11-10T09:00:00Z') }, now)).toBe(true);
    expect(needsVolume({ status: 'drafted' }, now)).toBe(false);
  });

  it("takes a topic's best phrase, matched as Google spells it", async () => {
    const { bestVolume } = await import('../guides/harvest/volumes');
    const r = (keyword: string, avgMonthly: number) => ({ keyword, avgMonthly, months: [], recent: 0 });
    expect(bestVolume(['sled push alternative', 'train sled push without sled'], [r('Sled Push Alternative', 90), r('train sled push without sled', 30)])?.avgMonthly).toBe(90);
    expect(bestVolume(['nothing matches'], [r('other', 5)])).toBeNull();
  });
});
