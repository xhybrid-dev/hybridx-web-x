// src/lib/guides/checks.ts
//
// What code checks in every draft before Jon sees it (docs/content-engine-plan.md,
// section 6.3). Deterministic: the same draft always gets the same result, so
// it can be tested, and a draft cannot talk its way past it.
//
//   errors    go back to the model for one fix, then to Jon, flagged
//   warnings  go to Jon in the review email, to judge
//
// The schema (src/lib/guides/types.ts) has already refused anything malformed;
// these are the rules about content.

import { APP, ATHLETES, DIVISIONS, UNCOVERED_FORMATS } from '@/lib/facts';
import { BANNED_DASHES, BANNED_PHRASES, MEDICAL_PHRASES, UNITS_AFTER_A_NUMBER, US_SPELLINGS, findWordViolations } from './bible';
import { plainText } from './inline';
import { linkCandidates, linkedArticles, linksIn, type Subject } from './related';
import { RESERVED_GUIDE_SLUGS, pillar as pillarOf } from './topics';
import type { Block, Guide } from './types';

export interface Issue {
  code: string;
  message: string;
  /** 1-based, as the review page numbers blocks. */
  block?: number;
}

export interface CheckResult {
  errors: Issue[];
  warnings: Issue[];
  words: number;
}

export const WORDS = { min: 300, low: 350, high: 800, max: 900 } as const;
/** Links in the text, not counting the call to action. */
export const MAX_LINKS = 5;

/** Every piece of reader-visible text, with the block it came from. */
export function textUnits(blocks: Block[]): { block: number; text: string }[] {
  const out: { block: number; text: string }[] = [];
  const add = (i: number, ...texts: (string | undefined)[]) => {
    for (const t of texts) if (t) out.push({ block: i + 1, text: plainText(t) });
  };
  blocks.forEach((b, i) => {
    switch (b.type) {
      case 'heading':
      case 'paragraph':
      case 'callout':
        add(i, b.text);
        break;
      case 'list':
        add(i, ...b.items);
        break;
      case 'workout':
        add(i, b.title, b.goal, b.notes, ...b.beginner.steps, b.beginner.rpe, b.beginner.rest, ...b.racePace.steps, b.racePace.rpe, b.racePace.rest);
        break;
      case 'table':
        add(i, b.caption, ...b.header, ...b.rows.flat());
        break;
      case 'faq':
        for (const item of b.items) add(i, item.question, item.answer);
        break;
      case 'sources':
        for (const s of b.items) add(i, s.title, s.publisher);
        break;
    }
  });
  return out;
}

const countWords = (s: string) => (s.match(/[A-Za-z0-9£%][A-Za-z0-9'’.,:£%×/–-]*/g) ?? []).length;

/* ── Race standards ─────────────────────────────────────────────────────── */

const unique = (xs: number[]) => [...new Set(xs)];
const LOADS: { station: string; pattern: RegExp; kg: number[] }[] = [
  { station: 'sled push', pattern: /sled push/i, kg: unique(DIVISIONS.map((d) => d.sledPushKg)) },
  { station: 'sled pull', pattern: /sled pull/i, kg: unique(DIVISIONS.map((d) => d.sledPullKg)) },
  { station: 'farmers carry', pattern: /farmer'?s?’?s? carry/i, kg: unique(DIVISIONS.map((d) => d.farmersCarryKgEach)) },
  { station: 'sandbag lunges', pattern: /sandbag/i, kg: unique(DIVISIONS.map((d) => d.sandbagKg)) },
  { station: 'wall balls', pattern: /wall ?ball/i, kg: unique(DIVISIONS.map((d) => d.wallBallKg)) },
];
const SLED_ANY = unique(DIVISIONS.flatMap((d) => [d.sledPushKg, d.sledPullKg]));
const TARGETS = unique(DIVISIONS.map((d) => d.wallBallTargetMetres));

/**
 * Words that mark a sentence as stating a race standard rather than a training
 * load. "Push the sled at 120 kg for four lengths" is a training prescription
 * and may be anything; "the Men Open sled is 152 kg" is a fact and must match.
 */
const RACE_CUE = /\b(race|racing|division|open|pro|doubles|rulebook|official|standard|including the sled|on race day|in the race|men'?s|women'?s|singles)\b/i;

function checkStandards(units: { block: number; text: string }[]): Issue[] {
  const issues: Issue[] = [];
  for (const { block, text } of units) {
    for (const sentence of text.split(/(?<=[.!?])\s+/)) {
      if (!RACE_CUE.test(sentence)) continue;
      const kgs = [...sentence.matchAll(/(\d+(?:\.\d+)?)\s?kg/gi)].map((m) => Number(m[1]));
      if (kgs.length) {
        const stations = LOADS.filter((l) => l.pattern.test(sentence));
        const allowed = stations.length ? unique(stations.flatMap((s) => s.kg)) : /\bsled\b/i.test(sentence) ? SLED_ANY : null;
        if (allowed) {
          for (const kg of kgs.filter((k) => !allowed.includes(k))) {
            issues.push({
              code: 'wrong-load',
              block,
              message: `${kg} kg is not a 2026/27 race load for ${stations.map((s) => s.station).join(' or ') || 'the sled'} (allowed: ${allowed.join(', ')} kg).`,
            });
          }
        }
      }
      if (/wall ?ball/i.test(sentence)) {
        for (const m of sentence.matchAll(/(\d\.\d+)\s?m\b/g)) {
          if (!TARGETS.includes(Number(m[1]))) {
            issues.push({ code: 'wrong-target', block, message: `${m[1]} m is not a wall ball target height (${TARGETS.map((t) => t.toFixed(2)).join(' or ')} m).` });
          }
        }
      }
      if (/\brelay\b/i.test(sentence) && kgs.length && UNCOVERED_FORMATS.some((f) => f.format === 'relay')) {
        issues.push({ code: 'relay-unconfirmed', block, message: 'Relay loads are not confirmed in the facts registry yet.' });
      }
    }
  }
  return issues;
}

/* ── Product claims ─────────────────────────────────────────────────────── */

function checkClaims(units: { block: number; text: string }[]): Issue[] {
  const issues: Issue[] = [];
  const price = APP.pricePence / 100;
  for (const { block, text } of units) {
    const flag = (code: string, message: string) => issues.push({ code, block, message });
    if (/\b(most affordable|cheapest)\b/i.test(text)) flag('claim-superlative', `Say "${APP.affordability}", never "most affordable" or "cheapest".`);
    if (/\b(app store|google play|play store)\b/i.test(text) && !APP.availability.ios && !APP.availability.android) {
      flag('claim-stores', 'The store apps are not published: do not send readers to an app store.');
    }
    if (/\b(official partner|officially endorsed|endorsed by|in partnership with|partnered with)\b/i.test(text)) flag('claim-partner', 'HybridX is independent of HYROX and ATHX.');
    if (/\bguarantee/i.test(text)) flag('claim-guarantee', 'No guarantees of results.');
    for (const m of text.matchAll(/£(\d+(?:\.\d{2})?)\s?(?:\/\s?mo(?:nth)?\b|per month|a month)/gi)) {
      if (Number(m[1]) !== price) flag('claim-price', `The app is £${price} a month, not £${m[1]}.`);
    }
    for (const m of text.matchAll(/(\d+)[- ]day (?:free )?trial/gi)) {
      if (Number(m[1]) !== APP.trialDays) flag('claim-trial', `The trial is ${APP.trialDays} days, not ${m[1]}.`);
    }
    if (/\b(?:first|1st) month (?:is )?free\b|\bfree (?:first )?month\b/i.test(text)) flag('claim-trial', `The trial is ${APP.trialDays} days, not a month.`);
    for (const m of text.matchAll(/([\d,]+)\+?\s+(?:app\s+)?(?:users|subscribers|members)\b/gi)) {
      if (Number(m[1].replace(/,/g, '')) >= 100) flag('claim-users', `Not a user count. The number HybridX may state: "${ATHLETES.wording}".`);
    }
  }
  return issues;
}

/* ── Wording ────────────────────────────────────────────────────────────── */

function checkWording(units: { block: number; text: string }[]): { errors: Issue[]; warnings: Issue[] } {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const usSpellings = Object.keys(US_SPELLINGS);
  for (const { block, text } of units) {
    // Whole words only, with curly apostrophes read as straight: "secure" is
    // not "cure", and "it’s not just about" is "it's not just about".
    for (const phrase of findWordViolations(text, BANNED_PHRASES)) errors.push({ code: 'banned-phrase', block, message: `Banned phrase: "${phrase}".` });
    for (const phrase of findWordViolations(text, MEDICAL_PHRASES)) errors.push({ code: 'medical', block, message: `Medical territory: "${phrase}". Coaching only.` });
    if (findWordViolations(text, BANNED_DASHES).length) errors.push({ code: 'dash', block, message: 'No em dashes or spaced en dashes: use a full stop, comma or colon.' });
    for (const us of findWordViolations(text, usSpellings)) warnings.push({ code: 'us-spelling', block, message: `UK spelling: "${US_SPELLINGS[us]}", not "${us}".` });
    for (const [us, uk] of Object.entries(UNITS_AFTER_A_NUMBER)) {
      if (new RegExp(`\\d\\s*${us}\\b`, 'i').test(text)) warnings.push({ code: 'us-spelling', block, message: `UK spelling: "${uk}", not "${us}".` });
    }
  }
  return { errors, warnings };
}

/* ── Similarity ─────────────────────────────────────────────────────────── */

function shingles(text: string): Set<string> {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + 3 <= words.length; i++) out.add(words.slice(i, i + 3).join(' '));
  return out;
}

export function similarity(a: string, b: string): number {
  const x = shingles(a);
  const y = shingles(b);
  if (!x.size || !y.size) return 0;
  let shared = 0;
  for (const s of x) if (y.has(s)) shared++;
  return shared / (x.size + y.size - shared);
}

const normalTitle = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/* ── The whole check ────────────────────────────────────────────────────── */

export function checkDraft(
  guide: Pick<Guide, 'slug' | 'title' | 'pillar' | 'blocks'> & Partial<Pick<Guide, 'point' | 'description'>>,
  published: (Subject & Pick<Guide, 'slug' | 'blocks'>)[] = [],
  opts: { fromModel?: boolean } = {},
): CheckResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const units = textUnits(guide.blocks);
  const words = units.reduce((n, u) => n + countWords(u.text), 0);

  // The answer comes first, with a number in it.
  const first = guide.blocks[0];
  if (!first || first.type !== 'paragraph') {
    errors.push({ code: 'answer-first', block: 1, message: 'Open with the answer, in a paragraph.' });
  } else if (!/\d/.test(plainText(first.text))) {
    errors.push({ code: 'answer-number', block: 1, message: 'The opening answer needs a concrete number (a pace, load, time, rest or count).' });
  }

  // One proof element: something a summary on a results page cannot give.
  const proof = guide.blocks.some(
    (b) => b.type === 'workout' || b.type === 'table' || b.type === 'calculator' || (b.type === 'callout' && b.kind === 'coach-note'),
  );
  if (!proof) errors.push({ code: 'no-proof', message: 'Add a proof element: a workout, a table or a tool.' });

  // First-hand material is Jon's to add, never the model's to invent.
  if (opts.fromModel) {
    guide.blocks.forEach((b, i) => {
      if (b.type === 'callout' && b.kind === 'coach-note') {
        errors.push({ code: 'invented-coach-note', block: i + 1, message: "Coach's notes are Jon's to write. Remove it." });
      }
    });
  }

  // Short, and one point.
  if (words < WORDS.min || words > WORDS.max) {
    errors.push({ code: 'length', message: `${words} words: keep it between ${WORDS.low} and ${WORDS.high}.` });
  } else if (words < WORDS.low || words > WORDS.high) {
    warnings.push({ code: 'length', message: `${words} words: the aim is ${WORDS.low} to ${WORDS.high}.` });
  }
  const sections = guide.blocks.filter((b) => b.type === 'heading' && b.level === 2).length;
  if (sections > 4) warnings.push({ code: 'too-many-sections', message: `${sections} section headings: one point needs four at most.` });
  if (guide.title.length > 60) warnings.push({ code: 'long-title', message: `The title is ${guide.title.length} characters; Google shows about 60.` });

  // Links up to the pillar page, across to a related article, and a call to action.
  const pillarPage = pillarOf(guide.pillar).page;
  const links = linksIn(guide.blocks).map((href) => href.split('#')[0]);
  if (!links.includes(pillarPage)) warnings.push({ code: 'no-pillar-link', message: `Link once to the topic's main page, ${pillarPage}.` });
  const twice = [...new Set(links.filter((href, i) => links.indexOf(href) !== i))];
  if (twice.length) warnings.push({ code: 'repeat-link', message: `Linked more than once: ${twice.join(', ')}. Once each is enough.` });
  if (links.length > MAX_LINKS) warnings.push({ code: 'too-many-links', message: `${links.length} links: keep it to ${MAX_LINKS} or fewer.` });
  const live = new Set(published.map((g) => g.slug));
  const linked = linkedArticles(guide.blocks).filter((s) => !(RESERVED_GUIDE_SLUGS as readonly string[]).includes(s));
  for (const slug of linked.filter((s) => !live.has(s))) {
    warnings.push({ code: 'dead-article-link', message: `/guides/${slug} is not published, so that link shows as plain text.` });
  }
  const related = linkCandidates(guide, published, 2);
  if (related.length && !linked.some((s) => live.has(s))) {
    const suggest = related.map((g) => `/guides/${g.slug} ("${g.title}")`).join(' or ');
    warnings.push({ code: 'no-related-link', message: `No link to a related article. Link one in the text, such as ${suggest}.` });
  }
  if (!guide.blocks.some((b) => b.type === 'cta')) warnings.push({ code: 'no-cta', message: 'No call to action.' });

  errors.push(...checkStandards(units), ...checkClaims(units));
  const wording = checkWording(units);
  errors.push(...wording.errors);
  warnings.push(...wording.warnings);

  // Not a second copy of an article that already exists.
  const body = units.map((u) => u.text).join(' ');
  for (const other of published) {
    if (other.slug === guide.slug) continue;
    if (normalTitle(other.title) === normalTitle(guide.title)) {
      errors.push({ code: 'duplicate-title', message: `Same title as the published article /guides/${other.slug}.` });
      continue;
    }
    const score = similarity(body, textUnits(other.blocks).map((u) => u.text).join(' '));
    if (score > 0.3) warnings.push({ code: 'similar', message: `${Math.round(score * 100)}% of its phrasing overlaps /guides/${other.slug}.` });
  }

  return { errors, warnings, words };
}
