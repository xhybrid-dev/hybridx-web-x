import { describe, expect, it } from 'vitest';
import { buildGuidesFeed } from '../guides/feed';
import manifest from '../../app/manifest';

describe('the guides feed', () => {
  const guides = [
    { slug: 'newer', title: 'Rest <90> & "go"', description: "Don't skip ]]> this", publishedAt: '2026-11-18T07:00:00.000Z', updatedAt: '2026-11-17T09:00:00.000Z' },
    { slug: 'older', title: 'Older', description: 'Older one.', publishedAt: undefined, updatedAt: '2026-11-10T07:00:00.000Z' },
  ];

  it('is RSS 2.0 with one item per article, linked to the article', () => {
    const xml = buildGuidesFeed(guides);
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>\n<rss version="2\.0"/);
    expect(xml.match(/<item>/g)).toHaveLength(2);
    expect(xml).toContain('<link>https://hybridx.club/guides/newer</link>');
    expect(xml).toContain('<pubDate>Wed, 18 Nov 2026 07:00:00 GMT</pubDate>');
    expect(xml).toContain('<lastBuildDate>Wed, 18 Nov 2026 07:00:00 GMT</lastBuildDate>');
  });

  it('escapes text so a title cannot break the XML', () => {
    const xml = buildGuidesFeed(guides);
    expect(xml).toContain('<title>Rest &lt;90&gt; &amp; &quot;go&quot;</title>');
    expect(xml).toContain('Don&apos;t skip ]]&gt; this');
    expect(xml).not.toContain('<90>');
  });

  it('is a valid empty feed with no articles', () => {
    const xml = buildGuidesFeed([]);
    expect(xml).not.toContain('<item>');
    expect(xml).not.toContain('lastBuildDate');
  });
});

describe('the web app manifest', () => {
  it('names the site and uses the icons that exist', () => {
    const m = manifest();
    expect(m.name).toBe('HybridX Hub');
    expect(m.lang).toBe('en-GB');
    expect(m.icons?.map((i) => i.src)).toEqual(['/icon.png', '/apple-icon.png']);
  });
});
