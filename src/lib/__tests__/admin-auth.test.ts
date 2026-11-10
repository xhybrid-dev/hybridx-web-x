import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * Admin sign-in lasts 14 days once the backend may sign session cookies, and
 * falls back to the old one-hour ID token until then, so admin never breaks
 * for want of the IAM grant. Cookies issued before the change (bare ID tokens)
 * keep working. The return path after sign-in only ever leads to an admin page.
 */

let cookieValue: string | undefined;
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => (cookieValue === undefined ? undefined : { value: cookieValue }) }),
}));

const adminAuth = {
  verifyIdToken: vi.fn(),
  verifySessionCookie: vi.fn(),
  createSessionCookie: vi.fn(),
};
vi.mock('@/lib/firebase-admin', () => ({ adminAuth, adminFirestore: {}, adminApp: {} }));

const auth = await import('../admin-auth');
const { safeReturnPath, loginUrlFor } = await import('../admin-return');

beforeEach(() => {
  process.env.ADMIN_EMAILS = 'coach@example.com';
  cookieValue = undefined;
  adminAuth.verifyIdToken.mockReset().mockResolvedValue({ uid: 'u1', email: 'Coach@Example.com' });
  adminAuth.verifySessionCookie.mockReset().mockResolvedValue({ uid: 'u1', email: 'coach@example.com' });
  adminAuth.createSessionCookie.mockReset().mockResolvedValue('SESSION');
});

describe('signing in', () => {
  it('mints a 14-day session cookie when the backend can sign one', async () => {
    const result = await auth.createAdminSessionCookie('ID');
    expect(result).toEqual({ cookie: 's:SESSION', email: 'coach@example.com', maxAgeMs: 14 * 86_400_000, lasting: true });
    expect(adminAuth.createSessionCookie).toHaveBeenCalledWith('ID', { expiresIn: 14 * 86_400_000 });
  });

  it('falls back to the one-hour ID token when it cannot, rather than failing', async () => {
    adminAuth.createSessionCookie.mockRejectedValue(new Error('Permission iam.serviceAccounts.signBlob denied'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await auth.createAdminSessionCookie('ID');
    expect(result).toEqual({ cookie: 'ID', email: 'coach@example.com', maxAgeMs: 55 * 60_000, lasting: false });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('serviceAccountTokenCreator'), expect.anything());
    warn.mockRestore();
  });

  it('refuses an account that is not on the allow-list', async () => {
    adminAuth.verifyIdToken.mockResolvedValue({ uid: 'u2', email: 'someone@example.com' });
    expect(await auth.createAdminSessionCookie('ID')).toBeNull();
    expect(adminAuth.createSessionCookie).not.toHaveBeenCalled();
  });
});

describe('checking a session', () => {
  it('verifies a session cookie, checking for revocation', async () => {
    cookieValue = 's:SESSION';
    expect(await auth.getAdminSession()).toEqual({ uid: 'u1', email: 'coach@example.com', lasting: true });
    expect(adminAuth.verifySessionCookie).toHaveBeenCalledWith('SESSION', true);
    expect(adminAuth.verifyIdToken).not.toHaveBeenCalled();
  });

  it('still accepts a cookie issued before the change', async () => {
    cookieValue = 'ID';
    expect(await auth.getAdminSession()).toEqual({ uid: 'u1', email: 'coach@example.com', lasting: false });
    expect(adminAuth.verifyIdToken).toHaveBeenCalledWith('ID');
  });

  it('treats an expired or forged cookie as signed out', async () => {
    cookieValue = 's:OLD';
    adminAuth.verifySessionCookie.mockRejectedValue(new Error('expired'));
    expect(await auth.getAdminSession()).toBeNull();
  });

  it('signs out an address removed from the allow-list, whatever its cookie', async () => {
    cookieValue = 's:SESSION';
    process.env.ADMIN_EMAILS = 'someone-else@example.com';
    expect(await auth.getAdminSession()).toBeNull();
  });
});

describe('the return path after sign-in', () => {
  it('returns to an admin page, query included', () => {
    expect(safeReturnPath('/admin/guides/lift-or-run-first')).toBe('/admin/guides/lift-or-run-first');
    expect(safeReturnPath('/admin/guides/lift-or-run-first?action=approve')).toBe('/admin/guides/lift-or-run-first?action=approve');
  });

  it('never leaves the admin pages', () => {
    for (const bad of ['https://evil.example/admin/', '//evil.example', '/admin//evil.example', '/guides', '/admin/../x', '/admin/login', '', null]) {
      expect(safeReturnPath(bad), String(bad)).toBe('/admin/leads');
    }
  });

  it('builds the login link that comes back', () => {
    expect(loginUrlFor('/admin/guides/a?action=approve')).toBe('/admin/login?next=%2Fadmin%2Fguides%2Fa%3Faction%3Dapprove');
  });
});
