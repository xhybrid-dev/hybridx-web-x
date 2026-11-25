// src/lib/guides/feed.ts
//
// RSS 2.0 for the published articles. Plain strings, with every value escaped:
// article text is data, and a "]]>" or "<" in a title must not break the XML.

import { SITE_CONFIG } from '@/lib/seo';
import { guidePath } from './schema';
import type { Guide } from './types';

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/** RFC 822 date, as RSS wants. */
const rfc822 = (iso: string) => new Date(iso).toUTCString();

export function buildGuidesFeed(guides: Pick<Guide, 'slug' | 'title' | 'description' | 'publishedAt' | 'updatedAt'>[]): string {
  const base = SITE_CONFIG.url;
  const newest = guides.map((g) => g.publishedAt ?? g.updatedAt).sort().pop();
  const items = guides
    .map((g) => {
      const url = `${base}${guidePath(g.slug)}`;
      return `    <item>
      <title>${escape(g.title)}</title>
      <link>${escape(url)}</link>
      <guid isPermaLink="true">${escape(url)}</guid>
      <description>${escape(g.description)}</description>
      <pubDate>${rfc822(g.publishedAt ?? g.updatedAt)}</pubDate>
    </item>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>HybridX Guides</title>
    <link>${base}/guides</link>
    <description>Short, clear answers to single HYROX and hybrid training questions, each reviewed by HybridX trainer Jon Lee.</description>
    <language>en-gb</language>
    <atom:link href="${base}/guides/feed.xml" rel="self" type="application/rss+xml" />
${newest ? `    <lastBuildDate>${rfc822(newest)}</lastBuildDate>\n` : ''}${items}
  </channel>
</rss>
`;
}
