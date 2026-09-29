import type { Metadata } from 'next';
import base from '@/components/una-app/app-page.module.css';
import FilmPlayer from '@/components/una-app/FilmPlayer';
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
import RouteRail from '@/components/trail/RouteRail';
import { GpxStream, RealScreen, UsbTree } from '@/components/trail/Steps';
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
 * Honesty constraints — the app is built (T0 to T3 of its brief) and in field
 * testing on the watch, not yet released:
 *   - The status says "coming to UNA Watch", and a section says exactly where
 *     the build is.
 *   - The watch screens in the stills are the app's own, captured in the UNA
 *     simulator (hybridx-trail docs/screens/). The animated watch is drawn by
 *     the page after the real map screen, and the footnote says so.
 *   - What the page computes is real: a visitor's GPX is read, thinned and
 *     measured by lib/trail-route.ts, which mirrors the watch's core, and the
 *     off-course alert, the zoom levels, the scale bar and the turn finder are
 *     ports of the app's own, tested against its test cases.
 *   - The Ridge loop is made up (the film's), and the page says it's a demo.
 *   - The limits are stated plainly: no map tiles, no street names, no
 *     rerouting. Routes go on over USB, from a laptop or a phone; sending one
 *     from the phone over Bluetooth works in testing only, and says so.
 *   - No Strava or Garmin Connect claim: the app has no store manifest yet, so
 *     the page says only that the run is saved as a normal run.
 *   - The watch render carries UNA's logo: permission needed before launch,
 *     as for the other two pages.
 */

const URL_CANONICAL = 'https://trail.hybridx.club';

const TITLE = 'HybridX Trail — follow the line on UNA Watch';
const DESCRIPTION =
  'Breadcrumb navigation for UNA Watch. Plan a route anywhere that exports a GPX, put it on your watch, and follow the line: a buzz before each turn, and another if you leave it. Try it with your own route.';

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
    title: 'Put it on your watch',
    body: 'Plug the watch into a laptop, or into your phone with a USB-C cable, and drop the file in its Routes folder. Sending a route from your phone with a tap, over Bluetooth, works in testing and is on its way.',
    visual: <UsbTree />,
  },
  {
    n: '03',
    title: 'Pick a route and run',
    body: 'Choose it from the list, with its distance and climb, check its shape, and start. The map, your run and your heart rate, all in one app.',
    visual: <RealScreen name="routes" alt="The watch's route list: No route, a plain run, and a route called Llyn y Fan Fach, 1.19 km, 275 m up." />,
  },
];

const FACES = [
  {
    screen: 'map',
    alt: 'The map screen: the route as a magenta line, you as an arrow, north marked, a 100 m scale bar and the distance to the start.',
    title: 'The line, and you on it',
    body: 'Heading up or north up. Zoom with the watch’s up and down buttons, from 60 m to 3.5 km to the edge of the screen, or the whole route. Before you reach the route, it tells you how far away the start is.',
  },
  {
    screen: 'nav',
    alt: 'The navigation screen: 25 m to go, 0.75 km done of a 0.78 km route, on course, 1 m from the line.',
    title: 'What’s left, and what’s next',
    body: 'Distance to go, done and the whole route, and how far you are from the line. The watch finds the turns itself: the map names the next from 400 m out, “Right 120 m”, and 50 m before it, a buzz. One for left, two for right; sharp bends and U-turns get it twice.',
  },
  {
    screen: 'off-course',
    alt: 'The navigation screen with the yellow Off course banner, 24 m from the line.',
    title: 'The way back',
    body: 'Stray 50 m for five seconds and it buzzes and jumps to the map, with an arrow pointing to the nearest part of the route and the distance to it. Back within 30 m, a second buzz: “Back on course”.',
  },
  {
    screen: 'elevation',
    alt: 'The elevation screen: the route’s profile, 0 m to climb, no more climbs, and now 280 m.',
    title: 'The climb still to come',
    body: 'For routes with height in them: the profile, the climbing left, the next climb, “+95 m in 218 m”, and the height you’re at now.',
  },
];

const SCREENS = [
  { screen: 'start', title: 'Start', caption: 'Pick a route, or run without one.' },
  { screen: 'preview', title: 'The route', caption: 'Its shape, distance and climb before you go.' },
  { screen: 'whole', title: 'The whole route', caption: 'Zoomed right out to see it all.' },
  { screen: 'run', title: 'Run', caption: 'Distance, pace, time, heart rate, lap.' },
  { screen: 'lap', title: 'Lap', caption: 'Heart rate zone, lap pace, distance and time.' },
  { screen: 'summary', title: 'Saved', caption: 'Your distance and the line you ran.' },
];

const PHASES = [
  { tag: 'Done', title: 'Reading routes', body: 'On the watch, a real 50 km route: 1,418 points read and 1,190 kept, 10 m apart, in a third of a second.' },
  { tag: 'Done', title: 'The route engine', body: 'Following the line, the off-course alert, the map and the turns, checked by 135 automated tests.' },
  { tag: 'Done', title: 'The app', body: 'Six screens: map, navigation, elevation, run, lap and status.' },
  { tag: 'Now', title: 'On the watch', body: 'Field testing on real runs.' },
  { tag: 'Next', title: 'Routes from your phone', body: 'A GPX on your phone, a tap, and it’s on the watch. Working in testing.' },
  { tag: 'Last', title: 'Release', body: 'Into the UNA app store.' },
];

const LATER = ['Follow a route in reverse', 'Guidance back to the start', 'A breadcrumb of where you’ve been'];

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
            Coming to UNA Watch
          </p>
          <h1 className={styles.h1}>
            Follow the line <em>with UNA</em>
          </h1>
          <p className={styles.lead}>
            HybridX Trail puts your route on your wrist. Plan it in OS Maps, Komoot, Strava or
            anything that exports a GPX, copy it to your watch, and follow the line. A buzz before
            each turn, and another if you leave it.
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
                The watch’s map screen, following a runner round a demo loop, fast-forwarded. Zoom
                in and out, turn the map, watch the turns get called, and press{' '}
                <strong>Wander off</strong> to see what happens when you leave the line. Or drop in
                a GPX of your own.
              </p>
            </div>
            <TrailSimulator />
            <p className={styles.footnote}>
              The watch here is drawn by this page, after the app’s real map screen; the real
              screens are below. Reading your file, the points kept, the distances, the zoom levels,
              the turns and the off-course alert all use the app’s own rules. Fast-forwarded about
              ten times, so the buzzes come quicker than on a run.
            </p>
          </div>
        </section>

        {/* ── Off course ────────────────────────────────────────────────── */}
        <OffCourseStory />

        {/* ── On the way round ──────────────────────────────────────────── */}
        <section id="features" className={styles.section}>
          <div className={base.container}>
            <div className={styles.head}>
              <p className={styles.kicker}>On the way round</p>
              <h2 className={styles.h2}>
                Eyes on the trail. <em>The watch minds the line.</em>
              </h2>
            </div>
            <ol className={styles.faces}>
              {FACES.map((f) => (
                <li key={f.screen} className={base.reveal}>
                  <div className={styles.faceShot}>
                    <RealScreen name={f.screen} alt={f.alt} size={220} />
                  </div>
                  <h3 className={styles.h3}>{f.title}</h3>
                  <p>{f.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

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
              <RealScreen name="run" alt="The run screen: 0.21 km, 3:50 per km, 42 seconds, 161 bpm, lap 1." />
              <p className={styles.visualNote}>The run screen, from the app</p>
            </div>
            <div>
              <p className={styles.kicker}>It’s a run, too</p>
              <h2 className={styles.h2}>
                Your route and your run, <em>in one app.</em>
              </h2>
              <p className={styles.sectionLead}>
                Time, distance, pace, heart rate and laps, saved as a normal run. The map is one
                more screen, a press away, and it comes to you when you need it.
              </p>
              <ul className={styles.ticks}>
                <li>Map, navigation, elevation, run, lap and status screens</li>
                <li>One press flips between the map and your numbers</li>
                <li>No route? It’s a plain run, too</li>
                <li>No phone signal needed: the route lives on the watch</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── The real screens ──────────────────────────────────────────── */}
        <section id="screens" className={styles.section}>
          <div className={base.container}>
            <div className={styles.head}>
              <p className={styles.kicker}>The screens</p>
              <h2 className={styles.h2}>
                From start to saved. <em>As they look on the watch.</em>
              </h2>
            </div>
            <ol className={styles.gallery}>
              {SCREENS.map((sc) => (
                <li key={sc.screen} className={base.reveal}>
                  <RealScreen name={sc.screen} alt={`The ${sc.title.toLowerCase()} screen`} size={200} />
                  <strong>{sc.title}</strong>
                  <span>{sc.caption}</span>
                </li>
              ))}
            </ol>
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
            <FilmPlayer base="/trail" title="Follow the line" accent="#ff55ff" ink="#14001a" />
          </div>
        </section>

        {/* ── Where it's up to ──────────────────────────────────────────── */}
        <section className={styles.section}>
          <div className={base.container}>
            <div className={styles.head}>
              <p className={styles.kicker}>Where it’s up to</p>
              <h2 className={styles.h2}>
                Built one gate at a time. <em>Nearly at the finish.</em>
              </h2>
            </div>
            <ol className={styles.phases}>
              {PHASES.map((p) => (
                <li key={p.title} className={`${p.tag === 'Now' ? styles.phaseNow : p.tag === 'Done' ? styles.phaseDone : ''} ${base.reveal}`}>
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
              HybridX Trail is coming to UNA Watch. Get the watch now, and be ready when the line
              is.
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
