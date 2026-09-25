import type { Metadata } from 'next';
import Image from 'next/image';
import base from '@/components/una-app/app-page.module.css';
import {
  AppFooter,
  Arrow,
  HYBRIDX_APP_URL,
  HYBRIDX_URL,
  UNA_URL,
  UnaSection,
  Wordmark,
} from '@/components/una-app/Chrome';
import StreakWatch from '@/components/streak/StreakWatch';
import WeekPlanner from '@/components/streak/WeekPlanner';
import ClimbLadder from '@/components/streak/ClimbLadder';
import { BADGES, DEFAULT_MIN_MINUTES, MAX_SHIELDS, SHIELD_EVERY } from '@/lib/streak-content';
import styles from './streak.module.css';

/*
 * streak.hybridx.club: the page for HybridX Streak, the weekly training
 * streak for UNA Watch.
 *
 * Served at /streak on hybridx.club and at the root of streak.hybridx.club;
 * the middleware rewrites the subdomain's "/" here. Canonical is the
 * subdomain.
 *
 * The Race page's sibling: same shared look and parts (components/una-app/),
 * retinted to the Streak app's own teal and lime (streak.module.css). Written
 * for athletes, not developers.
 *
 * Every rule the page states — the mountains, shields, badges, the coach's
 * words — comes from lib/streak-content.ts, which mirrors the watch app, and
 * the screens and the hero recording are the app's own.
 *
 * Honesty constraints:
 *   - The app is not in the UNA store yet: "coming to UNA Watch".
 *   - Screens are pre-release and say so.
 *   - Automatic counting reads other apps' recordings. It works in the
 *     simulator; the check on a real watch (Gate 0) is still to run. If it
 *     fails, the hero's "counts by itself" and the "Every app counts" card
 *     need rewording before this goes live.
 *   - The hero's watch is UNA's product render, which needs UNA's permission
 *     (see the Race page).
 */

const URL_CANONICAL = 'https://streak.hybridx.club';

const TITLE = 'HybridX Streak — the weekly training streak for UNA Watch';
const DESCRIPTION =
  'Set your own weekly target and every session your watch records counts by itself. Hit it and you climb a mountain, one week at a time. The weekly training streak for UNA Watch, by HybridX.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    'hybridx streak',
    'una watch',
    'una watch app',
    'training streak',
    'weekly streak',
    'workout streak tracker',
    'weekly training target',
    'fitness habit tracker watch',
    'modular sports watch',
    'repairable smartwatch',
  ],
  alternates: { canonical: URL_CANONICAL },
  openGraph: {
    title: 'HybridX Streak for UNA Watch',
    description: DESCRIPTION,
    type: 'website',
    url: URL_CANONICAL,
    siteName: 'HybridX',
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HybridX Streak for UNA Watch',
    description: DESCRIPTION,
  },
};

const appSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'HybridX Streak',
  applicationCategory: 'HealthApplication',
  operatingSystem: 'UNA Watch',
  description: DESCRIPTION,
  url: URL_CANONICAL,
  publisher: { '@type': 'Organization', name: 'HybridX', url: HYBRIDX_URL },
};

const STEPS = [
  {
    n: '01',
    title: 'Set your week',
    body: 'Choose how many sessions make a week, from one to seven — three to start. Pick the day your week begins, and whether everything counts or just one kind of training.',
  },
  {
    n: '02',
    title: 'Just train',
    body: `Run, ride, lift, row, race. Every session your watch records counts by itself — anything over ${DEFAULT_MIN_MINUTES} minutes, so an accidental start never does. Trained without the watch? Add it by hand.`,
  },
  {
    n: '03',
    title: 'Climb',
    body: 'Hit your target and the week is banked: one step up the mountain. Keep going, and the steps add up to summits.',
  },
];

const FEATURES = [
  {
    kicker: 'Every app counts',
    title: 'Whatever recorded it',
    body: 'A run from one app, a strength session from another, a race from HybridX Race. If your watch recorded it, it counts towards your week.',
    accent: 'cyan',
  },
  {
    kicker: 'Your coach',
    title: 'Always on your side',
    body: '“1 more · 3 days left.” “Week banked. Rest up.” Short, warm, and it tells you what’s left. Never a telling-off.',
    accent: 'amber',
  },
  {
    kicker: 'Leave one out',
    title: 'Oops, that was the warm-up',
    body: 'Started a recording by accident? Leave it out of your week in two presses, and put it back just as easily.',
    accent: 'lime',
  },
  {
    kicker: 'Trophy case',
    title: 'Everything you’ve earned',
    body: `Every summit, badges from ${BADGES[0].name} at ${BADGES[0].sessions} sessions to ${BADGES[BADGES.length - 1].name} at ${BADGES[BADGES.length - 1].sessions}, your best week and your longest streak.`,
    accent: 'yellow',
  },
  {
    kicker: 'Your rules',
    title: 'Set it up your way',
    body: 'Your target, the day your week starts, what counts, the shortest session that counts, and one a day if you’d rather. A new target starts next week, never mid-week.',
    accent: 'teal',
  },
];

const SHIELD_SCREENS = [
  { src: '/streak/shield-offer.png', title: 'Life happens.', caption: 'Missed a week? The watch offers a shield. Spend it, or don’t — your call.' },
  { src: '/streak/streak-saved.png', title: 'Streak saved.', caption: 'The streak carries on as if the week never slipped.' },
  { src: '/streak/fresh-start.png', title: 'Fresh start.', caption: 'No shields left? No scolding. It tells you what you kept, and starts again today.' },
];

const SCREENS = [
  { src: '/streak/home.png', title: 'Home', caption: 'Your mountain, your streak and this week’s sessions, together.' },
  { src: '/streak/this-week.png', title: 'This week', caption: 'Every session so far — and why one didn’t count, if it didn’t.' },
  { src: '/streak/log.png', title: 'Log a session', caption: 'Trained without your watch? Add it for today or yesterday.' },
  { src: '/streak/trophy.png', title: 'Trophy case', caption: 'Every summit and badge, and how close the next one is.' },
  { src: '/streak/settings.png', title: 'Settings', caption: 'Your target, your week, your rules.' },
  { src: '/streak/summit.png', title: 'Summit', caption: 'Reach the top and the whole screen celebrates.' },
];

// A sketch of the glance, the small card on the watch's glances screen. The
// wording and layout follow the app's own glance (DESIGN.md §8).
function GlanceCard() {
  return (
    <div className={styles.glance} aria-label="The glance: 7 week streak, 2 of 3 this week, Snowdon: 5 weeks to go">
      <svg viewBox="0 0 60 60" className={styles.glanceMark} aria-hidden="true">
        <path d="M4 56 L30 18 L56 56" fill="none" stroke="#35c5d0" strokeWidth="1.8" />
        <path d="M25 25 L35 25" stroke="#fff" strokeWidth="1.8" />
        <path d="M30 18 V4" stroke="#fff" strokeWidth="1.8" />
        <rect x="30" y="4" width="10" height="7" fill="#2fe04a" />
      </svg>
      <div className={styles.glanceText}>
        <strong>7 week streak</strong>
        <span>2 of 3 this week</span>
        <small>Snowdon: 5 weeks to go</small>
      </div>
    </div>
  );
}

export default function StreakPage() {
  return (
    <div id="top" className={`${base.page} ${styles.theme}`}>
      <script
        id="streak-app-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
      />

      <div className={base.aurora} aria-hidden="true" />
      <div className={base.grain} aria-hidden="true" />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className={base.nav}>
        <div className={base.navInner}>
          <a href="#top" className={base.brand} aria-label="HybridX Streak for UNA Watch, back to top">
            <Wordmark app="Streak" />
          </a>
          <nav className={base.navLinks} aria-label="Page">
            <a href="#how">How it works</a>
            <a href="#climb">The climb</a>
            <a href="#screens">Screens</a>
            <a href="#una">UNA Watch</a>
          </nav>
          <a href={UNA_URL} className={base.navCta} target="_blank" rel="noopener">
            Meet UNA <Arrow />
          </a>
        </div>
      </header>

      <main>
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className={base.hero}>
          <div className={base.container}>
            <div className={base.heroGrid}>
              <div>
                <p className={base.pill}>
                  <span className={base.pulse} aria-hidden="true" />
                  Coming to UNA Watch
                </p>
                <h1 className={base.h1}>
                  Build your streak <span className={base.gradientText}>with UNA</span>
                </h1>
                <p className={base.lead}>
                  HybridX Streak counts your training in weeks, not days. Set your own target —
                  three sessions a week, say — and every session your watch records counts by
                  itself. Hit your target, and you take a step up the mountain.
                </p>
                <div className={base.ctaRow}>
                  <a href={UNA_URL} className={base.btnPrimary} target="_blank" rel="noopener">
                    Discover UNA Watch <Arrow />
                  </a>
                  <a href="#how" className={base.btnGhost}>
                    See how it works
                  </a>
                </div>
              </div>

              <div className={base.heroWatch}>
                <div className={base.watchHalo} aria-hidden="true" />
                <div className={base.watchFloat}>
                  <StreakWatch />
                </div>
                <p className={base.watchNote}>The app’s own screens: a few months, in forty seconds.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────────────── */}
        <section id="how" className={base.section}>
          <div className={base.container}>
            <div className={base.sectionHead}>
              <p className={base.eyebrow}>How it works</p>
              <h2 className={base.h2}>
                Most streaks want every day.
                <span className={base.dim}> This one wants your week.</span>
              </h2>
              <p className={base.sectionLead}>
                Training three or four times a week is a great habit, and a daily streak punishes
                it. HybridX Streak counts the weeks you hit your own target, so rest days are part
                of the plan, not a threat to it.
              </p>
            </div>

            <ol className={styles.steps}>
              {STEPS.map((s) => (
                <li key={s.n} className={`${styles.step} ${base.reveal}`}>
                  <span className={styles.stepNum}>{s.n}</span>
                  <h3 className={base.h3}>{s.title}</h3>
                  <p>{s.body}</p>
                </li>
              ))}
            </ol>

            <div className={`${base.glassPanel} ${styles.tryPanel} ${base.reveal}`}>
              <p className={styles.panelTitle}>
                Try a week. <span>The watch always tells you what’s left.</span>
              </p>
              <WeekPlanner />
            </div>
          </div>
        </section>

        {/* ── The climb ─────────────────────────────────────────────────── */}
        <section id="climb" className={base.section}>
          <div className={base.container}>
            <div className={base.sectionHead}>
              <p className={base.eyebrow}>The climb</p>
              <h2 className={base.h2}>
                Every week you hit is a step up.
                <span className={base.dim}> A missed week never takes you back down.</span>
              </h2>
              <p className={base.sectionLead}>
                Your weeks add up to five mountains, from Arthur’s Seat to Everest. Your streak
                counts the weeks in a row; your climb counts every week you’ve ever completed. A
                tough month can end a streak, but it can’t take a summit away.
              </p>
            </div>
            <div className={`${base.glassPanel} ${base.reveal}`}>
              <ClimbLadder />
            </div>
          </div>
        </section>

        {/* ── Shields ───────────────────────────────────────────────────── */}
        <section className={base.section}>
          <div className={base.container}>
            <div className={base.sectionHead}>
              <p className={base.eyebrow}>Shields</p>
              <h2 className={base.h2}>
                Life happens.
                <span className={base.dim}> Your streak can survive it.</span>
              </h2>
              <p className={base.sectionLead}>
                Every {SHIELD_EVERY} weeks you complete earns a shield, and you can hold{' '}
                {MAX_SHIELDS === 2 ? 'two' : MAX_SHIELDS}. Miss a week and the watch asks whether
                to spend one. It’s always your choice, never automatic. Out of shields? It’s a fresh
                start, and your climb is kept.
              </p>
            </div>
            <ol className={styles.trio}>
              {SHIELD_SCREENS.map((s) => (
                <li key={s.src} className={base.reveal}>
                  <div className={base.screenDial}>
                    <Image src={s.src} alt={`${s.title} screen`} width={480} height={480} className={base.screenImg} />
                  </div>
                  <p className={base.screenTitle}>{s.title}</p>
                  <p className={base.screenCaption}>{s.caption}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────────────── */}
        <section id="features" className={base.section}>
          <div className={base.container}>
            <div className={base.sectionHead}>
              <p className={base.eyebrow}>Made for real training weeks</p>
              <h2 className={base.h2}>
                The details that <span className={base.nowrap}>keep you going.</span>
              </h2>
            </div>

            <div className={base.bento}>
              <article className={`${base.card} ${base.cardWide} ${base.reveal}`} data-accent="lime">
                <div className={base.cardCopy}>
                  <p className={base.kicker}>At a glance</p>
                  <h3 className={base.h3}>Your week, without opening a thing</h3>
                  <p>
                    HybridX Streak sits on your watch’s glances screen too: your streak, this
                    week’s sessions, and what’s next, right where you check the time.
                  </p>
                </div>
                <GlanceCard />
              </article>

              {FEATURES.map((f) => (
                <article key={f.title} className={`${base.card} ${base.reveal}`} data-accent={f.accent}>
                  <p className={base.kicker}>{f.kicker}</p>
                  <h3 className={base.h3}>{f.title}</h3>
                  <p>{f.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Screens ───────────────────────────────────────────────────── */}
        <section id="screens" className={base.section}>
          <div className={base.container}>
            <div className={base.sectionHead}>
              <p className={base.eyebrow}>On the wrist</p>
              <h2 className={base.h2}>
                One mountain.
                <span className={base.dim}> Everything else, one press away.</span>
              </h2>
            </div>
          </div>
          <ol className={base.screens}>
            {SCREENS.map((s, i) => (
              <li key={s.src} className={base.screen}>
                <div className={base.screenDial}>
                  <Image src={s.src} alt={`${s.title} screen`} width={480} height={480} className={base.screenImg} />
                </div>
                <p className={base.screenTitle}>
                  <span className={base.screenNum}>{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </p>
                <p className={base.screenCaption}>{s.caption}</p>
              </li>
            ))}
          </ol>
          <div className={base.container}>
            <p className={base.footnote}>Pre-release screens. The finished app may differ slightly.</p>
          </div>
        </section>

        <UnaSection
          appName="HybridX Streak"
          pitch="a watch built to last for years, keeping a streak that can last for years too."
        />

        {/* ── Final call ────────────────────────────────────────────────── */}
        <section className={base.final}>
          <div className={base.container}>
            <Wordmark app="Streak" large />
            <h2 className={base.finalTitle}>
              Start climbing <span className={base.gradientText}>with UNA.</span>
            </h2>
            <p className={base.finalLead}>
              HybridX Streak is coming to the UNA app store. Get the watch, and your first week
              starts the day you install it.
            </p>
            <div className={`${base.ctaRow} ${base.ctaCenter}`}>
              <a href={UNA_URL} className={base.btnPrimary} target="_blank" rel="noopener">
                Get UNA Watch <Arrow />
              </a>
              <a href={HYBRIDX_APP_URL} className={base.btnGhost}>
                Train with HybridX
              </a>
            </div>
          </div>
        </section>
      </main>

      <AppFooter appName="HybridX Streak" />
    </div>
  );
}
