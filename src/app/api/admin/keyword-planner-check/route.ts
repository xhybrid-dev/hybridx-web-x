import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-auth';
import {
  ADS_API_VERSION,
  KeywordPlannerError,
  accessToken,
  adsConfig,
  historicalMetrics,
  liveKeywordPlanner,
} from '@/lib/google/keyword-planner';

/**
 * Admin-only Keyword Planner diagnostic (docs/content-engine-plan.md, step 10).
 *
 * Says which credentials are present (names, never values), whether the
 * refresh token still mints an access token, and whether one real request
 * works, with Google's reason, explained, when it does not. Read-only.
 */

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' };

const reason = (e: unknown) => ({
  code: e instanceof KeywordPlannerError ? (e.code ?? null) : null,
  message: e instanceof Error ? e.message : String(e),
});

export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Not authorised' }, { status: 401, headers: NO_STORE });

  const config = adsConfig();
  if (!config.ok) {
    return NextResponse.json(
      { apiVersion: ADS_API_VERSION, configured: false, missing: config.missing, next: 'Create and grant the secrets, then bind them in apphosting.yaml (plan, step 10).' },
      { headers: NO_STORE },
    );
  }

  const report: Record<string, unknown> = {
    apiVersion: ADS_API_VERSION,
    configured: true,
    customerId: config.config.customerId,
    loginCustomerId: config.config.loginCustomerId ?? null,
  };
  try {
    await accessToken(liveKeywordPlanner, config.config);
    report.token = { ok: true };
  } catch (e) {
    report.token = { ok: false, error: reason(e) };
    return NextResponse.json(report, { headers: NO_STORE });
  }
  try {
    const [v] = await historicalMetrics(liveKeywordPlanner, config.config, ['hyrox training plan']);
    report.query = { ok: true, sample: v ? { keyword: v.keyword, avgMonthly: v.avgMonthly, months: v.months.length } : null };
  } catch (e) {
    report.query = { ok: false, error: reason(e) };
  }
  return NextResponse.json(report, { headers: NO_STORE });
}
