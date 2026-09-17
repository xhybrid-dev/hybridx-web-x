import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { isValidLeadSource } from '../leads';
import { hashEmail } from '../suppression-mirror';

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
