'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { SITE_CONFIG } from '@/lib/seo';
import { sendRaceDayCardEmail } from '@/lib/email/send-race-day-card';
import { getEmailProvider } from '@/lib/email/service';
import { checkEmailDeliverable } from '@/lib/email/validate-address';
import { upsertPendingLead } from '@/lib/leads';
import { isCaptureRateLimited } from '@/lib/rate-limit';
import { createLeadToken } from '@/lib/lead-tokens';

// The card is NOT public. It is served from /api/race-card/download behind a
// signed token, so the only route to it is a confirmed email address.
const CONFIRM_PATH = '/hyrox-rule-changes-2026/confirm';
const PAGE_PATH = '/hyrox-rule-changes-2026';

// Tag the ESP / sheet uses to route these leads into the race day nurture
// sequence, and to segment them later. Someone taking a rules card has a race
// booked, so this cohort behaves differently to the general list.
// Kept internal: a 'use server' module may only export async functions.
const ESP_TAG = 'hyrox-rules-card-2026';

export type RaceCardLeadState = {
  status: '' | 'success' | 'error';
  message: string;
  /** Echoed back so the success state can tell them which inbox to check. */
  email?: string;
};

const LeadSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'That email looks incomplete. Please check and try again.' }),
  firstName: z.string().trim().max(80).optional(),
  /** Optional — powers the race-date framing in the follow-up sequence. */
  raceDate: z.string().trim().max(20).optional(),
});


export async function submitRaceCardLead(
  _prevState: RaceCardLeadState,
  formData: FormData
): Promise<RaceCardLeadState> {
  // Honeypot: if the hidden "company" field is filled, silently drop (pretend success).
  const honeypot = (formData.get('company') as string) || '';
  if (honeypot.trim() !== '') {
    return { status: 'success', message: '' };
  }

  const parsed = LeadSchema.safeParse({
    email: formData.get('email'),
    firstName: formData.get('firstName') || undefined,
    raceDate: formData.get('raceDate') || undefined,
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.errors[0]?.message || 'Please enter a valid email address.',
    };
  }

  const { email, firstName, raceDate } = parsed.data;

  // Request metadata for abuse auditing + rate limiting.
  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || hdrs.get('x-real-ip') || 'unknown';
  const userAgent = hdrs.get('user-agent') || '';

  if (await isCaptureRateLimited(ip, 'race-card')) {
    return {
      status: 'error',
      message: 'Too many attempts. Please wait a little while and try again.',
    };
  }

  // Format validation only proves the address is well formed. This checks the
  // domain can actually receive mail, so typos and throwaway inboxes do not
  // reach the list. Fails open on inconclusive DNS — see validate-address.ts.
  const deliverable = await checkEmailDeliverable(email);
  if (!deliverable.ok) {
    return { status: 'error', message: deliverable.message };
  }

  // Which channel sent them — gyms, social or communities. Forwarded from the
  // page's query string so the three distribution channels stay separable.
  const src = (formData.get('src') as string) || 'direct';
  // Prefixed keys, matching the mailing system's contract. The bare spelling
  // (`source`, `medium`) was silently dropped on arrival for months, because
  // the two sides had each declared their own shape and neither knew.
  const utm = {
    utm_source: (formData.get('utm_source') as string) || '',
    utm_medium: (formData.get('utm_medium') as string) || '',
    utm_campaign: (formData.get('utm_campaign') as string) || '',
    utm_content: (formData.get('utm_content') as string) || '',
    utm_term: (formData.get('utm_term') as string) || '',
  };

  // 1) Record the pending lead (best effort, never blocks the email).
  //    Upserts on (source, email), so requesting the card twice does not
  //    inflate the denominator of the confirmation rate.
  try {
    await upsertPendingLead({
      source: 'hyrox_rules_card',
      email,
      name: firstName,
      extra: {
        magnet: 'hyrox-race-day-card',
        tag: ESP_TAG,
        src,
        raceDate: raceDate || null,
      },
      tags: [ESP_TAG],
      utm,
      ip,
      userAgent,
    });
  } catch (error) {
    console.error('[race-card-lead] Failed to save pending lead:', error);
  }

  // 2) Send the confirmation link. This is the action the visitor is waiting
  //    on, and the click is what proves the address is real.
  const token = createLeadToken(email, 'hyrox_rules_card');
  const confirmUrl = `${SITE_CONFIG.url}${CONFIRM_PATH}?token=${encodeURIComponent(token)}`;

  try {
    await sendRaceDayCardEmail({
      to: email,
      confirmUrl,
      pageUrl: `${SITE_CONFIG.url}${PAGE_PATH}`,
      siteUrl: SITE_CONFIG.url,
      firstName,
    });
  } catch (error) {
    // Log the provider and the underlying message, not just the object — this
    // is the only place the real cause (unverified domain, blocked SMTP,
    // missing credentials) is visible.
    const detail = error instanceof Error ? error.message : String(error);
    console.error(
      `[race-card-lead] Confirmation email failed (provider: ${getEmailProvider()}): ${detail}`
    );
    return {
      status: 'error',
      message:
        'We could not send your confirmation email just now. Please try again in a moment, or email us if it keeps happening.',
    };
  }

  return { status: 'success', message: '', email };
}
