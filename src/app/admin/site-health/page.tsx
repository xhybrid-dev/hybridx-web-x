import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-auth';
import { loginUrlFor } from '@/lib/admin-return';
import LogoutButton from '@/app/admin/leads/LogoutButton';
import { errorsOf } from '@/lib/site-health/analyse';
import { listHealthStates } from '@/lib/site-health/live';
import { PAGES_PER_RUN, type HealthState } from '@/lib/site-health/run';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Site health', robots: { index: false, follow: false } };

const WHEN = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });

function Row({ s }: { s: HealthState }) {
  const errors = errorsOf(s.issues);
  return (
    <li className="p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold">
          {s.kind === 'page' && s.path ? (
            <Link href={s.path} className="underline underline-offset-4">
              {s.path}
            </Link>
          ) : (
            s.label
          )}
        </span>
        <span className="text-xs text-muted-foreground">checked {WHEN.format(new Date(s.checkedAt))}</span>
      </div>
      <ul className="mt-1 space-y-1 text-sm">
        {s.issues.map((i, n) => (
          <li key={n} className={i.severity === 'error' ? 'text-destructive' : 'text-muted-foreground'}>
            <strong>{i.severity === 'error' ? 'Error' : 'Tidy'}:</strong> {i.message}
          </li>
        ))}
      </ul>
      {errors.length > 0 && s.alertedAt && <p className="mt-1 text-xs text-muted-foreground">Emailed {WHEN.format(new Date(s.alertedAt))}.</p>}
    </li>
  );
}

export default async function SiteHealthPage() {
  const session = await getAdminSession();
  if (!session) redirect(loginUrlFor('/admin/site-health'));
  const states = await listHealthStates();
  const site = states.filter((s) => s.kind === 'site').sort((a, b) => a.label.localeCompare(b.label));
  const pages = states.filter((s) => s.kind === 'page');
  const failing = pages.filter((s) => errorsOf(s.issues).length > 0);
  const tidy = pages.filter((s) => s.issues.length > 0 && errorsOf(s.issues).length === 0);
  const oldest = pages.length ? pages.reduce((a, b) => (a.checkedAt < b.checkedAt ? a : b)).checkedAt : null;

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-headline text-2xl font-bold text-primary">Site health</h1>
            <p className="text-sm text-muted-foreground">Signed in as {session.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link href="/admin/guides" className="underline underline-offset-4">
              Guides
            </Link>
            <LogoutButton />
          </div>
        </header>

        <p className="text-sm text-muted-foreground">
          Every hour the live site is read the way a search engine reads it: the checks that cover the whole site every time, and the {PAGES_PER_RUN} pages
          checked longest ago, so every page in the sitemap is covered every few hours. An error (a page that is missing, marked noindex, has no
          canonical or broken structured data, or a broken site-wide check) sends you one email, and again only after three days if it persists.
          &ldquo;Tidy&rdquo; items are listed here and never emailed.
        </p>

        {states.length === 0 ? (
          <p className="rounded-md border p-4 text-sm">Nothing checked yet. The first hourly run after a deploy to production fills this in.</p>
        ) : (
          <>
            <p className="text-sm">
              {pages.length} pages on record · <strong>{failing.length}</strong> with errors · <strong>{tidy.length}</strong> to tidy
              {oldest ? <> · least recently checked {WHEN.format(new Date(oldest))}</> : null}
            </p>

            <section>
              <h2 className="mb-2 font-headline text-lg font-bold">Site-wide checks</h2>
              <ul className="divide-y rounded-lg border">
                {site.map((s) => (
                  <li key={s.key} className="flex flex-wrap items-baseline justify-between gap-2 p-4 text-sm">
                    <span className="font-semibold">{s.label}</span>
                    <span className={errorsOf(s.issues).length ? 'text-destructive' : s.issues.length ? 'text-muted-foreground' : 'text-green-700'}>
                      {s.issues.length ? s.issues.map((i) => i.message).join(' ') : 'OK'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {failing.length > 0 && (
              <section>
                <h2 className="mb-2 font-headline text-lg font-bold">Pages with errors</h2>
                <ul className="divide-y rounded-lg border border-destructive/40">{failing.map((s) => <Row key={s.key} s={s} />)}</ul>
              </section>
            )}

            {tidy.length > 0 && (
              <section>
                <h2 className="mb-2 font-headline text-lg font-bold">To tidy</h2>
                <ul className="divide-y rounded-lg border">{tidy.map((s) => <Row key={s.key} s={s} />)}</ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
