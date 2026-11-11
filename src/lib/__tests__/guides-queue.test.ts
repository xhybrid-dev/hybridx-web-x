import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeFirestore } from './helpers/fake-firestore';

const db = new FakeFirestore();
vi.mock('@/lib/firebase-admin', () => ({ adminFirestore: db, adminApp: {}, adminAuth: {} }));

const queue = await import('../guides/queue');
const { CANDIDATES, UNBUILT_TOOLS } = await import('../guides/candidates');
const { TOOLS } = await import('../guides/topics');

/*
 * The topic queue: seeded once from the starting list, then Jon's to order.
 * His own questions go first, a skip keeps its reason, and topics that need a
 * tool not built yet wait.
 */

const at = new Date('2026-11-10T10:00:00Z');
const questions = async () => (await queue.listTopics()).filter((t) => t.status === 'queued').map((t) => t.question);

beforeEach(() => db.reset());

describe('the starting list', () => {
  it('has every proposal seed as a single question, each tool real or planned', () => {
    expect(CANDIDATES).toHaveLength(32);
    for (const c of CANDIDATES) {
      if (c.tool) expect(Object.keys(TOOLS)).toContain(c.tool);
      // A topic waits for a tool until it is built; then that tool is its proof.
      if (c.needs) expect([...UNBUILT_TOOLS, ...Object.keys(TOOLS)]).toContain(c.needs);
    }
  });

  it('frees the topics that waited for the week planner (4), the HYROX pacer (3) and the strength test (2)', () => {
    for (const [tool, n] of [['week-planner', 4], ['hyrox-pacer', 3], ['strength-test', 2]] as const) {
      expect(CANDIDATES.filter((c) => c.needs === tool)).toHaveLength(n);
      expect(Object.keys(TOOLS)).toContain(tool);
      expect(UNBUILT_TOOLS).not.toContain(tool);
    }
  });

  it('seeds the queue once, and never again', async () => {
    expect(await queue.ensureQueueSeeded(at)).toBe(32);
    await queue.skipTopic((await queue.listTopics())[0].id, 'Not now');
    expect(await queue.ensureQueueSeeded(at)).toBe(0);
    expect(db.all('guideTopics')).toHaveLength(32);
  });
});

describe('ordering', () => {
  beforeEach(async () => {
    await queue.ensureQueueSeeded(at);
  });

  it("puts Jon's own question first", async () => {
    await queue.addTopic('How long should I rest between wall ball sets?', 'hyrox', at);
    const [first] = await queue.listTopics();
    expect([first.question, first.source, first.proof]).toEqual(['How long should I rest between wall ball sets?', 'jon', 'any']);
    expect((await queue.nextTopic())?.question).toBe(first.question);
  });

  it('moves a topic up or down by one, and not past either end', async () => {
    const [a, b] = await questions();
    const second = (await queue.listTopics())[1];
    await queue.moveTopic(second.id, -1);
    expect((await questions()).slice(0, 2)).toEqual([b, a]);
    await queue.moveTopic(second.id, -1);
    expect((await questions()).slice(0, 2)).toEqual([b, a]);
  });

  it('skips with a reason, and puts back cleanly', async () => {
    const first = (await queue.listTopics())[0];
    await queue.skipTopic(first.id, 'Covered by the how-to guide');
    let t = (await queue.listTopics()).find((x) => x.id === first.id)!;
    expect([t.status, t.skipReason]).toEqual(['skipped', 'Covered by the how-to guide']);
    expect((await queue.nextTopic())?.id).not.toBe(first.id);
    await queue.requeueTopic(first.id);
    t = (await queue.listTopics()).find((x) => x.id === first.id)!;
    expect([t.status, t.skipReason]).toEqual(['queued', '']);
  });

  it('never offers a topic whose tool is not built', async () => {
    const all = await queue.listTopics();
    const unbuilt = (t: (typeof all)[number]) => !!t.needs && (UNBUILT_TOOLS as readonly string[]).includes(t.needs);
    // Every planned tool is built now, so nothing waits.
    expect(all.filter(unbuilt).length).toBe(0);
    for (const t of all) await queue.setTopic(t.id, { status: 'drafted' }, at);
    expect(await queue.nextTopic()).toBeNull();
  });
});
