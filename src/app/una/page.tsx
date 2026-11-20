import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { HYBRIDX_APP_URL, HYBRIDX_URL, UNA_URL } from '@/components/una-app/Chrome';
import { grotesk, inter, mono } from '@/components/una/fonts';
import HeroWatchTrio from '@/components/una/HeroWatchTrio';
import EcosystemHub from '@/components/una/EcosystemHub';
import XTrainingShowcase from '@/components/una/XTrainingShowcase';
import AppDeepDive from '@/components/una/AppDeepDive';
import GlancesShowcase from '@/components/una/GlancesShowcase';
import {
  APPS,
  INDEPENDENCE_NOTICE,
  STANDALONE_APPS,
  TRAINING_MEDICAL_NOTICE,
  VO2_ESTIMATE_NOTICE,
  WATCH_RENDERS,
} from '@/lib/una-family';
import styles from './una.module.css';

/*
 * hybridx.club/una: the X family — seven connected HybridX apps and three
 * live Glances for UNA Watch, united around X Streak as the central dashboard.
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
const DESCRIPTION =
  'X Training (10K, Half Marathon & 8-week VO2max plans), HybridX Race, X Run, X Trail, X Ride, X Workout and X Streak: seven specialist HybridX apps for UNA Watch that flow automatically into one dashboard.';

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
      <script
        id="una-family-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listSchema) }}
      />

      {/* Section 1: Sticky Translucent Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a href="#top" className={styles.brandMark} aria-label="HybridX X Apps for UNA Watch, back to top">
            <Image src="/Icon Logo.png" alt="HybridX" width={28} height={28} className={styles.brandLogo} />
            <span className={styles.brandName}>X Apps</span>
            <span className={styles.brandFor}>for UNA Watch</span>
          </a>

          <nav className={styles.navLinks} aria-label="Page sections">
            <a href="#ecosystem">Ecosystem</a>
            <a href="#x-training">X Training</a>
            <a href="#apps">All 7 Apps</a>
            <a href="#glances">Glances</a>
            <Link href="/una/nerdy-bits">The Maths</Link>
          </nav>

          <a href={UNA_URL} className={styles.headerCta} target="_blank" rel="noopener">
            Get UNA Watch <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>

      <main>
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
                An independent suite built natively for UNA Watch — combining{' '}
                <strong>X Training</strong>, <strong>HybridX Race</strong>, <strong>X Run</strong>,{' '}
                <strong>X Trail</strong>, <strong>X Ride</strong>, <strong>X Workout</strong> and{' '}
                <strong>X Streak</strong>. Train in the exact tool built for today’s session; every
                workout flows automatically into X Streak for one honest dashboard of your weekly
                habit, training load and form.
              </p>

              <div className={styles.ctaRow}>
                <a href="#ecosystem" className={styles.btnPrimary}>
                  See How It Connects <span aria-hidden="true">↓</span>
                </a>
                <a href="#x-training" className={styles.btnSecondary}>
                  Explore X Training <span aria-hidden="true">↓</span>
                </a>
                <Link href="/una/nerdy-bits" className={styles.textLink}>
                  Read the sports science <span aria-hidden="true">→</span>
                </Link>
              </div>

              <ul className={styles.trustStrip}>
                <li>
                  <span className={styles.trustDot} aria-hidden="true" />
                  100% Local Apps
                </li>
                <li>
                  <span className={styles.trustDot} aria-hidden="true" />
                  4-Button Control
                </li>
                <li>
                  <span className={styles.trustDot} aria-hidden="true" />
                  Strava-Ready Exports
                </li>
                <li>
                  <span className={styles.trustDot} aria-hidden="true" />
                  100% Free
                </li>
              </ul>
            </div>

            <HeroWatchTrio />
          </div>
        </section>

        {/* Section 01: The Ecosystem Heart */}
        <section id="ecosystem" className={styles.bandWhite} aria-labelledby="ecosystem-heading">
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <div className={styles.eyebrow}>// 01 · THE ECOSYSTEM</div>
              <h2 id="ecosystem-heading" className={styles.h2}>
                Six specialist engines. One central dashboard.
              </h2>
              <p className={styles.sectionLead}>
                Every X app works cleanly on its own — and the moment you pair them with{' '}
                <strong>X Streak</strong>, your watch becomes one connected system. Select any app
                below to see how it fits alongside the rest.
              </p>
            </div>
            <EcosystemHub />
          </div>
        </section>

        {/* Section 02: Flagship Spotlight — X Training */}
        <section id="x-training" className={styles.bandTeal} aria-labelledby="x-training-heading">
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <div className={styles.eyebrow}>// 02 · NEW APP · X TRAINING</div>
              <h2 id="x-training-heading" className={styles.h2}>
                Full 10K, Half Marathon &amp; VO2max coaching on your wrist.
              </h2>
              <p className={styles.sectionLead}>
                Not a static list of workouts. X Training builds personalised paces from your 5K time,
                works outdoors or on a treadmill, adapts when real life interrupts your week, and
                feeds straight into X Streak and X Run.
              </p>
            </div>
            <XTrainingShowcase />
          </div>
        </section>

        {/* Section 03: All 7 Apps in Clarity */}
        <section id="apps" className={styles.bandWhite} aria-labelledby="apps-heading">
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <div className={styles.eyebrow}>// 03 · ALL SEVEN APPS</div>
              <h2 id="apps-heading" className={styles.h2}>
                What each app does — and how it works alongside the rest.
              </h2>
              <p className={styles.sectionLead}>
                Compare all seven connected apps at a glance, then open any app below to inspect its
                latest features, how it connects with the family, and its watch-screen gallery.
              </p>
            </div>
            <AppDeepDive />
          </div>
        </section>

        {/* Section 04: Watch-Face Glances */}
        <section id="glances" className={styles.bandSoft} aria-labelledby="glances-heading">
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <div className={styles.eyebrow}>// 04 · WATCH-FACE GLANCES</div>
              <h2 id="glances-heading" className={styles.h2}>
                Everything that matters, one wrist glance away.
              </h2>
              <p className={styles.sectionLead}>
                Three lightweight companion Glances stay up to date automatically — toggle their
                real states below to see what appears before you even open an app.
              </p>
            </div>
            <GlancesShowcase />
          </div>
        </section>

        {/* Section 05: Built for UNA Watch Hardware */}
        <section id="hardware" className={styles.bandTeal} aria-labelledby="hardware-heading">
          <div className={`${styles.container} ${styles.hardwareGrid}`}>
            <div className={styles.hardwareCopy}>
              <div className={styles.eyebrow}>// 05 · BUILT FOR UNA WATCH</div>
              <h2 id="hardware-heading" className={styles.h2}>
                Engineered for the modular watch built to evolve.
              </h2>
              <p className={styles.sectionLead}>
                UNA Watch is the modular GPS sports watch designed in Scotland — built to be repaired
                and upgraded rather than replaced, and open to specialist apps crafted for the exact
                way you train.
              </p>

              <ul className={styles.hardwareSpecs}>
                <li>
                  <strong>Modular &amp; repairable</strong>
                  <span>Six swappable modules designed to be opened, repaired and upgraded over years.</span>
                </li>
                <li>
                  <strong>Sunlight-readable MIP dial</strong>
                  <span>Always-on round 240×240 screen engineered to stay crisp in bright outdoor sun.</span>
                </li>
                <li>
                  <strong>4 physical buttons</strong>
                  <span>Tactile control built for rain, gloves, sweat and 180 bpm transitions.</span>
                </li>
                <li>
                  <strong>Open specialist platform</strong>
                  <span>Native apps running directly on the wrist with universal USB-C access.</span>
                </li>
              </ul>

              <div className={styles.ctaRow}>
                <a href={UNA_URL} className={styles.btnPrimary} target="_blank" rel="noopener">
                  Explore UNA Watch <span aria-hidden="true">↗</span>
                </a>
                <Link href="/una/nerdy-bits" className={styles.btnSecondary}>
                  Read the Maths &amp; References
                </Link>
                <a href={HYBRIDX_APP_URL} className={styles.textLink}>
                  Train with HybridX <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>

            <div className={styles.hardwareVisual}>
              <div className={styles.hardwareWatch}>
                <Image
                  src="/una/screens/streak/session-found.png"
                  alt="X Streak auto-counting a newly saved session"
                  width={480}
                  height={480}
                  unoptimized
                  loading="eager"
                  className={styles.hardwareScreen}
                />
                <Image
                  src={WATCH_RENDERS.teal}
                  alt="UNA Watch Teal displaying X Streak"
                  fill
                  sizes="240px"
                  className={styles.hardwareRender}
                />
              </div>

              <ul className={styles.craftList}>
                <li>
                  <strong>100% local on your watch:</strong> Training load, Fitness/Fatigue, VO2max
                  estimates and training paces compute natively without a cloud server or subscription.
                </li>
                <li>
                  <strong>Crash-safe by design:</strong> Safe local saves and interrupted-session
                  recovery keep races and workouts protected even if a battery runs flat.
                </li>
                <li>
                  <strong>Open, inspectable science:</strong> Every published equation and its limits
                  are written out plainly on <Link href="/una/nerdy-bits">/una/nerdy-bits</Link>.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 06: More Independent Apps (Outside X Streak) */}
        <section id="more-apps" className={styles.bandWhite} aria-labelledby="more-apps-heading">
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <div className={styles.eyebrow}>// 06 · MORE FOR UNA WATCH</div>
              <h2 id="more-apps-heading" className={styles.h2}>
                Standalone tools — intentionally outside X Streak.
              </h2>
              <p className={styles.sectionLead}>
                Two more independent HybridX apps for UNA Watch that live outside your workout streak
                by design.
              </p>
            </div>

            <div className={styles.standaloneGrid}>
              {STANDALONE_APPS.map((app) => (
                <article key={app.slug} className={styles.standaloneCard}>
                  <div className={styles.standaloneHead}>
                    {app.icon && (
                      <Image
                        src={app.icon}
                        alt=""
                        width={48}
                        height={48}
                        className={styles.standaloneIcon}
                      />
                    )}
                    <div>
                      <h3 className={styles.standaloneTitle}>{app.name}</h3>
                      <span className={styles.standaloneRole}>{app.role}</span>
                    </div>
                  </div>
                  <p className={styles.standaloneBody}>{app.summary}</p>
                  <div className={styles.standaloneFoot}>
                    <span className={styles.standaloneHighlight}>{app.highlight}</span>
                    <Link href={app.href} className={styles.standaloneLink}>
                      Explore {app.name} <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </article>
              ))}
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
