import { listPublishedGuides } from '@/lib/guides/store';
import { buildGuidesFeed } from '@/lib/guides/feed';

// The articles as an RSS 2.0 feed, for readers, aggregators and anyone syndicating
// the three-a-week guides. Per request (the articles come from Firestore, which the
// build cannot read), kept by the CDN for an hour.
export const dynamic = 'force-dynamic';

export async function GET() {
  let guides: Awaited<ReturnType<typeof listPublishedGuides>> = [];
  try {
    guides = await listPublishedGuides();
  } catch (error) {
    console.error('[guides/feed.xml] could not read the articles:', error instanceof Error ? error.message : error);
  }
  return new Response(buildGuidesFeed(guides), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
