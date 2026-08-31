'use server';

// src/lib/magnet-actions.ts
//
// One capture action, and one confirm action, for every lead magnet.
//
// These replace a per-funnel pair that were near-copies of one another: of the
// ATHX action's 155 lines, 100 were identical to the race card's, and the
// differences were a slug, a tag and an email import. The sequence — honeypot,
// validate, rate limit, check the domain can receive mail, record the lead,
// send the thing they are waiting for — is the same every time, and it is the
// sequence where mistakes are expensive. A copied action that keeps the wrong
// slug files leads under another funnel and rejects every download token, and
// nothing about it looks wrong.
//
// The division with funnel-actions.ts is unchanged: that file captures an
// address for a promotion and delivers nothing, and its warning against adding
// a second nurture path still stands. What is here is magnet *delivery* — the
// single email somebody is actively waiting for, which this project has always
// owned and sent. The app still owns everything after it.

import { headers } from 'next/headers';
import { z } from 'zod';
import { SITE_CONFIG } from '@/lib/seo';
import { sendMagnetEmail } from '@/lib/email/send-magnet';
import { getEmailProvider } from '@/lib/email/service';
import { checkEmailDeliverable } from '@/lib/email/validate-address';
import { markLeadConfirmed, saveLead, upsertPendingLead } from '@/lib/leads';
import { createLeadToken, verifyLeadToken } from '@/lib/lead-tokens';
import { isCaptureRateLimited } from '@/lib/rate-limit';
import { getMagnet, magnetAssetUrl, magnetConfirmPath } from '@/lib/magnets';

/**
 * Extra form fields a magnet page may collect, by name.
 *
 * A closed list rather than "everything in the FormData": the values land in a
 * free-form map on the lead document, and an open one would let a page — or
 * anyone posting to it — write unbounded fields into that collection.
 */
const EXTRA_FIELDS = ['raceDate', 'edition', 'calcUsed'] as const;

export type MagnetLeadState = {
  status: '' | 'success' | 'error';
  message: string;
  /** Echoed back so a confirmed-opt-in success state can name the inbox to check. */
  email?: string;
  /**
   * Set only for immediate delivery: the asset is public, so the success state
   * can offer the download in place rather than making somebody wait for mail
   * they have already been sent.
   */
  assetUrl?: string;
};

const LeadSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'That email looks incomplete. Please check and try again.' }),
  firstName: z.string().trim().max(80).optional(),
  /**
   * Which form on the page. Free-form but bounded: it is written to the lead
   * record and segmented on later, and "hero" versus "footer" is the measure of
   * whether the page above the fold is doing its job.
   */
  placement: z.string().trim().max(40).optional(),
});

/**
 * Capture an address for one magnet and deliver it.
 *
 * The magnet slug is bound server-side by the calling page rather than read
 * from the form, so it cannot be substituted by whoever is submitting: a
 * spoofable slug would let somebody file themselves under a funnel they never
 * visited and mint a token for a file they were never offered.
 */
export async function submitMagnetLead(
  slug: string,
  _prevState: MagnetLeadState,
  formData: FormData,
): Promise<MagnetLeadState> {
  const magnet = getMagnet(slug);
  if (!magnet) {
    // A page wired to a magnet that does not exist. Nothing can be delivered,
    // so this is reported rather than swallowed — but the visitor is told
    // something true and useful instead of being shown an internal error.
    console.error(`[magnet] no such magnet "${slug}" — check src/lib/magnets.ts`);
    return {
      status: 'error',
      message: 'This form is not set up correctly yet. Please try again a little later.',
    };
  }

  // Honeypot: a filled hidden field means a bot. Report success so it learns
  // nothing from the difference.
  const honeypot = (formData.get('company') as string) || '';
  if (honeypot.trim() !== '') {
    return { status: 'success', message: '' };
  }

  const parsed = LeadSchema.safeParse({
    email: formData.get('email'),
    firstName: formData.get('firstName') || undefined,
    placement: formData.get('placement') || undefined,
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.errors[0]?.message || 'Please enter a valid email address.',
    };
  }

  const { email, firstName, placement } = parsed.data;

  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || hdrs.get('x-real-ip') || 'unknown';
  const userAgent = hdrs.get('user-agent') || '';
  const referrer = hdrs.get('referer') || '';

  if (await isCaptureRateLimited(ip, magnet.rateLimitBucket)) {
    return {
      status: 'error',
      message: 'Too many attempts. Please wait a little while and try again.',
    };
  }

  // Format validation only proves an address is well formed. This asks whether
  // the domain can receive mail at all, which matters more for a magnet than
  // anywhere else: the asset arrives by email, so an address that cannot take
  // one is a signup that was never going to convert. Fails open on
  // inconclusive DNS — see validate-address.ts.
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

  // Anything else the page collects. Bounded and stringly: this lands in a
  // free-form map on the lead, and a funnel that wants a typed field should
  // earn one rather than smuggling it through here.
  const extra: Record<string, string> = {};
  for (const key of EXTRA_FIELDS) {
    const value = (formData.get(key) as string) || '';
    if (value.trim()) extra[key] = value.trim().slice(0, 120);
  }

  const leadInput = {
    source: magnet.slug,
    email,
    name: firstName,
    extra: {
      magnet: magnet.slug,
      tag: magnet.tag,
      placement: placement ?? 'page',
      src,
      referrer: referrer || null,
      ...extra,
    },
    tags: [magnet.tag],
    utm,
    ip,
    userAgent,
  };

  // 1) Record the lead. Best effort: it must never stand between somebody and
  //    the email they are waiting for.
  //
  //    Which write depends on the delivery. A confirmed magnet upserts on
  //    (source, email) so asking twice does not inflate the denominator of its
  //    confirmation rate, and forwards without consent until the link is
  //    clicked. An immediate one records consent now, because the form said so.
  try {
    if (magnet.delivery === 'confirmed') {
      await upsertPendingLead(leadInput);
    } else {
      await saveLead(leadInput);
    }
  } catch (error) {
    console.error(`[magnet:${magnet.slug}] failed to save lead:`, error);
  }

  // 2) Send it. This is the thing the visitor is actually waiting on.
  const pageUrl = `${SITE_CONFIG.url}${magnet.pagePath}`;

  // For a confirmed magnet the button confirms and then unlocks; for an
  // immediate one it is the asset itself.
  const actionUrl =
    magnet.delivery === 'confirmed'
      ? `${SITE_CONFIG.url}${magnetConfirmPath(magnet)}?token=${encodeURIComponent(
          createLeadToken(email, magnet.slug),
        )}`
      : `${SITE_CONFIG.url}${magnetAssetUrl(magnet, null)}`;

  try {
    await sendMagnetEmail({
      to: email,
      magnet,
      actionUrl,
      pageUrl,
      siteUrl: SITE_CONFIG.url,
      firstName,
    });
  } catch (error) {
    // Log the provider and the underlying message, not just the object. This is
    // the only place the real cause — unverified domain, blocked SMTP, missing
    // credentials — is visible, and "it didn't send" is not a diagnosis.
    const detail = error instanceof Error ? error.message : String(error);
    console.error(
      `[magnet:${magnet.slug}] delivery email failed (provider: ${getEmailProvider()}): ${detail}`,
    );
    return {
      status: 'error',
      message:
        'We could not send that just now. Please try again in a moment, or email us if it keeps happening.',
    };
  }

  return {
    status: 'success',
    message: '',
    email,
    // Only for a public asset. Offering an in-page download for a gated one
    // would hand over the file without the confirmation that gates it.
    ...(magnet.asset.kind === 'public' ? { assetUrl: magnet.asset.url } : {}),
  };
}

// ---------------------------------------------------------------------------
// Confirmation
// ---------------------------------------------------------------------------

export type MagnetConfirmState = {
  status: '' | 'confirmed' | 'error';
  message: string;
  email?: string;
  /** Signed, per-address URL to the asset. Only ever set on success. */
  downloadUrl?: string;
};

/**
 * Complete a confirmed opt-in and hand over the asset.
 *
 * Deliberately an action rather than something a page does on render. Corporate
 * mail security — Outlook Safe Links, Proofpoint, Gmail's own prefetch —
 * fetches every URL in an inbound message, so a page that confirmed on load
 * would let a scanner produce the strongest consent evidence in the system for
 * somebody who never opened the email. A double opt-in a machine can complete
 * is not a double opt-in.
 *
 * The token is re-verified here rather than trusted from the form: a hidden
 * field is client-supplied like any other, and this is what makes an address
 * mailable.
 */
export async function confirmMagnet(
  slug: string,
  _prevState: MagnetConfirmState,
  formData: FormData,
): Promise<MagnetConfirmState> {
  const magnet = getMagnet(slug);
  if (!magnet) {
    console.error(`[magnet] confirm for unknown magnet "${slug}"`);
    return { status: 'error', message: 'That link is no longer valid.' };
  }

  const token = (formData.get('token') as string) || '';
  const verified = verifyLeadToken(token, magnet.slug);

  if (!verified.valid) {
    return {
      status: 'error',
      message:
        'That link is no longer valid. Ask for it again and we will send you a fresh one.',
    };
  }

  // Built from the token just verified, never from anything the form supplied,
  // so a tampered field cannot widen what this grants.
  const downloadUrl = magnetAssetUrl(magnet, token);

  try {
    await markLeadConfirmed(magnet.slug, verified.email, [magnet.tag]);
  } catch (error) {
    // Not a failure for the visitor. They have confirmed, the token is valid,
    // and the asset is what they came for — withholding it because our own
    // write failed would punish them for our outage. The consequence is ours:
    // the nurture sequence may not reach them, which is worth a log line rather
    // than an error on their screen.
    console.error(`[magnet:${magnet.slug}] could not mark the lead confirmed:`, error);
  }

  return { status: 'confirmed', message: '', email: verified.email, downloadUrl };
}
