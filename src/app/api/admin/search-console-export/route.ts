import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-auth';
import { getHarvest, getHarvestState } from '@/lib/guides/harvest/run';

/**
 * The latest (or a named) Search Console harvest as CSV, one row per query
 * group: what it was routed to, its score and numbers, and the page Google
 * showed most. Admin only, read-only.
 */

export const dynamic = 'force-dynamic';

const cell = (v: unknown) => {
  const s = String(v ?? '');
  // Quote everything, and defuse anything a spreadsheet would run as a formula:
  // query text is whatever somebody typed into Google.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET(request: NextRequest) {
  if (!(await getAdminSession())) return new NextResponse('Not authorised', { status: 401 });
  const id = request.nextUrl.searchParams.get('harvest') ?? (await getHarvestState()).lastHarvestId;
  const record = id && /^\d{4}-\d{2}-\d{2}$/.test(id) ? await getHarvest(id) : null;
  if (!record) return new NextResponse('No harvest yet', { status: 404 });

  const header = ['route', 'score', 'top query', 'impressions', 'clicks', 'position', 'page', 'pillar', 'why', 'other queries'];
  const lines = record.groups.map((g) =>
    [g.kind, g.score, g.top, g.impressions, g.clicks, g.position.toFixed(1), g.page ?? g.pages[0]?.page ?? '', g.pillar, g.why, g.queries.slice(1).join(' | ')]
      .map(cell)
      .join(','),
  );
  return new NextResponse([header.map(cell).join(','), ...lines].join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="search-${record.id}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
