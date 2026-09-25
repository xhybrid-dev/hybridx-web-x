import Image from 'next/image';
import styles from './app-page.module.css';

/*
 * The parts every HybridX-app-for-UNA page shares: the wordmark, the arrow on
 * outbound links, the UNA Watch section and the footer.
 *
 * Branding follows UNA's trademark notice (TRADEMARK.md in
 * github.com/UNAWatch/una-sdk): nominative use — "for UNA Watch" — and
 * nothing implying endorsement, sponsorship or affiliation. So no
 * "HybridX × UNA" lockup: the wordmark is the app's own, and the footer says
 * plainly that UNA Watch Ltd neither made nor endorses the app.
 *
 * Claims about UNA are limited to what UNA says publicly about itself:
 * modular, repairable and upgradable, open to apps, from Scotland. No battery
 * figures or specs that could change.
 */

export const UNA_URL = 'https://unawatch.com';
export const HYBRIDX_URL = 'https://hybridx.club';
export const HYBRIDX_APP_URL = 'https://hybridx.club/app';

/** The HybridX apps for UNA Watch, for cross-links between their pages. */
export const UNA_APPS = [
  { name: 'HybridX Race', href: `${HYBRIDX_URL}/race` },
  { name: 'HybridX Streak', href: `${HYBRIDX_URL}/streak` },
] as const;

export function Arrow() {
  return (
    <svg className={styles.arrow} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4.5 11.5l7-7M5.5 4.5h6v6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// The app's own wordmark: HybridX's mark, the app's name, and a nominative
// "for UNA Watch".
export function Wordmark({ app, large = false }: { app: string; large?: boolean }) {
  return (
    <span className={`${styles.wordmark} ${large ? styles.wordmarkLarge : ''}`}>
      <Image src="/Icon Logo.png" alt="HybridX" width={40} height={40} className={styles.xMark} />
      <span className={styles.wordRace}>{app}</span>
      <span className={styles.wordFor}>for UNA Watch</span>
    </span>
  );
}

export function UnaSection({ appName, pitch }: { appName: string; pitch: string }) {
  return (
    <section id="una" className={styles.section}>
      <div className={styles.container}>
        <div className={`${styles.unaPanel} ${styles.reveal}`}>
          <div className={styles.unaCopy}>
            <p className={styles.eyebrow}>Why UNA Watch</p>
            <h2 className={styles.h2}>
              Built for a watch
              <br />
              you can fix.
            </h2>
            <p className={styles.sectionLead}>
              UNA Watch is the modular GPS sports watch from Scotland: a watch you can repair and
              upgrade rather than replace, open to apps made for the sport you actually do.{' '}
              {appName} is made for it from the ground up — {pitch}
            </p>
            <div className={styles.ctaRow}>
              <a href={UNA_URL} className={styles.btnTeal} target="_blank" rel="noopener">
                Explore UNA Watch <Arrow />
              </a>
            </div>
          </div>
          <ul className={styles.unaPoints}>
            <li>
              <span className={styles.unaIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z" /></svg>
              </span>
              <strong>Repairable</strong>
              <span>Designed to be opened and fixed, not replaced.</span>
            </li>
            <li>
              <span className={styles.unaIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><path d="M16.5 13v7M13 16.5h7" /></svg>
              </span>
              <strong>Modular</strong>
              <span>Hardware that upgrades with you.</span>
            </li>
            <li>
              <span className={styles.unaIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 5l-3 14" /></svg>
              </span>
              <strong>Made for your sport</strong>
              <span>Open to specialist apps like this one, not just the big names.</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export function AppFooter({ appName, mentionsHyrox = false }: { appName: string; mentionsHyrox?: boolean }) {
  return (
    <footer className={styles.footer}>
      <div className={`${styles.container} ${styles.footerInner}`}>
        <p>
          {appName} is an independent app for UNA Watch, made by <a href={HYBRIDX_URL}>HybridX</a>.
          {mentionsHyrox ? (
            <>
              {' '}It is not made, endorsed or sponsored by UNA Watch Ltd or by HYROX. UNA and UNA
              Watch are trademarks of UNA Watch Ltd; HYROX is a trademark of its owner.
            </>
          ) : (
            <>
              {' '}It is not made, endorsed or sponsored by UNA Watch Ltd. UNA and UNA Watch are
              trademarks of UNA Watch Ltd.
            </>
          )}
        </p>
        <nav className={styles.footerLinks} aria-label="Footer">
          {UNA_APPS.filter((a) => a.name !== appName).map((a) => (
            <a key={a.name} href={a.href}>
              {a.name}
            </a>
          ))}
          <a href={HYBRIDX_URL}>hybridx.club</a>
          <a href={UNA_URL} target="_blank" rel="noopener">
            unawatch.com
          </a>
          <a href={`${HYBRIDX_URL}/privacy-policy`}>Privacy</a>
        </nav>
      </div>
    </footer>
  );
}
