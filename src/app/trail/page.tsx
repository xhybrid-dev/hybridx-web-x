import type { Metadata } from 'next';
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
import { mono, poppins } from '@/components/trail/fonts';
import TrailHero from '@/components/trail/TrailHero';
import Manifesto from '@/components/trail/Manifesto';
import TrailSimulator from '@/components/trail/TrailSimulator';
import OffCourseStory from '@/components/trail/OffCourseStory';
import AlongTheLine from '@/components/trail/AlongTheLine';
import Film from '@/components/trail/Film';
import RouteRail from '@/components/trail/RouteRail';
import { DataScreen, GpxStream, RouteListScreen, UsbTree } from '@/components/trail/Steps';
import styles from './trail.module.css';

/*
 * trail.hybridx.club: the page for HybridX Trail, breadcrumb navigation for
 * UNA Watch. Served at /trail on hybridx.club and at the root of
 * trail.hybridx.club (the middleware's rewrite, as for Race and Streak).
 *
 * The third sibling. It shares the HybridX mark, UNA's teal, the watch render,
 * the UNA section and the footer (components/una-app/), and takes its own look
 * from the promo film "Follow the line" (promo/): a topographic map at night,
 * one orchid line, Poppins and JetBrains Mono, HUD labels in the corners.
 * Where Race is a race and Streak is a climb, Trail is a map you move through:
 * the hero is a live map, the centrepiece is a working simulator, the
 * off-course alert is a scroll-driven scene, and the page's own scroll runs
 * the demo loop's elevation profile down the right-hand edge.
 *
 * Honesty constraints — Trail is at phase T0 (the probe) of its brief:
 *   - The status says "in development", not "coming", and a section says
 *     exactly where the build is, from the brief's phases.
 *   - Watch screens are concept designs from the film, and are labelled so.
 *   - What the page computes is real: a visitor's GPX is read, thinned and
 *     measured by lib/trail-route.ts, which mirrors the watch's core and is
 *     tested against the watch's own test cases. Along-the-line tracking and
 *     the off-course rule are the brief's v1 features; their tuning is T1's.
 *   - The Ridge loop is made up (the film's), and the page says it's a demo.
 *   - The brief's limits are stated plainly: no maps, no turn-by-turn, no
 *     rerouting; routes over USB for v1.
 *   - The watch render carries UNA's logo: permission needed before launch,
 *     as for the other two pages.
 */

const URL_CANONICAL = 'https://trail.hybridx.club';

const TITLE = 'HybridX Trail — follow the line on UNA Watch';
const DESCRIPTION =
  'Breadcrumb navigation for UNA Watch. Plan a route anywhere that exports a GPX, put it on your watch, and follow the line, with a buzz if you leave it. Try it with your own route.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    'hybridx trail',
    'una watch',
    'una watch app',
    'gpx route watch',
    'breadcrumb navigation',
    'trail running navigation',
    'follow a gpx route',
    'off course alert',
    'running route watch',
    'modular sports watch',
  ],
  alternates: { canonical: URL_CANONICAL },
  openGraph: {
    title: 'HybridX Trail for UNA Watch',
    description: DESCRIPTION,
    type: 'website',
    url: URL_CANONICAL,
    siteName: 'HybridX',
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HybridX Trail for UNA Watch',
    description: DESCRIPTION,
  },
};

const appSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'HybridX Trail',
  applicationCategory: 'SportsApplication',
  operatingSystem: 'UNA Watch',
  description: DESCRIPTION,
  url: URL_CANONICAL,
  publisher: { '@type': 'Organization', name: 'HybridX', url: HYBRIDX_URL },
};

const STEPS = [
  {
    n: '01',
    title: 'Plan it anywhere',
    body: 'Draw a route in OS Maps, Komoot, Strava or any planner, and export it as a GPX. The watch reads the file as it is: no converting, no syncing.',
    visual: <GpxStream />,
  },
  {
    n: '02',
    title: 'Copy it over USB',
    body: 'Plug the watch in and drop the file in its Routes folder. It’s a night-before job, as the watch can’t be worn while it’s plugged in. Sending routes from your phone is planned.',
    visual: <UsbTree />,
  },
  {
    n: '03',
    title: 'Pick a route and run',
    body: 'Choose it from the list, with its distance and climb, and start. The map, your run and your heart rate, all in one app.',
    visual: <RouteListScreen />,
  },
];

const PHASES = [
  { tag: 'Now', title: 'The groundwork', body: 'Reading a GPX on the watch, GPS and compass. In the simulator it reads a 5,001-point test route and keeps 1,001 points, 10 m apart. The run on a real watch is next.' },
  { tag: 'Next', title: 'The route engine', body: 'Following the line, the off-course alert and drawing the map, tested on loops, out-and-backs and figure-of-eights.' },
  { tag: 'Then', title: 'The app', body: 'The run recording, the screens and the off-course banner.' },
  { tag: 'Then', title: 'On the watch', body: 'A field test on a local loop, with a deliberate wrong turn.' },
  { tag: 'Last', title: 'Release', body: 'Into the UNA app store.' },
];

const LATER = ['Follow a route in reverse', 'Back to the start', 'A breadcrumb of where you’ve been', 'The climb still to come', 'Routes from your phone'];

export default function TrailPage() {
  return (
    <div id="top" className={`${base.page} ${styles.theme} ${poppins.variable} ${mono.variable}`}>
      <script
        id="trail-app-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
      />
      <RouteRail />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className={base.nav}>
        <div className={base.navInner}>
          <a href="#top" className={base.brand} aria-label="HybridX Trail for UNA Watch, back to top">
            <Wordmark app="Trail" />
          </a>
          <nav className={base.navLinks} aria-label="Page">
            <a href="#how">How it works</a>
            <a href="#try">Try it</a>
            <a href="#film">The film</a>
            <a href="#una">UNA Watch</a>
          </nav>
          <a href={UNA_URL} className={base.navCta} target="_blank" rel="noopener">
            Meet UNA <Arrow />
          </a>
        </div>
      </header>

      <main>
        <TrailHero>
          <p className={styles.pill}>
            <span className={styles.pillDot} aria-hidden="true" />
            In development for UNA Watch
          </p>
          <h1 className={styles.h1}>
            Follow the line <em>with UNA</em>
          </h1>
          <p className={styles.lead}>
            HybridX Trail puts your route on your wrist. Plan it in OS Maps, Komoot, Strava or
            anything that exports a GPX, copy it to your watch, and follow the line. Leave it, and
            your wrist buzzes.
          </p>
          <div className={base.ctaRow}>
            <a href="#try" className={base.btnPrimary}>
              Try it with your own route
            </a>
            <a href={UNA_URL} className={base.btnGhost} target="_blank" rel="noopener">
              Discover UNA Watch <Arrow />
            </a>
          </div>
        </TrailHero>

        {/* ── What it is, and isn't ─────────────────────────────────────── */}
        <section className={styles.section}>
          <div className={base.container}>
            <Manifesto />
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────────────── */}
        <section id="how" className={styles.section}>
          <div className={base.container}>
            <div className={styles.head}>
              <p className={styles.kicker}>How it works</p>
              <h2 className={styles.h2}>
                Plan it anywhere. <em>Follow it on your wrist.</em>
              </h2>
            </div>
            <ol className={styles.steps}>
              {STEPS.map((s) => (
                <li key={s.n} className={base.reveal}>
                  <div className={styles.stepVisual}>{s.visual}</div>
                  <span className={styles.stepNum}>{s.n}</span>
                  <h3 className={styles.h3}>{s.title}</h3>
                  <p>{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── The simulator ─────────────────────────────────────────────── */}
        <section id="try" className={styles.section}>
          <div className={base.container}>
            <div className={styles.head}>
              <p className={styles.kicker}>Try it</p>
              <h2 className={styles.h2}>
                Take it for a run. <em>Bring your own route.</em>
              </h2>
              <p className={styles.sectionLead}>
                This is the line the watch would draw, following a runner round a demo loop,
                fast-forwarded. Change the zoom, turn the map, and press <strong>Wander off</strong>{' '}
                to see what happens when you leave the line. Or drop in a GPX of your own.
              </p>
            </div>
            <TrailSimulator />
            <p className={styles.footnote}>
              The watch screens are concept designs: the app’s real screens are still being made.
              Reading your file, the points kept and the distances use the watch’s own rules.
            </p>
          </div>
        </section>

        {/* ── Off course ────────────────────────────────────────────────── */}
        <OffCourseStory />

        {/* ── Along the line ────────────────────────────────────────────── */}
        <section id="along" className={styles.section}>
          <div className={`${base.container} ${styles.split}`}>
            <div>
              <p className={styles.kicker}>Measured along the line</p>
              <h2 className={styles.h2}>
                Done and to go, <em>along your route.</em>
              </h2>
              <p className={styles.sectionLead}>
                Not as the crow flies. The watch works out where you are on the line and keeps to
                the leg you’re on, so a loop that crosses itself, or an out-and-back, never jumps
                to the wrong side.
              </p>
            </div>
            <div className={`${styles.panel} ${base.reveal}`}>
              <AlongTheLine />
            </div>
          </div>
        </section>

        {/* ── It's a run, too ───────────────────────────────────────────── */}
        <section className={styles.section}>
          <div className={`${base.container} ${styles.split} ${styles.splitRev}`}>
            <div className={`${styles.runVisual} ${base.reveal}`}>
              <DataScreen />
              <p className={styles.visualNote}>Concept design · illustrative numbers</p>
            </div>
            <div>
              <p className={styles.kicker}>It’s a run, too</p>
              <h2 className={styles.h2}>
                Your route and your run, <em>in one app.</em>
              </h2>
              <p className={styles.sectionLead}>
                Time, distance, pace, heart rate and laps, recorded as a normal run and saved for
                Strava and Garmin Connect. The map is one more screen, a press away.
              </p>
              <ul className={styles.ticks}>
                <li>Zoom from 200 m to the whole route</li>
                <li>Heading up or north up</li>
                <li>No phone signal needed: the route lives on the watch</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── The film ──────────────────────────────────────────────────── */}
        <section id="film" className={styles.section}>
          <div className={base.container}>
            <div className={styles.head}>
              <p className={styles.kicker}>The film</p>
              <h2 className={styles.h2}>
                Follow the line. <em>Two and a half minutes, <span className={styles.nowrap}>sound on.</span></em>
              </h2>
            </div>
            <Film />
          </div>
        </section>

        {/* ── Where it's up to ──────────────────────────────────────────── */}
        <section className={styles.section}>
          <div className={base.container}>
            <div className={styles.head}>
              <p className={styles.kicker}>Where it’s up to</p>
              <h2 className={styles.h2}>
                Built one gate at a time. <em>Here’s the route.</em>
              </h2>
            </div>
            <ol className={styles.phases}>
              {PHASES.map((p, i) => (
                <li key={p.title} className={`${i === 0 ? styles.phaseNow : ''} ${base.reveal}`}>
                  <span className={styles.phaseTag}>{p.tag}</span>
                  <strong>{p.title}</strong>
                  <span>{p.body}</span>
                </li>
              ))}
            </ol>
            <p className={styles.later}>
              <span>Later</span>
              {LATER.join(' · ')}
            </p>
          </div>
        </section>

        <UnaSection
          appName="HybridX Trail"
          pitch="a watch you can take anywhere, following a line you drew yourself."
        />

        {/* ── Final call ────────────────────────────────────────────────── */}
        <section className={styles.final}>
          <div className={`${base.container} ${styles.finalInner}`}>
            <Wordmark app="Trail" large />
            <h2 className={styles.finalTitle}>
              Follow the line <em>with UNA.</em>
            </h2>
            <p className={styles.lead}>
              HybridX Trail is in development for UNA Watch. Get the watch now, and be ready when
              the line is.
            </p>
            <div className={`${base.ctaRow} ${styles.center}`}>
              <a href={UNA_URL} className={base.btnPrimary} target="_blank" rel="noopener">
                Get UNA Watch <Arrow />
              </a>
              <a href={HYBRIDX_APP_URL} className={base.btnGhost}>
                Train with HybridX
              </a>
            </div>
          </div>
          <svg className={styles.finalLine} viewBox="0 0 1440 200" preserveAspectRatio="none" aria-hidden="true">
            <path d="M-20 170 C 180 60, 330 190, 520 120 S 860 20, 1020 110 S 1300 170, 1460 60" />
          </svg>
        </section>
      </main>

      <AppFooter appName="HybridX Trail" />
    </div>
  );
}
