'use client';

import { useActionState, useEffect, useState } from 'react';
import styles from '@/app/athx-2027/athx.module.css';
import { trackEvent } from '@/lib/analytics';
import { confirmAthxGuide, type AthxConfirmState } from '@/app/athx-2027/confirm/actions';

const STORAGE_KEY = 'athx-guide-download-url';

/**
 * The confirm-and-download step.
 *
 * Two states, one button each. Before confirming, the button POSTs the token,
 * which is what grants consent — see the action for why that must not happen on
 * page load. After confirming, the same space holds the download.
 *
 * The URL is stashed in sessionStorage so a refresh, or a return to this tab
 * after reading the guide, lands on the download rather than back on the
 * confirm button. It is scoped to the tab because it is a per-address link and
 * has no business outliving the session on a shared machine.
 */
export default function AthxConfirmDownload({ token }: { token: string }) {
  const initialState: AthxConfirmState = { status: '', message: '' };
  const [state, formAction, isPending] = useActionState(confirmAthxGuide, initialState);
  const [storedUrl, setStoredUrl] = useState<string | null>(null);

  useEffect(() => {
    try {
      setStoredUrl(sessionStorage.getItem(STORAGE_KEY));
    } catch {
      // Private mode, or storage disabled. The button below still works.
    }
  }, []);

  useEffect(() => {
    if (state.status !== 'confirmed' || !state.downloadUrl) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, state.downloadUrl);
    } catch {
      // Not worth reporting: losing the stash costs a click on a refresh.
    }
    // The conversion that counts. Fired here rather than on submission, so the
    // metric counts confirmed subscribers rather than typed addresses.
    trackEvent('generate_lead', { magnet: 'what-is-athx', method: 'confirmed_opt_in' });
  }, [state]);

  const downloadUrl = state.downloadUrl || storedUrl;

  if (downloadUrl) {
    return (
      <div role="status" aria-live="polite">
        <p className={styles.eyebrow}>Email confirmed</p>
        <h1 className={styles.h1}>Here is your guide</h1>
        <p className={styles.standfirst}>
          One page on what ATHX is, how the day is structured, the three zones, how the rank
          scoring adds up, and the 2027 UK and Ireland dates.
        </p>

        <a
          className={styles.downloadButton}
          href={downloadUrl}
          target="_blank"
          rel="noopener"
          onClick={() => trackEvent('magnet_download', { magnet: 'what-is-athx' })}
        >
          Download What is ATHX?
        </a>

        <p className={styles.micro} style={{ marginTop: 20 }}>
          It opens in a new tab. The link in your email keeps working, so you can come back to it
          later.
        </p>

        <div className={styles.linkList}>
          <a className={styles.textLink} href="/athx-2027#calculator">
            Work out your own Endurance Zone number
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className={styles.eyebrow}>One more click</p>
      <h1 className={styles.h1}>Confirm and the guide is yours</h1>
      <p className={styles.standfirst}>
        We confirm addresses so the guide only goes to people who asked for it, and so the launch
        email reaches an inbox that wants it.
      </p>

      <form action={formAction}>
        <input type="hidden" name="token" value={token} />
        <button type="submit" className={styles.downloadButton} disabled={isPending}>
          {isPending ? 'Confirming…' : 'Confirm and download the guide'}
        </button>
      </form>

      <div aria-live="polite" className={styles.errorSlot}>
        {state.status === 'error' ? <p className={styles.error}>{state.message}</p> : null}
      </div>
    </div>
  );
}
