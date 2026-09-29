// GET /api/admin/plan-finder/export?table=steps|products|sources|rules|cells&range=...
// A plan finder table as CSV, for the same range the admin page shows.
// Aggregate counts only: no personal data is exported from here.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-auth';
import { loadRange, reportFor } from '@/lib/plan-finder/store';
import { parseRange } from '@/components/admin/plan-finder/range';

export const dynamic = 'force-dynamic';

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  // Leading = + - @ would run as a formula when the file is opened in a spreadsheet.
  const safe = /^[=+\-@]/.test(str) ? "'" + str : str;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
const rate = (x: number | null) => (x === null ? '' : (x * 100).toFixed(1));

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const q = Object.fromEntries(request.nextUrl.searchParams.entries());
  const range = parseRange(q);
  const table = q.table;
  const { merged } = await loadRange(range.from, range.to, { demo: range.demo, today: range.today });
  const { report: r } = reportFor(merged);

  let rows: unknown[][];
  if (table === 'steps') {
    rows = [['step', 'name', 'views', 'answered', 'went_back', 'left_here', 'drop_rate_pct', 'back_rate_pct']];
    r.stepFunnel.forEach((s) => rows.push([s.step, s.name, s.views, s.answered, s.back, s.exits, rate(s.dropRate), rate(s.backRate)]));
  } else if (table === 'products') {
    rows = [['product', 'title', 'shown_first', 'clicked', 'click_rate_pct', 'feedback_yes', 'feedback_partly', 'feedback_no', 'no_rate_pct']];
    r.products.forEach((p) => rows.push([p.id, p.title ?? '', p.results, p.clicks, rate(p.ctr), p.feedbackYes, p.feedbackPartly, p.feedbackNo, rate(p.feedbackNoRate)]));
  } else if (table === 'sources') {
    rows = [['source', 'visits', 'opened', 'results', 'clicked', 'skipped', 'open_rate_pct', 'completion_pct', 'click_rate_pct', 'skip_rate_pct']];
    r.sources.forEach((s) => rows.push([s.ref, s.sessions, s.opened, s.result, s.clicked, s.skipped, rate(s.openRate), rate(s.completionRate), rate(s.clickRate), rate(s.skipRate)]));
  } else if (table === 'rules') {
    rows = [['rule', 'results', 'share_of_results_pct']];
    (r.answerShares.rulePath ?? []).forEach((x: { key: string; count: number; share: number | null }) => rows.push([x.key, x.count, rate(x.share)]));
  } else if (table === 'cells') {
    rows = [['goal', 'format', 'results', 'clicks', 'click_rate_pct', 'feedback_no']];
    r.demand.cells.forEach((c) => rows.push([c.goal, c.format, c.results, c.clicks, rate(c.clickRate), c.feedbackNo]));
  } else {
    return NextResponse.json({ error: 'Unknown table' }, { status: 400 });
  }

  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="plan-finder-${table}-${range.from}-to-${range.to}${range.demo ? '-demo' : ''}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
