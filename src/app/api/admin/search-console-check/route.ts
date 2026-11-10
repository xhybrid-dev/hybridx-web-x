import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-auth';
import {
  SearchConsoleError,
  harvestWindow,
  identity,
  listSites,
  liveSearchConsole,
  searchAnalytics,
  searchConsoleSite,
} from '@/lib/google/search-console';
import { getHarvestState } from '@/lib/guides/harvest/run';

/**
 * Admin-only Search Console diagnostic (docs/content-engine-plan.md, step 6).
 *
 * Reports the identity the site reads Search Console as, the properties that
 * identity can see, whether the configured property is among them, and
 * whether a one-row query works, with Google's own reason when it does not.
 * Read-only: it changes nothing here or in Search Console.
 */

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' };

const reason = (e: unknown) => (e instanceof SearchConsoleError ? { status: e.status ?? null, message: e.message } : { status: null, message: e instanceof Error ? e.message : String(e) });

export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Not authorised' }, { status: 401, headers: NO_STORE });

  const site = searchConsoleSite();
  const report: Record<string, unknown> = { site, identity: await identity() };

  try {
    const sites = await listSites(liveSearchConsole);
    const entry = sites.find((s) => s.siteUrl === site);
    report.sitesVisible = sites;
    report.property = entry ? { found: true, permissionLevel: entry.permissionLevel } : { found: false, hint: 'Add the identity above to this property as a Restricted user, or set SEARCH_CONSOLE_SITE to one of sitesVisible.' };
  } catch (e) {
    report.sitesVisible = { error: reason(e) };
  }

  try {
    const rows = await searchAnalytics(liveSearchConsole, site, harvestWindow(new Date()));
    report.query = { ok: true, rows: rows.length };
  } catch (e) {
    report.query = { ok: false, error: reason(e) };
  }

  report.harvest = await getHarvestState().catch((e) => ({ error: reason(e) }));
  return NextResponse.json(report, { headers: NO_STORE });
}
