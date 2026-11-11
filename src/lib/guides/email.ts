// src/lib/guides/email.ts
//
// The review emails (docs/content-engine-plan.md, section 6.5): the whole
// article, readable anywhere, with what the checks and the reviewer found, and
// two buttons.
//
// The buttons are plain links to the review page. They never act by
// themselves: Outlook Safe Links and Gmail open every link in a message, so a
// link that approved would let a mail scanner publish. Approving takes one tap
// on the page, after sign-in.
//
// Every piece of article text is escaped. Formatting comes only from the
// parsed inline tokens (bold, italic, links), as on the site.

import { ARTICLE_REVIEWER } from '@/lib/facts';
import type { CheckResult } from './checks';
import { CTAS } from './ctas';
import { parseInline, plainText } from './inline';
import { TOOLS } from './topics';
import type { Block, Guide } from './types';
import type { ReviewOutcome } from './engine/models';
import type { LinkProposal } from './backlinks';

export type ReviewEmailKind = 'ready' | 'revised' | 'reminder' | 'gave-up';

export interface ReviewEmail {
  kind: ReviewEmailKind;
  to: string;
  guide: Guide;
  checks?: CheckResult;
  review?: ReviewOutcome;
  /** 1-based blocks a revision changed. */
  changedBlocks?: number[];
  /** A model step that failed, if the draft is being sent as it stands. */
  error?: string;
}

/** Links from older articles to a newly approved one, for Jon to accept or skip. */
export interface LinksEmail {
  kind: 'links';
  to: string;
  /** The new article. */
  guide: Guide;
  proposals: (Pick<LinkProposal, 'source' | 'after'> & { sourceTitle: string })[];
}

/** The weekly Search Console summary (step 6). */
export interface SummaryEmail {
  kind: 'summary';
  to: string;
  harvest: { id: string; window: { startDate: string; endDate: string }; clicks: number; impressions: number };
  published: string[];
  scheduled: string[];
  /** Topics the harvest added to the queue. */
  added: { question: string; impressions: number }[];
  /** The next three topics in the queue. */
  next: string[];
  refresh: { page: string; query: string; position: number; impressions: number }[];
  notIndexed: { slug: string; state: string }[];
  /** Keyword Planner's run this week, if it is set up (step 10). */
  keywordPlanner?: { checked: number; error?: string };
}

/** Every email the engine sends. */
export type EngineEmail = ReviewEmail | LinksEmail;

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://hybridx.club').replace(/\/$/, '');
const YELLOW = '#FADB5C';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inlineHtml(text: string, highlight?: string): string {
  return parseInline(text)
    .map((t) => {
      if (t.kind === 'bold') return `<strong>${esc(t.text)}</strong>`;
      if (t.kind === 'italic') return `<em>${esc(t.text)}</em>`;
      if (t.kind === 'link') {
        const href = t.href.startsWith('/') ? SITE + t.href : t.href;
        const mark = t.href === highlight ? `background:${YELLOW};font-weight:bold;` : '';
        return `<a href="${esc(href)}" style="color:#111111;${mark}">${esc(t.text)}</a>`;
      }
      return esc(t.text);
    })
    .join('');
}

const P = 'margin:0 0 14px;font-size:16px;line-height:1.55;color:#111111;';

function blockHtml(b: Block, n: number): string {
  const label = `<div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#888888;margin:18px 0 4px;">Block ${n}</div>`;
  switch (b.type) {
    case 'heading':
      return `${label}<h${b.level} style="margin:0 0 10px;font-size:${b.level === 2 ? 20 : 17}px;color:#111111;">${esc(b.text)}</h${b.level}>`;
    case 'paragraph':
      return `${label}<p style="${P}">${inlineHtml(b.text)}</p>`;
    case 'list': {
      const tag = b.ordered ? 'ol' : 'ul';
      return `${label}<${tag} style="${P}padding-left:22px;">${b.items.map((i) => `<li>${inlineHtml(i)}</li>`).join('')}</${tag}>`;
    }
    case 'callout':
      return `${label}<p style="${P}border-left:4px solid ${YELLOW};padding-left:12px;"><strong>${b.kind === 'warning' ? 'Watch out' : b.kind === 'coach-note' ? "Coach's note" : 'Tip'}:</strong> ${inlineHtml(b.text)}</p>`;
    case 'workout': {
      const option = (name: string, o: { steps: string[]; rpe: string; rest: string }) =>
        `<p style="${P}margin-bottom:6px;"><strong>${name}</strong></p><ol style="${P}padding-left:22px;">${o.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol><p style="${P}">Effort: ${esc(o.rpe)} · Rest: ${esc(o.rest)}</p>`;
      return `${label}<div style="border:1px solid #dddddd;border-radius:8px;padding:14px;"><p style="${P}"><strong>${esc(b.title)}</strong>${b.goal ? `<br>${esc(b.goal)}` : ''}</p>${option('Beginner or first race', b.beginner)}${option('Race pace', b.racePace)}${b.notes ? `<p style="${P}">${inlineHtml(b.notes)}</p>` : ''}</div>`;
    }
    case 'table':
      return `${label}<table cellpadding="6" style="border-collapse:collapse;font-size:14px;margin:0 0 14px;">${b.caption ? `<caption style="text-align:left;font-weight:bold;">${esc(b.caption)}</caption>` : ''}<tr>${b.header.map((h) => `<th style="border-bottom:2px solid #111111;text-align:left;">${esc(h)}</th>`).join('')}</tr>${b.rows.map((r) => `<tr>${r.map((c) => `<td style="border-bottom:1px solid #dddddd;">${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`;
    case 'calculator':
      return `${label}<p style="${P}">[Tool: ${esc(TOOLS[b.tool].name)}]</p>`;
    case 'cta':
      return `${label}<p style="${P}">[Call to action: ${esc(CTAS[b.variant].headline)}]</p>`;
    case 'faq':
      return `${label}${b.items.map((i) => `<p style="${P}"><strong>${esc(i.question)}</strong><br>${inlineHtml(i.answer)}</p>`).join('')}`;
    case 'sources':
      return `${label}<p style="${P}font-size:13px;">Sources: ${b.items.map((s) => esc([s.title, s.publisher].filter(Boolean).join(', '))).join('; ')}</p>`;
  }
}

function blockText(b: Block, n: number): string {
  const head = `[Block ${n}]`;
  switch (b.type) {
    case 'heading':
      return `${head} ${b.text.toUpperCase()}`;
    case 'paragraph':
    case 'callout':
      return `${head} ${plainText(b.text)}`;
    case 'list':
      return `${head}\n${b.items.map((i) => `- ${plainText(i)}`).join('\n')}`;
    case 'workout':
      return `${head} ${b.title}\nBeginner: ${b.beginner.steps.join('; ')} (${b.beginner.rpe}, rest ${b.beginner.rest})\nRace pace: ${b.racePace.steps.join('; ')} (${b.racePace.rpe}, rest ${b.racePace.rest})`;
    case 'table':
      return `${head}\n${[b.header, ...b.rows].map((r) => r.join(' | ')).join('\n')}`;
    case 'calculator':
      return `${head} Tool: ${TOOLS[b.tool].name}`;
    case 'cta':
      return `${head} Call to action: ${CTAS[b.variant].headline}`;
    case 'faq':
      return `${head}\n${b.items.map((i) => `Q: ${i.question}\nA: ${plainText(i.answer)}`).join('\n')}`;
    case 'sources':
      return `${head} Sources: ${b.items.map((s) => s.title).join('; ')}`;
  }
}

const SUBJECT: Record<ReviewEmailKind, string> = {
  ready: 'Ready to review',
  revised: 'Revised',
  reminder: 'Still waiting for you',
  'gave-up': 'Needs you',
};

function lead(e: ReviewEmail): string {
  switch (e.kind) {
    case 'ready':
      return 'A new article is ready for you.';
    case 'revised':
      return e.changedBlocks?.length
        ? `Revised after your comments. Changed: block${e.changedBlocks.length > 1 ? 's' : ''} ${e.changedBlocks.join(', ')}.`
        : 'Revised after your comments.';
    case 'reminder':
      return 'This article has been waiting three days. Nothing publishes until you approve it.';
    case 'gave-up':
      return 'Three rounds of revision have not settled it. Edit it yourself, or turn it down.';
  }
}

/** The lines summarising checks and review, shared by HTML and text. */
function findings(e: ReviewEmail): string[] {
  const out: string[] = [];
  if (e.error) out.push(`A step failed, so this is sent as it stands: ${e.error}`);
  if (e.checks) {
    const { errors, warnings, words } = e.checks;
    out.push(errors.length ? `Checks: ${errors.length} problem${errors.length > 1 ? 's' : ''} still flagged.` : `Checks: all passed (${words} words).`);
    for (const i of errors) out.push(`Problem${i.block ? ` (block ${i.block})` : ''}: ${i.message}`);
    for (const i of warnings) out.push(`For you to judge${i.block ? ` (block ${i.block})` : ''}: ${i.message}`);
  }
  if (e.review) {
    if ('skipped' in e.review) out.push(`Second-model review skipped: ${e.review.skipped}.`);
    else {
      const serious = e.review.notes.filter((n) => n.severity === 'serious').length;
      out.push(`Reviewer: ${e.review.verdict === 'publishable' ? 'publishable' : 'needs fixes'}, ${serious} serious and ${e.review.notes.length - serious} minor note${e.review.notes.length === 1 ? '' : 's'}. ${e.review.summary}`);
      for (const n of e.review.notes) out.push(`${n.severity === 'serious' ? 'Serious' : 'Minor'}${n.block ? ` (block ${n.block})` : ''}: "${n.quote}" ${n.problem}`);
    }
  }
  return out;
}

const button = (href: string, label: string, primary: boolean) =>
  `<a href="${esc(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 20px;border-radius:6px;font-weight:bold;text-decoration:none;${primary ? `background:${YELLOW};color:#000000;` : 'background:#ffffff;color:#111111;border:2px solid #111111;'}">${label}</a>`;

/** The branded frame every engine email shares. */
function frame(body: string): string {
  return `
  <div style="margin:0;padding:0;background-color:#0a0a0a;">
    <div style="font-family: Helvetica, Arial, sans-serif; max-width: 640px; margin: 0 auto; background-color:#ffffff;">
      <div style="background-color:#0a0a0a; padding: 22px 28px; border-bottom: 4px solid ${YELLOW};">
        <span style="font-weight: 800; font-size: 20px; color:#ffffff;">HYBRID<span style="color:${YELLOW};">X</span></span>
        <span style="color:#b3b3b3; font-size: 14px;"> · Guides</span>
      </div>
      <div style="padding: 28px;">${body}</div>
      <div style="padding: 18px 28px; background:#f5f5f5; font-size:12px; color:#4d4d4d;">
        Sent to ${esc(ARTICLE_REVIEWER.name)} as the reviewer of HybridX guides. Change the email hours, or pause drafting, in
        <a href="${esc(SITE + '/admin/guides/settings')}" style="color:#111111;">guide settings</a>.
      </div>
    </div>
  </div>`;
}

/** Any engine email. */
export function buildEngineEmail(e: EngineEmail): { subject: string; html: string; text: string } {
  return e.kind === 'links' ? buildLinksEmail(e) : buildReviewEmail(e);
}

/**
 * Suggested links from older articles to a new one. Like the review email, its
 * button only opens the page: accepting takes a tap there, after sign-in.
 */
export function buildLinksEmail(e: LinksEmail): { subject: string; html: string; text: string } {
  const g = e.guide;
  const page = `${SITE}/admin/guides/${g.slug}#links`;
  const path = `/guides/${g.slug}`;
  const n = e.proposals.length;
  const lead = `${n === 1 ? 'One older article' : `${n} older articles`} could link to "${g.title}". Each change is below, with the new link highlighted. Nothing changes until you accept it, and an accepted link goes in when the new article goes live.`;
  const subject = `Links to check: ${g.title}`;
  const html = frame(`
        <p style="${P}">${esc(lead)}</p>
        <div>${button(page, 'Accept or skip', true)}</div>
        ${e.proposals
          .map(
            (p) =>
              `<div style="border-top:1px solid #dddddd;padding-top:12px;margin-top:12px;"><p style="${P}font-size:13px;color:#4d4d4d;">In <strong>${esc(p.sourceTitle)}</strong>:</p><p style="${P}">${inlineHtml(p.after, path)}</p></div>`,
          )
          .join('')}
        <div style="margin-top:20px;">${button(page, 'Accept or skip', true)}</div>`);
  const text = [
    lead,
    '',
    `Accept or skip: ${page}`,
    '',
    ...e.proposals.flatMap((p) => [`In "${p.sourceTitle}":`, plainText(p.after), '']),
    `Guide settings: ${SITE}/admin/guides/settings`,
  ].join('\n');
  return { subject, html, text };
}

const fmt = (n: number) => new Intl.NumberFormat('en-GB').format(n);

/** The weekly summary: plain sections, one link to the search page. Nothing in it acts. */
export function buildSummaryEmail(e: SummaryEmail): { subject: string; html: string; text: string } {
  const page = `${SITE}/admin/guides/search`;
  const { window, clicks, impressions } = e.harvest;
  const lead = `Search, ${window.startDate} to ${window.endDate}: ${fmt(clicks)} clicks from ${fmt(impressions)} impressions across the site.`;
  const sections: [string, string[]][] = [
    ['Published this week', e.published],
    ['Scheduled', e.scheduled],
    ['Added to the queue from search', e.added.map((a) => `${a.question} (${fmt(a.impressions)} impressions)`)],
    ['Next in the queue', e.next],
    ['Pages to improve (ranking 4 to 20)', e.refresh.map((r) => `${r.page}: "${r.query}", position ${r.position}, ${fmt(r.impressions)} impressions`)],
    ['Not indexed after a week', e.notIndexed.map((n) => `/guides/${n.slug}: ${n.state}`)],
    [
      'Keyword Planner',
      !e.keywordPlanner
        ? []
        : e.keywordPlanner.error
          ? [`The volume check failed: ${e.keywordPlanner.error}`]
          : [`Monthly UK searches checked for ${e.keywordPlanner.checked} topic${e.keywordPlanner.checked === 1 ? '' : 's'}, and the queue reordered.`],
    ],
  ];
  const shown = sections.filter(([, items]) => items.length);
  const html = frame(`
        <p style="${P}">${esc(lead)}</p>
        ${shown
          .map(([title, items]) => `<p style="${P}margin-bottom:6px;"><strong>${esc(title)}</strong></p><ul style="${P}padding-left:22px;">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`)
          .join('')}
        <div style="margin-top:20px;">${button(page, 'Open the search page', true)}</div>`);
  const text = [lead, '', ...shown.flatMap(([title, items]) => [title, ...items.map((i) => `- ${i}`), '']), `Search page: ${page}`].join('\n');
  return { subject: `This week in search: ${fmt(clicks)} clicks`, html, text };
}

export function buildReviewEmail(e: ReviewEmail): { subject: string; html: string; text: string } {
  const g = e.guide;
  const page = `${SITE}/admin/guides/${g.slug}`;
  const approve = `${page}?action=approve`;
  const comment = `${page}?action=comment#comment`;
  const subject = `${SUBJECT[e.kind]}: ${g.title}`;
  const notes = findings(e);

  const html = frame(`
        <p style="${P}">${esc(lead(e))}</p>
        <h1 style="margin:0 0 8px;font-size:24px;color:#111111;">${esc(g.title)}</h1>
        <p style="${P}color:#4d4d4d;"><strong>The point:</strong> ${esc(g.point)}</p>
        <div>${button(approve, 'Approve', true)}${button(comment, 'Comment', false)}</div>
        <p style="${P}font-size:13px;color:#4d4d4d;">Both open the review page; nothing happens until you tap there.</p>
        ${notes.length ? `<div style="background:#f5f5f5;border-radius:8px;padding:14px 16px;margin:0 0 18px;">${notes.map((n) => `<p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#111111;">${esc(n)}</p>`).join('')}</div>` : ''}
        <p style="${P}color:#4d4d4d;"><strong>Search description:</strong> ${esc(g.description)}</p>
        <div style="border-top:1px solid #dddddd;padding-top:8px;">${g.blocks.map((b, i) => blockHtml(b, i + 1)).join('\n')}</div>
        <div style="margin-top:24px;">${button(approve, 'Approve', true)}${button(comment, 'Comment', false)}</div>`);

  const text = [
    lead(e),
    '',
    g.title,
    `The point: ${g.point}`,
    '',
    `Approve: ${approve}`,
    `Comment: ${comment}`,
    '(Both open the review page; nothing happens until you tap there.)',
    '',
    ...notes,
    notes.length ? '' : '',
    `Search description: ${g.description}`,
    '',
    ...g.blocks.map((b, i) => blockText(b, i + 1)),
    '',
    `Guide settings: ${SITE}/admin/guides/settings`,
  ].join('\n');

  return { subject, html, text };
}

/** Whether `now` falls inside the email hours, in UK time. */
export function inEmailHours(now: Date, settings: { emailFrom: string; emailTo: string; timeZone: string }): boolean {
  const hhmm = new Intl.DateTimeFormat('en-GB', { timeZone: settings.timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
  return hhmm >= settings.emailFrom && hhmm < settings.emailTo;
}
