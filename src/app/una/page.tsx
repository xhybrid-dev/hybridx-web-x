import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { HYBRIDX_APP_URL, HYBRIDX_URL, UNA_URL } from '@/components/una-app/Chrome';
import { grotesk, inter, mono } from '@/components/una/fonts';
import HeroWatchTrio from '@/components/una/HeroWatchTrio';
import FamilyExplorer from '@/components/una/FamilyExplorer';
import EcosystemReel from '@/components/una/EcosystemReel';
import GlancesShowcase from '@/components/una/GlancesShowcase';
import SectionNav from '@/components/una/SectionNav';
import {
  APPS,
  FREE_ON_WATCH_LINE,
  INDEPENDENCE_NOTICE,
  TRAINING_MEDICAL_NOTICE,
  VO2_ESTIMATE_NOTICE,
} from '@/lib/una-family';
import styles from './una.module.css';

import JsonLd from '@/components/JsonLd';
/*
 * hybridx.club/una: the X family — seven connected HybridX apps and three
 * live Glances for UNA Watch, united around X Streak as the central dashboard.
 *
 * Layout: the family has grown, so the page stays short by interaction rather
 * than by cutting content. Three bands: hero, one explorer for all seven apps
 * (diagram as selector, one panel, swipe rows on phones) with the 20-second
 * ecosystem reel beside its heading, then Glances and the watch. Old #ecosystem / #apps / #x-training / #<slug> links still work
 * (see family-hash.ts).
 *
 * Honesty & trademark guardrails:
 *   - Every feature claim is verified against xhybrid-dev/una-hyrox source &
 *     store copy (see src/lib/una-family.ts and una-family.test.ts).
 *   - Nominative "for UNA Watch" phrasing only; no co-branded endorsement.
 *   - HYROX is always qualified as "HYROX-format" or "HYROX-style".
 *   - VO2max is always described as an estimate, never a lab measurement.
 *   - Daniels–Gilbert equations are cited without trademarked "VDOT".
 *   - No version numbers on /una; training advice is clearly marked general.
 */

const URL_CANONICAL = `${HYBRIDX_URL}/una`;
const TITLE = 'The X family — seven connected apps for UNA Watch by HybridX';
const DESCRIPTION = 'The X family: seven connected HybridX apps for UNA Watch, from X Training plans to Race, Run, Trail, Ride, Workout and Streak, all feeding one dashboard.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    'una watch apps',
    'una watch',
    'hybridx una',
    'x training una watch',
    '10k half marathon training plan watch',
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
    title: 'The X family — seven connected apps for UNA Watch',
    description: DESCRIPTION,
    type: 'website',
    url: URL_CANONICAL,
    siteName: 'HybridX',
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The X family — seven connected apps for UNA Watch',
    description: DESCRIPTION,
  },
};

const listSchema = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'The X family of apps for UNA Watch',
  description: DESCRIPTION,
  url: URL_CANONICAL,
  itemListElement: APPS.map((a, i) => ({
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

export default function UnaFamilyPage() {
  return (
    <div id="top" className={`${styles.page} ${grotesk.variable} ${inter.variable} ${mono.variable}`}>
      <JsonLd data={listSchema} />

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a href="#top" className={styles.brandMark} aria-label="HybridX X Apps for UNA Watch, back to top">
            <Image src="/icon-logo.png" alt="HybridX" width={28} height={28} className={styles.brandLogo} />
            <span className={styles.brandName}>X Apps</span>
            <span className={styles.brandFor}>for UNA Watch</span>
          </a>

          <SectionNav className={styles.navLinks} />

          <a href={UNA_URL} className={styles.headerCta} target="_blank" rel="noopener">
            Get UNA Watch <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        {/* Hero */}
        <section className={styles.heroSection} aria-labelledby="una-hero-heading">
          <div className={`${styles.container} ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <h1 id="una-hero-heading" className={styles.h1}>
                Seven specialist apps. One connected watch.
                <span className={styles.h1Accent}>
                  Every session lands in{' '}
                  <span className={styles.h1Highlight}>X Streak.</span>
                </span>
              </h1>
              <p className={styles.heroLead}>
                An independent suite built natively for UNA Watch: <strong>X Training</strong>,{' '}
                <strong>HybridX Race</strong>, <strong>X Run</strong>, <strong>X Trail</strong>,{' '}
                <strong>X Ride</strong>, <strong>X Workout</strong> and <strong>X Streak</strong>. Train in
                the app built for today’s session; every workout flows into one honest dashboard of your
                weekly habit, training load and form.
              </p>

              <div className={styles.ctaRow}>
                <a href="#family" className={styles.btnPrimary}>
                  Explore the apps <span aria-hidden="true">↓</span>
                </a>
                <a href="#x-training" className={styles.btnSecondary}>
                  New: X Training
                </a>
                <Link href="/una/nerdy-bits" className={styles.textLink}>
                  The sports science <span aria-hidden="true">→</span>
                </Link>
              </div>

              <ul className={styles.trustStrip}>
                <li>
                  <span className={styles.trustDot} aria-hidden="true" />
                  {FREE_ON_WATCH_LINE}
                </li>
                <li>
                  <span className={styles.trustDot} aria-hidden="true" />
                  100% local
                </li>
                <li>
                  <span className={styles.trustDot} aria-hidden="true" />
                  4-button control
                </li>
                <li>
                  <span className={styles.trustDot} aria-hidden="true" />
                  Strava-ready exports
                </li>
              </ul>
            </div>

            <HeroWatchTrio />
          </div>
        </section>

        {/* The family: one selector, one panel, all seven apps */}
        <section id="family" className={styles.bandWhite} aria-labelledby="family-heading">
          <div className={styles.container}>
            <div className={styles.familyIntro}>
              <div className={styles.sectionHead}>
                <div className={styles.eyebrow}>// THE FAMILY · {APPS.length} APPS</div>
                <h2 id="family-heading" className={styles.h2}>
                  Six specialist apps. One dashboard.
                </h2>
                <p className={styles.sectionLead}>
                  Each app works on its own; pair them with <strong>X Streak</strong> and your watch becomes one
                  system. Pick an app to see its screens, features and how it connects.
                </p>
              </div>
              <EcosystemReel />
            </div>
            <FamilyExplorer />
          </div>
        </section>

        {/* On the wrist: Glances, then the watch itself */}
        <section id="glances" className={styles.bandSoft} aria-labelledby="glances-heading">
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <div className={styles.eyebrow}>// ON THE WRIST</div>
              <h2 id="glances-heading" className={styles.h2}>
                Everything that matters, one glance away.
              </h2>
              <p className={styles.sectionLead}>
                Three Glances stay up to date on their own. Swipe through them and tap a state to see what
                shows before you open an app.
              </p>
            </div>
            <GlancesShowcase />

            <div id="hardware" className={styles.hardwareBlock} aria-labelledby="hardware-heading">
              <div className={styles.hardwareHead}>
                <h3 id="hardware-heading" className={styles.h3}>
                  Built for the modular watch made to last.
                </h3>
                <p className={styles.hardwareLead}>
                  UNA Watch is the modular GPS sports watch designed in Scotland, built to be repaired and
                  upgraded rather than replaced.
                </p>
              </div>

              <ul className={styles.specStrip}>
                <li>
                  <strong>Modular &amp; repairable</strong>
                  <span>Six swappable modules, opened and upgraded over years.</span>
                </li>
                <li>
                  <strong>Sunlight-readable</strong>
                  <span>Always-on round 240×240 MIP screen.</span>
                </li>
                <li>
                  <strong>4 physical buttons</strong>
                  <span>Built for rain, gloves, sweat and 180 bpm.</span>
                </li>
                <li>
                  <strong>Open platform</strong>
                  <span>Native apps on the wrist, USB-C access.</span>
                </li>
              </ul>

              <ul className={styles.craftStrip}>
                <li>
                  <strong>Local on your watch.</strong> Load, Fitness/Fatigue, VO2max estimates and paces
                  compute on the wrist: no cloud server, no subscription.
                </li>
                <li>
                  <strong>Crash-safe.</strong> Safe local saves and interrupted-session recovery protect a
                  race even if the battery runs flat.
                </li>
                <li>
                  <strong>Inspectable science.</strong> Every published equation and its limits are on{' '}
                  <Link href="/una/nerdy-bits">the nerdy bits</Link>.
                </li>
              </ul>

              <div className={styles.ctaRow}>
                <a href={UNA_URL} className={styles.btnPrimary} target="_blank" rel="noopener">
                  Explore UNA Watch <span aria-hidden="true">↗</span>
                </a>
                <Link href="/una/nerdy-bits" className={styles.btnSecondary}>
                  Maths &amp; references
                </Link>
                <a href={HYBRIDX_APP_URL} className={styles.textLink}>
                  Train with HybridX <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <div className={styles.footerNotices}>
            <p>{INDEPENDENCE_NOTICE}</p>
            <p>
              {VO2_ESTIMATE_NOTICE} {TRAINING_MEDICAL_NOTICE}
            </p>
          </div>
          <nav className={styles.footerNav} aria-label="Footer navigation">
            <Link href="/una/nerdy-bits">The nerdy bits</Link>
            <Link href="/training">X Training</Link>
            <Link href="/race">HybridX Race</Link>
            <Link href="/streak">X Streak</Link>
            <Link href="/trail">X Trail</Link>
            <Link href="/weigh-in">X Weigh-in</Link>
            <Link href="/trail-quest">Trail Quest</Link>
            <a href={HYBRIDX_URL}>hybridx.club</a>
            <Link href="/privacy-policy">Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
