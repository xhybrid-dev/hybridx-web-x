'use client';

import { useActionState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';
import { confirmMagnet, type MagnetConfirmState } from '@/lib/magnet-actions';
import { GLASGOW_SAMPLE_MAGNET } from '@/lib/glasgow-sample-magnet';

/**
 * Confirm, then download. The button POSTs the token, which is what grants
 * consent: a mail scanner that fetches the link only ever sees this page.
 */
export default function SampleConfirm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(
    confirmMagnet.bind(null, GLASGOW_SAMPLE_MAGNET.slug),
    { status: '', message: '' } as MagnetConfirmState,
  );

  useEffect(() => {
    if (state.status === 'confirmed') {
      trackEvent('sample_request', { magnet: GLASGOW_SAMPLE_MAGNET.slug, method: 'confirmed_opt_in' });
    }
  }, [state.status]);

  if (state.status === 'confirmed' && state.downloadUrl) {
    return (
      <div role="status" aria-live="polite">
        <h1 className="font-headline text-3xl font-bold">Here are your sample pages</h1>
        <p className="mt-3 text-muted-foreground">
          The 22-week timeline, technique and pacing for the first four stations, and the race cards. The link in
          your email keeps working, so you can come back to it.
        </p>
        <Button asChild size="lg" className="mt-6 font-headline text-base focus-visible:ring-foreground">
          <a
            href={state.downloadUrl}
            target="_blank"
            rel="noopener"
            onClick={() => trackEvent('magnet_download', { magnet: GLASGOW_SAMPLE_MAGNET.slug })}
          >
            Open the sample
          </a>
        </Button>
        <p className="mt-8">
          <a href="/hyrox-glasgow-2027#split-preview" className="font-medium underline underline-offset-4">
            Work out your run splits for Glasgow
          </a>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-headline text-3xl font-bold">Confirm and the sample is yours</h1>
      <p className="mt-3 text-muted-foreground">
        We confirm addresses so the sample only goes to people who asked for it.
      </p>
      <form action={formAction} className="mt-6">
        <input type="hidden" name="token" value={token} />
        <Button type="submit" size="lg" disabled={isPending} className="font-headline text-base focus-visible:ring-foreground">
          {isPending ? 'Confirming…' : 'Confirm and open the sample'}
        </Button>
      </form>
      <div aria-live="polite">
        {state.status === 'error' ? <p className="mt-3 font-medium text-destructive">{state.message}</p> : null}
      </div>
    </div>
  );
}
