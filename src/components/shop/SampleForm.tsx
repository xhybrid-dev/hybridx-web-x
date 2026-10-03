'use client';

import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { useMagnetCapture } from '@/hooks/use-magnet-capture';
import { GLASGOW_SAMPLE_MAGNET } from '@/lib/glasgow-sample-magnet';

/**
 * Three free sample pages for an email address, confirmed opt-in.
 *
 * Behaviour (validation, honeypot, UTM capture, analytics, pending state)
 * comes from useMagnetCapture like every other magnet on the site; this is
 * only the markup. The confirmation email is what unlocks the file, so the
 * list holds addresses that were actually opened.
 */
export default function SampleForm({ placement = 'glasgow_shop' }: { placement?: string }) {
  const capture = useMagnetCapture(GLASGOW_SAMPLE_MAGNET.slug, placement);
  const fieldId = useId();
  const errorId = useId();

  if (capture.succeeded) {
    return (
      <div role="status" aria-live="polite" className="rounded-lg border border-border bg-card p-5 sm:p-6">
        <p className="font-headline text-lg font-bold">Check your inbox</p>
        <p className="mt-2 text-muted-foreground">
          We have sent a link to <strong className="text-foreground">{capture.email || 'your inbox'}</strong>. Click
          the button in that email and the sample opens straight away. If nothing arrives in a few minutes, check
          your spam or promotions folder.
        </p>
      </div>
    );
  }

  return (
    <form
      action={capture.formAction}
      onSubmit={capture.onSubmit}
      noValidate
      className="rounded-lg border border-border bg-card p-5 sm:p-6"
    >
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Company
          <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {Object.entries(capture.hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <label htmlFor={fieldId} className="mb-1.5 block font-medium">
        Email address
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id={fieldId}
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          required
          onFocus={capture.onFocus}
          aria-invalid={capture.error ? true : undefined}
          aria-describedby={capture.error ? errorId : undefined}
          className="h-12 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground sm:flex-1"
        />
        <Button
          type="submit"
          size="lg"
          disabled={capture.isPending}
          className="h-12 font-headline text-base focus-visible:ring-foreground"
        >
          {capture.isPending ? 'Sending…' : 'Send me the sample'}
        </Button>
      </div>
      <div id={errorId} aria-live="polite">
        {capture.error ? <p className="mt-2 text-sm font-medium text-destructive">{capture.error}</p> : null}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        We email you a link to confirm your address, and the sample opens when you click it. Confirming also signs
        you up to HybridX training emails about preparing for HYROX. Unsubscribe at any time. See the{' '}
        <a href="/privacy-policy" className="underline underline-offset-4">
          privacy policy
        </a>
        .
      </p>
    </form>
  );
}
