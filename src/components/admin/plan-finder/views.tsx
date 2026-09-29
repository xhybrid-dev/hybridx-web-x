// The plan finder admin views (handover/entry-funnel/docs/05). Each takes the
// report for the selected range and shows the numbers that answer one of the
// owner's questions. No number is computed here: they all come from report()
// and insights() in src/lib/plan-finder/analytics.

import type { Insight, Report } from '@/lib/plan-finder/analytics';
import { funnel } from '@/lib/plan-finder/content';
import DailyChart from './DailyChart';
import { label } from './labels';
import { BarList, DataTable, Note, RateGrid, SeeAlso, Section, StatTile, int, pct, points } from './ui';

export interface ViewProps {
  report: Report;
  previous: Report | null;
  insights: Insight[];
  perDay: { day: string; sessions: number | null }[];
  base: string; // '/admin/plan-finder'
  query: string; // the range query string, carried between views
  csv: (table: string) => string;
}

const SMALL = 100;
const small = (n: number) => n < SMALL;

/* ------------------------------------------------------------------------ */

export function Overview({ report: r, previous: p, insights, perDay, base, query }: ViewProps) {
  const tiles: { label: string; key: keyof Report['rates'] | 'sessions'; up: boolean; format?: 'int' }[] = [
    { label: 'Visits (page loads)', key: 'sessions', up: true, format: 'int' },
    { label: 'Opened the questions', key: 'openRate', up: true },
    { label: 'Finished, of those who opened', key: 'completionRate', up: true },
    { label: 'Clicked a recommendation', key: 'clickRate', up: true },
    { label: 'Skipped the entry section', key: 'skipRate', up: false },
    { label: 'Sent a Talk to us message', key: 'talkRate', up: true },
    { label: 'Left within 10 seconds', key: 'bounceRate', up: false },
  ];
  const value = (rep: Report | null, k: string) => (!rep ? null : k === 'sessions' ? rep.sessions : rep.rates[k as keyof Report['rates']]);
  return (
    <div className="space-y-6">
      {small(r.sessions) && <Note>Fewer than {SMALL} visits in this period: treat every rate as a hint, not a finding.</Note>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {tiles.map((t) => (
          <StatTile key={t.key} label={t.label} value={value(r, t.key)} previous={value(p, t.key)} format={t.format ?? 'pct'} upIsGood={t.up} />
        ))}
      </div>
      <Section title="Visits per day" description="A visit is one page load of the homepage or /start by someone who accepted analytics.">
        <DailyChart data={perDay.map((d) => ({ day: d.day, value: d.sessions }))} label="Visits" />
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-muted-foreground">Show the numbers</summary>
          <DataTable
            columns={[
              { key: 'day', label: 'Day', value: (d) => d.day },
              { key: 'n', label: 'Visits', value: (d) => (d.sessions === null ? 'No rollup' : int(d.sessions)), numeric: true },
            ]}
            rows={perDay}
          />
        </details>
      </Section>
      <Section title="Top things to improve" action={<SeeAlso href={`${base}/improve${query}`}>All findings</SeeAlso>}>
        <InsightList items={insights.slice(0, 3)} />
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

export function Journey({ report: r, csv }: ViewProps) {
  const t = r.medianBuckets;
  return (
    <div className="space-y-6">
      <Section title="Where people drop out" description="Per question: how many saw it, answered it, went back from it, and left the finder there without a result.">
        <BarList rows={r.stepFunnel.map((s) => ({ key: `${s.step}. ${s.name}`, count: s.exits, share: s.dropRate }))} shareLabel="of those who saw the step left there" />
        <div className="mt-4">
          <DataTable
            csvHref={csv('steps')}
            columns={[
              { key: 's', label: 'Question', value: (s) => `${s.step}. ${s.name}` },
              { key: 'v', label: 'Saw it', value: (s) => int(s.views), numeric: true },
              { key: 'a', label: 'Answered', value: (s) => int(s.answered), numeric: true },
              { key: 'b', label: 'Went back', value: (s) => int(s.back), numeric: true },
              { key: 'e', label: 'Left here', value: (s) => int(s.exits), numeric: true },
              { key: 'd', label: 'Drop rate', value: (s) => pct(s.dropRate), numeric: true },
              { key: 'br', label: 'Back rate', value: (s) => pct(s.backRate), numeric: true },
            ]}
            rows={r.stepFunnel}
          />
        </div>
      </Section>
      <Section title="Time on each question" description="Half of answers took less than the median; one in ten took longer than the slowest-10% figure. A slow question is often a confusing one.">
        <DataTable
          columns={[
            { key: 's', label: 'Question', value: (s: Report['stepFunnel'][number]) => `${s.step}. ${s.name}` },
            { key: 'n', label: 'Answers', value: (s) => int(t.timeOnStep['s' + s.step]?.n), numeric: true },
            { key: 'm', label: 'Median', value: (s) => t.timeOnStep['s' + s.step]?.median ?? '–', numeric: true },
            { key: 'p', label: 'Slowest 10% take', value: (s) => t.timeOnStep['s' + s.step]?.p90 ?? '–', numeric: true },
          ]}
          rows={r.stepFunnel}
        />
        <p className="mt-3 text-sm text-muted-foreground">
          From opening the questions to seeing a result: median {t.timeToResult.median ?? '–'}, slowest 10% {t.timeToResult.p90 ?? '–'} ({int(t.timeToResult.n)} results).
        </p>
      </Section>
      <Section title="How the questions were closed">
        <BarList rows={r.answerShares.closeReason ?? []} label={label.close} />
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

export function People({ report: r }: ViewProps) {
  const a = r.answerShares.answers;
  const cells = new Map(r.demand.cells.map((c) => [c.goal + '|' + c.format, c]));
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="What they are training for" description="Among visits that reached a result.">
          <BarList rows={a.goal ?? []} label={label.goal} />
        </Section>
        <Section title="Which goal they pick first" description="Everyone who chose a goal, including those who never finished. The clearest sign of what draws people in, and which goals lose them.">
          <DataTable
            columns={[
              { key: 'g', label: 'Goal', value: (g: Report['attractors']['goalStarts'][number]) => label.goal(g.goal) },
              { key: 's', label: 'Started', value: (g) => int(g.started), numeric: true },
              { key: 'r', label: 'Got a result', value: (g) => int(g.result), numeric: true },
              { key: 'c', label: 'Completion', value: (g) => pct(g.completionRate), numeric: true },
              { key: 'k', label: 'Click rate', value: (g) => pct(g.clickRate), numeric: true },
            ]}
            rows={r.attractors.goalStarts}
          />
        </Section>
        <Section title="Experience">
          <BarList rows={a.level ?? []} label={label.level} />
        </Section>
        <Section title="Where they train">
          <BarList rows={a.place ?? []} label={label.place} />
        </Section>
        <Section title="What has got in the way" description="Share of results naming each one; people can pick several. This is product research in their own terms.">
          <BarList rows={a.obst ?? []} label={label.obst} shareLabel="of results" />
        </Section>
        <Section title="How they want to follow a plan">
          <BarList rows={a.format ?? []} label={label.format} />
        </Section>
        <Section title="Weeks to their race">
          <BarList rows={a.race ?? []} label={label.race} />
        </Section>
      </div>
      <Section title="Goal by format" description="Click rate on the recommendation for each combination, with results and clicks in each cell.">
        <RateGrid
          rows={funnel.goals.map((g) => g.id)}
          cols={funnel.formats.map((f) => f.id)}
          rowLabel={label.goal}
          colLabel={label.format}
          minN={10}
          cell={(g, f) => {
            const c = cells.get(g + '|' + f);
            return c ? { n: c.results, rate: c.clickRate, detail: `${int(c.clicks)} of ${int(c.results)} clicked` } : null;
          }}
        />
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

export function Results({ report: r, csv }: ViewProps) {
  const reasons = r.answerShares.feedbackReasons ?? [];
  return (
    <div className="space-y-6">
      <Section title="Recommended first" description="Each product as the main recommendation: how often, how often it was clicked, and what people said when asked whether it fitted.">
        <DataTable
          csvHref={csv('products')}
          columns={[
            { key: 'p', label: 'Product', value: (p: Report['products'][number]) => p.title ?? label.product(p.id) },
            { key: 'r', label: 'Shown first', value: (p) => int(p.results), numeric: true },
            { key: 'c', label: 'Clicked', value: (p) => int(p.clicks), numeric: true },
            { key: 'ctr', label: 'Click rate', value: (p) => pct(p.ctr), numeric: true },
            { key: 'y', label: 'Yes', value: (p) => int(p.feedbackYes), numeric: true },
            { key: 'pt', label: 'Partly', value: (p) => int(p.feedbackPartly), numeric: true },
            { key: 'n', label: 'Not really', value: (p) => int(p.feedbackNo), numeric: true },
            { key: 'nr', label: '"Not really" rate', value: (p) => (p.feedbackN ? pct(p.feedbackNoRate) : '–'), numeric: true },
          ]}
          rows={r.products}
        />
        <p className="mt-3 text-sm text-muted-foreground">
          Amazon sales are not visible here: a click is the working measure, and sales arrive later in the KDP reports.
        </p>
      </Section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title='Why it did not fit' description='Reasons given with "Partly" or "Not really".'>
          <BarList rows={reasons} label={label.feedbackReason} shareLabel="of feedback answers" />
        </Section>
        <Section title="Main or extra" description="Clicks on the main recommendation against the extras below it.">
          <BarList rows={r.answerShares.clickBySlot ?? []} label={(k) => (k === 'primary' ? 'Main recommendation' : 'An extra')} shareLabel="of visits that clicked" />
        </Section>
      </div>
      <Section title="Rule paths" description="Which routing rules sent people to their result. A weak product can be traced back to the rule that chose it.">
        <DataTable
          csvHref={csv('rules')}
          columns={[
            { key: 'k', label: 'Rule', value: (x: { key: string; count: number; share: number | null }) => <code className="text-xs">{x.key}</code> },
            { key: 'n', label: 'Results', value: (x) => int(x.count), numeric: true },
            { key: 's', label: 'Share of results', value: (x) => pct(x.share), numeric: true },
          ]}
          rows={r.answerShares.rulePath ?? []}
        />
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

export function Entry({ report: r }: ViewProps) {
  const lift = r.variants.lift;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Skipped, of those shown the entry" value={r.rates.skipRate} />
        <StatTile label="Skipped, then clicked a homepage link" value={r.skips.thenCtaRate} note="A skipper who knew what they wanted" />
        <StatTile label="Skipped, then scrolled halfway" value={r.skips.thenScroll50Rate} />
        <StatTile label="Skipped" value={r.skips.skipped} format="int" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Where the skip happened">
          <BarList rows={r.answerShares.skipFrom ?? []} label={label.skipFrom} />
        </Section>
        <Section title="Why they skipped" description="From the optional one-row question after a skip.">
          <BarList rows={r.putOffs.skipReasons} label={label.skipReason} />
        </Section>
      </div>
      <Section title="Skip rate by source">
        <DataTable
          columns={[
            { key: 's', label: 'Source', value: (s: Report['sources'][number]) => label.source(s.ref) },
            { key: 'n', label: 'Visits', value: (s) => int(s.sessions), numeric: true },
            { key: 'k', label: 'Skipped', value: (s) => pct(s.skipRate), numeric: true },
          ]}
          rows={r.sources}
        />
      </Section>
      <Section title="Entry section against the plain homepage" description="Visits clicking any call to action, per experiment arm. A lift needs at least 30 visits in each arm; treat it as meaningful only with a few hundred.">
        <DataTable
          columns={[
            { key: 'v', label: 'Arm', value: (a: Report['variants']['arms'][number]) => label.arm(a.variant) },
            { key: 'n', label: 'Visits', value: (a) => int(a.sessions), numeric: true },
            { key: 'o', label: 'Opened', value: (a) => pct(a.openRate), numeric: true },
            { key: 'c', label: 'Completed', value: (a) => pct(a.completionRate), numeric: true },
            { key: 'x', label: 'Clicked a call to action', value: (a) => pct(a.ctaRate), numeric: true },
          ]}
          rows={r.variants.arms}
          empty="No experiment data in this period."
        />
        <div className="mt-4 text-sm">
          {lift ? (
            lift.map((l) => (
              <p key={l.variant}>
                {label.arm(l.variant)}: {points(l.absolute)} against control
                {l.relative !== null && ` (${l.relative > 0 ? '+' : ''}${(l.relative * 100).toFixed(0)}% relative)`}, z = {l.z === null ? '–' : l.z.toFixed(2)}
                {l.z !== null && Math.abs(l.z) >= 1.96 ? ', a clear difference.' : ', which may still be noise.'}
              </p>
            ))
          ) : (
            <p className="text-muted-foreground">No lift yet: each arm needs at least 30 visits, and the experiment needs to be running.</p>
          )}
        </div>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

export function Homepage({ report: r }: ViewProps) {
  const a = r.attractors;
  return (
    <div className="space-y-6">
      <Note>This is the existing homepage below the entry section. &quot;hero&quot; is its first section, named by position because it has no id.</Note>
      <Section title="Sections reached" description="Share of visits in which each section was at least 40% on screen, and the share among visits that scrolled at least halfway.">
        <DataTable
          columns={[
            { key: 'i', label: 'Section', value: (s: Report['attractors']['sections'][number]) => <code className="text-xs">{s.id}</code> },
            { key: 'n', label: 'Visits', value: (s) => int(s.sessions), numeric: true },
            { key: 'r', label: 'Of all visits', value: (s) => pct(s.reach), numeric: true },
            { key: 'h', label: 'Of those who scrolled halfway', value: (s) => pct(s.reachOfScrolled), numeric: true },
          ]}
          rows={a.sections}
        />
      </Section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="How far down they scrolled">
          <BarList rows={a.scroll.map((s) => ({ key: `${s.pct}% of the page`, count: s.sessions, share: s.reach }))} shareLabel="of visits" />
        </Section>
        <Section title="Most clicked links" description="Links outside the plan finder, by the last part of their address.">
          <BarList rows={a.ctas} max={15} shareLabel="of visits" />
        </Section>
        <Section title="FAQ questions opened">
          <BarList rows={a.faq} label={(i) => `Question ${Number(i) + 1}`} shareLabel="of visits" />
        </Section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

export function Sources({ report: r, csv }: ViewProps) {
  return (
    <div className="space-y-6">
      <Section title="Where visits come from" description="Referring site (or direct), and what those visitors did. Find the content that brings people who open the questions and click, and the content that brings people who skip.">
        <DataTable
          csvHref={csv('sources')}
          columns={[
            { key: 's', label: 'Source', value: (s: Report['sources'][number]) => label.source(s.ref) },
            { key: 'n', label: 'Visits', value: (s) => int(s.sessions), numeric: true },
            { key: 'o', label: 'Opened', value: (s) => pct(s.openRate), numeric: true },
            { key: 'c', label: 'Completed', value: (s) => pct(s.completionRate), numeric: true },
            { key: 'k', label: 'Clicked', value: (s) => pct(s.clickRate), numeric: true },
            { key: 'x', label: 'Skipped', value: (s) => pct(s.skipRate), numeric: true },
          ]}
          rows={r.sources}
        />
      </Section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Campaign source (utm_source)">
          <BarList rows={r.answerShares.utmSource ?? []} />
        </Section>
        <Section title="Campaign (utm_campaign)">
          <BarList rows={r.answerShares.utmCampaign ?? []} />
        </Section>
      </div>
      <Section title="Devices">
        <DataTable
          columns={[
            { key: 'v', label: 'Device', value: (d: Report['devices'][number]) => label.device(d.vw) },
            { key: 'n', label: 'Visits', value: (d) => int(d.sessions), numeric: true },
            { key: 'o', label: 'Opened', value: (d) => pct(d.openRate), numeric: true },
            { key: 'c', label: 'Completed', value: (d) => pct(d.completionRate), numeric: true },
            { key: 'k', label: 'Clicked', value: (d) => pct(d.clickRate), numeric: true },
            { key: 'b', label: 'Left within 10 s', value: (d) => pct(d.bounceRate), numeric: true },
          ]}
          rows={r.devices}
        />
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

export function PutOffs({ report: r, base, query }: ViewProps) {
  const p = r.putOffs;
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="Biggest drop" action={<SeeAlso href={`${base}/journey${query}`}>Journey</SeeAlso>}>
          {p.biggestStepDrop ? (
            <p className="text-sm">
              <strong>{p.biggestStepDrop.step}. {p.biggestStepDrop.name}</strong>: {pct(p.biggestStepDrop.dropRate)} of those who saw it left there ({int(p.biggestStepDrop.exits)} of {int(p.biggestStepDrop.views)}).
            </p>
          ) : <p className="text-sm text-muted-foreground">No data.</p>}
        </Section>
        <Section title="Slowest question" action={<SeeAlso href={`${base}/journey${query}`}>Journey</SeeAlso>}>
          {p.slowestStep ? (
            <p className="text-sm">
              <strong>{p.slowestStep.step}. {p.slowestStep.name}</strong>: median {p.slowestStep.median}, slowest 10% {p.slowestStep.p90}.
            </p>
          ) : <p className="text-sm text-muted-foreground">No data.</p>}
        </Section>
        <Section title="Most went back from" action={<SeeAlso href={`${base}/journey${query}`}>Journey</SeeAlso>}>
          {p.highestBackStep ? (
            <p className="text-sm">
              <strong>{p.highestBackStep.step}. {p.highestBackStep.name}</strong>: {pct(p.highestBackStep.backRate)} pressed back ({int(p.highestBackStep.back)} of {int(p.highestBackStep.views)}).
            </p>
          ) : <p className="text-sm text-muted-foreground">No data.</p>}
        </Section>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Why they skipped" action={<SeeAlso href={`${base}/entry${query}`}>Entry and skips</SeeAlso>}>
          <BarList rows={p.skipReasons} label={label.skipReason} />
        </Section>
        <Section title='Why a result did not fit' action={<SeeAlso href={`${base}/results${query}`}>Results</SeeAlso>}>
          <BarList rows={p.feedbackReasons} label={label.feedbackReason} />
        </Section>
        <Section title="Talk to us: fields that failed validation" description="Field names only; what people typed is never recorded.">
          <BarList rows={p.talkInvalidFields} label={label.field} />
        </Section>
        <Section title="Left within 10 seconds, by device" action={<SeeAlso href={`${base}/sources${query}`}>Sources and devices</SeeAlso>}>
          <ul className="space-y-1 text-sm">
            {(['phone', 'tablet', 'desktop'] as const).map((d) => (
              <li key={d}>
                {label.device(d)}: {pct(p.bounceByDevice[d])}
              </li>
            ))}
            {p.bounceGapPhoneVsDesktop !== null && <li className="text-muted-foreground">Phone against desktop: {points(p.bounceGapPhoneVsDesktop)}</li>}
          </ul>
        </Section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

const SEVERITY: Record<Insight['severity'], string> = { high: 'High', medium: 'Medium', low: 'Low', info: 'Note' };

export function InsightList({ items }: { items: Insight[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">Nothing stands out in this period.</p>;
  return (
    <ol className="space-y-4">
      {items.map((x) => (
        <li key={x.id} className="rounded-md border p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <span className={`rounded px-2 py-0.5 font-semibold ${x.severity === 'high' ? 'bg-primary text-primary-foreground' : 'border'}`}>{SEVERITY[x.severity]}</span>
            <span>{x.area}</span>
          </div>
          <p className="mt-2 font-medium">{x.finding}</p>
          <p className="mt-1 text-sm text-muted-foreground">{x.evidence}</p>
          <p className="mt-2 text-sm">
            <strong>Try:</strong> {x.suggestion}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function Improve({ insights, review }: ViewProps & { review: { id: string; data: Record<string, unknown> } | null }) {
  return (
    <div className="space-y-6">
      <Section
        title="Findings from the rules"
        description="Each rule compares a number with a threshold chosen for a small site. The thresholds have not met real traffic yet: expect to tune them after the first month."
      >
        <InsightList items={insights} />
        <p className="mt-4 text-sm text-muted-foreground">
          To test a change, run it as a second version (arm B) and compare it on the Entry and skips page before keeping it.
        </p>
      </Section>
      <Section title="Monthly review" description="A written summary of each month's visitors, their obstacles in their own words, and up to five changes to test.">
        {review ? <MonthlyReview id={review.id} data={review.data} /> : (
          <p className="text-sm text-muted-foreground">No monthly review yet. It is written from the month&apos;s numbers and anonymous notes once the review job is set up.</p>
        )}
      </Section>
    </div>
  );
}

// Renders hx_insights/<YYYY-MM>, shaped as the output schema in
// handover/entry-funnel/examples/insights-prompt.md. Text is shown as text: it
// was written from visitors' notes and is never treated as markup.
const REVIEW_SECTIONS: [string, string][] = [
  ['audiences', 'Audiences'],
  ['attracts', 'What attracts them'],
  ['putsOff', 'What puts them off'],
  ['obstaclesInTheirWords', 'Obstacles in their own words'],
  ['unmatchedDemand', 'What they want that is not sold yet'],
  ['sources', 'Sources'],
  ['changes', 'Changes to test'],
];

function reviewItem(x: unknown): string {
  if (typeof x === 'string') return x;
  if (!x || typeof x !== 'object') return '';
  return Object.entries(x as Record<string, unknown>)
    .filter(([k]) => k !== 'priority')
    .map(([, v]) => (Array.isArray(v) ? v.filter((q) => typeof q === 'string').map((q) => `"${q}"`).join(' ') : typeof v === 'string' || typeof v === 'number' ? String(v) : ''))
    .filter(Boolean)
    .join(' · ');
}

function MonthlyReview({ id, data }: { id: string; data: Record<string, unknown> }) {
  const list = (k: string) => (Array.isArray(data[k]) ? (data[k] as unknown[]) : []);
  return (
    <div className="space-y-4 text-sm">
      <p className="text-muted-foreground">Review for {id}.</p>
      {typeof data.headline === 'string' && <p className="font-medium">{data.headline}</p>}
      {REVIEW_SECTIONS.map(([k, title]) =>
        list(k).length ? (
          <div key={k}>
            <h3 className="font-semibold">{title}</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {list(k).map((x, i) => (
                <li key={i}>{reviewItem(x)}</li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
      {typeof data.dataQuality === 'string' && <p className="text-muted-foreground">About the data: {data.dataQuality}</p>}
    </div>
  );
}
