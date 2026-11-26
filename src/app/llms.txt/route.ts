import sitemap from '@/lib/sitemap';
import { listPublishedGuides } from '@/lib/guides/store';
import { buildLlmsTxt } from '@/lib/llms';

// /llms.txt, generated from the sitemap and the published articles so it cannot
// drift from the site. Served per request (the articles come from Firestore, which
// the build cannot read) and kept by the CDN for an hour, like /sitemap.xml.
export const dynamic = 'force-dynamic';

export async function GET() {
  const entries = await sitemap();
  const paths = entries.map((e) => new URL(e.url).pathname).filter((p) => p !== '/hyrox-glasgow-2027/thanks');
  let guides: { slug: string; title: string; description: string }[] = [];
  try {
    guides = (await listPublishedGuides()).map((g) => ({ slug: g.slug, title: g.title, description: g.description }));
  } catch (error) {
    console.error('[llms.txt] could not read the articles:', error instanceof Error ? error.message : error);
  }
  return new Response(buildLlmsTxt({ paths, guides }), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
