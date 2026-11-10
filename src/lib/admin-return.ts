// src/lib/admin-return.ts
//
// Where admin sign-in sends you afterwards. A review email links straight to
// /admin/guides/<slug>; if you are signed out, that page sends you to
// /admin/login?next=<the page>, and this decides whether to honour `next`.
// Only an admin page is honoured: anything else would make the login page an
// open redirect. Shared by the login page (client) and the admin pages (server).

const ADMIN_PATH = /^\/admin\/[A-Za-z0-9\-/]*(?:\?[A-Za-z0-9\-=&]*)?$/;
export const DEFAULT_ADMIN_PAGE = '/admin/leads';

export function safeReturnPath(next: string | null | undefined): string {
  if (!next || !ADMIN_PATH.test(next) || next.startsWith('/admin/login') || next.includes('//')) return DEFAULT_ADMIN_PAGE;
  return next;
}

/** The login URL that returns to `path` afterwards. */
export function loginUrlFor(path: string): string {
  return `/admin/login?next=${encodeURIComponent(path)}`;
}
