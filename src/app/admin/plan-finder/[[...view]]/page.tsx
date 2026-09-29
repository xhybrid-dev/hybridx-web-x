import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getAdminSession } from '@/lib/admin-auth';
import { FieldPath } from 'firebase-admin/firestore';
import { adminFirestore } from '@/lib/firebase-admin';
import { COLLECTIONS } from '@/lib/plan-finder/config';
import { loadRange, reportFor } from '@/lib/plan-finder/store';
import type { Insight, Report } from '@/lib/plan-finder/analytics';
import LogoutButton from '@/app/admin/leads/LogoutButton';
import { parseRange, rangeQuery, type Range } from '@/components/admin/plan-finder/range';
import { Entry, Homepage, Improve, Journey, Overview, People, PutOffs, Results, Sources, type ViewProps } from '@/components/admin/plan-finder/views';
import { Health, Leads } from '@/components/admin/plan-finder/LeadsAndHealth';

// The plan finder analytics (handover/entry-funnel/docs/05). Behind the same
// Firebase Auth allow-list as /admin/leads, checked here on every request.

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Plan finder', robots: { index: false, follow: false } };

const BASE = '/admin/plan-finder';
const VIEWS: Record<string, { title: string; question: string }> = {
  overview: { title: 'Overview', question: 'How is the plan finder doing?' },
  journey: { title: 'Journey', question: 'Where do people drop out?' },
  people: { title: 'People', question: 'Who are they, and what do they want?' },
  results: { title: 'Results', question: 'Is the routing recommending the right thing?' },
  entry: { title: 'Entry and skips', question: 'Who skips, why, and does the entry beat the plain homepage?' },
  homepage: { title: 'Homepage', question: 'What on the existing homepage attracts attention?' },
  sources: { title: 'Sources', question: 'How do people find the site, and which sources bring the right visitors?' },
  'put-offs': { title: 'Put-offs', question: 'What puts people off?' },
  improve: { title: 'Improve', question: 'What should change next?' },
  leads: { title: 'Leads', question: 'Who asked to talk to us?' },
  health: { title: 'Data health', question: 'Is the data arriving?' },
};

async function latestReview(): Promise<{ id: string; data: Record<string, unknown> } | null> {
  const snap = await adminFirestore.collection(COLLECTIONS.insights).orderBy(FieldPath.documentId(), 'desc').limit(1).get();
  return snap.empty ? null : { id: snap.docs[0].id, data: snap.docs[0].data() };
}

export default async function PlanFinderAdmin({
  params,
  searchParams,
}: {
  params: Promise<{ view?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const { view = [] } = await params;
  const key = view[0] ?? 'overview';
  if (view.length > 1 || !VIEWS[key]) notFound();
  const range = parseRange(await searchParams);
  const query = rangeQuery(range);

  let body: React.ReactNode;
  let dataThrough: string | null = null;
  let loadError = '';
  if (key === 'health') {
    body = <Health />;
  } else {
    try {
      const current = await loadRange(range.from, range.to, { demo: range.demo, today: range.today });
      dataThrough = current.dataThrough;
      const { report, insights } = reportFor(current.merged);
      let previous: Report | null = null;
      if (key === 'overview') {
        const prev = await loadRange(range.prevFrom, range.prevTo, { demo: range.demo });
        previous = reportFor(prev.merged).report;
      }
      const props: ViewProps = {
        report,
        previous,
        insights: insights as Insight[],
        perDay: current.perDay.map((d) => ({ day: d.day, sessions: d.doc ? d.doc.counters.sessions : null })),
        base: BASE,
        query,
        csv: (table) => `/api/admin/plan-finder/export${rangeQuery(range)}${query ? '&' : '?'}table=${table}`,
      };
      if (key === 'overview') body = <Overview {...props} />;
      else if (key === 'journey') body = <Journey {...props} />;
      else if (key === 'people') body = <People {...props} />;
      else if (key === 'results') body = <Results {...props} />;
      else if (key === 'entry') body = <Entry {...props} />;
      else if (key === 'homepage') body = <Homepage {...props} />;
      else if (key === 'sources') body = <Sources {...props} />;
      else if (key === 'put-offs') body = <PutOffs {...props} />;
      else if (key === 'improve') body = <Improve {...props} review={range.demo ? null : await latestReview().catch(() => null)} />;
      else if (key === 'leads') body = <Leads report={report} />;
    } catch (e) {
      loadError = e instanceof Error ? e.message : 'unknown error';
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-headline text-2xl font-bold text-primary">Plan finder</h1>
            <p className="text-sm text-muted-foreground">Signed in as {session.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/leads" className="text-sm underline underline-offset-4">
              Marketing leads
            </Link>
            <LogoutButton />
          </div>
        </header>

        <nav aria-label="Plan finder views" className="flex flex-wrap gap-2">
          {Object.entries(VIEWS).map(([k, v]) => (
            <Link
              key={k}
              href={`${BASE}${k === 'overview' ? '' : '/' + k}${query}`}
              aria-current={k === key ? 'page' : undefined}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                k === key ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              {v.title}
            </Link>
          ))}
        </nav>

        {key !== 'health' && <Filters range={range} path={`${BASE}${key === 'overview' ? '' : '/' + key}`} dataThrough={dataThrough} />}

        <div>
          <h2 className="font-headline text-xl font-bold">{VIEWS[key].question}</h2>
        </div>

        {loadError ? (
          <p className="rounded-md border p-4 text-sm">
            Could not load the numbers: {loadError}. <Link className="underline" href={`${BASE}/health`}>Check data health</Link>, or look at{' '}
            <Link className="underline" href={`${BASE}${key === 'overview' ? '' : '/' + key}${rangeQuery(range, { demo: '1' })}`}>
              the demo data
            </Link>
            .
          </p>
        ) : (
          body
        )}

        <footer className="border-t pt-4 text-xs leading-relaxed text-muted-foreground">
          <p>
            What these numbers cannot tell you: a visit is one page load by someone who accepted analytics, not a person, so a returning visitor counts
            again and visitors who rejected analytics are not counted at all. Amazon sales are not visible, only clicks. Nothing links a Talk to us message
            to a visit. Under about 100 visits in a period, or 30 in a cell, treat a rate as a hint. Notes are scrubbed of emails, numbers and links, but
            names are not removed.
          </p>
        </footer>
      </div>
    </div>
  );
}

function Filters({ range, path, dataThrough }: { range: Range; path: string; dataThrough: string | null }) {
  const presets: [Range['preset'], string][] = [
    ['7', 'Last 7 days'],
    ['30', 'Last 30 days'],
    ['90', 'Last 90 days'],
  ];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {presets.map(([p, text]) => (
          <Link
            key={p}
            href={path + rangeQuery(range, { range: p })}
            aria-current={range.preset === p ? 'true' : undefined}
            className={`rounded-md border px-3 py-1.5 text-sm ${range.preset === p ? 'border-primary font-semibold' : 'text-muted-foreground'}`}
          >
            {text}
          </Link>
        ))}
        <form method="get" action={path} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="range" value="custom" />
          {range.demo && <input type="hidden" name="demo" value="1" />}
          {range.today && <input type="hidden" name="today" value="1" />}
          <label className="text-sm text-muted-foreground" htmlFor="from">
            From
          </label>
          <input id="from" name="from" type="date" defaultValue={range.from} className="h-9 rounded-md border bg-background px-2 text-sm" />
          <label className="text-sm text-muted-foreground" htmlFor="to">
            to
          </label>
          <input id="to" name="to" type="date" defaultValue={range.to} className="h-9 rounded-md border bg-background px-2 text-sm" />
          <button type="submit" className="h-9 rounded-md border px-3 text-sm">
            Show
          </button>
        </form>
        <Link href={path + rangeQuery(range, { today: range.today ? null : '1' })} className="rounded-md border px-3 py-1.5 text-sm text-muted-foreground" aria-pressed={range.today}>
          {range.today ? '✓ ' : ''}Today so far
        </Link>
        <Link href={path + rangeQuery(range, { demo: range.demo ? null : '1' })} className="rounded-md border px-3 py-1.5 text-sm text-muted-foreground" aria-pressed={range.demo}>
          {range.demo ? '✓ ' : ''}Demo data
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        {range.from} to {range.to} ({range.days} days).{' '}
        {range.demo ? (
          <strong className="text-foreground">Showing made-up demo traffic, not real visitors.</strong>
        ) : dataThrough ? (
          `Data through ${dataThrough}${range.today ? ', plus today so far' : ''}.`
        ) : (
          'No daily rollups yet.'
        )}
      </p>
    </div>
  );
}
