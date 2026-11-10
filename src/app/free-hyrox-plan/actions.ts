
'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { saveLead } from '@/lib/leads';

const SignUpSchema = z.object({
  name: z.string().min(2, { message: 'Please enter your name.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  event: z.string().min(1, { message: 'Please select an event.' }),
  eventDate: z.string().min(1, { message: 'Please select an event date.' }),
});

export type SignUpFormState = {
  message: string;
  type: 'success' | 'error' | '';
  /** Whether the lead was actually recorded. The PDF is generated client-side
   * regardless, so a storage failure here must not block delivery — but it
   * must not be silently invisible either. */
  leadSaved?: boolean;
};

function srcOf(formData: FormData): string | null {
  const src = String(formData.get('src') ?? '').trim();
  return /^[a-z0-9][a-z0-9_-]{0,90}$/i.test(src) ? src.toLowerCase() : null;
}

export async function signUpForTrainingPlan(
  prevState: SignUpFormState,
  formData: FormData
): Promise<SignUpFormState> {
  const validatedFields = SignUpSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    event: formData.get('event'),
    eventDate: formData.get('eventDate'),
  });

  if (!validatedFields.success) {
    return {
      message: validatedFields.error.errors.map((e) => e.message).join(' '),
      type: 'error',
    };
  }

  const { name, email, event, eventDate } = validatedFields.data;

  const hdrs = await headers();
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || hdrs.get('x-real-ip') || 'unknown';
  const userAgent = hdrs.get('user-agent') || '';

  let leadSaved = true;
  try {
    await saveLead({
      source: 'free_hyrox_plan',
      email,
      name,
      // Where they came from, when the link said (guide-<slug> from an article):
      // bounded and pattern-checked, since anyone can put anything in a URL.
      extra: { event, eventDate, ...(srcOf(formData) ? { src: srcOf(formData) } : {}) },
      ip,
      userAgent,
    });
  } catch (error) {
    leadSaved = false;
    console.error('[free-hyrox-plan] Failed to save lead:', error);
  }

  return {
    message: "Success! Your PDF and Calendar files are downloading. Find the '.ics' file and open it to add the full 12-week plan to your phone or computer's calendar (Google, Apple, Outlook).",
    type: 'success',
    leadSaved,
  };
}
