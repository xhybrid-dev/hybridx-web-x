// Amazon links are affiliate links, and say so.
//
// Every Amazon book link on the site carries the HybridX associate tag, but two
// of them were marked "not affiliate" in the plan finder, so they lost
// rel="sponsored", and no page told the reader that HybridX earns from them.
// The UK CAP Code asks for the disclosure beside the link; Amazon's Associates
// agreement asks for the statement. These tests hold both.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import funnel from '@/lib/plan-finder/funnel.json';
import { books, homepageBooks } from '@/lib/books';
import { AFFILIATE_DISCLOSURE } from '@/components/AffiliateDisclosure';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const AMAZON_HOST = /^https:\/\/(?:amzn\.to|link\.amazon|www\.amazon\.[a-z.]+|amazon\.[a-z.]+)\//;

describe('the plan finder catalog', () => {
  const products = Object.values((funnel as unknown as { catalog: Record<string, { id: string; href: string; affiliate: boolean; destinationType: string }> }).catalog);

  it('marks every Amazon product as an affiliate link', () => {
    const amazon = products.filter((p) => AMAZON_HOST.test(p.href));
    expect(amazon.map((p) => p.id).sort()).toEqual(['athx', 'elite', 'home', 'twelve', 'ultra']);
    for (const p of amazon) {
      expect(p.affiliate, p.id).toBe(true);
      expect(p.destinationType, p.id).toBe('amazon-affiliate');
    }
  });

  it('has no Amazon product that is not an affiliate link, and no affiliate link that is not Amazon', () => {
    for (const p of products) expect(p.destinationType === 'amazon-affiliate', p.id).toBe(AMAZON_HOST.test(p.href));
  });

  it('uses the link.amazon links the owner supplied for ATHX and ULTRA STRENGTH', () => {
    const byId = Object.fromEntries(products.map((p) => [p.id, p.href]));
    expect(byId.athx).toBe('https://link.amazon/B0g5sdBgd');
    expect(byId.ultra).toBe('https://link.amazon/B0dzb9lZh');
  });
});

describe('the books catalog', () => {
  it('sends every book to an Amazon affiliate link', () => {
    for (const b of books) expect(b.amazonUrl, b.id).toMatch(AMAZON_HOST);
  });

  it('lists all seven books, with the supplied ATHX and ULTRA links and their ASINs', () => {
    const byId = Object.fromEntries(books.map((b) => [b.id, b]));
    expect(books).toHaveLength(7);
    expect(byId['athx-2027-mens']).toMatchObject({ amazonUrl: 'https://link.amazon/B0g5sdBgd', asin: 'B0HH8QQF9N' });
    expect(byId['athx-2027-womens']).toMatchObject({ amazonUrl: 'https://link.amazon/B09UkaF2U', asin: 'B0HH8RGVN1' });
    expect(byId['ultra-strength']).toMatchObject({ amazonUrl: 'https://link.amazon/B0dzb9lZh', asin: 'B0H5CCCYNH' });
  });

  it('shows only books with a cover in the homepage section', () => {
    expect(homepageBooks.length).toBeGreaterThan(0);
    for (const b of homepageBooks) expect(b.imageUrl, b.id).toBeTruthy();
  });
});

describe('the pages that link to Amazon', () => {
  it('show the disclosure beside the links, and mark the links sponsored', () => {
    for (const file of ['src/app/books/page.tsx', 'src/components/AmazonBookPromotion.tsx']) {
      const src = read(file);
      expect(src, file).toContain('<AffiliateDisclosure');
      expect(src, file).toContain('rel="sponsored noopener noreferrer"');
      expect(src, file).not.toMatch(/rel="noopener noreferrer"\s+event="cta_book_click"/);
    }
  });

  it('shows the disclosure in the plan finder result when a product is an affiliate link', () => {
    expect(read('src/components/plan-finder/PlanFinderDialog.tsx')).toContain('Affiliate disclosure: links to Amazon are affiliate links.');
  });

  it('says in the terms that some links are affiliate links', () => {
    expect(read('src/app/terms/page.tsx')).toContain('As an Amazon Associate, HybridX earns from qualifying');
  });

  it('uses the disclosure sentence Amazon asks for', () => {
    expect(AFFILIATE_DISCLOSURE).toContain('As an Amazon Associate, HybridX earns from qualifying purchases');
  });
});
