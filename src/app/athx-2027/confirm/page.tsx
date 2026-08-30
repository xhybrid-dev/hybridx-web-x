import type { Metadata } from 'next';
import styles from '../athx.module.css';
import AthxConfirmDownload from '@/components/athx/AthxConfirmDownload';
import { verifyLeadToken } from '@/lib/lead-tokens';
import { ATHX_SOURCE } from '@/lib/athx-campaign';

/*
 * Where the emailed download link lands.
 *
 * The page renders; it does not confirm. Consent is granted by the button,
 * which POSTs — see confirm/actions.ts for why that distinction is the whole
 * point of a double opt-in.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your ATHX guide',
  // A per-address utility page. Never index it, and never let it compete with
  // the funnel page it belongs to.
  robots: { index: false, follow: false },
};

const ERROR_COPY: Record<string, { heading: string; body: string }> = {
  expired: {
    heading: 'That link has expired',
    body: 'Links last 30 days. Ask for the guide again and we will send you a fresh one.',
  },
  'bad-signature': {
    heading: 'That link is not valid',
    body: 'It may have been altered on the way to you, or copied incompletely from the email. Ask for the guide again for a working link.',
  },
  malformed: {
    heading: 'That link is incomplete',
    body: 'Some email clients break long links across lines. Try clicking it again from the email, or ask for a fresh one.',
  },
  'wrong-source': {
    heading: 'That link is not valid',
    body: 'It was issued for a different download. Ask for the guide again for a working link.',
  },
};

export default async function AthxConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const verified = verifyLeadToken(token, ATHX_SOURCE);

  // `error` carries a reason back from the download route when a token failed
  // there, so a stale link explains itself instead of redirecting into a page
  // that just asks the visitor to confirm again.
  const reason = verified.valid && !error ? null : error || (verified.valid ? null : verified.reason);
  const errorCopy = reason ? (ERROR_COPY[reason] ?? ERROR_COPY['bad-signature']) : null;

  return (
    <div className={styles.page}>
      <main>
        <section className={styles.hero}>
          <div className={styles.container}>
            {errorCopy ? (
              <>
                <p className={styles.eyebrow}>Link problem</p>
                <h1 className={styles.h1}>{errorCopy.heading}</h1>
                <p className={styles.standfirst}>{errorCopy.body}</p>
                <a className={styles.downloadButton} href="/athx-2027#guide">
                  Ask for the guide again
                </a>
              </>
            ) : (
              <AthxConfirmDownload token={token ?? ''} />
            )}
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <p className={styles.wordmark}>
            HYBRID<span>X</span> CLUB
          </p>
          <p className={styles.caption}>hybridx.club</p>
          <p className={styles.legal}>
            Unofficial and independently produced. Not affiliated with or endorsed by ATHX Games.
          </p>
        </div>
      </footer>
    </div>
  );
}
