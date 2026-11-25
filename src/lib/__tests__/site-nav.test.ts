// No page is left out of the navigation.
//
// Before this, 22 of 45 indexable pages were in neither the header nor the
// footer, among them the live shop, the ATHX 2027 page and all three HYROX
// tools, and the desktop Calculators menu discarded its own link. A page that
// is only reachable through other pages' copy does not get found, so this fails
// when a page is added to the sitemap and not to a menu.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/lib/guides/store', () => ({ listPublishedGuides: async () => [] }));

import sitemap from '@/lib/sitemap';
import { footerColumns, openShopLinks, primaryNav } from '@/lib/site-nav';
import { APP_LOGIN_URL } from '@/lib/app-links';

const ROOT = process.cwd();

/** The UNA Watch pages: reached from /una and from each other through the UNA apps' own chrome. */
const UNA_PAGES = ['/race', '/streak', '/trail', '/weigh-in', '/trail-quest', '/una/nerdy-bits'];

/** The older single-purpose calculators sit one click down, on the three category hubs that are in the menus. */
const HUB_PAGES = ['src/app/calculators/running/page.tsx', 'src/app/calculators/strength/page.tsx', 'src/app/calculators/general-health/page.tsx'];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

beforeAll(() => {
  process.env.SHOP_SALES_OPEN = 'true';
  process.env.SHOP_SALES_CLOSE_AT = '2099-01-01T00:00:00Z';
});

describe('the navigation', () => {
  const hrefs = () => {
    const header = primaryNav().flatMap((e) => (e.kind === 'link' ? [e.href] : e.links.map((l) => l.href)));
    const footer = footerColumns().flatMap((c) => c.links.map((l) => l.href));
    return { header: new Set(header), footer: new Set(footer), all: new Set([...header, ...footer]) };
  };

  it('has every page in the sitemap in the header or the footer, or reached from /una', async () => {
    const BASE = 'https://hybridx.club';
    const pages = (await sitemap()).map((e) => e.url.replace(BASE, '') || '/').filter((p) => p !== '/');
    const { all } = hrefs();
    const hubs = HUB_PAGES.map((f) => readFileSync(join(ROOT, f), 'utf8')).join('\n');
    const missing = pages.filter((p) => !all.has(p) && !UNA_PAGES.includes(p) && !hubs.includes(`'${p}'`) && !hubs.includes(`"${p}"`));
    expect(missing, 'in the sitemap but in no menu, and on no category hub').toEqual([]);
  });

  it('links the UNA pages from /una and the apps\' own chrome', () => {
    const files = [
      ...walk(join(ROOT, 'src/components/una-app')),
      ...walk(join(ROOT, 'src/components/una')),
      join(ROOT, 'src/app/una/page.tsx'),
      join(ROOT, 'src/lib/una-family.ts'),
    ].filter((f) => /\.(tsx?|ts)$/.test(f));
    const text = files.map((f) => readFileSync(f, 'utf8')).join('\n');
    for (const page of UNA_PAGES) expect(text, page).toContain(page);
  });

  it('gives each dropdown a real link for every item, with no "#" placeholders', () => {
    const { all } = hrefs();
    for (const href of all) expect(href, 'every link goes somewhere').toMatch(/^(\/|https:\/\/)/);
    expect([...all].some((h) => h === '#')).toBe(false);
  });

  it('reaches the calculators hub and the three HYROX tools from the Tools menu', () => {
    const tools = primaryNav().find((e) => e.kind === 'group' && e.label === 'Tools');
    expect(tools && tools.kind === 'group' && tools.links.map((l) => l.href)).toEqual(
      expect.arrayContaining([
        '/calculators',
        '/calculators/hyrox-pacer',
        '/calculators/week-planner',
        '/calculators/strength-engine-test',
      ]),
    );
  });

  it('has ATHX 2027, the rule changes and the Glasgow packs where an athlete would look', () => {
    const { header, footer } = hrefs();
    for (const href of ['/athx-2027', '/hyrox-rule-changes-2026']) {
      expect(header.has(href), `${href} in the header`).toBe(true);
      expect(footer.has(href), `${href} in the footer`).toBe(true);
    }
    expect(header.has('/hyrox-glasgow-2027') && footer.has('/hyrox-glasgow-2027')).toBe(true);
  });

  it('leaves the shop out of the menus while its sales are closed', () => {
    expect(openShopLinks(new Date('2099-06-01T00:00:00Z'))).toEqual([]);
    expect(openShopLinks(new Date('2026-12-01T00:00:00Z')).map((l) => l.href)).toEqual(['/hyrox-glasgow-2027']);
  });

  it('gives a returning member a way in, and a customer a way to get a lost download back', () => {
    const { footer } = hrefs();
    expect(footer.has(APP_LOGIN_URL)).toBe(true);
    expect(footer.has('/resend')).toBe(true);
    expect(footer.has('/contact')).toBe(true);
    const header = readFileSync(join(ROOT, 'src/components/Header.tsx'), 'utf8');
    expect(header).toContain('APP_LOGIN_URL');
    expect(header).not.toContain('<LogIn');
    expect(header).not.toMatch(/href=\{[^}]*\|\|\s*'#'\}/);
  });
});
