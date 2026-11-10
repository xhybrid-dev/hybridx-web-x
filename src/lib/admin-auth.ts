import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase-admin';

export const ADMIN_SESSION_COOKIE = 'admin_session';

// Admin sign-in lasts 14 days, so a review email tapped on a phone lands on the
// article rather than the login page (docs/content-engine-plan.md, step 3).
//
// That needs a Firebase *session cookie*, which the Admin SDK mints by asking
// IAM to sign it with the backend's service account: the account must hold
// roles/iam.serviceAccountTokenCreator on itself. Until that grant exists,
// minting fails, and sign-in falls back to what it always did: store the
// Firebase ID token itself, which expires after an hour. So admin never breaks
// for want of the grant; it just keeps asking you to sign in.
//
// The cookie says which it holds: "s:" before a session cookie, nothing before
// an ID token (the form every cookie issued before this change has).

/** Firebase's maximum session cookie lifetime. */
export const SESSION_COOKIE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
/** ID tokens last an hour; the cookie expires a little before the token does. */
export const ID_TOKEN_MAX_AGE_MS = 55 * 60 * 1000;
const SESSION_PREFIX = 's:';

function getAllowedEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export interface AdminSession {
  uid: string;
  email: string;
  /** True for the 14-day session, false for the one-hour fallback. */
  lasting: boolean;
}

/** Verifies the stored session cookie or ID token and checks the email allow-list. Null if not a valid admin. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!value) return null;

  try {
    const decoded = value.startsWith(SESSION_PREFIX)
      ? await adminAuth.verifySessionCookie(value.slice(SESSION_PREFIX.length), true)
      : await adminAuth.verifyIdToken(value);
    const email = (decoded.email || '').toLowerCase();
    if (!email || !getAllowedEmails().includes(email)) return null;
    return { uid: decoded.uid, email, lasting: value.startsWith(SESSION_PREFIX) };
  } catch {
    return null;
  }
}

export interface AdminCookie {
  cookie: string;
  email: string;
  maxAgeMs: number;
  /** True for a 14-day session, false for the one-hour fallback. */
  lasting: boolean;
}

/** Checks the ID token and the allow-list, then mints the longest-lived cookie available. */
export async function createAdminSessionCookie(idToken: string): Promise<AdminCookie | null> {
  const decoded = await adminAuth.verifyIdToken(idToken);
  const email = (decoded.email || '').toLowerCase();
  if (!email || !getAllowedEmails().includes(email)) return null;

  try {
    const session = await adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_COOKIE_MAX_AGE_MS });
    return { cookie: SESSION_PREFIX + session, email, maxAgeMs: SESSION_COOKIE_MAX_AGE_MS, lasting: true };
  } catch (error) {
    console.warn(
      '[admin-session] 14-day sign-in unavailable, using the one-hour fallback. Grant the App Hosting service account ' +
        'roles/iam.serviceAccountTokenCreator on itself (docs/content-engine-plan.md, step 3):',
      error instanceof Error ? error.message : error,
    );
    return { cookie: idToken, email, maxAgeMs: ID_TOKEN_MAX_AGE_MS, lasting: false };
  }
}
