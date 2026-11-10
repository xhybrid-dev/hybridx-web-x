import type { MetadataRoute } from 'next';
import sitemap from '@/lib/sitemap';

/*
 * /sitemap.xml, built by src/lib/sitemap.ts.
 *
 * A route handler rather than app/sitemap.ts so it can set its own caching.
 * It cannot be prerendered (force-static): it reads published articles from
 * Firestore, which the build has no credentials for, and answers differently
 * for the race., streak. and trail. subdomains. Instead the CDN keeps each
 * host's answer for an hour and serves the old one for a day while it
 * refreshes, so Googlebot gets it from the edge, not from a cold server. A new
 * article reaches the sitemap within the hour.
 */

export const dynamic = 'force-dynamic';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

function toXml(entries: MetadataRoute.Sitemap): string {
  const urls = entries.map((e) => {
    const lastmod = e.lastModified ? `<lastmod>${esc(new Date(e.lastModified).toISOString())}</lastmod>` : '';
    const freq = e.changeFrequency ? `<changefreq>${e.changeFrequency}</changefreq>` : '';
    const priority = e.priority !== undefined ? `<priority>${e.priority}</priority>` : '';
    return `<url><loc>${esc(e.url)}</loc>${lastmod}${freq}${priority}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export async function GET() {
  return new Response(toXml(await sitemap()), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
