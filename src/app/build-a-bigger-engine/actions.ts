'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { SITE_CONFIG } from '@/lib/seo';
import { sendEngineGuideEmail } from '@/lib/email/send-engine-guide';
import { saveLead } from '@/lib/leads';
import { isCaptureRateLimited } from '@/lib/rate-limit';

// Public path to the lead magnet (served from /public).
const PDF_PATH = '/build-a-bigger-engine/HybridX-Build-A-Bigger-Engine-VO2max-Guide.pdf';

// Tag the ESP / sheet uses to route these leads into the VO2max nurture sequence.
// Kept internal: a 'use server' module may only export async functions.
const ESP_TAG = 'vo2max-guide';

export type EngineLeadState = {
  status: '' | 'success' | 'error';
  message: string;
  /** Absolute URL to the guide, returned so the success state can offer a direct download. */
  pdfUrl?: string;
};

const LeadSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'That email looks incomplete. Please check and try again.' }),
  firstName: z.string().trim().max(80).optional(),
});


export async function submitEngineLead(
  _prevState: EngineLeadState,
  formData: FormData
): Promise<EngineLeadState> {
  // Honeypot: if the hidden "company" field is filled, silently drop (pretend success).
  const honeypot = (formData.get('company') as string) || '';
  if (honeypot.trim() !== '') {
    return { status: 'success', message: '', pdfUrl: `${SITE_CONFIG.url}${PDF_PATH}` };
  }

  const parsed = LeadSchema.safeParse({
    email: formData.get('email'),
    firstName: formData.get('firstName') || undefined,
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.errors[0]?.message || 'Please enter a valid email address.',
    };
  }

  const { email, firstName } = parsed.data;

  // Gather request metadata for abuse auditing + rate limiting.
  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    hdrs.get('x-real-ip') ||
    'unknown';
  const userAgent = hdrs.get('user-agent') || '';

  if (await isCaptureRateLimited(ip, 'engine-guide')) {
    return {
      status: 'error',
      message: 'Too many attempts. Please wait a little while and try again.',
    };
  }

  const source = (formData.get('src') as string) || 'direct';
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

  const pdfUrl = `${SITE_CONFIG.url}${PDF_PATH}`;

  // 1) Persist the lead (best effort, never blocks delivery).
  try {
    await saveLead({
      source: 'build_a_bigger_engine',
      email,
      name: firstName,
      extra: { magnet: 'build-a-bigger-engine', tag: ESP_TAG, src: source },
      tags: [ESP_TAG],
      utm,
      ip,
      userAgent,
    });
  } catch (error) {
    console.error('[engine-lead] Failed to save lead:', error);
  }

  // 2) Deliver the guide. This is the critical action the user is waiting on.
  try {
    await sendEngineGuideEmail({
      to: email,
      pdfUrl,
      siteUrl: SITE_CONFIG.url,
      firstName,
    });
  } catch (error) {
    console.error('[engine-lead] Failed to send guide email:', error);
    return {
      status: 'error',
      message:
        'We could not send your guide just now. Please try again in a moment, or email us if it keeps happening.',
    };
  }

  return {
    status: 'success',
    message: '',
    pdfUrl,
  };
}
