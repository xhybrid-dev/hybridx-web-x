'use server';

// src/app/athx-2027/confirm/actions.ts
//
// The write half of the ATHX funnel's confirmed opt-in.
//
// Kept out of the page so that granting consent takes a deliberate POST. A GET
// cannot do it, which matters because corporate mail security — Outlook Safe
// Links, Proofpoint, Gmail's own prefetch — fetches every URL in an inbound
// message. A page that confirmed on render would let a scanner produce the
// strongest consent evidence in the system for somebody who never opened the
// email, and a double opt-in a machine can complete is not a double opt-in.
//
// The token is re-verified here rather than trusted from the form. A hidden
// field is client-supplied like any other, and this action is what makes an
// address mailable and hands back the download link.

import { verifyLeadToken } from '@/lib/lead-tokens';
import { markLeadConfirmed } from '@/lib/leads';
import { ATHX_SOURCE, ATHX_TAG } from '@/lib/athx-campaign';

export type AthxConfirmState = {
  status: '' | 'confirmed' | 'error';
  message: string;
  email?: string;
  /** Signed, per-address URL to the guide. Only ever set on success. */
  downloadUrl?: string;
};

export async function confirmAthxGuide(
  _prevState: AthxConfirmState,
  formData: FormData,
): Promise<AthxConfirmState> {
  const token = (formData.get('token') as string) || '';
  const verified = verifyLeadToken(token, ATHX_SOURCE);

  if (!verified.valid) {
    return {
      status: 'error',
      message:
        'That link is no longer valid. Ask for the guide again and we will send you a fresh one.',
    };
  }

  // The download URL is built from the token that was just verified, not from
  // anything the form supplied, so a tampered field cannot widen what it grants.
  const downloadUrl = `/api/athx-guide/download?token=${encodeURIComponent(token)}`;

  try {
    await markLeadConfirmed(ATHX_SOURCE, verified.email, [ATHX_TAG]);
  } catch (error) {
    // Deliberately not a failure for the visitor. They have confirmed, the
    // token is valid, and the guide is the thing they came for — withholding it
    // because our analytics write failed would punish them for our outage. The
    // consequence is ours: the launch email may not reach them, which is worth
    // an error in the log rather than an error on their screen.
    console.error('[athx-confirm] Could not mark the lead confirmed:', error);
  }

  return { status: 'confirmed', message: '', email: verified.email, downloadUrl };
}
