import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeFirestore } from './helpers/fake-firestore';

const db = new FakeFirestore();
vi.mock('@/lib/firebase-admin', () => ({ adminFirestore: db, adminApp: {}, adminAuth: {} }));

const { SAMPLE_GUIDES } = await import('../guides/fixtures');
const store = await import('../guides/store');
const queue = await import('../guides/queue');
const { runEngineStep, pipelineHasRoom, changedBlocks, getRun } = await import('../guides/engine/run');
const { toContent, toLoose } = await import('../guides/engine/shape');
const { buildEngineEmail, buildReviewEmail, inEmailHours } = await import('../guides/email');
const backlinks = await import('../guides/backlinks');
const { DEFAULT_SETTINGS } = await import('../guides/slots');
import type { EngineModels, ReviewOutcome } from '../guides/engine/models';
import type { EngineEmail, LinksEmail, ReviewEmail } from '../guides/email';
import type { LooseDraft } from '../guides/engine/shape';

/*
 * The drafting engine, with stand-in models: what happens on each hourly tick,
 * from the first draft to the review email, a revision from Jon's comments,
 * and the ways it can fail. Nothing here calls a real model or sends mail.
 */

const sample = SAMPLE_GUIDES[0];

/** A stand-in writer: the sample article, titled with the question it was asked. */
function sampleFor(prompt: string, edit?: (d: LooseDraft) => void): LooseDraft {
  const question = prompt.match(/^QUESTION: (.+)$/m)?.[1] ?? 'A question';
  const d = toLoose({ ...sample, title: question.slice(0, 60) });
  edit?.(d);
  return JSON.parse(JSON.stringify(d));
}

const publishable: ReviewOutcome = { verdict: 'publishable', summary: 'Sound.', notes: [], model: 'stand-in' };

function harness(over: Partial<EngineModels> = {}, at = '2026-11-10T10:00:00Z') {
  const sent: ReviewEmail[] = [];
  const linkEmails: LinksEmail[] = [];
  const calls = { write: 0, review: 0 };
  const links: string[] = [];
  const models: EngineModels = {
    write: over.write ?? (async (p) => (calls.write++, sampleFor(p))),
    link: over.link ?? (async (p) => (links.push(p), [])),
    review: over.review ?? (async () => (calls.review++, publishable)),
    canReview: over.canReview,
  };
  const deps = { models, send: async (e: EngineEmail) => void (e.kind === 'links' ? linkEmails.push(e) : sent.push(e)), now: () => new Date(clock.at) };
  const clock = { at };
  return { deps, sent, linkEmails, calls, links, clock, tick: () => runEngineStep(deps) };
}

beforeEach(() => {
  db.reset();
  store.invalidateGuideCache();
  process.env.CONTENT_ENGINE_MODE = 'on';
  process.env.ADMIN_EMAILS = 'coach@example.com';
});

describe('switching it on', () => {
  it('does nothing unless CONTENT_ENGINE_MODE is "on"', async () => {
    process.env.CONTENT_ENGINE_MODE = 'off';
    const h = harness();
    expect(await h.tick()).toEqual({ skipped: 'CONTENT_ENGINE_MODE is not "on"' });
    expect(db.all('guides')).toEqual([]);
  });

  it('does nothing while paused in settings', async () => {
    await store.saveEngineSettings({ ...DEFAULT_SETTINGS, paused: true });
    expect((await harness().tick()).skipped).toBe('paused in settings');
  });

  it('does nothing while another tick holds the lock', async () => {
    db.rawSet('contentSettings', 'engineLock', { lockedUntil: Date.parse('2026-11-10T10:05:00Z') });
    expect((await harness().tick()).skipped).toBe('another tick is running');
  });
});

describe('from topic to review email', () => {
  it('seeds the queue, drafts the first topic, reviews it on the next tick, then emails Jon', async () => {
    const h = harness();
    await h.tick();
    expect((await queue.listTopics()).length).toBe(32);
    const [g] = await store.listAllGuides();
    expect([g.title, g.status]).toEqual(['How do I train the sled push without a sled?', 'drafting']);
    expect((await getRun(g.slug))?.stage).toBe('review');
    expect(h.calls).toEqual({ write: 1, review: 0 });

    h.clock.at = '2026-11-10T11:00:00Z';
    await h.tick();
    expect((await store.getGuide(g.slug))?.status).toBe('awaiting_review');
    expect(h.calls.review).toBe(1);
    expect(h.sent.map((e) => [e.kind, e.to, e.guide.slug])).toEqual([['ready', 'coach@example.com', g.slug]]);
    expect((await getRun(g.slug))?.stage).toBe('done');
  });

  it('marks the topic drafted, with its article', async () => {
    const h = harness();
    await h.tick();
    const first = (await queue.listTopics())[0];
    expect([first.status, first.guideSlug]).toEqual(['drafted', 'how-do-i-train-the-sled-push-without-a-sled']);
  });

  it('fixes a draft that fails the checks, once', async () => {
    let n = 0;
    const h = harness({
      write: async (p) =>
        sampleFor(p, (d) => {
          if (n++ === 0) d.blocks![0].text = 'The Men Open sled push is 150 kg including the sled, for 50 metres.';
        }),
    });
    await h.tick();
    const [g] = await store.listAllGuides();
    expect(n).toBe(2);
    expect(g.revision).toBe(2);
    expect((await getRun(g.slug))?.checks?.errors).toEqual([]);
  });

  it('fixes what the reviewer calls serious, then sends the email with the notes', async () => {
    let reviews = 0;
    const h = harness({
      review: async () =>
        reviews++ === 0
          ? { verdict: 'needs-fixes', summary: 'One problem.', notes: [{ block: 3, quote: 'RPE 8', problem: 'Too hard for this set.', severity: 'serious' }], model: 'stand-in' }
          : publishable,
    });
    await h.tick();
    h.clock.at = '2026-11-10T11:00:00Z';
    await h.tick();
    const [g] = await store.listAllGuides();
    expect(g.revision).toBe(2);
    expect(h.sent[0].review && 'notes' in h.sent[0].review ? h.sent[0].review.notes.length : 0).toBe(1);
  });

  it('carries on without the reviewer key, and says so', async () => {
    const h = harness({ review: async () => ({ skipped: 'the reviewer key (ANTHROPIC_API_KEY) is not set yet' }) });
    await h.tick();
    h.clock.at = '2026-11-10T11:00:00Z';
    await h.tick();
    expect(buildReviewEmail(h.sent[0]).text).toContain('Second-model review skipped: the reviewer key (ANTHROPIC_API_KEY) is not set yet.');
  });

  it('holds the email until the email hours, then sends it', async () => {
    const h = harness({}, '2026-11-10T21:00:00Z');
    await h.tick();
    h.clock.at = '2026-11-10T22:00:00Z';
    await h.tick();
    expect(h.sent).toEqual([]);
    h.clock.at = '2026-11-11T07:30:00Z';
    await h.tick();
    expect(h.sent.map((e) => e.kind)).toEqual(['ready']);
  });

  it('drops the email if Jon dealt with the article first', async () => {
    const h = harness({}, '2026-11-10T21:00:00Z');
    await h.tick();
    h.clock.at = '2026-11-10T22:00:00Z';
    await h.tick();
    const [g] = await store.listAllGuides();
    await store.updateGuideState(g.slug, { status: 'rejected', rejectionReason: 'Not this one.' });
    h.clock.at = '2026-11-11T07:30:00Z';
    await h.tick();
    expect(h.sent).toEqual([]);
  });
});

describe('pacing', () => {
  it('keeps two waiting for review at most, and three in hand counting scheduled ones', () => {
    const now = new Date('2026-11-10T10:00:00Z');
    const g = (status: string, publishAt?: string) => ({ status, publishAt }) as never;
    expect(pipelineHasRoom([g('awaiting_review')], now)).toBe(true);
    expect(pipelineHasRoom([g('awaiting_review'), g('drafting')], now)).toBe(false);
    expect(pipelineHasRoom([g('awaiting_review'), g('scheduled', '2026-11-11T07:00:00Z'), g('scheduled', '2026-11-13T07:00:00Z')], now)).toBe(false);
    expect(pipelineHasRoom([g('scheduled', '2026-11-09T07:00:00Z'), g('published')], now)).toBe(true);
  });

  it('stops drafting when the pipeline is full', async () => {
    const h = harness();
    for (const at of ['2026-11-10T10:00:00Z', '2026-11-10T11:00:00Z', '2026-11-10T12:00:00Z', '2026-11-10T13:00:00Z', '2026-11-10T14:00:00Z']) {
      h.clock.at = at;
      await h.tick();
    }
    expect((await store.listAllGuides()).length).toBe(2);
  });

  it('passes over topics whose tool is not built yet', () => {
    const t = { status: 'queued', needs: 'strength-test' } as never;
    expect(queue.isDraftable(t)).toBe(false);
    expect(queue.isDraftable(t, [])).toBe(true);
  });
});

describe('revisions from comments', () => {
  async function waitingArticle(h: ReturnType<typeof harness>) {
    await h.tick();
    h.clock.at = '2026-11-10T11:00:00Z';
    await h.tick();
    return (await store.listAllGuides())[0];
  }

  it('revises from open comments, resolves them, and emails what changed', async () => {
    let revisions = 0;
    const h = harness({
      write: async (p) =>
        p.includes('COMMENTS FROM')
          ? (revisions++, sampleFor(p, (d) => (d.blocks![3].beginner!.steps![0] = '3 × 15 s wall drive')))
          : sampleFor(p),
    });
    const g = await waitingArticle(h);
    await store.addComment({ slug: g.slug, revision: g.revision, blockIndex: 3, text: 'Make the first wall drive 15 s.', by: 'coach@example.com' });
    await store.updateGuideState(g.slug, { status: 'revising' });

    h.clock.at = '2026-11-10T12:00:00Z';
    await h.tick();
    h.clock.at = '2026-11-10T13:00:00Z';
    await h.tick();

    expect(revisions).toBe(1);
    expect((await store.listComments(g.slug)).map((c) => c.status)).toEqual(['resolved']);
    const revised = h.sent.find((e) => e.kind === 'revised')!;
    expect(revised.changedBlocks).toEqual([4]);
    expect(buildReviewEmail(revised).text).toContain('Changed: block 4.');
  });

  it('hands the article back to Jon after three rounds', async () => {
    const h = harness();
    const g = await waitingArticle(h);
    const run = (await getRun(g.slug))!;
    db.rawSet('guideRuns', g.slug, { ...run, round: 3 });
    await store.addComment({ slug: g.slug, revision: g.revision, blockIndex: null, text: 'Still not right.', by: 'coach@example.com' });
    await store.updateGuideState(g.slug, { status: 'revising' });
    h.clock.at = '2026-11-10T12:00:00Z';
    await h.tick();
    expect(h.sent.at(-1)?.kind).toBe('gave-up');
    expect((await store.getGuide(g.slug))?.status).toBe('awaiting_review');
  });

  it('sends one reminder after three days waiting', async () => {
    const h = harness();
    await waitingArticle(h);
    h.clock.at = '2026-11-12T11:00:00Z';
    await h.tick();
    h.clock.at = '2026-11-13T11:30:00Z';
    await h.tick();
    h.clock.at = '2026-11-13T12:30:00Z';
    await h.tick();
    expect(h.sent.map((e) => e.kind).filter((k) => k === 'reminder')).toHaveLength(1);
  });
});

describe('failures', () => {
  it('puts a topic back after a failed draft, and skips it after two', async () => {
    const h = harness({ write: async () => { throw new Error('model unavailable'); } });
    await h.tick();
    let first = (await queue.listTopics())[0];
    expect([first.status, first.failures]).toEqual(['queued', 1]);
    h.clock.at = '2026-11-10T11:00:00Z';
    await h.tick();
    first = (await queue.listTopics())[0];
    expect(first.status).toBe('skipped');
    expect(first.skipReason).toMatch(/model unavailable/);
    expect(db.all('guides')).toEqual([]);
  });

  it('never saves a draft that does not fit the article format', async () => {
    const h = harness({ write: async () => ({ title: 'No blocks', description: 'x', point: 'y', blocks: [] }) });
    await h.tick();
    expect(db.all('guides')).toEqual([]);
    expect((await queue.listTopics())[0].lastError).toMatch(/did not fit the article format/);
  });
});

describe('the model output becomes typed blocks', () => {
  it('keeps each type to its own fields and drops what cannot be a block', () => {
    const c = toContent({
      title: ' T ',
      description: 'D',
      point: 'P',
      blocks: [
        { type: 'paragraph', text: 'Hi', items: ['stray'] },
        { type: 'calculator', tool: 'made-up' },
        { type: 'script', text: '<script>' },
        { type: 'callout', kind: 'shout', text: 'x' },
      ],
    });
    expect(c.title).toBe('T');
    expect(c.blocks).toEqual([
      { type: 'paragraph', text: 'Hi' },
      { type: 'callout', kind: 'tip', text: 'x' },
    ]);
  });

  it('lists the blocks a revision changed', () => {
    const a = sample.blocks;
    const b = [...a.slice(0, 2), { type: 'paragraph' as const, text: 'New.' }, ...a.slice(3)];
    expect(changedBlocks(a, b)).toEqual([3]);
  });
});

describe('the review email', () => {
  const guide = { ...sample, status: 'awaiting_review' as const, title: 'Sled <push>' };

  it('escapes article text and links only to the review page', () => {
    const blocks = [{ type: 'paragraph' as const, text: '<script>alert(1)</script> and [the guide](/how-to-train-for-hyrox)' }, ...sample.blocks.slice(1)];
    const { subject, html, text } = buildReviewEmail({ kind: 'ready', to: 'x@example.com', guide: { ...guide, blocks } });
    expect(subject).toBe('Ready to review: Sled <push>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('href="https://hybridx.club/admin/guides/sled-push-without-a-sled?action=approve"');
    expect(html).toContain('href="https://hybridx.club/how-to-train-for-hyrox"');
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs.every((h) => h.startsWith('https://hybridx.club/'))).toBe(true);
    expect(text).toContain('Approve: https://hybridx.club/admin/guides/sled-push-without-a-sled?action=approve');
  });

  it('puts what the checks and reviewer found before the article', () => {
    const { text } = buildReviewEmail({
      kind: 'ready',
      to: 'x@example.com',
      guide,
      checks: { errors: [], warnings: [{ code: 'em-dash', block: 2, message: 'No em dashes.' }], words: 420 },
      review: { verdict: 'publishable', summary: 'Sound.', notes: [{ block: 4, quote: 'RPE 8', problem: 'High.', severity: 'minor' }], model: 'm' },
    });
    expect(text).toContain('Checks: all passed (420 words).');
    expect(text).toContain('For you to judge (block 2): No em dashes.');
    expect(text).toContain('Minor (block 4): "RPE 8" High.');
    expect(text.indexOf('Checks:')).toBeLessThan(text.indexOf('[Block 1]'));
  });

  it('sends only within the email hours, UK time', () => {
    const hours = { emailFrom: '07:00', emailTo: '20:00', timeZone: 'Europe/London' };
    expect(inEmailHours(new Date('2026-11-10T06:59:00Z'), hours)).toBe(false);
    expect(inEmailHours(new Date('2026-11-10T07:00:00Z'), hours)).toBe(true);
    // 06:30 UTC is 07:30 in British Summer Time.
    expect(inEmailHours(new Date('2026-06-15T06:30:00Z'), hours)).toBe(true);
    expect(inEmailHours(new Date('2026-11-10T20:00:00Z'), hours)).toBe(false);
  });
});

describe('a tick cut off by the platform', () => {
  /** A model call that never returns: the request was killed mid-call. */
  const never = <T,>() => new Promise<T>(() => {});
  /** Starts a tick that will hang, and lets it get as far as the hanging call. */
  const startCutOff = async (h: ReturnType<typeof harness>) => {
    void h.tick();
    await new Promise((r) => setTimeout(r, 30));
  };

  it('puts a topic cut off mid-draft back in the queue, and drafts it next time', async () => {
    await startCutOff(harness({ write: () => never() }));
    expect((await queue.listTopics())[0].status).toBe('drafting');

    const h = harness({}, '2026-11-10T10:45:00Z');
    await h.tick();
    const first = (await queue.listTopics())[0];
    expect([first.status, first.failures]).toEqual(['drafted', 1]);
    expect(await store.listAllGuides()).toHaveLength(1);
  });

  it('does not retry a cut-off fix every hour: the draft goes on to review, flagged', async () => {
    let writes = 0;
    const h = harness({
      write: (p) => (++writes === 1 ? Promise.resolve(sampleFor(p, (d) => (d.blocks![0].text = 'The Men Open sled push is 150 kg including the sled.'))) : never()),
    });
    await startCutOff(h);
    h.clock.at = '2026-11-10T11:00:00Z';
    await h.tick();
    expect(writes).toBe(2);
    expect(h.sent.map((e) => e.kind)).toEqual(['ready']);
    expect(h.sent[0].checks?.errors.map((i) => i.code)).toContain('wrong-load');
  });

  it('gives up on a review that never finishes after three tries, and still sends the draft', async () => {
    const h = harness({ review: () => never() });
    await h.tick();
    for (const at of ['2026-11-10T11:00:00Z', '2026-11-10T12:00:00Z', '2026-11-10T13:00:00Z']) {
      h.clock.at = at;
      await startCutOff(h);
    }
    expect(h.sent).toEqual([]);
    h.clock.at = '2026-11-10T14:00:00Z';
    await h.tick();
    expect(h.sent.map((e) => e.kind)).toEqual(['ready']);
    expect(buildReviewEmail(h.sent[0]).text).toContain('Second-model review skipped: the review did not finish after 3 tries.');
  });

  it('recovers a draft saved without its run', async () => {
    await store.saveGuide({ ...sample, slug: 'orphan', status: 'drafting', publishedAt: undefined });
    const h = harness({}, '2026-11-10T11:00:00Z');
    await h.tick();
    expect((await getRun('orphan'))?.stage).not.toBeUndefined();
    expect(h.sent.map((e) => e.guide.slug)).toContain('orphan');
  });

  it('starts no model call late in a tick', async () => {
    const h = harness();
    const late = { ...h.deps, callWindowMs: 0 };
    await runEngineStep(late);
    expect(h.calls.write).toBe(0);
    expect((await queue.listTopics())[0].status).toBe('queued');
  });

  it('sends the draft in the same tick when no review is possible', async () => {
    const h = harness({ canReview: () => false });
    await h.tick();
    expect(h.calls.review).toBe(0);
    expect(h.sent.map((e) => e.kind)).toEqual(['ready']);
    expect(buildReviewEmail(h.sent[0]).text).toContain('Second-model review skipped: the reviewer key (ANTHROPIC_API_KEY) is not set yet.');
  });
});

describe('links from older articles to an approved one', () => {
  /** A published article the new one should be linked from: the sample, published a while ago. */
  const older = { ...sample, status: 'published' as const, publishedAt: '2026-10-01T07:00:00Z' };
  /** The new article, approved for tomorrow's slot. */
  const newer = {
    ...sample,
    slug: 'sled-pull-grip',
    title: 'How do I stop my grip failing on the sled pull?',
    point: 'On the sled pull your grip fails when the arms do the work: drive with the legs and reset the rope in long pulls.',
    status: 'scheduled' as const,
    publishAt: '2026-11-11T07:00:00Z',
    publishedAt: undefined,
  };
  const paragraph = older.blocks[2] as { type: 'paragraph'; text: string };
  const suggestion = {
    article: older.slug,
    paragraph: 3,
    text: `${paragraph.text} The same leg drive is [what keeps your grip on the sled pull](/guides/sled-pull-grip).`,
  };

  async function setUp() {
    await store.saveGuide(older);
    await store.saveGuide(newer);
  }

  it('asks once, saves what passes, and emails Jon in the same tick, before any new draft', async () => {
    await setUp();
    const h = harness({ link: async (p) => (h.links.push(p), [suggestion]) });
    await h.tick();
    expect(h.links).toHaveLength(1);
    expect(h.links[0]).toContain('/guides/sled-pull-grip');
    expect(h.links[0]).toContain(`OLDER ARTICLE ${older.slug}`);
    expect(h.calls.write).toBe(0);
    const [p] = await backlinks.listProposals({ target: 'sled-pull-grip' });
    expect([p.source, p.block, p.status]).toEqual([older.slug, 2, 'proposed']);
    expect(h.linkEmails.map((e) => [e.guide.slug, e.proposals.length])).toEqual([['sled-pull-grip', 1]]);

    h.clock.at = '2026-11-10T11:00:00Z';
    await h.tick();
    expect(h.links).toHaveLength(1);
    expect(h.linkEmails).toHaveLength(1);
    expect(h.calls.write).toBeGreaterThan(0);
  });

  it('drops a suggestion that changes the older article’s words, and says why', async () => {
    await setUp();
    const rewritten = { ...suggestion, text: suggestion.text.replace('The push fails', 'The sled push fails') };
    const h = harness({ link: async () => [rewritten] });
    const result = await h.tick();
    expect(await backlinks.listProposals({ target: 'sled-pull-grip' })).toEqual([]);
    expect(result.log?.join('\n')).toContain('refused 1');
    expect(h.linkEmails).toEqual([]);
  });

  it('makes no call when nothing published is related, and drafts instead', async () => {
    await store.saveGuide(newer);
    const h = harness();
    await h.tick();
    expect(h.links).toEqual([]);
    expect(h.calls.write).toBe(1);
    expect((await backlinks.listBacklinkStates())[0].status).toBe('none');
  });

  it('counts a cut-off call, retries next tick, and gives up after three', async () => {
    await setUp();
    let calls = 0;
    const h = harness({ link: async () => (calls++, Promise.reject(new Error('timeout'))) });
    for (const at of ['2026-11-10T10:00:00Z', '2026-11-10T11:00:00Z', '2026-11-10T12:00:00Z', '2026-11-10T13:00:00Z']) {
      h.clock.at = at;
      await h.tick();
    }
    expect(calls).toBe(3);
    expect((await backlinks.listBacklinkStates())[0].status).toBe('failed');
  });

  it('puts an accepted link in only once the new article is live', async () => {
    await setUp();
    const h = harness({ link: async () => [suggestion] });
    await h.tick();
    const before = (await store.getGuide(older.slug))!.revision;

    const accepted = await backlinks.decideProposal(`sled-pull-grip__${older.slug}`, 'accept', new Date('2026-11-10T12:00:00Z'));
    expect(accepted.status).toBe('accepted');
    expect((await store.getGuide(older.slug))!.revision).toBe(before);

    expect(await backlinks.applyAcceptedLinks(new Date('2026-11-10T20:00:00Z'))).toEqual({ applied: [], stale: [] });
    expect(await backlinks.applyAcceptedLinks(new Date('2026-11-11T07:00:00Z'))).toEqual({ applied: [`sled-pull-grip__${older.slug}`], stale: [] });
    const after = (await store.getGuide(older.slug))!;
    expect(after.revision).toBe(before + 1);
    expect((after.blocks[2] as { text: string }).text).toBe(suggestion.text);
  });

  it('applies at once when the new article is already live, and never twice', async () => {
    await store.saveGuide(older);
    await store.saveGuide({ ...newer, status: 'published', publishAt: undefined, publishedAt: '2026-11-10T07:00:00Z' });
    const h = harness({ link: async () => [suggestion] });
    await h.tick();
    const p = await backlinks.decideProposal(`sled-pull-grip__${older.slug}`, 'accept');
    expect(p.status).toBe('applied');
    await expect(backlinks.decideProposal(p.id, 'skip')).rejects.toThrow('already in');
  });

  it('marks a suggestion stale if the paragraph changed in the meantime', async () => {
    await setUp();
    const h = harness({ link: async () => [suggestion] });
    await h.tick();
    await backlinks.decideProposal(`sled-pull-grip__${older.slug}`, 'accept');
    const current = (await store.getGuide(older.slug))!;
    const { revision: _r, updatedAt: _u, ...rest } = current;
    await store.saveGuide({ ...rest, blocks: current.blocks.map((b, i) => (i === 2 ? { type: 'paragraph' as const, text: 'Rewritten by Jon.' } : b)) });
    expect((await backlinks.applyAcceptedLinks(new Date('2026-11-11T08:00:00Z'))).stale).toHaveLength(1);
    expect((await store.getGuide(older.slug))!.blocks[2]).toEqual({ type: 'paragraph', text: 'Rewritten by Jon.' });
  });

  it('leaves a skipped suggestion out', async () => {
    await setUp();
    const h = harness({ link: async () => [suggestion] });
    await h.tick();
    await backlinks.decideProposal(`sled-pull-grip__${older.slug}`, 'skip');
    expect(await backlinks.applyAcceptedLinks(new Date('2026-11-11T08:00:00Z'))).toEqual({ applied: [], stale: [] });
  });

  it('emails the suggestions with the new link marked, and buttons that only open the page', async () => {
    await setUp();
    const h = harness({ link: async () => [suggestion] });
    await h.tick();
    const { subject, html, text } = buildEngineEmail(h.linkEmails[0]);
    expect(subject).toBe('Links to check: How do I stop my grip failing on the sled pull?');
    expect(html).toContain('background:#FADB5C;font-weight:bold;">what keeps your grip on the sled pull</a>');
    expect(text).toContain(`In "${older.title}":`);
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs.filter((u) => u.includes('/admin/')).every((u) => /\/admin\/guides\/(sled-pull-grip#links|settings)$/.test(u))).toBe(true);
  });
});
