// POST /api/talk: the plan finder's "Talk to us" form.
//
// Stores the message in hx_leads and emails it to the team. It is not a
// marketing sign-up: it never enters the `leads` collection or the mailing
// system, and it carries no visit id, so a message cannot be joined to a
// tracked visit (handover/entry-funnel/docs/04). Kept 12 months (TTL on
// `expireAt`), or deleted sooner from the admin.
//
// Answers 200 once the message is stored, even if the notification email
// fails: the message is safe in the admin inbox, and telling the visitor it
// failed would only make them send it twice. Request bodies are never logged.

import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { adminFirestore } from '@/lib/firebase-admin';
import { isCaptureRateLimited } from '@/lib/rate-limit';
import { EMAIL_REPLY_TO, sendEmail } from '@/lib/email/service';
import { COLLECTIONS, LEAD_RETENTION_MS } from '@/lib/plan-finder/config';
import { funnel } from '@/lib/plan-finder/content';
import { DEFAULT_SCHEMA } from '@/lib/plan-finder/collect-core';

export const dynamic = 'force-dynamic';

const OWN_ORIGIN = /^https?:\/\/(?:[a-z0-9-]+\.)*(?:hybridx\.club|localhost)(?::\d+)?(?:\/|$)/i;
const av = DEFAULT_SCHEMA.answerValues as Record<string, string[]>;
const oneOf = (values: string[]) => z.string().refine((v) => values.includes(v));
const text = (max: number) => z.string().trim().max(max);

const Talk = z.object({
  name: text(100).min(1),
  email: z.string().trim().toLowerCase().max(200).email(),
  goal: text(200).min(1),
  week: text(500).default(''),
  message: text(3000).default(''),
  // The visitor's answers, only when they ticked "attach my plan finder answers".
  answers: text(600).nullish(),
  plan: z
    .object({
      answers: z.object({
        goal: oneOf(av.goal).optional(),
        level: oneOf(av.level).optional(),
        place: oneOf(av.place).optional(),
        format: oneOf(av.format).optional(),
        race: oneOf(av.race).optional(),
        obst: z.array(oneOf(av.obst)).max(8).default([]),
      }),
      recommended: oneOf(Object.keys(funnel.catalog)),
    })
    .nullish(),
  source: z.enum(['entry', 'page']).default('page'),
});

const json = (status: number, body: object) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export async function POST(request: Request) {
  const origin = request.headers.get('origin') || request.headers.get('referer') || '';
  if (origin && !OWN_ORIGIN.test(origin)) return json(403, { ok: false });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  if (await isCaptureRateLimited(ip, 'talk')) {
    return json(429, { ok: false, error: 'Too many messages. Please wait a little while and try again.' });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false });
  }
  const parsed = Talk.safeParse(body);
  if (!parsed.success) {
    // Which fields failed, never what was in them.
    return json(400, { ok: false, fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))] });
  }
  const t = parsed.data;
  const now = Date.now();

  let id: string;
  try {
    const ref = await adminFirestore.collection(COLLECTIONS.leads).add({
      name: t.name,
      email: t.email,
      goal: t.goal,
      week: t.week,
      message: t.message,
      answers: t.answers ?? null,
      plan: t.plan ?? null,
      source: t.source,
      status: 'new',
      createdAt: Timestamp.fromMillis(now),
      expireAt: Timestamp.fromMillis(now + LEAD_RETENTION_MS),
    });
    id = ref.id;
  } catch (err) {
    console.error('[talk] could not store a message:', err instanceof Error ? err.name : 'unknown error');
    return json(500, { ok: false });
  }

  const recommended = t.plan ? funnel.catalog[t.plan.recommended as keyof typeof funnel.catalog]?.title : null;
  const lines: [string, string][] = [
    ['Name', t.name],
    ['Email', t.email],
    ['Training for', t.goal],
    ['Training week', t.week || '(not given)'],
    ['What is in the way', t.message || '(not given)'],
    ['Plan finder answers', t.answers || '(not attached)'],
  ];
  if (recommended) lines.push(['Recommended', recommended]);
  try {
    await sendEmail({
      // An internal notification to the team's own inbox: no unsubscribe header,
      // and no suppression lookup (the recipient is us, not a subscriber).
      to: EMAIL_REPLY_TO,
      replyTo: t.email,
      transactional: true,
      ignoreSuppression: true,
      subject: `Plan finder: ${t.name} wants to talk (${t.goal.slice(0, 60)})`,
      text:
        lines.map(([k, v]) => `${k}: ${v}`).join('\n') +
        `\n\nReply to this email to answer them. The message is also in the admin under Plan finder > Leads (${id}).`,
      html:
        '<table cellpadding="6" style="font-family:Helvetica,Arial,sans-serif;font-size:15px">' +
        lines.map(([k, v]) => `<tr><td style="vertical-align:top"><b>${esc(k)}</b></td><td>${esc(v).replace(/\n/g, '<br>')}</td></tr>`).join('') +
        '</table><p style="font-family:Helvetica,Arial,sans-serif;font-size:14px">Reply to this email to answer them. ' +
        `The message is also in the admin under Plan finder &gt; Leads (${esc(id)}).</p>`,
    });
  } catch (err) {
    console.error('[talk] stored the message but could not email it:', err instanceof Error ? err.message : 'unknown error');
  }

  return json(200, { ok: true });
}
