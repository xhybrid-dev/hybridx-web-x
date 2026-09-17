import { describe, it, expect, beforeAll } from 'vitest';
import { createLeadToken, readLeadToken, verifyLeadToken } from '../lead-tokens';

// A stable secret, so tokens are reproducible across the file. Without one the
// module mints a per-process random key and every assertion below would depend
// on module load order.
beforeAll(() => {
  process.env.LEAD_TOKEN_SECRET = 'test-secret-that-is-comfortably-long-enough';
});

const EMAIL = 'athlete@hybridx.club';
const SOURCE = 'hyrox_rules_card';

describe('createLeadToken / verifyLeadToken', () => {
  it('round-trips the address and funnel it was minted for', () => {
    const result = verifyLeadToken(createLeadToken(EMAIL, SOURCE), SOURCE);
    expect(result).toEqual({ valid: true, email: EMAIL, source: SOURCE });
  });

  it('normalises the address, so a token minted from typed input still matches', () => {
    const result = verifyLeadToken(createLeadToken('  Athlete@HybridX.Club ', SOURCE), SOURCE);
    expect(result.valid && result.email).toBe(EMAIL);
  });

  it('refuses a token issued for a different funnel', () => {
    // The property that stops a race-card token unlocking the VO2max guide.
    const token = createLeadToken(EMAIL, 'build_a_bigger_engine');
    expect(verifyLeadToken(token, SOURCE)).toEqual({ valid: false, reason: 'wrong-source' });
  });

  it('rejects a tampered payload', () => {
    const token = createLeadToken(EMAIL, SOURCE);
    const [payload, sig] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ e: 'attacker@example.com', s: SOURCE, x: Date.now() + 1000 }),
    ).toString('base64url');

    expect(verifyLeadToken(`${forged}.${sig}`, SOURCE)).toEqual({
      valid: false,
      reason: 'bad-signature',
    });
    // And the original still verifies, so the test is not passing by accident.
    expect(verifyLeadToken(`${payload}.${sig}`, SOURCE).valid).toBe(true);
  });

  it('rejects anything that is not a token at all', () => {
    for (const bad of [undefined, '', 'nodot', 'a.b.c.d']) {
      expect(verifyLeadToken(bad as string | undefined, SOURCE).valid, String(bad)).toBe(false);
    }
  });
});

describe('readLeadToken — what lets one page confirm every funnel', () => {
  it('reads the funnel from the signed payload rather than being told it', () => {
    const result = readLeadToken(createLeadToken(EMAIL, 'spring-hyrox-challenge'));
    expect(result).toEqual({ valid: true, email: EMAIL, source: 'spring-hyrox-challenge' });
  });

  it('still enforces the signature — the source cannot be substituted', () => {
    const forged = Buffer.from(
      JSON.stringify({ e: EMAIL, s: 'any-funnel-i-like', x: Date.now() + 10_000 }),
    ).toString('base64url');
    expect(readLeadToken(`${forged}.not-a-real-signature`)).toEqual({
      valid: false,
      reason: 'bad-signature',
    });
  });

  it('agrees with verifyLeadToken on every rejection reason it shares', () => {
    // verifyLeadToken delegates here, so a divergence would mean one page
    // accepting a token another rejects.
    for (const bad of ['', 'nodot', 'a.b.c.d']) {
      const read = readLeadToken(bad);
      const verified = verifyLeadToken(bad, SOURCE);
      expect(read.valid, bad).toBe(false);
      expect(verified.valid, bad).toBe(false);
      if (!read.valid && !verified.valid) expect(verified.reason).toBe(read.reason);
    }
  });
});
