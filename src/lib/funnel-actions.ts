'use server';

// src/lib/funnel-actions.ts
//
// One capture action for every funnel.
//
// Each of the original magnets has its own server action, because each also
// delivers a file the visitor is waiting on — a PDF, a calendar export — and
// that delivery is bespoke. Those stay as they are.
//
// This is for everything else: a promotion, a waitlist, a challenge sign-up, a
// seasonal offer. It takes a slug and an address and does nothing bespoke at
// all, which is the point. A new funnel is a page with this form on it; the
// mailing system registers the slug on the first lead, and what happens next —
// tags, consent posture, which welcome sequence runs, what the first email says
// and what it links to — is configured in the marketing console without a
// deploy.
//
// The division is deliberate: this project owns *capture*, the app owns
// *everything after it*. Adding delivery here would recreate the second send
// path we are trying to remove.

import { headers } from 'next/headers';
import { z } from 'zod';
import { saveLead } from '@/lib/leads';
import { isCaptureRateLimited } from '@/lib/rate-limit';

/** Must match the mailing system's own slug rule. See lib/leads.ts. */
const SLUG = /^[a-z0-9][a-z0-9_-]{1,48}$/;

/** Where a lead from a misconfigured form is filed, so it is never simply lost. */
const UNCLASSIFIED_SOURCE = 'website-other';

export type FunnelLeadState = {
  status: '' | 'success' | 'error';
  message: string;
};

const FunnelSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'That email looks incomplete. Please check and try again.' }),
  firstName: z.string().trim().max(80).optional(),
  // Validated here, not merely checked later: this becomes a permanent route in
  // the mailing system, so a mistyped `source` prop would otherwise create a
  // parallel funnel that no journey is attached to.
  source: z
    .string()
    .trim()
    .regex(SLUG, 'This form is misconfigured — its funnel name is not a valid slug.'),
});


/**
 * Capture a lead from any funnel.
 *
 * The `source` slug arrives from a hidden field, so it is validated here rather
 * than trusted: it becomes a permanent route in the mailing system, and an
 * unbounded slug space would let a mistyped page fill that collection with
 * junk. A malformed slug still captures the lead — it simply lands as
 * unclassified instead of getting its own route, which is the right trade when
 * the alternative is discarding a real person's sign-up.
 */
export async function submitFunnelLead(
  _prevState: FunnelLeadState,
  formData: FormData,
): Promise<FunnelLeadState> {
  // Honeypot: a filled hidden field means a bot. Report success so it learns
  // nothing from the difference.
  const honeypot = (formData.get('company') as string) || '';
  if (honeypot.trim() !== '') {
    return { status: 'success', message: 'Thanks — check your inbox.' };
  }

  const rawSource = ((formData.get('source') as string) || '').trim();

  const parsed = FunnelSchema.safeParse({
    email: formData.get('email'),
    firstName: formData.get('firstName') || undefined,
    // Substituted rather than rejected. A bad slug is the page author's mistake,
    // and failing the submission would show the visitor a nonsense error under
    // the email field while the funnel silently captured nobody. The lead is
    // filed as unclassified and the misconfiguration is logged for us instead.
    source: SLUG.test(rawSource) ? rawSource : UNCLASSIFIED_SOURCE,
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.errors[0]?.message || 'Please enter a valid email address.',
    };
  }

  if (!SLUG.test(rawSource)) {
    console.error(
      `[funnel] misconfigured form: source "${rawSource}" is not a valid slug; ` +
        `filing this lead as ${UNCLASSIFIED_SOURCE}`,
    );
  }

  const { email, firstName, source } = parsed.data;

  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || hdrs.get('x-real-ip') || 'unknown';
  const userAgent = hdrs.get('user-agent') || '';

  if (await isCaptureRateLimited(ip, 'funnel')) {
    return { status: 'error', message: 'Too many attempts. Please wait a little while and try again.' };
  }

  // Prefixed keys, matching the mailing system's published contract.
  const utm = {
    utm_source: (formData.get('utm_source') as string) || '',
    utm_medium: (formData.get('utm_medium') as string) || '',
    utm_campaign: (formData.get('utm_campaign') as string) || '',
    utm_content: (formData.get('utm_content') as string) || '',
    utm_term: (formData.get('utm_term') as string) || '',
  };

  try {
    await saveLead({
      source,
      email,
      name: firstName,
      extra: { funnel: source, src: (formData.get('src') as string) || 'direct' },
      utm,
      ip,
      userAgent,
    });
  } catch (error) {
    console.error(`[funnel:${source}] failed to save lead:`, error);
    return {
      status: 'error',
      message: 'We could not sign you up just now. Please try again in a moment.',
    };
  }

  return {
    status: 'success',
    message: 'You are on the list — check your inbox shortly.',
  };
}
