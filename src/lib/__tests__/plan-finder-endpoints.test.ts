import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Timestamp } from 'firebase-admin/firestore';

// What the two plan finder endpoints write, checked against an in-memory
// Firestore. The point is what reaches storage: never an IP address, a user
// agent or a visit id on a lead, and nothing at all for bots, other sites, or
// batches the collector rejects.

const written: { collection: string; doc: Record<string, unknown> }[] = [];
let failWrites = false;

vi.mock('@/lib/firebase-admin', () => ({
  adminFirestore: {
    collection: (collection: string) => ({
      add: async (doc: Record<string, unknown>) => {
        if (failWrites) throw new Error('Firestore unavailable');
        written.push({ collection, doc });
        return { id: 'doc' + written.length };
      },
    }),
  },
}));

const rateLimited = vi.fn(async () => false);
vi.mock('@/lib/rate-limit', () => ({ isCaptureRateLimited: (...args: unknown[]) => rateLimited(...(args as [])) }));

const sent: Record<string, unknown>[] = [];
let failEmail = false;
vi.mock('@/lib/email/service', () => ({
  EMAIL_REPLY_TO: 'training@hybridx.club',
  sendEmail: async (opts: Record<string, unknown>) => {
    if (failEmail) throw new Error('no transport');
    sent.push(opts);
  },
}));

const { POST: collect } = await import('@/app/api/collect/route');
const { POST: talk } = await import('@/app/api/talk/route');

const SID = '0123456789abcdef0123456789abcdef';
const CTX = { site: 'web-1', route: '1.0.0', catalog: '2026-09-29.2', mode: 'entry', path: '/', ref: 'google.com', vw: 'phone', lang: 'en' };

function batch(events: Record<string, unknown>[], extra: Record<string, unknown> = {}) {
  const now = Date.now();
  return JSON.stringify({ v: 1, sid: SID, ctx: CTX, events: events.map((e, i) => ({ t: now + i, q: i, ...e })), ...extra });
}

function post(url: string, body: string, headers: Record<string, string> = {}) {
  return new Request(url, {
    method: 'POST',
    body,
    headers: { 'user-agent': 'Mozilla/5.0 (iPhone)', origin: 'https://hybridx.club', 'x-forwarded-for': '203.0.113.9', ...headers },
  });
}

beforeEach(() => {
  written.length = 0;
  sent.length = 0;
  failWrites = false;
  failEmail = false;
  rateLimited.mockClear();
  rateLimited.mockImplementation(async () => false);
});

describe('POST /api/collect', () => {
  it('stores one scrubbed batch with its day and expiry, and nothing about the requester', async () => {
    const res = await collect(
      post('https://hybridx.club/api/collect', batch([
        { n: 'page_view' },
        { n: 'q_answer', step: 5, key: 'note', value: 'Race in Leeds, mail me at sam@example.com or 07700 900123' },
        { n: 'talk_submit', ok: true, email: 'sam@example.com' },
      ]), { 'content-type': 'text/plain;charset=UTF-8' }),
    );
    expect(res.status).toBe(204);
    expect(written).toHaveLength(1);
    const { collection, doc } = written[0];
    expect(collection).toBe('hx_batches');
    expect(doc.sid).toBe(SID);
    expect(doc.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const expire = (doc.expireAt as Timestamp).toMillis() - (doc.receivedAt as Timestamp).toMillis();
    expect(Math.round(expire / 86_400_000)).toBe(400);
    const text = JSON.stringify(doc);
    expect(text).not.toContain('sam@example.com');
    expect(text).not.toContain('07700');
    expect(text).not.toContain('203.0.113.9');
    expect(text).not.toContain('Mozilla');
    expect(text).toContain('[email]');
    expect(doc.dropped).toEqual({ events: 0, props: 1 }); // the email prop on talk_submit
  });

  it('drops bots without storing anything (C9)', async () => {
    for (const ua of ['Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', 'HeadlessChrome/120', 'Lighthouse']) {
      const res = await collect(post('https://hybridx.club/api/collect', batch([{ n: 'page_view' }]), { 'user-agent': ua }));
      expect(res.status).toBe(204);
    }
    expect(written).toHaveLength(0);
  });

  it('ignores batches from other sites, and accepts the app subdomains and local development', async () => {
    await collect(post('https://hybridx.club/api/collect', batch([{ n: 'page_view' }]), { origin: 'https://evil.example' }));
    expect(written).toHaveLength(0);
    await collect(post('https://hybridx.club/api/collect', batch([{ n: 'page_view' }]), { origin: 'https://race.hybridx.club' }));
    await collect(post('http://localhost:3000/api/collect', batch([{ n: 'page_view' }]), { origin: 'http://localhost:3000' }));
    expect(written).toHaveLength(2);
  });

  it('stores nothing for a rejected or empty batch', async () => {
    for (const body of ['not json', batch([]), batch([{ n: 'no_such_event' }]), JSON.stringify({ v: 1, sid: 'x', ctx: CTX, events: [] })]) {
      expect((await collect(post('https://hybridx.club/api/collect', body))).status).toBe(204);
    }
    expect(written).toHaveLength(0);
  });

  it('still answers 204 when Firestore is down', async () => {
    failWrites = true;
    const res = await collect(post('https://hybridx.club/api/collect', batch([{ n: 'page_view' }])));
    expect(res.status).toBe(204);
  });

  it('caps how fast one address can write', async () => {
    const headers = { 'x-forwarded-for': '198.51.100.77' };
    for (let i = 0; i < 70; i++) await collect(post('https://hybridx.club/api/collect', batch([{ n: 'page_view' }]), headers));
    expect(written).toHaveLength(60);
    // A different visitor is unaffected.
    await collect(post('https://hybridx.club/api/collect', batch([{ n: 'page_view' }]), { 'x-forwarded-for': '198.51.100.78' }));
    expect(written).toHaveLength(61);
  });
});

describe('POST /api/talk', () => {
  const message = {
    name: 'Sam',
    email: 'Sam@Example.com',
    goal: 'My first Hyrox',
    week: 'Three runs and two gym sessions',
    message: 'Knee niggles on long runs',
    answers: 'My first Hyrox | I am new to structured training | Recommended: Train for Hyrox at Home',
    plan: { answers: { goal: 'first', level: 'new', place: 'home', format: 'paper', race: 'none', obst: ['run'] }, recommended: 'home' },
    source: 'entry',
  };

  it('stores the message in hx_leads with a 12-month expiry and emails the team', async () => {
    const res = await talk(post('https://hybridx.club/api/talk', JSON.stringify(message), { 'content-type': 'application/json' }));
    expect(res.status).toBe(200);
    expect(written).toHaveLength(1);
    const { collection, doc } = written[0];
    expect(collection).toBe('hx_leads');
    expect(doc).toMatchObject({ name: 'Sam', email: 'sam@example.com', goal: 'My first Hyrox', status: 'new', source: 'entry' });
    expect(Object.keys(doc)).not.toContain('sid');
    expect(JSON.stringify(doc)).not.toMatch(/[0-9a-f]{32}/); // no visit id anywhere
    expect(JSON.stringify(doc)).not.toContain('203.0.113.9');
    const expire = (doc.expireAt as Timestamp).toMillis() - (doc.createdAt as Timestamp).toMillis();
    expect(Math.round(expire / 86_400_000)).toBe(365);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: 'training@hybridx.club', replyTo: 'sam@example.com', transactional: true });
    expect(String(sent[0].text)).toContain('Train for Hyrox at Home');
  });

  it('keeps the message when the email fails, and says it was received', async () => {
    failEmail = true;
    const res = await talk(post('https://hybridx.club/api/talk', JSON.stringify(message)));
    expect(res.status).toBe(200);
    expect(written).toHaveLength(1);
  });

  it('reports a failed store, so the form keeps what the visitor typed (C13)', async () => {
    failWrites = true;
    const res = await talk(post('https://hybridx.club/api/talk', JSON.stringify(message)));
    expect(res.status).toBe(500);
    expect(sent).toHaveLength(0);
  });

  it('rejects missing name, bad email and unknown plan values, naming fields but not values', async () => {
    const res = await talk(post('https://hybridx.club/api/talk', JSON.stringify({ ...message, name: '', email: 'nope', plan: { answers: { goal: 'moon' }, recommended: 'home' } })));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.fields.sort()).toEqual(['email', 'name', 'plan']);
    expect(JSON.stringify(body)).not.toContain('nope');
    expect(written).toHaveLength(0);
  });

  it('is rate limited per address like the other forms', async () => {
    rateLimited.mockImplementation(async () => true);
    const res = await talk(post('https://hybridx.club/api/talk', JSON.stringify(message)));
    expect(res.status).toBe(429);
    expect(rateLimited).toHaveBeenCalledWith('203.0.113.9', 'talk');
    expect(written).toHaveLength(0);
  });

  it('refuses posts from other sites', async () => {
    const res = await talk(post('https://hybridx.club/api/talk', JSON.stringify(message), { origin: 'https://evil.example' }));
    expect(res.status).toBe(403);
    expect(written).toHaveLength(0);
  });
});
