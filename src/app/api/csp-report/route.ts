import { NextResponse } from 'next/server';

// Where browsers send reports from the report-only Content-Security-Policy in
// security-headers.js. Each one is a line in the server log, so the policy can
// be tightened from what real visitors' browsers actually blocked.
//
// A public endpoint that writes to the log, so it is capped: small bodies, a
// handful of fields, query strings stripped from addresses (they can hold
// tokens), and no more than a few hundred lines a minute per instance.

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 8 * 1024;
const MAX_PER_MINUTE = 300;
let windowStart = 0;
let count = 0;

function clean(value: unknown): string {
  if (typeof value !== 'string') return '';
  // Addresses lose their query string and fragment: either can hold a token.
  return value.replace(/[?#].*$/, '').slice(0, 200);
}

function summarise(report: Record<string, unknown>) {
  return {
    directive: clean(report['effective-directive'] ?? report['violated-directive'] ?? report.effectiveDirective),
    blocked: clean(report['blocked-uri'] ?? report.blockedURL),
    document: clean(report['document-uri'] ?? report.documentURL),
  };
}

export async function POST(request: Request) {
  const now = Date.now();
  if (now - windowStart > 60_000) {
    windowStart = now;
    count = 0;
  }
  if (++count > MAX_PER_MINUTE) return new NextResponse(null, { status: 204 });

  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 204 });
    const body = JSON.parse(text) as unknown;
    // The legacy format is {"csp-report": {...}}; the Reporting API sends a list of {type, body}.
    const reports: Record<string, unknown>[] = Array.isArray(body)
      ? body.map((r) => (r && typeof r === 'object' ? ((r as { body?: Record<string, unknown> }).body ?? {}) : {}))
      : [((body as { 'csp-report'?: Record<string, unknown> })?.['csp-report'] ?? {}) as Record<string, unknown>];
    for (const report of reports.slice(0, 5)) {
      console.warn('[csp-report]', JSON.stringify(summarise(report)));
    }
  } catch {
    // Not a report. Nothing to say about it.
  }
  return new NextResponse(null, { status: 204 });
}
