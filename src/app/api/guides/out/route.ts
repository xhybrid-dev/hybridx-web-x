import { NextRequest, NextResponse } from 'next/server';
import { CTAS, type CtaId } from '@/lib/guides/ctas';
import { guideSrc, recordClick } from '@/lib/guides/performance';
import { getPublicGuide } from '@/lib/guides/store';
import { TOOLS, type ToolId } from '@/lib/guides/topics';

/**
 * GET /api/guides/out?g=<article>&cta=<variant> or &tool=<tool>
 *
 * Counts one click on an article's call to action or tool, then sends the
 * reader on (docs/content-engine-plan.md, step 7). Stores a total per article
 * and nothing else: no cookie, no identifier, no IP address.
 *
 * Not an open redirect: the destination is looked up from the registry by id,
 * never read from the URL. A call to action carries src=guide-<article> so a
 * lead from it is credited to the article. Bots, and links to articles that
 * are not public, are sent on without counting. A tool link carries the src
 * too, so a sign-up on a tool page (the week planner's) is credited as well.
 */

export const dynamic = 'force-dynamic';

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor|scan/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const slug = q.get('g') ?? '';
  const cta = q.get('cta');
  const tool = q.get('tool');

  const target =
    cta && Object.hasOwn(CTAS, cta)
      ? { kind: 'cta' as const, path: CTAS[cta as CtaId].href, hash: CTAS[cta as CtaId].hash }
      : tool && Object.hasOwn(TOOLS, tool)
        ? { kind: 'tool' as const, path: TOOLS[tool as ToolId].route, hash: undefined }
        : null;
  if (!target) return NextResponse.redirect(new URL('/guides', request.url), 302);
  const destination = new URL(target.path, request.url);
  if (SLUG.test(slug)) destination.searchParams.set('src', guideSrc(slug));
  if (target.hash) destination.hash = target.hash;

  if (SLUG.test(slug) && !BOT.test(request.headers.get('user-agent') ?? '')) {
    try {
      if ((await getPublicGuide(slug))?.status === 'published') await recordClick(slug, target.kind);
    } catch (error) {
      // Counting must never stand between a reader and the page they asked for.
      console.error('[guides/out] click not counted:', error instanceof Error ? error.message : error);
    }
  }

  const response = NextResponse.redirect(destination, 302);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}
