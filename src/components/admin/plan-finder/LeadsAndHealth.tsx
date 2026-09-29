// The Talk-to-us inbox and the data health page. Both read Firestore directly
// and are only rendered after the page has checked the admin session.

import { adminFirestore } from '@/lib/firebase-admin';
import { COLLECTIONS } from '@/lib/plan-finder/config';
import { funnel } from '@/lib/plan-finder/content';
import { dataHealth } from '@/lib/plan-finder/store';
import type { Report } from '@/lib/plan-finder/analytics';
import LeadActions from './LeadActions';
import { label } from './labels';
import { BarList, Note, Section, int } from './ui';

interface Lead {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  goal: string;
  week: string;
  message: string;
  answers: string | null;
  recommended: string | null;
  source: string;
  status: string;
}

async function fetchLeads(): Promise<Lead[]> {
  const snap = await adminFirestore.collection(COLLECTIONS.leads).orderBy('createdAt', 'desc').limit(200).get();
  return snap.docs.map((d) => {
    const x = d.data();
    const rec = x.plan?.recommended as keyof typeof funnel.catalog | undefined;
    return {
      id: d.id,
      createdAt: x.createdAt?.toDate ? x.createdAt.toDate().toISOString() : '',
      name: x.name || '',
      email: x.email || '',
      goal: x.goal || '',
      week: x.week || '',
      message: x.message || '',
      answers: x.answers || null,
      recommended: rec ? (funnel.catalog[rec]?.title ?? rec) : null,
      source: x.source || '',
      status: x.status || 'new',
    };
  });
}

export async function Leads({ report }: { report: Report }) {
  let leads: Lead[] = [];
  let error = '';
  try {
    leads = await fetchLeads();
  } catch (e) {
    error = e instanceof Error ? e.message : 'unknown error';
  }
  return (
    <div className="space-y-6">
      <Note>
        These are personal details: names, email addresses and what people wrote. Reply from training@hybridx.club, and delete a message when someone asks
        you to remove their data. Messages are kept 12 months after the last change of status, or 30 days once closed. Nothing links a message to a tracked visit.
      </Note>
      <Section title="Where messages started" description="Talk to us forms opened in the selected period, by where they were opened from.">
        <BarList rows={report.answerShares.talkFrom ?? []} label={label.talkFrom} />
      </Section>
      <Section title={`Messages (${leads.length}${leads.length === 200 ? ', newest 200' : ''})`} description="Newest first.">
        {error ? (
          <p className="text-sm">Could not read the messages: {error}</p>
        ) : leads.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          <ul className="divide-y">
            {leads.map((l) => (
              <li key={l.id} className="grid gap-3 py-4 md:grid-cols-[1fr_auto]">
                <div className="space-y-1 text-sm">
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <strong>{l.name}</strong>
                    <a className="underline underline-offset-4" href={`mailto:${l.email}`}>
                      {l.email}
                    </a>
                    <span className="text-muted-foreground">{l.createdAt ? new Date(l.createdAt).toLocaleString('en-GB') : ''}</span>
                    <span className="text-muted-foreground">{l.source === 'entry' ? 'From the homepage' : 'From /start'}</span>
                  </div>
                  <p>
                    <span className="text-muted-foreground">Training for:</span> {l.goal}
                  </p>
                  {l.week && (
                    <p>
                      <span className="text-muted-foreground">Training week:</span> {l.week}
                    </p>
                  )}
                  {l.message && <p className="whitespace-pre-wrap">{l.message}</p>}
                  {l.answers && <p className="text-muted-foreground">Plan finder answers: {l.answers}</p>}
                </div>
                <LeadActions id={l.id} status={l.status} />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

export async function Health() {
  let h: Awaited<ReturnType<typeof dataHealth>> | null = null;
  let error = '';
  try {
    h = await dataHealth();
  } catch (e) {
    error = e instanceof Error ? e.message : 'unknown error';
  }
  if (!h) return <p className="text-sm">Could not read the data store: {error}</p>;
  const warnings: string[] = [];
  if (h.yesterdayDue && !h.yesterdayRolledUp) warnings.push("Yesterday's rollup is missing. The hourly maintenance job rolls up each day after 03:00 UTC: check that its Cloud Scheduler job is running and returning 200.");
  if (h.yesterdayRolledUp && h.yesterdaySessions === 0) warnings.push('No visits were recorded yesterday. If the site had visitors, check that the collector is receiving batches.');
  if (h.droppedPropsToday > 0 || h.droppedEventsToday > 0) warnings.push('The collector dropped data it did not recognise today. A steady stream of drops means the tracker and events.schema.json have drifted apart.');
  return (
    <div className="space-y-6">
      {warnings.length ? (
        <ul className="space-y-2">
          {warnings.map((w) => (
            <li key={w} className="rounded-md border-2 border-primary p-3 text-sm">
              <strong>Check:</strong> {w}
            </li>
          ))}
        </ul>
      ) : (
        <Note>Nothing needs attention.</Note>
      )}
      <Section title="Data health">
        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-muted-foreground">Newest daily rollup</dt>
          <dd>{h.newestRollup ? `${h.newestRollup} (${int(h.newestRollupSessions)} visits)` : 'None yet'}</dd>
          <dt className="text-muted-foreground">Yesterday rolled up</dt>
          <dd>{h.yesterdayRolledUp ? `Yes, ${int(h.yesterdaySessions)} visits` : h.yesterdayDue ? 'No' : 'Not yet (after 03:00 UTC)'}</dd>
          <dt className="text-muted-foreground">Batches received today ({h.today}, UTC)</dt>
          <dd>{int(h.batchesToday)}</dd>
          <dt className="text-muted-foreground">Dropped by the collector today</dt>
          <dd>
            {int(h.droppedEventsToday)} events, {int(h.droppedPropsToday)} properties
          </dd>
          <dt className="text-muted-foreground">Batches with a wrong clock today</dt>
          <dd>{int(h.skewedBatchesToday)} (their times were replaced with the time received)</dd>
        </dl>
      </Section>
    </div>
  );
}
