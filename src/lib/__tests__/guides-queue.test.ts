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
    // The 32 the proposal started with, and any added since (candidates.ts says when).
    expect(CANDIDATES.length).toBeGreaterThanOrEqual(32);
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
    expect(await queue.ensureQueueSeeded(at)).toBe(CANDIDATES.length);
    await queue.skipTopic((await queue.listTopics())[0].id, 'Not now');
    expect(await queue.ensureQueueSeeded(at)).toBe(0);
    expect(db.all('guideTopics')).toHaveLength(CANDIDATES.length);
  });

  it('adds a candidate to a queue seeded before it existed, at the back, and leaves a skipped topic skipped', async () => {
    // The queue as it was when the list was one candidate shorter.
    const newest = CANDIDATES.at(-1)!;
    const stamp = at.toISOString();
    for (const [i, c] of CANDIDATES.slice(0, -1).entries()) {
      await db.collection('guideTopics').add({ ...c, rank: (i + 1) * 10, status: 'queued', source: 'list', createdAt: stamp, updatedAt: stamp });
    }
    const first = (await queue.listTopics())[0];
    await queue.skipTopic(first.id, 'Not now');

    expect(await queue.ensureQueueSeeded(at)).toBe(1);
    const after = await queue.listTopics();
    const back = after.find((t) => t.question === newest.question)!;
    expect(back.status).toBe('queued');
    expect(back.rank).toBe(Math.max(...after.map((t) => t.rank)));
    expect(after.find((t) => t.id === first.id)?.status).toBe('skipped');
    expect(await queue.ensureQueueSeeded(at)).toBe(0);
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

  it("carries Jon's brief as the topic's note, trimmed and capped, and writes none when there is no brief", async () => {
    await queue.addTopic('How long should I rest between wall ball sets?', 'hyrox', at, '  For gym-goers; keep it to one workout.  ');
    await queue.addTopic('Is a weighted vest worth it?', 'hyrox', at);
    await queue.addTopic('Could a long brief be cut?', 'hyrox', at, 'x'.repeat(queue.BRIEF_MAX + 500));
    const mine = (await queue.listTopics()).filter((t) => t.source === 'jon');
    const by = (q: string) => mine.find((t) => t.question === q)!;
    expect(by('How long should I rest between wall ball sets?').note).toBe('For gym-goers; keep it to one workout.');
    expect('note' in by('Is a weighted vest worth it?')).toBe(false);
    expect(by('Could a long brief be cut?').note).toHaveLength(queue.BRIEF_MAX);
  });

  it('knows a question already waiting or being drafted, whatever its case, but not one drafted or skipped', async () => {
    await queue.addTopic('Is a weighted vest worth it?', 'hyrox', at);
    expect(await queue.isInQueue('  is a WEIGHTED vest worth it? ')).toBe(true);
    const [t] = (await queue.listTopics()).filter((x) => x.question === 'Is a weighted vest worth it?');
    await queue.setTopic(t.id, { status: 'drafted' }, at);
    expect(await queue.isInQueue('Is a weighted vest worth it?')).toBe(false);
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

  it('clears the failure count on a put-back, so one more failure does not skip it again', async () => {
    const first = (await queue.listTopics())[0];
    await queue.setTopic(first.id, { status: 'skipped', failures: 2, lastError: 'quota exceeded', skipReason: 'twice' }, at);
    await queue.requeueTopic(first.id, at);
    const t = (await queue.listTopics()).find((x) => x.id === first.id)!;
    expect([t.status, t.failures, t.lastError]).toEqual(['queued', 0, '']);
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

describe('putting back what the engine skipped', () => {
  beforeEach(async () => {
    await queue.ensureQueueSeeded(at);
  });

  it('puts back every topic the engine skipped, leaves the ones Jon skipped, and says how many', async () => {
    const [a, b, c, d] = await queue.listTopics();
    // a and b: the engine gave up after two failed drafts (an outage). c: Jon's own skip. d: queued.
    for (const t of [a, b]) {
      await queue.setTopic(t.id, { status: 'skipped', failures: 2, lastError: '402 Payment Required', skipReason: 'The drafting model could not produce a usable draft twice.' }, at);
    }
    await queue.skipTopic(c.id, 'Covered by the how-to guide');

    expect(await queue.requeueEngineSkipped(at)).toBe(2);

    const now = new Map((await queue.listTopics()).map((t) => [t.id, t]));
    for (const t of [a, b]) expect([now.get(t.id)!.status, now.get(t.id)!.failures, now.get(t.id)!.lastError, now.get(t.id)!.skipReason]).toEqual(['queued', 0, '', '']);
    expect([now.get(c.id)!.status, now.get(c.id)!.skipReason]).toEqual(['skipped', 'Covered by the how-to guide']);
    expect(now.get(d.id)!.status).toBe('queued');
    expect(await queue.requeueEngineSkipped(at)).toBe(0);
  });

  it('tells the two kinds of skip apart', () => {
    expect(queue.isEngineSkipped({ status: 'skipped', failures: 2 })).toBe(true);
    expect(queue.isEngineSkipped({ status: 'skipped' })).toBe(false);
    expect(queue.isEngineSkipped({ status: 'skipped', failures: 1 })).toBe(false);
    expect(queue.isEngineSkipped({ status: 'queued', failures: 2 })).toBe(false);
  });
});
