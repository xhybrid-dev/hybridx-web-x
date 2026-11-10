import { describe, expect, it, vi } from 'vitest';
import { FakeFirestore } from './helpers/fake-firestore';

vi.mock('@/lib/firebase-admin', () => ({ adminFirestore: new FakeFirestore(), adminApp: {}, adminAuth: {} }));

const { SAMPLE_GUIDES } = await import('../guides/fixtures');
const { RELATED_MIN, linkCandidates, linkedArticles, relatedGuides, relatedness, terms } = await import('../guides/related');
const { checkDraft } = await import('../guides/checks');
const { draftPrompt, linkPrompt } = await import('../guides/engine/prompts');
const { checkLinkEdit, linkSources, proposalsFrom, targetsNeedingLinks } = await import('../guides/backlinks');
import type { Guide } from '../guides/types';

/*
 * How articles link to each other: which are related, what the brief and the
 * checks ask for, and the rules a suggested link from an older article must
 * pass before Jon sees it. The engine side (asking, emailing, applying) is in
 * guides-engine.test.ts.
 */

const [sledPush, liftOrRun] = SAMPLE_GUIDES;
const sledPull: Guide = {
  ...sledPush,
  slug: 'sled-pull-grip',
  title: 'How do I stop my grip failing on the sled pull?',
  point: 'On the sled pull your grip fails when the arms do the work: drive with the legs and reset the rope in long pulls.',
  description: 'Grip goes on the sled pull when your arms do the pulling. Drive with the legs and reset in long pulls.',
  publishedAt: '2026-11-08T07:00:00Z',
};
const wallBalls: Guide = {
  ...sledPush,
  slug: 'break-up-100-wall-balls',
  title: 'How should I break up 100 wall balls?',
  point: 'Break 100 wall balls into sets you can repeat with short rests, decided before the race.',
  description: 'Pick a set size you can repeat, rest five breaths, and decide it before race day.',
  publishedAt: '2026-11-09T07:00:00Z',
};

/** An article whose opening paragraph carries the given text, after the sample's answer. */
const withText = (g: Guide, text: string): Guide => ({ ...g, blocks: [g.blocks[0], { type: 'paragraph', text }, ...g.blocks.slice(1)] });

describe('relatedness', () => {
  it('reads what an article is about, not the words every article uses', () => {
    expect([...terms('How do I train the sleds for HYROX race day?')]).toEqual(['sled']);
  });

  it('ranks two sled articles above a sled and a wall ball article', () => {
    expect(relatedness(sledPush, sledPull)).toBeGreaterThanOrEqual(RELATED_MIN);
    expect(relatedness(sledPush, sledPull)).toBeGreaterThan(relatedness(sledPush, wallBalls));
  });

  it('does not count sharing a pillar alone as related enough to link', () => {
    expect(relatedness({ title: 'Burpee broad jumps', pillar: 'hyrox' }, { title: 'Roxzone transitions', pillar: 'hyrox' })).toBeLessThan(RELATED_MIN);
  });

  it('puts the most related article first in the related box, never the article itself or a draft', () => {
    const draft = { ...sledPull, slug: 'draft-one', status: 'awaiting_review' as const };
    expect(relatedGuides(sledPush, [wallBalls, liftOrRun, sledPull, sledPush, draft]).map((g) => g.slug)).toEqual([
      'sled-pull-grip',
      'break-up-100-wall-balls',
      'lift-or-run-first',
    ]);
  });

  it('offers only articles related enough to link in the text', () => {
    expect(linkCandidates(sledPush, [wallBalls, liftOrRun, sledPull]).map((g) => g.slug)).toEqual(['sled-pull-grip']);
  });
});

describe('links an article already has', () => {
  it('finds article links in paragraphs, lists and FAQ answers', () => {
    const g: Guide = {
      ...sledPush,
      blocks: [
        { type: 'paragraph', text: 'See [the grip guide](/guides/sled-pull-grip).' },
        { type: 'list', ordered: false, items: ['Then [break up wall balls](/guides/break-up-100-wall-balls#sets).'] },
        { type: 'faq', items: [{ question: 'Q?', answer: 'Read [it](/guides/sled-pull-grip) again.' }] },
      ],
    };
    expect(linkedArticles(g.blocks)).toEqual(['sled-pull-grip', 'break-up-100-wall-balls']);
  });
});

describe('the checks on links', () => {
  const codes = (g: Guide, published: Guide[]) => checkDraft(g, published).warnings.map((w) => w.code);

  it('asks for a link to a related published article, naming it', () => {
    const r = checkDraft(sledPush, [sledPull, wallBalls]);
    expect(r.warnings.find((w) => w.code === 'no-related-link')?.message).toContain('/guides/sled-pull-grip');
    expect(codes(withText(sledPush, 'Grip matters too: [keep it on the pull](/guides/sled-pull-grip).'), [sledPull])).not.toContain('no-related-link');
  });

  it('asks for nothing when no published article is related enough', () => {
    expect(codes(sledPush, [liftOrRun])).not.toContain('no-related-link');
  });

  it('flags a link to an article that is not published, which would show as plain text', () => {
    expect(codes(withText(sledPush, 'See [the plan](/guides/not-yet-written).'), [])).toContain('dead-article-link');
    expect(codes(withText(sledPush, 'See [how we write](/guides/how-we-write).'), [])).not.toContain('dead-article-link');
  });

  it('flags the same page linked twice, and too many links', () => {
    const twice = withText(sledPush, 'Read [one](/guides/sled-pull-grip) and [again](/guides/sled-pull-grip).');
    expect(codes(twice, [sledPull])).toContain('repeat-link');
    const many = withText(sledPush, ['/vdot', '/calculators', '/app', '/books', '/una', '/guides'].map((p) => `[x](${p})`).join(' '));
    expect(codes(many, [])).toContain('too-many-links');
  });
});

describe('the brief', () => {
  it('lists the related published articles to link to, with their point', () => {
    const brief = draftPrompt({ question: 'How do I stop my grip failing on the sled pull?', pillar: 'hyrox', proof: 'workout' }, [sledPush, liftOrRun]);
    expect(brief).toContain(`RELATED ARTICLES. Link to one or two of these in the body text, where the reader would want to go next:\n/guides/${sledPush.slug}: ${sledPush.title} (its point: ${sledPush.point})`);
    expect(brief.split('RELATED ARTICLES')[1].split('TOOLS YOU MAY EMBED')[0]).not.toContain(liftOrRun.slug);
  });

  it('says nothing about related articles when there are none', () => {
    expect(draftPrompt({ question: 'Zone 2 or intervals?', pillar: 'athx', proof: 'any' }, [sledPush])).not.toContain('RELATED ARTICLES');
  });
});

describe('a suggested link from an older article', () => {
  const before = 'The push fails in two places: your hips rise, or your legs go. **Neither** needs a sled, and the [VDOT paces](/vdot) still apply.';
  const target = '/guides/sled-pull-grip';

  it('may turn existing words into the link', () => {
    expect(checkLinkEdit(before, before.replace('your legs go', `[your legs go](${target})`), target)).toBeNull();
  });

  it('may add one short sentence at the end that carries it', () => {
    expect(checkLinkEdit(before, `${before} The same leg drive is [what keeps your grip on the sled pull](${target}).`, target)).toBeNull();
  });

  it.each([
    ['changes a word', before.replace('hips rise', 'hips lift').replace('your legs go', `[your legs go](${target})`), 'changes words'],
    ['drops the bold', before.replace('**Neither**', 'Neither').replace('your legs go', `[your legs go](${target})`), 'changes words'],
    ['drops another link', before.replace('[VDOT paces](/vdot)', 'VDOT paces').replace('your legs go', `[your legs go](${target})`), 'other links'],
    ['adds no link to the new article', `${before} More on grip soon.`, 'exactly one link'],
    ['links it twice', `${before} [Grip](${target}) and [more grip](${target}).`, 'exactly one link'],
    ['links somewhere else too', `${before} See [the grip guide](${target}) and [this](/guides/other).`, 'other links'],
    ['says "click here"', `${before} For grip, [click here](${target}).`, 'say what the reader will find'],
    ['adds too much', `${before} ${'word '.repeat(30)}[the grip guide](${target}).`, 'the most is 30'],
    ['inserts a sentence before the end', before.replace('your legs go.', `your legs go. See [the grip guide](${target}).`), 'changes words'],
  ])('is refused when it %s', (_, after, reason) => {
    expect(checkLinkEdit(before, after, target)).toContain(reason);
  });

  it('is refused when the added words break the coaching bible', () => {
    const p = sledPush.blocks[2] as { text: string };
    const { proposals, refused } = proposalsFrom(sledPull, [sledPush], [
      { article: sledPush.slug, paragraph: 3, text: `${p.text} In conclusion, [grip on the sled pull](/guides/sled-pull-grip) matters too.` },
    ], new Date());
    expect(proposals).toEqual([]);
    expect(refused[0]).toContain('Banned phrase');
  });

  it('is refused for an article it was not asked about, a block that is not a paragraph, or a second one per article', () => {
    const p = sledPush.blocks[2] as { text: string };
    const good = { article: sledPush.slug, paragraph: 3, text: `${p.text} Grip goes next: [keep it on the sled pull](/guides/sled-pull-grip).` };
    const { proposals, refused } = proposalsFrom(sledPull, [sledPush], [
      { ...good, article: 'somewhere-else' },
      { ...good, paragraph: 2 },
      good,
      good,
    ], new Date('2026-11-10T10:00:00Z'));
    expect(proposals.map((x) => [x.id, x.block, x.status])).toEqual([[`sled-pull-grip__${sledPush.slug}`, 2, 'proposed']]);
    expect(refused).toEqual([
      'somewhere-else: not one of the articles asked about',
      `${sledPush.slug}: block 2 is not a paragraph`,
      `${sledPush.slug}: a second suggestion for the same article`,
    ]);
  });
});

describe('which articles are asked about', () => {
  it('asks only related published articles that do not already link to the new one', () => {
    const linking = { ...withText(sledPush, 'See [grip](/guides/sled-pull-grip).'), slug: 'already-links' };
    expect(linkSources(sledPull, [sledPush, wallBalls, liftOrRun, linking]).map((g) => g.slug)).toEqual([sledPush.slug]);
  });

  it('looks for links to approved articles, and recent published ones, once each', () => {
    const now = new Date('2026-11-10T10:00:00Z');
    const scheduled = { ...sledPull, status: 'scheduled' as const, publishAt: '2026-11-11T07:00:00Z', publishedAt: undefined };
    const old = { ...wallBalls, publishedAt: '2026-10-01T07:00:00Z' };
    const draft = { ...liftOrRun, status: 'awaiting_review' as const };
    expect(targetsNeedingLinks([scheduled, old, draft, sledPush], new Set(), now).map((g) => g.slug)).toEqual([sledPush.slug, 'sled-pull-grip']);
    expect(targetsNeedingLinks([scheduled], new Set(['sled-pull-grip']), now)).toEqual([]);
  });

  it('shows the model only the older articles’ paragraphs, numbered as blocks', () => {
    const prompt = linkPrompt(sledPull, [sledPush]);
    expect(prompt).toContain(`OLDER ARTICLE ${sledPush.slug}`);
    expect(prompt).toContain(`3: ${(sledPush.blocks[2] as { text: string }).text}`);
    expect(prompt).not.toContain('2: Why a sled is not the only way');
  });
});
