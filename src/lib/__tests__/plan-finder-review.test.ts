import { beforeEach, describe, expect, it, vi } from 'vitest';

// The monthly review job, with the Anthropic client and Firestore replaced.
// What matters: it stays dormant without a key, sends only aggregates and
// scrubbed notes, stores a checked reply, and never retries without limit.

type Doc = Record<string, unknown>;
const db = new Map<string, Map<string, Doc>>();
const col = (name: string) => db.get(name) ?? db.set(name, new Map()).get(name)!;

vi.mock('@/lib/firebase-admin', () => ({
  adminFirestore: {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => ({ exists: col(name).has(id), data: () => col(name).get(id) }),
        set: async (d: Doc, o?: { merge?: boolean }) => void col(name).set(id, o?.merge ? { ...(col(name).get(id) ?? {}), ...d } : d),
      }),
      where: (_f: string, _o: string, from: string) => ({
        where: (_f2: string, _o2: string, to: string) => ({
          get: async () => ({
            docs: [...col(name).values()].filter((d) => (d.day as string) >= from && (d.day as string) <= to).map((d) => ({ data: () => d })),
          }),
        }),
      }),
    }),
  },
}));

let sessions = 500;
vi.mock('@/lib/plan-finder/store', async () => {
  const { report, insights } = await import('@/lib/plan-finder/analytics');
  const { funnel } = await import('@/lib/plan-finder/content');
  return {
    loadRange: async () => ({ merged: { v: 1, date: null, days: 30, counters: { sessions }, hist: {}, maps: {} } }),
    reportFor: (m: object) => {
      const r = report(m, { catalog: funnel.catalog });
      return { report: r, insights: insights(r) };
    },
  };
});

const requests: Record<string, unknown>[] = [];
let reply: () => Record<string, unknown>;
vi.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {
    status = 529;
  }
  class Anthropic {
    static APIError = APIError;
    beta = {
      messages: {
        create: async (req: Record<string, unknown>) => {
          requests.push(req);
          return reply();
        },
      },
    };
  }
  return { default: Anthropic };
});

const { runMonthlyReview, previousMonth } = await import('@/lib/plan-finder/monthly-review');

const GOOD = {
  month: '2026-10',
  headline: 'Most visitors want their first Hyrox.',
  audiences: [{ name: 'First-timers', share: 'about 35%', who: 'New to Hyrox', evidence: '175 of 500' }],
  attracts: [],
  putsOff: [{ finding: 'Step 3 is long', evidence: '12% leave', confidence: 'medium' }],
  obstaclesInTheirWords: [{ theme: 'Time', quotes: ['I train around shift work'], count: 4 }],
  unmatchedDemand: [],
  sources: [{ source: 'instagram.com', verdict: 'bring more', evidence: 'high click rate' }],
  changes: Array.from({ length: 6 }, (_, i) => ({ priority: i + 1, change: 'c' + i, why: 'w', howToTest: 'B arm', expectedEffect: 'e', effort: 'small' })),
  dataQuality: 'One month only.',
};
const ok = (body: object = GOOD) => ({ model: 'claude-opus-5-5', stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(body) }] });
const NOV_3 = Date.UTC(2026, 10, 3, 5);

beforeEach(() => {
  db.clear();
  requests.length = 0;
  sessions = 500;
  reply = () => ok();
  process.env.ANTHROPIC_API_KEY = 'test-key';
  col('hx_batches').set('a', {
    day: '2026-10-12',
    events: [
      { n: 'q_answer', t: 2, key: 'note', value: 'I train around shift work' },
      { n: 'q_answer', t: 1, key: 'goal', value: 'first' },
      { n: 'talk_submit', t: 3, ok: true },
    ],
  });
  col('hx_batches').set('b', { day: '2026-09-30', events: [{ n: 'q_answer', t: 1, key: 'note', value: 'from September' }] });
});

describe('monthly review', () => {
  it('works out the previous month', () => {
    expect(previousMonth(NOV_3)).toEqual({ month: '2026-10', from: '2026-10-01', to: '2026-10-31' });
    expect(previousMonth(Date.UTC(2027, 0, 5))).toEqual({ month: '2026-12', from: '2026-12-01', to: '2026-12-31' });
  });

  it('does nothing without an API key, or before the month has settled', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(await runMonthlyReview(NOV_3)).toMatchObject({ skipped: expect.stringContaining('ANTHROPIC_API_KEY') });
    process.env.ANTHROPIC_API_KEY = 'k';
    expect(await runMonthlyReview(Date.UTC(2026, 10, 1, 12))).toMatchObject({ skipped: 'waiting for the month to settle' });
    expect(requests).toHaveLength(0);
  });

  it('sends the month to Claude and stores a checked review, once', async () => {
    expect(await runMonthlyReview(NOV_3)).toEqual({ done: '2026-10' });
    expect(requests).toHaveLength(1);
    const req = requests[0] as { model: string; output_config: { effort: string; format: { type: string } }; fallbacks: string; betas: string[]; messages: { content: string }[] };
    expect(req.model).toBe('claude-opus-5-5');
    expect(req.output_config.effort).toBe('high');
    expect(req.output_config.format.type).toBe('json_schema');
    expect(req.fallbacks).toBe('default');
    expect(req.betas).toEqual(['server-side-fallback-2026-07-01']);
    const sent = req.messages[0].content;
    expect(sent).toContain('1. I train around shift work');
    expect(sent).not.toContain('from September');
    const stored = col('hx_insights').get('2026-10')!;
    expect(stored).toMatchObject({ status: 'done', headline: GOOD.headline, notesSent: 1, sessions: 500 });
    expect((stored.changes as unknown[]).length).toBe(5);
    expect(await runMonthlyReview(NOV_3 + 3_600_000)).toMatchObject({ skipped: 'already done' });
    expect(requests).toHaveLength(1);
  });

  it('skips the call when the month had too few visits', async () => {
    sessions = 40;
    expect(await runMonthlyReview(NOV_3)).toMatchObject({ skipped: 'too little data', sessions: 40 });
    expect(requests).toHaveLength(0);
    expect(col('hx_insights').get('2026-10')!.status).toBe('too-little-data');
  });

  it('records a refusal or a malformed reply as a failure, and stops after three attempts', async () => {
    reply = () => ({ stop_reason: 'refusal', stop_details: { category: null }, content: [] });
    await expect(runMonthlyReview(NOV_3)).rejects.toThrow(/attempt 1 of 3.*declined/);
    reply = () => ok({ ...GOOD, headline: 42 });
    await expect(runMonthlyReview(NOV_3)).rejects.toThrow(/attempt 2 of 3/);
    await expect(runMonthlyReview(NOV_3)).rejects.toThrow(/attempt 3 of 3/);
    expect(await runMonthlyReview(NOV_3)).toMatchObject({ skipped: 'gave up after 3 attempts' });
    expect(requests).toHaveLength(3);
    expect(col('hx_insights').get('2026-10')).toMatchObject({ status: 'failed', attempts: 3 });
  });
});
