import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { HYBRIDX_APP_URL, HYBRIDX_URL, UNA_URL } from '@/components/una-app/Chrome';
import { grotesk, inter } from '@/components/una/fonts';
import FamilyExplorer from '@/components/una/FamilyExplorer';
import { FAMILY, STORE_STATUS, WATCH_RENDER, icon } from '@/lib/una-family';
import styles from './una.module.css';

/*
 * hybridx.club/una: the X family, the six HybridX apps for UNA Watch.
 *
 * A sales page, written from the athlete's side: what you get, in as few
 * words as it takes. It is short on purpose.
 *   - First thing on the page: one picture of how the apps join up (five
 *     apps, each with a line into X Streak). The picture is also the menu.
 *   - Then tabs: choose an app and see it straight away. No long scroll.
 *   - Then three lines on why they are better together, and the watch.
 *
 * How any of it works (the shared folder, the formulas, the references) is
 * deliberately not here. It lives on /una/nerdy-bits, one link away.
 *
 * Honesty constraints, all deliberate:
 *   - Claims are the watch repo's checked store text (see lib/una-family.ts).
 *   - Store status is one constant, STORE_STATUS, to edit as listings go live.
 *   - VO2max is called an estimate wherever it is described.
 *   - Watch screens are the apps' own, from UNA's simulator; the watch is
 *     UNA's product render, as on the single-app pages.
 *   - Branding follows UNA's trademark notice (components/una-app/Chrome.tsx):
 *     "for UNA Watch", nothing implying endorsement. HYROX is someone else's
 *     trademark; Race is "HYROX-format".
 */

const URL_CANONICAL = `${HYBRIDX_URL}/una`;
const TITLE = 'The X family — six apps for UNA Watch that work together';
const DESCRIPTION =
  'Race, Run, Trail, Ride, Workout and Streak: six HybridX apps for UNA Watch. One for each thing you do, and every session you save counts in X Streak.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    'una watch apps',
    'una watch',
    'hybridx una',
    'x run una watch',
    'x ride una watch',
    'x workout una watch',
    'x trail una watch',
    'x streak una watch',
    'hybridx race',
    'una watch vo2max',
    'una watch training load',
    'hyrox watch app',
  ],
  alternates: { canonical: URL_CANONICAL },
  openGraph: {
    title: 'The X family for UNA Watch',
    description: DESCRIPTION,
    type: 'website',
    url: URL_CANONICAL,
    siteName: 'HybridX',
    locale: 'en_GB',
  },
  twitter: { card: 'summary_large_image', title: 'The X family for UNA Watch', description: DESCRIPTION },
};

const listSchema = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'The X family of apps for UNA Watch',
  description: DESCRIPTION,
  url: URL_CANONICAL,
  itemListElement: FAMILY.map((a, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: {
      '@type': 'SoftwareApplication',
      name: a.name,
      applicationCategory: 'SportsApplication',
      operatingSystem: 'UNA Watch',
      description: a.summary,
      url: `${URL_CANONICAL}#${a.slug}`,
      publisher: { '@type': 'Organization', name: 'HybridX', url: HYBRIDX_URL },
    },
  })),
};

const TOGETHER = [
  {
    title: 'Every session counts',
    body: 'Save a run, a ride, a race or a workout, and it is already in your week. Nothing to log.',
  },
  {
    title: 'One training load',
    body: 'Every session is scored by your heart rate, so an hour on the bike and an hour in the gym add up fairly.',
  },
  {
    title: 'VO2max from every run',
    body: 'Road or trail, your steady running feeds one VO2max estimate.',
  },
];

export default function UnaFamilyPage() {
  return (
    <div id="top" className={`${styles.page} ${grotesk.variable} ${inter.variable}`}>
      <script
        id="una-family-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listSchema) }}
      />

      <header className={styles.bar}>
        <a href="#top" className={styles.mark} aria-label="The X family for UNA Watch">
          <Image src={icon('race')} alt="" width={56} height={56} />
          <span>X family</span>
          <i>for UNA Watch</i>
        </a>
        <nav className={styles.barLinks} aria-label="Page">
          <Link href="/una/nerdy-bits">The nerdy bits</Link>
          <a href={UNA_URL} className={styles.pill} target="_blank" rel="noopener">
            Get UNA Watch
          </a>
        </nav>
      </header>

      <main className={styles.wrap}>
        <section className={styles.hero}>
          <h1 className={styles.h1}>
            Six apps. One watch.
            <br />
            <span>Every session counts.</span>
          </h1>
          <p className={styles.lead}>
            An app for each way you train on UNA Watch. Whatever you do, it all adds up in X
            Streak.
          </p>
        </section>

        <FamilyExplorer />

        <section className={styles.together}>
          <h2 className={styles.h2}>Better together.</h2>
          <ul>
            {TOGETHER.map((t) => (
              <li key={t.title}>
                <b>{t.title}</b>
                <span>{t.body}</span>
              </li>
            ))}
          </ul>
          <p className={styles.fine}>
            Each app works on its own. Add X Streak and they start adding up.{' '}
            <Link href="/una/nerdy-bits">How the numbers work</Link>
          </p>
        </section>

        <section className={styles.una}>
          <div>
            <h2 className={styles.h2}>Made for UNA Watch.</h2>
            <p className={styles.lead}>
              The modular GPS sports watch from Scotland. Built to be repaired and upgraded, not
              replaced.
            </p>
            <div className={styles.ctas}>
              <a href={UNA_URL} className={styles.btn} target="_blank" rel="noopener">
                Get UNA Watch
              </a>
              <a href={HYBRIDX_APP_URL} className={styles.link}>
                Train with HybridX <span aria-hidden="true">→</span>
              </a>
            </div>
            <p className={styles.status}>{STORE_STATUS}</p>
          </div>
          <div className={styles.unaWatch}>
            <Image src="/una/screens/streak/home.png" alt="" width={480} height={480} className={styles.unaScreen} />
            <Image src={WATCH_RENDER.teal} alt="UNA Watch showing X Streak" fill sizes="260px" className={styles.unaRender} />
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>
          The X family are independent apps for UNA Watch, made by <a href={HYBRIDX_URL}>HybridX</a>.
          They are not made, endorsed or sponsored by UNA Watch Ltd or by HYROX. UNA and UNA Watch
          are trademarks of UNA Watch Ltd; HYROX is a trademark of its owner. VO2max is an estimate
          for tracking your own trend, not a lab test.
        </p>
        <nav aria-label="Footer">
          <Link href="/una/nerdy-bits">The nerdy bits</Link>
          <Link href="/weigh-in">X Weigh-in</Link>
          <Link href="/trail-quest">Trail Quest</Link>
          <a href={HYBRIDX_URL}>hybridx.club</a>
          <Link href="/privacy-policy">Privacy</Link>
        </nav>
      </footer>
    </div>
  );
}
