import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { HYBRIDX_URL, UNA_URL } from '@/components/una-app/Chrome';
import { grotesk, inter, mono } from '@/components/una/fonts';
import PaceExplorer from '@/components/training/PaceExplorer';
import {
  APP_BY_SLUG,
  INDEPENDENCE_NOTICE,
  TRAINING_MEDICAL_NOTICE,
  TRAINING_PLANS,
  VO2_ESTIMATE_NOTICE,
  WATCH_RENDERS,
} from '@/lib/una-family';
import styles from './training.module.css';
import ConsentSettingsButton from '@/components/consent/ConsentSettingsButton';

import JsonLd from '@/components/JsonLd';
import { OG_DEFAULTS, TWITTER_DEFAULTS } from '@/lib/seo';
const URL_CANONICAL = `${HYBRIDX_URL}/training`;
const TITLE = 'X Training: 10K, Half and VO2max Plans for UNA Watch';
const DESCRIPTION = '10K, Half Marathon and 8-week VO2max training plans for UNA Watch: Daniels-Gilbert paces from your 5K, treadmill belt-speed mode and Session Review.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    'x training una watch',
    'una watch training plan',
    '10k training plan watch',
    'half marathon training plan watch',
    'vo2max block watch app',
    'hybridx x training',
    'treadmill belt speed watch app',
  ],
  alternates: { canonical: URL_CANONICAL },
  openGraph: {
    ...OG_DEFAULTS,
    title: 'X Training for UNA Watch',
    description: DESCRIPTION,
    type: 'website',
    url: URL_CANONICAL,
    siteName: 'HybridX',
    locale: 'en_GB',
  },
  twitter: {
    ...TWITTER_DEFAULTS,
    card: 'summary_large_image',
    title: 'X Training for UNA Watch',
    description: DESCRIPTION,
  },
};

const trainingApp = APP_BY_SLUG.training;

const appSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'X Training',
  applicationCategory: 'SportsApplication',
  operatingSystem: 'UNA Watch',
  description: DESCRIPTION,
  url: URL_CANONICAL,
  publisher: { '@type': 'Organization', name: 'HybridX', url: HYBRIDX_URL },
};

export default function TrainingPage() {
  return (
    <div id="top" className={`${styles.page} ${grotesk.variable} ${inter.variable} ${mono.variable}`}>
      <JsonLd data={appSchema} />

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/una" className={styles.brand}>
            <Image src="/icon-logo.png" alt="HybridX" width={28} height={28} />
            <span>X Training</span>
            <span className={styles.brandFor}>for UNA Watch</span>
          </Link>

          <nav className={styles.navLinks} aria-label="Page sections">
            <a href="#plans">3 Plans</a>
            <a href="#paces">Pace Calculator</a>
            <a href="#screens">Screens</a>
            <a href="#ecosystem">Ecosystem</a>
            <Link href="/una">All 7 X Apps</Link>
          </nav>

          <a href={UNA_URL} className={styles.navCta} target="_blank" rel="noopener">
            Get UNA Watch ↗
          </a>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="training-hero-heading">
          <div className={`${styles.container} ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <div className={styles.eyebrow}>// PART OF THE 7-APP X FAMILY FOR UNA WATCH</div>
              <h1 id="training-hero-heading" className={styles.h1}>
                Your 10K &amp; Half Marathon plan,{' '}
                <span className={styles.h1Mark}>coached on your wrist.</span>
              </h1>
              <p className={styles.lead}>
                X Training brings three complete periodised running plans — <strong>10K (10 weeks)</strong>,{' '}
                <strong>Half Marathon (12 weeks)</strong> and an <strong>8-week VO2max block</strong> —
                directly onto UNA Watch. Enter your 5K time, pick the 3 to 6 days you run, and run
                outdoors or on a treadmill while every session flows straight into{' '}
                <strong>X Streak</strong> and <strong>X Run</strong>.
              </p>
              <div className={styles.ctaRow}>
                <a href="#paces" className={styles.btnPrimary}>
                  Preview Your Paces ↓
                </a>
                <Link href="/una" className={styles.btnSecondary}>
                  ← Back to All 7 X Apps
                </Link>
              </div>
            </div>

            <div className={styles.heroWatchCard}>
              <div className={styles.watchWrap}>
                <Image
                  src="/una/screens/training/today.png"
                  alt="X Training Today screen on UNA Watch"
                  width={480}
                  height={480}
                  unoptimized
                  loading="eager"
                  className={styles.watchScreen}
                />
                <Image
                  src={WATCH_RENDERS.black}
                  alt="UNA Watch Charcoal displaying X Training"
                  fill
                  sizes="250px"
                  className={styles.watchRender}
                  priority
                />
              </div>
              <p className={styles.watchNote}>
                Today’s exact session, pace band and purpose — ready the second you open the app.
              </p>
            </div>
          </div>
        </section>

        <section id="plans" className={styles.bandWhite} aria-labelledby="plans-heading">
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <div className={styles.eyebrow}>// THREE BUILT-IN PLANS · 392 LAYOUTS</div>
              <h2 id="plans-heading" className={styles.h2}>
                Built around the 3 to 6 days you actually run.
              </h2>
              <p className={styles.lead}>
                Every plan scales cleanly across Beginner (&lt;20 km/wk), Intermediate (20–40 km/wk)
                and Experienced (40+ km/wk) volumes and places quality workouts on your chosen days
                without stacking hard sessions back to back.
              </p>
            </div>

            <div className={styles.planCards}>
              {TRAINING_PLANS.map((plan) => (
                <article key={plan.id} className={styles.planCard}>
                  <span className={styles.planWeeks}>{plan.weeks}</span>
                  <h3>{plan.name}</h3>
                  <p>{plan.summary}</p>
                  <ul>
                    {plan.keyWorkouts.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                  <div className={styles.longRunPill}>{plan.longRunRange}</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="paces" className={styles.bandSoft} aria-labelledby="paces-heading">
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <div className={styles.eyebrow}>// PERSONALIZED PACES &amp; TREADMILL SUPPORT</div>
              <h2 id="paces-heading" className={styles.h2}>
                Dial your 5K time. See your exact bands.
              </h2>
              <p className={styles.lead}>
                Switch cleanly between outdoor running paces and Treadmill mode indoors.
              </p>
            </div>
            <PaceExplorer />
          </div>
        </section>

        <section id="screens" className={styles.bandWhite} aria-labelledby="screens-heading">
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <div className={styles.eyebrow}>// ON THE WRIST · 8 SCREENS</div>
              <h2 id="screens-heading" className={styles.h2}>
                From Today’s workout to Session Review, Feel and Form.
              </h2>
            </div>

            <ol className={styles.screensGrid}>
              {trainingApp.screens.map((sc) => (
                <li key={sc.file} className={styles.screenCard}>
                  <div className={styles.dialWrap}>
                    <Image
                      src={sc.file}
                      alt={`X Training: ${sc.label}`}
                      width={480}
                      height={480}
                      unoptimized
                      loading="eager"
                      className={styles.dialImg}
                    />
                  </div>
                  <strong>{sc.label}</strong>
                  <span>{sc.caption}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="adapt" className={styles.bandSoft} aria-labelledby="adapt-heading">
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <div className={styles.eyebrow}>// PLAN MEMORY · SESSION REVIEW · GLANCE</div>
              <h2 id="adapt-heading" className={styles.h2}>
                Adaptive Plan Memory built for real training weeks.
              </h2>
              <p className={styles.lead}>
                Real life interrupts training blocks. X Training adapts calmly on your wrist without
                guilt or spreadsheets.
              </p>
            </div>

            <div className={styles.planCards}>
              <article className={styles.planCard}>
                <span className={styles.planWeeks}>PLAN MEMORY &amp; CHANGES</span>
                <h3>Handles missed &amp; moved days</h3>
                <p>
                  Missed easy runs drop quietly, missed quality sessions shift into a later key
                  slot, missed Sunday long runs are offered back Monday, and the Changes menu lets
                  you swap, skip, pause or recalibrate after a faster time trial.
                </p>
              </article>
              <article className={styles.planCard}>
                <span className={styles.planWeeks}>SESSION REVIEW, FEEL &amp; FORM</span>
                <h3>Smart 3-run hold-plan coaching</h3>
                <p>
                  Scores percent time in your target pace band (with 5-second debounced alerts),
                  asks how the run felt (Fresh to Spent), charts your last 8 sessions on Form, and
                  only after 3 consecutive off-pace runs offers to repeat a week.
                </p>
              </article>
              <article className={styles.planCard}>
                <span className={styles.planWeeks}>X TRAINING GLANCE</span>
                <h3>14-day wrist window &amp; 7-day pips</h3>
                <p>
                  Pair X Training with X Training Glance to check today’s exact workout, pace band
                  and Mon–Sun status pips straight from the watch’s glances screen without opening
                  the app.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="ecosystem" className={styles.bandTeal} aria-labelledby="eco-heading">
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <div className={styles.eyebrow}>// CONNECTED TO THE X FAMILY</div>
              <h2 id="eco-heading" className={styles.h2}>
                Automatically wired into X Streak, X Run and X Training Glance.
              </h2>
            </div>

            <div className={styles.ecosystemGrid}>
              <article className={styles.ecoCard}>
                <h3>Counts in X Streak with full Training Load</h3>
                <p>
                  Every completed workout counts automatically in X Streak with Edwards 5-zone
                  heart-rate load. Watch your 42-day Fitness rise across your Build weeks and your
                  Form swing Fresh through race taper — with live week progress shown right on the
                  Saved screen.
                </p>
              </article>
              <article className={styles.ecoCard}>
                <h3>Two-way VO2max estimate loop with X Run</h3>
                <p>
                  Steady outdoor running minutes feed automatically into X Run’s ACSM/%HRR VO2max
                  estimate engine, and X Run writes your latest estimate back so X Training shows
                  your aerobic trend right on the Plan screen.
                </p>
              </article>
            </div>

            <div className={styles.ctaRow} style={{ marginTop: 24 }}>
              <Link href="/una" className={styles.btnPrimary}>
                Explore All 7 Connected Apps →
              </Link>
              <Link href="/una/nerdy-bits#training" className={styles.btnSecondary}>
                Read the Daniels–Gilbert Maths
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <p>{INDEPENDENCE_NOTICE}</p>
          <p>
            {VO2_ESTIMATE_NOTICE} {TRAINING_MEDICAL_NOTICE}
          </p>
          <nav className={styles.footerNav} aria-label="Footer">
            <Link href="/una">The X family</Link>
            <Link href="/una/nerdy-bits">The nerdy bits</Link>
            <Link href="/race">HybridX Race</Link>
            <Link href="/streak">X Streak</Link>
            <Link href="/trail">X Trail</Link>
            <Link href="/weigh-in">X Weigh-in</Link>
            <a href={HYBRIDX_URL}>hybridx.club</a>
            <Link href="/privacy-policy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/contact">Contact</Link>
            <ConsentSettingsButton className={styles.footerButton} />
          </nav>
        </div>
      </footer>
    </div>
  );
}
