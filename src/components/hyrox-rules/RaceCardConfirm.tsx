'use client';

import { useActionState, useEffect } from 'react';
import { Download, Printer } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { confirmMagnet, type MagnetConfirmState } from '@/lib/magnet-actions';

const SLUG = 'hyrox_rules_card';

/**
 * The confirm-and-download step for the race day rules card.
 *
 * The button POSTs the token, which is what grants marketing consent. The page
 * around it must never do that on load: Outlook Safe Links, Proofpoint and
 * Gmail's prefetch fetch every link in an inbound message, so a confirmation on
 * render is one a scanner can complete for someone who never opened the email.
 * `generate_lead` fires on the confirmed state for the same reason: the funnel
 * metric counts confirmed subscribers, not addresses typed into the box.
 */
export default function RaceCardConfirm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(
    confirmMagnet.bind(null, SLUG),
    { status: '', message: '' } as MagnetConfirmState,
  );

  useEffect(() => {
    if (state.status !== 'confirmed') return;
    trackEvent('generate_lead', {
      placement: 'rules_2026_confirm',
      magnet: 'hyrox-race-day-card',
      currency: 'GBP',
      value: 0,
    });
  }, [state.status]);

  if (state.status === 'confirmed' && state.downloadUrl) {
    return (
      <div role="status" aria-live="polite">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/20 px-4 py-1.5 font-headline text-sm font-semibold text-accent">
          Email confirmed
        </span>
        <h1 className="mb-4 font-headline text-3xl font-extrabold leading-tight md:text-5xl">
          Here is your race day rules card
        </h1>
        <p className="mb-8 font-body text-lg text-white/75">
          Thanks for confirming. The card is yours below, and the link in your email keeps working if you need it
          again closer to your race.
        </p>

        <a
          href={state.downloadUrl}
          onClick={() =>
            trackEvent('pdf_download_click', {
              placement: 'rules_2026_confirm',
              magnet: 'hyrox-race-day-card',
            })
          }
          className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-accent px-8 font-headline text-base font-extrabold text-black transition-opacity hover:opacity-90"
        >
          <Download className="h-5 w-5" aria-hidden="true" /> Download the card
        </a>

        <p className="mt-6 flex items-start gap-2 font-body text-sm leading-relaxed text-white/60">
          <Printer className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          Print A4 landscape, single sided, at 100% scale, then fold with the print facing outwards.
        </p>
      </div>
    );
  }

  return (
    <div>
      <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/20 px-4 py-1.5 font-headline text-sm font-semibold text-accent">
        One more click
      </span>
      <h1 className="mb-4 font-headline text-3xl font-extrabold leading-tight md:text-5xl">
        Confirm and the card is yours
      </h1>
      <p className="mb-8 font-body text-lg text-white/75">
        We confirm addresses so the card only goes to people who asked for it, and so the rule updates reach an inbox
        that wants them.
      </p>

      <form action={formAction}>
        <input type="hidden" name="token" value={token} />
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-accent px-8 font-headline text-base font-extrabold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isPending ? 'Confirming…' : 'Confirm and download the card'}
        </button>
      </form>

      <div aria-live="polite">
        {state.status === 'error' ? (
          <p className="mt-4 font-body font-medium text-rose-300">{state.message}</p>
        ) : null}
      </div>
    </div>
  );
}
