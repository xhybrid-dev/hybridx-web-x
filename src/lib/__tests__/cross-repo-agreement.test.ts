import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { isValidLeadSource } from '../leads';
import { hashEmail } from '../suppression-mirror';
import { requireMagnet } from '../magnets';

/**
 * Two rules in this file are shared with the mailing system in the app repo,
 * where they are defined independently. That is exactly the shape of the bug
 * that already cost months of first-touch attribution — the site sent
 * `utm.source`, the app read `utm.utm_source`, both typechecked, neither knew.
 *
 * These pin the agreement from this side. They cannot import the app's copy
 * across a repository boundary, so they assert the *derivation* rather than
 * comparing implementations: if either side changes, one of these fails.
 */

describe('email hashing must match the mailing system', () => {
  it('is sha256 of the lowercased, trimmed address', () => {
    // The app derives its subscriber document ids this way, and the complainant
    // mirror is a list of those ids. A different derivation here silently means
    // no address ever matches and every complainant is mailed anyway.
    const expected = createHash('sha256').update('athlete@hybridx.club').digest('hex');
    expect(hashEmail('athlete@hybridx.club')).toBe(expected);
  });

  it('collapses case and whitespace, as the app does', () => {
    const canonical = hashEmail('athlete@hybridx.club');
    expect(hashEmail('  Athlete@HybridX.Club  ')).toBe(canonical);
    expect(hashEmail('ATHLETE@HYBRIDX.CLUB')).toBe(canonical);
  });

  it('produces a 64-character hex digest', () => {
    expect(hashEmail('athlete@hybridx.club')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('distinguishes different addresses', () => {
    expect(hashEmail('a@b.com')).not.toBe(hashEmail('c@d.com'));
  });
});

describe('funnel slugs must match the mailing system', () => {
  // Mirrors isValidRouteSlug in the app's lib/marketing/route-store.ts. A slug
  // valid here but not there registers no route, so the lead files as
  // unclassified and the journey attached to that funnel never enrols them.
  it('accepts what a funnel page would carry', () => {
    for (const slug of ['spring-hyrox-challenge', 'race_week_offer', 'promo2026', 'ab']) {
      expect(isValidLeadSource(slug), slug).toBe(true);
    }
  });

  it('accepts every legacy source name still in use', () => {
    // These predate slugs and are mapped by alias on the app side. If the rule
    // ever tightened past them, three live magnets would stop being routed.
    for (const legacy of [
      'free_hyrox_plan',
      'sign_up',
      'build_a_bigger_engine',
      'hyrox_rules_card',
    ]) {
      expect(isValidLeadSource(legacy), legacy).toBe(true);
    }
  });

  it('rejects what the app would also reject', () => {
    for (const bad of [
      '',
      'a',
      'Spring-Challenge',
      '-leading-dash',
      'has spaces',
      'has/slash',
      'has.dot',
      'a'.repeat(50),
    ]) {
      expect(isValidLeadSource(bad), JSON.stringify(bad)).toBe(false);
    }
  });

  it('agrees on the exact length boundary', () => {
    expect(isValidLeadSource('a'.repeat(49))).toBe(true);
    expect(isValidLeadSource('a'.repeat(50))).toBe(false);
  });
});

describe('the ATHX 2027 funnel agrees with the mailing system', () => {
  const { slug: ATHX_SOURCE, tag: ATHX_TAG } = requireMagnet('athx_2027_guide');

  // The app declares `magnet-athx-guide` with `aliases: ['athx_2027_guide']`
  // in lib/marketing/sources.ts. That alias is the only thing joining this
  // funnel to its route, and nothing fails loudly if the two drift: leads keep
  // being captured, keep being forwarded, and quietly land as unclassified —
  // where the launch campaign's audience filter does not see them. The funnel
  // would look healthy right up to the send that reaches nobody.

  it('sends a slug the app will accept rather than file as unclassified', () => {
    expect(isValidLeadSource(ATHX_SOURCE)).toBe(true);
  });

  it('sends a slug spelled exactly as the app aliases it', () => {
    // Pinned as a literal on purpose. Importing the constant proves only that
    // this file agrees with itself; the string is what has to match the entry
    // in the app's registry.
    expect(ATHX_SOURCE).toBe('athx_2027_guide');
  });

  it('sends a tag the app will keep rather than silently drop', () => {
    // bridge-contract.ts filters on /^[a-z0-9:-]{1,40}$/ and drops what fails,
    // without failing the request. An underscored tag would arrive as no tag,
    // and the cohort would be invisible to any segment built on it.
    const TAG_PATTERN = /^[a-z0-9:-]{1,40}$/;
    expect(TAG_PATTERN.test(ATHX_TAG)).toBe(true);
  });

  it('does not reuse the slug spelling as the tag', () => {
    // The two rules differ by one character class: slugs allow underscores,
    // tags do not. Passing the slug through as a tag is the easy mistake, and
    // it fails silently on the far side.
    expect(ATHX_TAG).not.toBe(ATHX_SOURCE);
    expect(ATHX_TAG).toBe('athx-2027-guide');
  });
});


describe('consent posture travels with the lead, not just the answer', () => {
  // The app's bridge-contract.ts accepts an optional `consentPolicy` of
  // 'implied' | 'explicit' | 'confirmed' | 'none', and route-store.ts uses it
  // when registering a funnel it has never seen. Send a spelling it does not
  // know and zod drops the field, silently restoring the old inference — which
  // records a double opt-in funnel as granting no consent at all.
  const POLICIES = ['implied', 'explicit', 'confirmed', 'none'];

  const leadsSource = readFileSync(join(process.cwd(), 'src/lib/leads.ts'), 'utf8');
  const sent = [...leadsSource.matchAll(/consentPolicy: '([a-z]+)'/g)].map((m) => m[1]);

  it('sends a posture on every forward, so no route falls back to the inference', () => {
    // Three forwards: saveLead, upsertPendingLead, markLeadConfirmed.
    expect(sent).toHaveLength(3);
  });

  it('sends only postures the app declares', () => {
    for (const policy of sent) {
      expect(POLICIES, `"${policy}" is not in the app's enum`).toContain(policy);
    }
  });

  it('calls the confirmed opt-in path confirmed, on both halves', () => {
    // upsertPendingLead and markLeadConfirmed are the two halves of one funnel.
    // If the grant half sent `implied`, clicking the confirmation link would
    // relabel the route as one that never asked twice.
    expect(sent.filter((p) => p === 'confirmed')).toHaveLength(2);
    expect(sent.filter((p) => p === 'implied')).toHaveLength(1);
  });
});
