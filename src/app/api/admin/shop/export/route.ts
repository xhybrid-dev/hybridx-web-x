import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-auth';
import { loadReportOrders } from '@/lib/shop/report-data';
import { ordersCsv, ukDay } from '@/lib/shop/vat-report';

/**
 * GET → every shop order as CSV, with location evidence and no personal
 * details. Admin only. `?test=1` includes Stripe test-mode orders.
 */
export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const includeTest = request.nextUrl.searchParams.get('test') === '1';
  const { orders } = await loadReportOrders();
  const rows = orders.filter((o) => includeTest || o.livemode);

  return new NextResponse(ordersCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="shop-orders-${ukDay(new Date())}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
