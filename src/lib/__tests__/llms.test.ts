// /llms.txt is generated from the sitemap, and says only what is true.
//
// The static file had listed a noindex page, described features the calculators
// do not have (negative splits, Lombardi, BMI, HRV), claimed 10 km of running and
// omitted 23 live pages.

import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/lib/guides/store', () => ({
  listPublishedGuides: async () => [
    { slug: 'singles-or-doubles', title: 'Singles or doubles for a first HYROX?', description: 'Pick by your partner, not your pride.' },
  ],
}));

import sitemap from '@/lib/sitemap';
import { PAGE_INFO, buildLlmsTxt } from '@/lib/llms';

process.env.SHOP_SALES_OPEN = 'true';
process.env.SHOP_SALES_CLOSE_AT = '2099-01-01T00:00:00Z';

async function render() {
  const paths = (await sitemap()).map((e) => new URL(e.url).pathname);
  const { GET } = await import('../../app/llms.txt/route');
  return { paths, text: await (await GET()).text(), direct: buildLlmsTxt({ paths, guides: [] }) };
}

describe('llms.txt', () => {
  it('lists every page in the sitemap, so none can be left out', async () => {
    const { paths, text } = await render();
    const missing = paths
      .filter((p) => p !== '/hyrox-glasgow-2027/thanks' && !p.startsWith('/guides/'))
      .filter((p) => !text.includes(p === '/' ? 'https://hybridx.club)' : `https://hybridx.club${p})`) && !text.includes(`https://hybridx.club${p}\n`));
    expect(missing).toEqual([]);
  });

  it('has a description for every page the sitemap lists', async () => {
    const { paths } = await render();
    const undescribed = paths.filter((p) => !p.startsWith('/guides/') || p === '/guides/how-we-write').filter((p) => !PAGE_INFO[p] && !p.startsWith('/hyrox-glasgow'));
    expect(undescribed, 'add a row to PAGE_INFO in src/lib/llms.ts').toEqual([]);
  });

  it('lists the published articles', async () => {
    const { text } = await render();
    expect(text).toContain('/guides/singles-or-doubles');
  });

  it('does not list pages that are noindex, retired or per-person', async () => {
    const { text } = await render();
    for (const gone of ['/12-week-hyrox', '/start)', '/confirm', '/resend', '/d/', '/thanks', '/home-control', '/admin']) {
      expect(text, gone).not.toContain(gone);
    }
  });

  it('does not describe features the tools do not have, or old facts', async () => {
    const { direct } = await render();
    for (const wrong of [/negative split/i, /lombardi/i, /\bBMI\b/, /\bHRV\b/, /approximately 10\s?km/i, /200\+/, /four 12-week/i, /emailed to you|by email\./i]) {
      expect(direct, String(wrong)).not.toMatch(wrong);
    }
    // The one email mention that is true: the VO2max guide is sent by email.
    expect(direct).toContain('sent by email');
  });

  it('states the product facts as the registry does', async () => {
    const { direct } = await render();
    expect(direct).toContain('£5/month');
    expect(direct).toContain('14-day free trial');
    expect(direct).toContain('Over 2,000 athletes have trained with HybridX plans');
    expect(direct).toContain('8 km');
  });

  it('is served as text the CDN may keep for an hour', async () => {
    const { GET } = await import('../../app/llms.txt/route');
    const res = await GET();
    expect(res.headers.get('content-type')).toContain('text/plain');
    expect(res.headers.get('cache-control')).toContain('s-maxage=3600');
  });
});
