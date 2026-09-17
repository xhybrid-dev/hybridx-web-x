'use client';

import styles from '@/app/athx-2027/athx.module.css';
import { useMagnetCapture } from '@/hooks/use-magnet-capture';
import { ATHX_MAGNET } from '@/lib/athx-magnet';
import { useCalculatorUsed } from '@/components/athx/calc-usage';

interface AthxGuideFormProps {
  /** Which form on the page. Recorded on the lead, and segmented on later. */
  placement: 'hero' | 'footer';
  label: string;
  support: string;
}

/**
 * The ATHX email capture.
 *
 * Rendered twice on the page with different framing; both post through the same
 * action under different placements, so "did anybody convert below the fold" is
 * answerable.
 *
 * Behaviour — validation, honeypot, UTM capture, analytics, pending state —
 * comes from useMagnetCapture, which every magnet on the site shares. What is
 * left here is this funnel's markup and its copy, which is the only part that
 * was ever specific to it.
 *
 * One field. Nothing else is asked for, because nothing else is needed to send
 * a guide, and every extra field costs conversions the launch email will miss.
 */
export default function AthxGuideForm({ placement, label, support }: AthxGuideFormProps) {
  const capture = useMagnetCapture(ATHX_MAGNET.slug, placement);
  // Subscribed, not sampled at submit time: see calc-usage.ts for why reading
  // it in the handler recorded false on every lead.
  const calcUsed = useCalculatorUsed();

  const fieldId = `athx-email-${placement}`;
  const errorId = `athx-error-${placement}`;

  if (capture.succeeded) {
    return (
      <div className={styles.sent} role="status" aria-live="polite">
        <p className={styles.formLabel}>Check your inbox</p>
        <p className={styles.formSupport}>
          We have sent the download link to{' '}
          <strong style={{ color: '#ffffff' }}>{capture.email || 'your inbox'}</strong>. Click the
          button in that email and the guide opens straight away.
        </p>
        <ol className={styles.sentSteps}>
          <li>Open the email from HybridX</li>
          <li>Click &ldquo;Confirm and download the guide&rdquo;</li>
          <li>The guide opens in your browser, and the link keeps working</li>
        </ol>
        <p className={styles.micro}>
          Nothing in a minute or two? Check your spam or promotions tab. We confirm addresses so
          the guide only goes to people who asked for it.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.form}>
      <p className={styles.formLabel}>{label}</p>
      <p className={styles.formSupport}>{support}</p>

      <form action={capture.formAction} onSubmit={capture.onSubmit} noValidate>
        {/* Honeypot. Off-screen rather than display:none, and hidden from
            assistive technology so it is never announced to a real person. */}
        <div className={styles.honeypot} aria-hidden="true">
          <label htmlFor={`athx-company-${placement}`}>Company</label>
          <input
            id={`athx-company-${placement}`}
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {Object.entries(capture.hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        {/* Whether the calculator was touched before this form was submitted.
            The number that decides whether the calculator stays on the page. */}
        <input type="hidden" name="calcUsed" value={String(calcUsed)} readOnly />

        <label className={styles.fieldLabel} htmlFor={fieldId}>
          Email address
        </label>
        <input
          id={fieldId}
          className={styles.input}
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@email.com"
          onFocus={capture.onFocus}
          aria-invalid={capture.error ? true : undefined}
          aria-describedby={capture.error ? errorId : undefined}
        />

        <button type="submit" className={styles.submit} disabled={capture.isPending}>
          {capture.isPending ? 'Sending…' : 'Send me the guide'}
        </button>

        <div id={errorId} className={styles.errorSlot} aria-live="polite">
          {capture.error ? <p className={styles.error}>{capture.error}</p> : null}
        </div>

        <p className={styles.micro}>
          We will email you a link to the guide, then one more email when the training plans
          launch, and then nothing. Unsubscribe any time. See our{' '}
          <a href="/privacy-policy">privacy notice</a>.
        </p>
      </form>
    </div>
  );
}
