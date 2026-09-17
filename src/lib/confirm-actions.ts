'use server';

// src/lib/confirm-actions.ts
//
// The write half of confirmed opt-in.
//
// Kept out of the page so that granting consent takes a deliberate POST. A GET
// cannot do it, which matters because corporate mail security — Outlook Safe
// Links, Proofpoint, Gmail's own prefetch — fetches every URL in an inbound
// message. A page that confirmed on render would let a scanner produce the
// strongest consent evidence in the system for somebody who never opened the
// email, and a double opt-in a machine can complete is not a double opt-in.
//
// The token is re-verified here rather than trusted from the form. A hidden
// field is client-supplied like any other, and this action is the thing that
// makes an address mailable.

import { readLeadToken } from '@/lib/lead-tokens';
import { markLeadConfirmed } from '@/lib/leads';

export type ConfirmState = {
  status: '' | 'confirmed' | 'error';
  message: string;
  email?: string;
};

export async function confirmLead(
  _prevState: ConfirmState,
  formData: FormData,
): Promise<ConfirmState> {
  const token = (formData.get('token') as string) || '';
  const verified = readLeadToken(token);

  if (!verified.valid) {
    return {
      status: 'error',
      message: 'That confirmation link is no longer valid. Please sign up again for a fresh one.',
    };
  }

  try {
    await markLeadConfirmed(verified.source, verified.email);
  } catch (err) {
    // The forward to the mailing system is itself fire-and-forget, so reaching
    // here means the local write failed. Report it rather than claiming success:
    // unlike a magnet download, there is nothing else the person walks away with,
    // and telling them they are subscribed when they are not is the one outcome
    // worth avoiding.
    console.error('[confirm] could not mark lead confirmed:', err);
    return {
      status: 'error',
      message: 'We could not confirm you just now. Please try that button again in a moment.',
    };
  }

  return { status: 'confirmed', message: '', email: verified.email };
}
