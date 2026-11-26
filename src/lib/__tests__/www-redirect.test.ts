// www.hybridx.club is bound to the same App Hosting backend as hybridx.club. Left alone,
// every page would answer on two hostnames. Canonical tags would paper over it for Google,
// but not for the links, shares and bookmarks that already point at www.

import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const nodeRequire = createRequire(import.meta.url);

type Redirect = { source: string; destination: string; permanent: boolean; has?: { type: string; value: string }[] };

describe('www.hybridx.club', () => {
  it('redirects, permanently, to the same path on hybridx.club and nothing else does', async () => {
    const config = nodeRequire('../../../next.config.js') as { redirects: () => Promise<Redirect[]> };
    const redirects = await config.redirects();
    const www = redirects.find((r) => r.has?.some((h) => h.type === 'host' && h.value === 'www.hybridx.club'));
    expect(www).toBeDefined();
    expect(www!.source).toBe('/:path*');
    expect(www!.destination).toBe('https://hybridx.club/:path*');
    expect(www!.permanent).toBe(true);
    // The host condition is what stops this redirecting the apex to itself.
    expect(redirects.filter((r) => r.destination.startsWith('https://')).every((r) => r.has?.length)).toBe(true);
  });
});
