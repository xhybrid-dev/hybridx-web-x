// The security headers, and the rules that keep them reaching visitors.
//
// They once lived in a root middleware.ts that Next ignores when the app is
// under src/, so the live site sent none of them. They are applied from
// next.config.js now; these tests read that config.

import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { SHOP_EVENTS } from '@/lib/shop/config';

const nodeRequire = createRequire(import.meta.url);

/** security-headers.js reads NODE_ENV when it loads, so load a fresh copy under the one asked for. */
function loadSecurityHeaders(nodeEnv: string) {
  const path = nodeRequire.resolve('../../../security-headers.js');
  const before = process.env.NODE_ENV;
  delete nodeRequire.cache[path];
  (process.env as Record<string, string>).NODE_ENV = nodeEnv;
  try {
    return nodeRequire(path) as {
      globalHeaders: { key: string; value: string }[];
      reportOnlyPolicy: string;
    };
  } finally {
    (process.env as Record<string, string>).NODE_ENV = before as string;
    delete nodeRequire.cache[path];
  }
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const config = require('../../../next.config.js') as {
  poweredByHeader: boolean;
  headers: () => Promise<{ source: string; headers: { key: string; value: string }[] }[]>;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { SECRET_PAGE_SOURCES } = require('../../../security-headers.js') as {
  SECRET_PAGE_SOURCES: string[];
};

const header = (rules: { headers: { key: string; value: string }[] }[], key: string) =>
  rules.flatMap((r) => r.headers).find((h) => h.key === key)?.value;

describe('security headers', () => {
  it('goes on every path', async () => {
    const rules = await config.headers();
    const global = rules.find((r) => r.source === '/:path*');
    expect(global).toBeDefined();
    const keys = global!.headers.map((h) => h.key);
    for (const k of [
      'X-Frame-Options',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Permissions-Policy',
      'Content-Security-Policy',
      'Content-Security-Policy-Report-Only',
    ]) {
      expect(keys, k).toContain(k);
    }
  });

  it('turns off x-powered-by', () => {
    expect(config.poweredByHeader).toBe(false);
  });

  it('enforces only the directives that cannot break a page', async () => {
    const rules = await config.headers();
    const csp = rules.find((r) => r.source === '/:path*')!.headers.find((h) => h.key === 'Content-Security-Policy')!.value;
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).not.toContain('script-src');
  });

  it('keeps unsafe-eval, plain http images and IDE frames out of the production policy', () => {
    const { reportOnlyPolicy: production } = loadSecurityHeaders('production');
    expect(production).not.toContain('unsafe-eval');
    expect(production).not.toMatch(/img-src[^;]*\shttp:/);
    expect(production).not.toContain('cloudworkstations');
    expect(production).toContain('report-uri /api/csp-report');
    // Development needs eval for hot reloading, and only development.
    expect(loadSecurityHeaders('development').reportOnlyPolicy).toContain("'unsafe-eval'");
  });

  it('sends HSTS in production only, for this host only, without a preload entry', () => {
    const production = loadSecurityHeaders('production').globalHeaders.find((h) => h.key === 'Strict-Transport-Security');
    expect(production?.value).toBe('max-age=31536000');
    expect(loadSecurityHeaders('development').globalHeaders.some((h) => h.key === 'Strict-Transport-Security')).toBe(false);
  });

  it('sends the shop pages whose URL is a secret with no referrer, no cache and no index', async () => {
    const rules = await config.headers();
    for (const source of SECRET_PAGE_SOURCES) {
      const rule = rules.find((r) => r.source === source);
      expect(rule, source).toBeDefined();
      expect(header([rule!], 'Referrer-Policy')).toBe('no-referrer');
      expect(header([rule!], 'Cache-Control')).toBe('private, no-store');
      expect(header([rule!], 'X-Robots-Tag')).toBe('noindex, nofollow');
    }
    // After the global rule, so they override it.
    const index = (s: string) => rules.findIndex((r) => r.source === s);
    for (const source of SECRET_PAGE_SOURCES) expect(index(source)).toBeGreaterThan(index('/:path*'));
  });

  it('covers the download page and every shop event\'s thanks page', () => {
    expect(SECRET_PAGE_SOURCES).toContain('/d/:path*');
    for (const event of SHOP_EVENTS) {
      expect(SECRET_PAGE_SOURCES, event.path).toContain(`${event.path}/thanks`);
    }
  });

  it('keeps lead-magnet files out of search results', async () => {
    const rules = await config.headers();
    for (const source of ['/:path*.pdf', '/:path*.csv']) {
      expect(header(rules.filter((r) => r.source === source), 'X-Robots-Tag'), source).toBe('noindex');
    }
  });
});
