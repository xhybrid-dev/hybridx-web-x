'use server';

// src/app/athx-2027/actions.ts
//
// Capture for the ATHX 2027 pre-launch funnel.
//
// Confirmed opt-in, and delivery by email rather than in-page. The guide is
// behind a signed link in the confirmation email, so a click on that link is
// the only route to the file — which is what makes the captured address a real
// one rather than a well-formed one. The whole point of this page is a list
// that can be sold to at launch, and a list of addresses that were never
// verified is not that.
//
// Shape follows the race-card funnel deliberately (honeypot, rate limit,
// deliverability check, pending lead, confirmation email) so there is one
// capture pattern on this site rather than one per promotion.

import { z } from 'zod';
import { headers } from 'next/headers';
import { SITE_CONFIG } from '@/lib/seo';
import { sendAthxGuideEmail } from '@/lib/email/send-athx-guide';
import { getEmailProvider } from '@/lib/email/service';
import { checkEmailDeliverable } from '@/lib/email/validate-address';
import { upsertPendingLead } from '@/lib/leads';
import { isCaptureRateLimited } from '@/lib/rate-limit';
import { createLeadToken } from '@/lib/lead-tokens';
import { ATHX_SOURCE, ATHX_TAG } from '@/lib/athx-campaign';

const CONFIRM_PATH = '/athx-2027/confirm';
const PAGE_PATH = '/athx-2027';

export type AthxLeadState = {
  status: '' | 'success' | 'error';
  message: string;
  /** Echoed back so the success state can name the inbox to check. */
  email?: string;
};

const LeadSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'That email looks incomplete. Please check and try again.' }),
  /**
   * Which form on the page. Constrained rather than free text: it is written to
   * the lead record and segmented on later, and "hero" versus "footer" is the
   * measure of whether the page above the fold is doing its job.
   */
  source: z.enum(['hero', 'footer']).catch('hero'),
  /** Optional. Decides which edition the launch email leads with. */
  edition: z.enum(['mens', 'womens']).nullable().catch(null),
  calcUsed: z.boolean().catch(false),
});

export async function submitAthxLead(
  _prevState: AthxLeadState,
  formData: FormData,
): Promise<AthxLeadState> {
  // Honeypot. Report success so a bot learns nothing from the difference.
  const honeypot = (formData.get('company') as string) || '';
  if (honeypot.trim() !== '') {
    return { status: 'success', message: '' };
  }

  const rawEdition = (formData.get('edition') as string) || '';

  const parsed = LeadSchema.safeParse({
    email: formData.get('email'),
    source: formData.get('placement'),
    edition: rawEdition === 'mens' || rawEdition === 'womens' ? rawEdition : null,
    calcUsed: formData.get('calcUsed') === 'true',
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.errors[0]?.message || 'Please enter a valid email address.',
    };
  }

  const { email, source, edition, calcUsed } = parsed.data;

  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || hdrs.get('x-real-ip') || 'unknown';
  const userAgent = hdrs.get('user-agent') || '';
  const referrer = hdrs.get('referer') || '';

  if (await isCaptureRateLimited(ip, 'athx-guide')) {
    return {
      status: 'error',
      message: 'Too many attempts. Please wait a little while and try again.',
    };
  }

  // Format validation only proves the address is well formed. This asks whether
  // the domain can receive mail at all, which matters more here than usual: the
  // asset is delivered by email, so an address that cannot receive one is a
  // signup that was never going to convert. Fails open on inconclusive DNS.
  const deliverable = await checkEmailDeliverable(email);
  if (!deliverable.ok) {
    return { status: 'error', message: deliverable.message };
  }

  const src = (formData.get('src') as string) || 'direct';
  // Prefixed keys, matching the mailing system's published contract. The bare
  // spellings are silently dropped on arrival.
  const utm = {
    utm_source: (formData.get('utm_source') as string) || '',
    utm_medium: (formData.get('utm_medium') as string) || '',
    utm_campaign: (formData.get('utm_campaign') as string) || '',
    utm_content: (formData.get('utm_content') as string) || '',
    utm_term: (formData.get('utm_term') as string) || '',
  };

  // 1) Record the pending lead. Best effort: it must never stand between
  //    somebody and the email they are waiting for. Upserts on (source, email),
  //    so asking twice does not inflate the confirmation rate's denominator.
  try {
    await upsertPendingLead({
      source: ATHX_SOURCE,
      email,
      extra: {
        magnet: 'what-is-athx',
        tag: ATHX_TAG,
        placement: source,
        edition,
        // Whether the calculator was touched before signing up. This is the
        // number that decides whether the calculator stays on the page.
        calcUsed,
        src,
        referrer: referrer || null,
      },
      tags: [ATHX_TAG, ...(edition ? [`athx-edition:${edition}`] : [])],
      utm,
      ip,
      userAgent,
    });
  } catch (error) {
    console.error('[athx-lead] Failed to save pending lead:', error);
  }

  // 2) Send the confirmation, which carries the download link. This is the
  //    thing the visitor is actually waiting on.
  const token = createLeadToken(email, ATHX_SOURCE);
  const confirmUrl = `${SITE_CONFIG.url}${CONFIRM_PATH}?token=${encodeURIComponent(token)}`;

  try {
    await sendAthxGuideEmail({
      to: email,
      confirmUrl,
      pageUrl: `${SITE_CONFIG.url}${PAGE_PATH}`,
      siteUrl: SITE_CONFIG.url,
    });
  } catch (error) {
    // Log the provider and the underlying message. This is the only place the
    // real cause — unverified domain, blocked SMTP, missing credentials — is
    // visible, and "it didn't send" is not a diagnosis.
    const detail = error instanceof Error ? error.message : String(error);
    console.error(
      `[athx-lead] Confirmation email failed (provider: ${getEmailProvider()}): ${detail}`,
    );
    return {
      status: 'error',
      message:
        'We could not send your guide just now. Please try again in a moment, or email us if it keeps happening.',
    };
  }

  return { status: 'success', message: '', email };
}
