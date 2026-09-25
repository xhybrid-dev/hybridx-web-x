import type { Metadata } from 'next';
import Image from 'next/image';
import { Fraunces, IBM_Plex_Mono } from 'next/font/google';
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
import { Contours, Peak, Ridges, Stars } from '@/components/streak/Terrain';
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
 * The Race page's sibling, deliberately not its twin. They share the
 * HybridX mark, UNA's teal, the watch render, the UNA section and the footer
 * (components/una-app/). Everything else is Streak's own, and mountaineering:
 *   - an alpine night-to-dawn palette (navy, snow, glacier teal, summit lime)
 *     where Race is black and neon;
 *   - Fraunces, an editorial serif, for headlines where Race uses Space
 *     Grotesk, and IBM Plex Mono for trail-map labels;
 *   - ridges, contour lines and stars where Race has a grid and a glow;
 *   - a centred hero rising over the ridges, a route down the page with camps
 *     as section markers, a kit list, a grid of screens, and a sunrise at the
 *     summit — where Race has a split hero, a bento and a scrolling strip.
 * Written for athletes, not developers.
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

// Streak's own type: an editorial serif for headlines, a mono for map labels.
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap' });
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
});

const STEPS = [
  {
    title: 'Set your week',
    body: 'Choose how many sessions make a week, from one to seven — three to start. Pick the day your week begins, and whether everything counts or just one kind of training.',
  },
  {
    title: 'Just train',
    body: `Run, ride, lift, row, race. Every session your watch records counts by itself — anything over ${DEFAULT_MIN_MINUTES} minutes, so an accidental start never does. Trained without the watch? Add it by hand.`,
  },
  {
    title: 'Climb',
    body: 'Hit your target and the week is banked: one step up the mountain. Keep going, and the steps add up to summits.',
  },
];

// The kit list. Icons are simple line drawings in the page's own stroke.
const KIT = [
  {
    title: 'Every app counts',
    body: 'A run from one app, a strength session from another, a race from HybridX Race. If your watch recorded it, it counts towards your week.',
    icon: <path d="M4 7h16M4 12h16M4 17h10" />,
  },
  {
    title: 'A coach on your side',
    body: '“1 more · 3 days left.” “Week banked. Rest up.” Short, warm, and it tells you what’s left. Never a telling-off.',
    icon: <path d="M4 5h16v10H9l-5 4z" />,
  },
  {
    title: 'Leave one out',
    body: 'Started a recording by accident? Leave it out of your week in two presses, and put it back just as easily.',
    icon: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M8 12h8" />
      </>
    ),
  },
  {
    title: 'A trophy case',
    body: `Every summit, badges from ${BADGES[0].name} at ${BADGES[0].sessions} sessions to ${BADGES[BADGES.length - 1].name} at ${BADGES[BADGES.length - 1].sessions}, your best week and your longest streak.`,
    icon: <path d="M8 4h8v5a4 4 0 0 1-8 0zM12 13v4M8 20h8M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4" />,
  },
  {
    title: 'Your rules',
    body: 'Your target, the day your week starts, what counts, the shortest session that counts, and one a day if you’d rather. A new target starts next week, never mid-week.',
    icon: <path d="M5 6h14M5 12h14M5 18h14M9 4v4M15 10v4M11 16v4" />,
  },
];

const SHIELD_SCREENS = [
  { tag: 'Missed a week', src: '/streak/shield-offer.png', title: 'Life happens.', caption: 'The watch offers a shield. Spend it, or don’t — your call.' },
  { tag: 'Spend a shield', src: '/streak/streak-saved.png', title: 'Streak saved.', caption: 'The streak carries on as if the week never slipped.' },
  { tag: 'Or start fresh', src: '/streak/fresh-start.png', title: 'Fresh start.', caption: 'No scolding. It tells you what you kept, and starts again today.' },
];

const SCREENS = [
  { src: '/streak/home.png', title: 'Home', caption: 'Your mountain, your streak and this week’s sessions, together.' },
  { src: '/streak/this-week.png', title: 'This week', caption: 'Every session so far — and why one didn’t count, if it didn’t.' },
  { src: '/streak/log.png', title: 'Log a session', caption: 'Trained without your watch? Add it for today or yesterday.' },
  { src: '/streak/trophy.png', title: 'Trophy case', caption: 'Every summit and badge, and how close the next one is.' },
  { src: '/streak/settings.png', title: 'Settings', caption: 'Your target, your week, your rules.' },
  { src: '/streak/summit.png', title: 'Summit', caption: 'Reach the top and the whole screen celebrates.' },
];

// The hero's ridges: far and mid behind the watch, near in front of its strap.
const RIDGES_BACK = [
  { seed: 11, baseY: 120, amp: 70, fill: '#10283d' },
  { seed: 23, baseY: 170, amp: 60, fill: '#0c1f31' },
];
const RIDGES_FRONT = [{ seed: 37, baseY: 190, amp: 40, fill: '#07111c' }];

/** A camp on the route: the section's marker on the trail, and its name. */
function Camp({ camp, label }: { camp: string; label: string }) {
  return (
    <p className={styles.camp}>
      <span className={styles.campPin} aria-hidden="true" />
      <span className={styles.campName}>{camp}</span>
      <span className={styles.campLabel}>{label}</span>
    </p>
  );
}

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
    <div id="top" className={`${base.page} ${styles.theme} ${fraunces.variable} ${plexMono.variable}`}>
      <script
        id="streak-app-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
      />
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
        {/* ── Hero: a night sky, and the watch rising over the ridges ──── */}
        <section className={styles.hero}>
          <Stars className={styles.stars} />
          <Contours className={styles.heroContours} />
          <div className={`${base.container} ${styles.heroCopy}`}>
            <p className={base.pill}>
              <span className={base.pulse} aria-hidden="true" />
              Coming to UNA Watch
            </p>
            <h1 className={styles.h1}>
              Build your streak <em>with UNA</em>
            </h1>
            <p className={styles.lead}>
              HybridX Streak counts your training in weeks, not days. Set your own target — three
              sessions a week, say — and every session your watch records counts by itself. Hit your
              target, and you take a step up the mountain.
            </p>
            <div className={`${base.ctaRow} ${styles.center}`}>
              <a href={UNA_URL} className={base.btnPrimary} target="_blank" rel="noopener">
                Discover UNA Watch <Arrow />
              </a>
              <a href="#how" className={base.btnGhost}>
                See how it works
              </a>
            </div>
          </div>

          <div className={styles.heroScene}>
            <Ridges className={styles.ridgesBack} layers={RIDGES_BACK} />
            <div className={styles.heroWatch}>
              <StreakWatch />
            </div>
            <Ridges className={styles.ridgesFront} layers={RIDGES_FRONT} />
          </div>
          <p className={styles.heroNote}>The app’s own screens: a few months, in forty seconds.</p>
        </section>

        {/* ── The route: each section is a camp on the way up ─────────── */}
        <div className={styles.route}>
          <section id="how" className={styles.section}>
            <div className={base.container}>
              <div className={styles.head}>
                <Camp camp="Base camp" label="How it works" />
                <h2 className={styles.h2}>
                  Most streaks want every day. <em>This one wants your week.</em>
                </h2>
                <p className={styles.sectionLead}>
                  Training three or four times a week is a great habit, and a daily streak punishes
                  it. HybridX Streak counts the weeks you hit your own target, so rest days are part
                  of the plan, not a threat to it.
                </p>
              </div>

              <ol className={styles.trail}>
                {STEPS.map((s, i) => (
                  <li key={s.title} className={base.reveal}>
                    <span className={styles.trailMark} aria-hidden="true">
                      {i + 1}
                    </span>
                    <h3 className={styles.h3}>{s.title}</h3>
                    <p>{s.body}</p>
                  </li>
                ))}
              </ol>

              <div className={`${styles.mapPanel} ${base.reveal}`}>
                <Contours className={styles.panelContours} rings={8} />
                <p className={styles.panelTitle}>
                  Try a week. <em>The watch always tells you what’s left.</em>
                </p>
                <WeekPlanner />
              </div>
            </div>
          </section>

          <section id="climb" className={styles.section}>
            <div className={base.container}>
              <div className={styles.head}>
                <Camp camp="Camp I" label="The climb" />
                <h2 className={styles.h2}>
                  Every week you hit is a step up. <em>A missed week never takes you back down.</em>
                </h2>
                <p className={styles.sectionLead}>
                  Your weeks add up to five mountains, from Arthur’s Seat to Everest. Your streak
                  counts the weeks in a row; your climb counts every week you’ve ever completed. A
                  tough month can end a streak, but it can’t take a summit away.
                </p>
              </div>
              <div className={`${styles.mapPanel} ${base.reveal}`}>
                <ClimbLadder />
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={base.container}>
              <div className={styles.head}>
                <Camp camp="Camp II" label="Shields" />
                <h2 className={styles.h2}>
                  Life happens. <em>Your streak can survive it.</em>
                </h2>
                <p className={styles.sectionLead}>
                  Every {SHIELD_EVERY} weeks you complete earns a shield, and you can hold{' '}
                  {MAX_SHIELDS === 2 ? 'two' : MAX_SHIELDS}. Miss a week and the watch asks whether
                  to spend one. It’s always your choice, never automatic. Out of shields? It’s a
                  fresh start, and your climb is kept.
                </p>
              </div>
              <ol className={styles.shields}>
                {SHIELD_SCREENS.map((s) => (
                  <li key={s.src} className={base.reveal}>
                    <span className={styles.shieldTag}>{s.tag}</span>
                    <div className={styles.dial}>
                      <Image src={s.src} alt={`${s.title} screen`} width={480} height={480} />
                    </div>
                    <h3 className={styles.h3}>{s.title}</h3>
                    <p>{s.caption}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section id="kit" className={styles.section}>
            <div className={base.container}>
              <div className={styles.head}>
                <Camp camp="Camp III" label="Kit list" />
                <h2 className={styles.h2}>
                  Packed for real training weeks. <em>Nothing you don’t need.</em>
                </h2>
              </div>
              <div className={styles.kitGrid}>
                <div className={`${styles.kitFeature} ${base.reveal}`}>
                  <p className={styles.kitKicker}>At a glance</p>
                  <h3 className={styles.h3}>Your week, without opening a thing</h3>
                  <p>
                    HybridX Streak sits on your watch’s glances screen too: your streak, this
                    week’s sessions and what’s next, right where you check the time.
                  </p>
                  <GlanceCard />
                </div>
                <ul className={styles.kit}>
                  {KIT.map((k) => (
                    <li key={k.title} className={base.reveal}>
                      <svg viewBox="0 0 24 24" className={styles.kitIcon} aria-hidden="true">
                        {k.icon}
                      </svg>
                      <div>
                        <h3 className={styles.kitTitle}>{k.title}</h3>
                        <p>{k.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section id="screens" className={styles.section}>
            <div className={base.container}>
              <div className={styles.head}>
                <Camp camp="Camp IV" label="On the wrist" />
                <h2 className={styles.h2}>
                  One mountain. <em>Everything else, one press away.</em>
                </h2>
              </div>
              <ol className={styles.screens}>
                {SCREENS.map((s) => (
                  <li key={s.src} className={base.reveal}>
                    <div className={styles.dial}>
                      <Image src={s.src} alt={`${s.title} screen`} width={480} height={480} />
                    </div>
                    <h3 className={styles.h3}>{s.title}</h3>
                    <p>{s.caption}</p>
                  </li>
                ))}
              </ol>
              <p className={styles.footnote}>Pre-release screens. The finished app may differ slightly.</p>
            </div>
          </section>
        </div>

        <UnaSection
          appName="HybridX Streak"
          pitch="a watch built to last for years, keeping a streak that can last for years too."
        />

        {/* ── Summit: the sky warms to dawn ─────────────────────────────── */}
        <section className={styles.summit}>
          <div className={`${base.container} ${styles.summitCopy}`}>
            <p className={styles.campSummit}>Summit</p>
            <h2 className={styles.summitTitle}>
              Start climbing <em>with UNA.</em>
            </h2>
            <p className={styles.lead}>
              HybridX Streak is coming to the UNA app store. Get the watch, and your first week
              starts the day you install it.
            </p>
            <div className={`${base.ctaRow} ${styles.center}`}>
              <a href={UNA_URL} className={base.btnPrimary} target="_blank" rel="noopener">
                Get UNA Watch <Arrow />
              </a>
              <a href={HYBRIDX_APP_URL} className={base.btnGhost}>
                Train with HybridX
              </a>
            </div>
            <div className={styles.summitMark}>
              <Wordmark app="Streak" large />
            </div>
          </div>
          <Peak className={styles.peak} />
        </section>
      </main>

      <AppFooter appName="HybridX Streak" />
    </div>
  );
}
