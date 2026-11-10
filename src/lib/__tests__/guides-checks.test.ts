import { describe, expect, it } from 'vitest';
import { SAMPLE_GUIDES } from '../guides/fixtures';
import { checkDraft, similarity, textUnits } from '../guides/checks';
import type { Block, Guide } from '../guides/types';

/*
 * The checks every draft passes before Jon sees it. Each test breaks the
 * sample article in one way and expects that one problem to be caught, and
 * the untouched sample to pass.
 */

const sample = SAMPLE_GUIDES[0];
const codes = (r: ReturnType<typeof checkDraft>, kind: 'errors' | 'warnings' = 'errors') => r[kind].map((i) => i.code);

/** The sample with its opening paragraph replaced. */
const withOpening = (text: string): Guide => ({ ...sample, blocks: [{ type: 'paragraph', text }, ...sample.blocks.slice(1)] });
/** The sample with one extra paragraph appended. */
const withLine = (text: string): Guide => ({ ...sample, blocks: [...sample.blocks, { type: 'paragraph', text }] });
const padding = (words: number) => Array.from({ length: words }, (_, i) => `word${i}`).join(' ') + '.';

describe('the sample article', () => {
  it('passes with no errors', () => {
    const r = checkDraft(sample, [], { fromModel: true });
    expect(r.errors).toEqual([]);
    expect(r.words).toBeGreaterThan(250);
  });
});

describe('shape of an answer', () => {
  it('wants the answer first, with a number', () => {
    expect(codes(checkDraft(withOpening('Train it as two separate skills.')))).toContain('answer-number');
    const headingFirst: Guide = { ...sample, blocks: [{ type: 'heading', level: 2, text: 'Intro' }, ...sample.blocks] };
    expect(codes(checkDraft(headingFirst))).toContain('answer-first');
  });

  it('wants a proof element', () => {
    const bare: Guide = { ...sample, blocks: sample.blocks.filter((b) => !['workout', 'table', 'calculator'].includes(b.type)) };
    expect(codes(checkDraft(bare))).toContain('no-proof');
  });

  it("refuses a coach's note written by the model, but not one Jon adds", () => {
    const note: Block = { type: 'callout', kind: 'coach-note', text: 'In my experience this works.' };
    const g: Guide = { ...sample, blocks: [...sample.blocks, note] };
    expect(codes(checkDraft(g, [], { fromModel: true }))).toContain('invented-coach-note');
    expect(codes(checkDraft(g, [], { fromModel: false }))).not.toContain('invented-coach-note');
  });

  it('keeps it short', () => {
    const short: Guide = { ...sample, blocks: [{ type: 'paragraph', text: 'Rest 90 seconds.' }, sample.blocks[3]] };
    expect(codes(checkDraft(short))).toContain('length');
    expect(codes(checkDraft(withLine(padding(700))))).toContain('length');
  });
});

describe('race standards', () => {
  it('catches a wrong race load', () => {
    const r = checkDraft(withOpening('The Men Open sled push is 150 kg including the sled, for 50 metres.'));
    expect(r.errors.find((i) => i.code === 'wrong-load')?.message).toMatch(/150 kg is not a 2026\/27 race load for sled push/);
  });

  it('accepts the confirmed loads, in any division', () => {
    const r = checkDraft(withOpening('Men Pro push 202 kg and Women Open push 102 kg on the sled push; the Women Open sled pull is 78 kg.'));
    expect(codes(r)).not.toContain('wrong-load');
  });

  it('leaves training loads alone', () => {
    const r = checkDraft(withLine('Push the sled at 120 kg for four lengths, then run 400 m.'));
    expect(codes(r)).not.toContain('wrong-load');
  });

  it('checks wall ball weights and targets', () => {
    expect(codes(checkDraft(withLine('In the Women Open race the wall ball is 5 kg.')))).toContain('wrong-load');
    expect(codes(checkDraft(withLine('Men Open throw the wall ball to a 2.90 m target in the race.')))).toContain('wrong-target');
    expect(codes(checkDraft(withLine('Men Open throw a 6 kg wall ball to a 3.00 m target in the race.')))).toEqual([]);
  });

  it('will not state relay loads, which are unconfirmed', () => {
    expect(codes(checkDraft(withLine('In the relay race each athlete carries 24 kg per hand on the farmers carry.')))).toContain('relay-unconfirmed');
  });
});

describe('product claims', () => {
  it.each([
    ['The app is the most affordable on the market.', 'claim-superlative'],
    ['It costs £4.99 a month.', 'claim-price'],
    ['Start a 30-day free trial.', 'claim-trial'],
    ['Your first month free.', 'claim-trial'],
    ['Download it from the App Store.', 'claim-stores'],
    ['Join our 2,000 app users.', 'claim-users'],
    ['HybridX is an official partner of HYROX.', 'claim-partner'],
    ['Guaranteed to take ten minutes off your time.', 'claim-guarantee'],
  ])('catches "%s"', (line, code) => {
    expect(codes(checkDraft(withLine(line)))).toContain(code);
  });

  it('accepts the true claims', () => {
    const r = checkDraft(withLine('The app is very affordable at £5 a month, with a 14-day free trial.'));
    expect(codes(r).filter((c) => c.startsWith('claim'))).toEqual([]);
  });
});

describe('wording', () => {
  it('refuses banned phrases and medical claims', () => {
    expect(codes(checkDraft(withLine('In conclusion, push harder.')))).toContain('banned-phrase');
    expect(codes(checkDraft(withLine('This will cure your knee pain.')))).toContain('medical');
  });

  it('flags US spelling and em dashes for Jon', () => {
    const r = checkDraft(withLine('Run 400 meters at your favorite pace — easy.'));
    expect(codes(r, 'warnings')).toEqual(expect.arrayContaining(['us-spelling', 'em-dash']));
    expect(r.warnings.filter((w) => w.code === 'us-spelling').map((w) => w.message)).toEqual([
      'UK spelling: "favourite", not "favorite".',
      'UK spelling: "metres", not "meters".',
    ]);
  });
});

describe('overlap with published articles', () => {
  it('refuses a duplicate title and flags heavy overlap', () => {
    const other = { ...sample, slug: 'existing' };
    expect(codes(checkDraft({ ...sample, slug: 'new-one' }, [other]))).toContain('duplicate-title');
    const r = checkDraft({ ...sample, slug: 'new-one', title: 'A different title' }, [other]);
    expect(codes(r, 'warnings')).toContain('similar');
  });

  it('measures overlap by shared phrasing', () => {
    expect(similarity('push the sled low and drive', 'push the sled low and drive')).toBe(1);
    expect(similarity('push the sled low and drive', 'row easy for twenty minutes today')).toBe(0);
  });

  it('reads the text of every block type', () => {
    expect(textUnits(sample.blocks).length).toBeGreaterThan(10);
  });
});
