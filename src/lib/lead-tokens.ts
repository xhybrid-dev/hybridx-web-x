import crypto from 'node:crypto';

/**
 * Signed, expiring tokens for confirmed-opt-in lead magnets.
 *
 * Stateless by design: the token carries the address and expiry, and an HMAC
 * proves we issued it. That means the confirm link keeps working even if
 * Firestore is having a bad day — the download is the thing the visitor is
 * waiting on, and it should not depend on our analytics storage.
 */

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface TokenPayload {
  /** Email address the token was issued to. */
  e: string;
  /** Lead source, so a token for one magnet cannot unlock another. */
  s: string;
  /** Expiry, epoch ms. */
  x: number;
}

/**
 * Resolves the signing secret.
 *
 * In production LEAD_TOKEN_SECRET must be set. If it is missing we generate a
 * random per-process secret rather than falling back to a hardcoded one: that
 * degrades to "confirmation links stop working after a restart", which is
 * visible and safe, instead of "anyone can mint their own download link",
 * which is neither.
 */
let cachedSecret: string | null = null;
function getSecret(): string {
  if (cachedSecret) return cachedSecret;

  const fromEnv = process.env.LEAD_TOKEN_SECRET;
  if (fromEnv && fromEnv.length >= 16) {
    cachedSecret = fromEnv;
    return cachedSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    console.error(
      '[lead-tokens] LEAD_TOKEN_SECRET is missing or too short. Falling back to an ' +
        'ephemeral secret — confirmation links will break on the next restart. ' +
        'Set it in apphosting.yaml as a secret.'
    );
    cachedSecret = crypto.randomBytes(32).toString('hex');
    return cachedSecret;
  }

  // Development only. Keeps links stable across dev-server restarts.
  cachedSecret = 'dev-only-lead-token-secret-do-not-use-in-production';
  return cachedSecret;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(payloadB64: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payloadB64).digest('base64url');
}

/** Issues a token granting access to `source`'s magnet for this address. */
export function createLeadToken(email: string, source: string): string {
  const payload: TokenPayload = {
    e: email.trim().toLowerCase(),
    s: source,
    x: Date.now() + TOKEN_TTL_MS,
  };
  const payloadB64 = b64url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64)}`;
}

export type VerifiedToken =
  | { valid: true; email: string; source: string }
  | { valid: false; reason: 'malformed' | 'bad-signature' | 'expired' | 'wrong-source' };

/**
 * Verify a token and check it was issued for the funnel the caller expects.
 *
 * Delegates the signature and expiry work to readLeadToken rather than
 * repeating it. The two were briefly near-identical copies differing by one
 * line, which is how a fix to constant-time comparison gets applied to one and
 * not the other, leaving a bypass on whichever page uses the stale copy.
 */
export function verifyLeadToken(token: string | undefined, expectedSource: string): VerifiedToken {
  const result = readLeadToken(token);
  if (!result.valid) return result;
  if (result.source !== expectedSource) return { valid: false, reason: 'wrong-source' };
  return result;
}

export type ReadToken =
  | { valid: true; email: string; source: string }
  | { valid: false; reason: 'malformed' | 'bad-signature' | 'expired' };

/**
 * Verify a token and read the funnel it was issued for, rather than checking it
 * against a source the caller already knows.
 *
 * This is what lets one confirmation page serve every funnel. `verifyLeadToken`
 * requires the expected source, which means a page per magnet — fine when there
 * were two, a tax on every future promotion once double opt-in is the norm.
 *
 * It is not weaker: the signature still proves we issued the token, and the
 * source is read from the signed payload, so it cannot be substituted. The
 * dropped check was only ever "is this the magnet I think it is", which a
 * generic page has no opinion about.
 */
export function readLeadToken(token: string | undefined): ReadToken {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return { valid: false, reason: 'malformed' };
  }

  const [payloadB64, signature] = token.split('.');
  if (!payloadB64 || !signature) return { valid: false, reason: 'malformed' };

  const expected = sign(payloadB64);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false, reason: 'bad-signature' };
  }

  let payload: TokenPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return { valid: false, reason: 'malformed' };
  }

  if (!payload?.e || !payload?.s || typeof payload.x !== 'number') {
    return { valid: false, reason: 'malformed' };
  }
  if (Date.now() > payload.x) return { valid: false, reason: 'expired' };

  return { valid: true, email: payload.e, source: payload.s };
}
