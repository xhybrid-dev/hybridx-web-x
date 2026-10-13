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
import { manrope, splineMono, watchPoppins } from '@/components/weighin/fonts';
import WeighHero from '@/components/weighin/WeighHero';
import OneDay from '@/components/weighin/OneDay';
import TryIt from '@/components/weighin/TryIt';
import Shot from '@/components/weighin/Shot';
import WatchScreen from '@/components/weighin/WatchScreen';
import { SAMPLE, SAMPLE_DAYS_LIST, SAMPLE_PROFILE, SAMPLE_RANGE, SAMPLE_SUMMARY } from '@/components/weighin/sample';
import { bmiTenths, bmrKcal, formatEntry, LOG_HEADER } from '@/lib/weighin-core';
import styles from './weighin.module.css';

/*
 * hybridx.club/weigh-in: the page for X Weigh-in, the weight trend tracker for
 * UNA Watch (x-weighin/ in the watch repo).
 *
 * The fourth sibling, after Race, Streak and Trail. It shares the HybridX mark,
 * UNA's teal, the watch render, the UNA section and the footer
 * (components/una-app/), and takes its own look from the app's Graph page:
 * black, grey dots for the weigh-ins and one lime line, the trend, riding over
 * them (LIME, #aaff00, the watch's own colour), on graph paper, in Manrope
 * with Spline Sans Mono for readings. Where Trail is a map and Streak a climb, this is
 * a chart: the hero draws one, the middle lets you bend it, and the
 * centrepiece is the app itself, working.
 *
 * Unlike the others it has no subdomain yet: canonical is this path, and it is
 * in the main sitemap. To give it weighin.hybridx.club like the others, add
 * the domain to the App Hosting backend, then follow the trail page (the
 * middleware's APP_SUBDOMAINS, sitemap.ts and its test, and the canonical).
 *
 * Honesty constraints:
 *   - Version 1.0 is released (the tag weighin-v1.0.0, 13 October 2026), as two
 *     store listings, the app and its glance. Whether the listings are public
 *     yet isn't known here, so the page says "released" and never "download"
 *     or "in the store". When they are live, say so.
 *   - Every number the page shows comes from lib/weighin-core.ts, the port of
 *     the app's core, tested against the app's own host tests; the hero and
 *     the simulator use make_log's sample log, the one the app's store screens
 *     were taken from, and say it is made up.
 *   - The real screens (Home, Graph, Recent, Weigh in, Saved) are the app's
 *     store previews, from its simulator. Body is drawn by the page with a
 *     made-up profile (the simulator has no profile height), and says so. The
 *     glance pictures are drawn from the glance's layout code, as its own
 *     store previews are, and say so.
 *   - Claims follow SUBMISSION.md's checked store text: 0.1 kg steps, hold to
 *     repeat, the latest of a day counts, the 20% trend, the week's change
 *     after 7 days, 30 days on the graph, 5 on Recent, BMI from the profile
 *     height, resting kcal by Mifflin-St Jeor from the trend weight, nothing
 *     sent to the phone, the UNA app or Strava, no activities. Not claimed:
 *     that the history survives an uninstall (not yet tested on a watch).
 *   - No goals, no warnings, no judgement, as the app: the sample's slow loss
 *     is make_log's, and the page never calls it good.
 *   - "A tracker, not a medical device", as the store text says.
 *   - The watch render carries UNA's logo: permission needed before launch,
 *     as for the other pages.
 */

const URL_CANONICAL = 'https://hybridx.club/weigh-in';

const TITLE = 'X Weigh-in — the weight trend tracker for UNA Watch';
const DESCRIPTION =
  'Weigh in on your watch in seconds, in kg, and see the smoothed trend beneath the day-to-day swings: the change over the week, a 30-day graph, BMI and resting kcal. Your weigh-ins stay on the watch. By HybridX.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    'x weigh-in',
    'una watch',
    'una watch app',
    'weight tracker watch',
    'weight trend',
    'smoothed weight trend',
    'weight moving average',
    'daily weigh-in',
    'weight log',
    'modular sports watch',
  ],
  alternates: { canonical: URL_CANONICAL },
  openGraph: {
    title: 'X Weigh-in for UNA Watch',
    description: DESCRIPTION,
    type: 'website',
    url: URL_CANONICAL,
    siteName: 'HybridX',
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'X Weigh-in for UNA Watch',
    description: DESCRIPTION,
  },
};

const appSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'X Weigh-in',
  applicationCategory: 'HealthApplication',
  operatingSystem: 'UNA Watch',
  softwareVersion: '1.0.0',
  description: DESCRIPTION,
  url: URL_CANONICAL,
  publisher: { '@type': 'Organization', name: 'HybridX', url: HYBRIDX_URL },
};

const STEPS = [
  {
    n: '01',
    title: 'Step on any scale',
    body: 'The one in your bathroom, the one at the gym, any scale at all. Nothing to pair and no phone needed: you read the number.',
    visual: (
      <div className={styles.scaleArt} aria-label="A bathroom scale reading 81.8 kg">
        <span className={styles.scaleLcd}>
          81.8<small>kg</small>
        </span>
      </div>
    ),
  },
  {
    n: '02',
    title: 'Dial it in on your watch',
    body: 'SELECT, then UP or DOWN in 0.1 kg steps, then SELECT. It starts from your last weigh-in, so the number is usually a press or two away. Hold either button to move quickly.',
    visual: <Shot src="/weigh-in/screens/weigh-in.png" alt="The Weigh in screen: 81.8 kg, and Last 81.5, today." size={220} />,
  },
  {
    n: '03',
    title: 'See where you’re heading',
    body: 'Saved, with your trend and how far it has moved this week. Weighed twice? The latest of the day counts, so a slip is fixed by weighing again.',
    visual: <Shot src="/weigh-in/screens/saved.png" alt="The Saved screen: 81.8 kg saved, trend 82.4 kg, -0.3 kg this week." size={220} />,
  },
];

// The Body still's numbers, for its description: as the drawn screen works them out.
const BODY_BMI = bmiTenths(SAMPLE_SUMMARY.trend, SAMPLE_PROFILE.heightCm);
const BODY_KCAL = bmrKcal(SAMPLE_SUMMARY.trend, SAMPLE_PROFILE.heightCm, SAMPLE_PROFILE.ageYears, SAMPLE_PROFILE.sex);

const FACES = [
  {
    key: 'home',
    title: 'Your trend',
    body: 'The trend, large, with how far it has moved this week and your last weigh-in. A plain signed number: no goals, no warnings. It’s a tracker.',
    shot: <Shot src="/weigh-in/screens/home.png" alt="Home: trend 82.4 kg, -0.3 kg this week, last 81.5 today." size={220} />,
  },
  {
    key: 'graph',
    title: 'Thirty days',
    body: 'The trend line through a dot for every weigh-in. The scale is never shorter than 2 kg, so a steady week looks steady.',
    shot: <Shot src="/weigh-in/screens/graph.png" alt="Graph: the last 30 days, 13 Sep to 12 Oct, from 85.0 to 81.0 kg." size={220} />,
  },
  {
    key: 'recent',
    title: 'Your last five',
    body: 'The last five days you weighed in, newest first, to the tenth of a kilo.',
    shot: <Shot src="/weigh-in/screens/recent.png" alt="Recent: Mon 12 Oct 81.5, Sun 11 Oct 82.7, Sat 10 Oct 82.4, Fri 9 Oct 82.4, Thu 8 Oct 81.9." size={220} />,
  },
  {
    key: 'body',
    title: 'Body numbers',
    body: 'BMI, from the height in your UNA profile, and the calories you burn at rest, from your birth year and sex in the app’s settings. Both from your trend, not one morning.',
    shot: (
      <Shot size={220}>
        <WatchScreen
          view={{ screen: 'body', summary: SAMPLE_SUMMARY, ...SAMPLE_PROFILE }}
          label={`Body, drawn by this page with a made-up profile: BMI ${Math.trunc(BODY_BMI / 10)}.${BODY_BMI % 10}, resting ${BODY_KCAL} kcal, height ${SAMPLE_PROFILE.heightCm} cm, age ${SAMPLE_PROFILE.ageYears}.`}
        />
      </Shot>
    ),
  },
];

const GLANCES = [
  { src: '/weigh-in/glance/six-weeks.png', title: 'Six weeks in', body: 'The newest bar is white. Up or down, the bars are just your weigh-ins.' },
  { src: '/weigh-in/glance/days-off.png', title: 'A few days off', body: 'A day with no weigh-in is a gap, so a break shows at once.' },
  {
    src: '/weigh-in/glance/first-days.png',
    title: 'The first days',
    body: (
      <>
        The week’s change reads <code>--</code> until your log spans a week.
      </>
    ),
  },
];

const PHASES = [
  { tag: 'Done', title: 'The first look', body: 'Your height and weight from your UNA profile, read on a real watch.' },
  { tag: 'Done', title: 'The trend', body: 'The log and the trend. 20% a day, chosen by measuring it on twenty sample logs.' },
  { tag: 'Done', title: 'The screens', body: 'Home, Graph, Recent and Body, and weighing in.' },
  { tag: 'Done', title: 'The glance', body: 'Your trend on the glances screen, checked on the watch.' },
  { tag: 'Now', title: 'Version 1.0', body: 'Released: the app and its glance, with 113 automated tests behind them.' },
  { tag: 'Next', title: 'The sweat-rate test', body: 'Weigh before and after a session, enter what you drank, and see your sweat rate.' },
];

// The final section's line: the sample's forty days, dots and trend, across the foot.
function FinalLine() {
  const n = SAMPLE_DAYS_LIST.length;
  const X = (i: number) => 20 + (i / (n - 1)) * 1400;
  const Y = (v: number) => 30 + ((SAMPLE_RANGE.hi - v) / (SAMPLE_RANGE.hi - SAMPLE_RANGE.lo)) * 150;
  const line = SAMPLE_DAYS_LIST.map((d, i) => `${X(i).toFixed(1)},${Y(d.trend).toFixed(1)}`).join(' ');
  return (
    <svg className={styles.finalLine} viewBox="0 0 1440 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {SAMPLE_DAYS_LIST.map((d, i) => (d.weight ? <circle key={i} cx={X(i)} cy={Y(d.weight)} r={3.4} /> : null))}
      <polyline points={line} />
    </svg>
  );
}

export default function WeighInPage() {
  const tail = SAMPLE.slice(-7).map(formatEntry);
  return (
    <div id="top" className={`${base.page} ${styles.theme} ${manrope.variable} ${splineMono.variable} ${watchPoppins.variable}`}>
      <script
        id="weighin-app-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
      />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className={base.nav}>
        <div className={base.navInner}>
          <a href="#top" className={base.brand} aria-label="X Weigh-in for UNA Watch, back to top">
            <Wordmark app="Weigh-in" />
          </a>
          <nav className={base.navLinks} aria-label="Page">
            <a href="#trend">The trend</a>
            <a href="#how">How it works</a>
            <a href="#try">Try it</a>
            <a href="#glance">The glance</a>
            <a href="#una">UNA Watch</a>
          </nav>
          <a href={UNA_URL} className={base.navCta} target="_blank" rel="noopener">
            Meet UNA <Arrow />
          </a>
        </div>
      </header>

      <main>
        <WeighHero>
          <p className={styles.pill}>
            <span className={styles.pillDot} aria-hidden="true" />
            Version 1.0 · for UNA Watch
          </p>
          <h1 className={styles.h1}>
            Weigh in <em>with UNA</em>
          </h1>
          <p className={styles.lead}>
            X Weigh-in puts your weight trend on your wrist. Step on any scale, dial the number into
            your watch in a few presses, and see where your weight is really heading, beneath the
            day-to-day swings of water, salt and late meals.
          </p>
          <div className={base.ctaRow}>
            <a href="#try" className={base.btnPrimary}>
              Try it on this page
            </a>
            <a href={UNA_URL} className={base.btnGhost} target="_blank" rel="noopener">
              Discover UNA Watch <Arrow />
            </a>
          </div>
        </WeighHero>

        {/* ── The trend ─────────────────────────────────────────────────── */}
        <section id="trend" className={styles.section}>
          <div className={base.container}>
            <div className={styles.head}>
              <p className={styles.kicker}>The trend</p>
              <h2 className={styles.h2}>
                The scale bounces. <em>The trend doesn’t.</em>
              </h2>
              <p className={styles.sectionLead}>
                Water, salt and a late dinner move the scale from one morning to the next. X Weigh-in
                takes one weight a day, your latest, and moves its trend a fifth of the way towards
                it. One odd morning shifts the trend by a fifth of the jump; a real change shows
                within days. Set one morning yourself:
              </p>
            </div>
            <OneDay />
            <p className={styles.footnote}>
              The price of smoothing is a little lag: on a steady change, the trend runs about four
              days behind the scale. It’s where your weight is heading, not what it was this morning.
            </p>
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────────────── */}
        <section id="how" className={styles.section}>
          <div className={base.container}>
            <div className={styles.head}>
              <p className={styles.kicker}>How it works</p>
              <h2 className={styles.h2}>
                Step on. Dial in. <em>See the trend.</em>
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

        {/* ── Try it ────────────────────────────────────────────────────── */}
        <section id="try" className={styles.section}>
          <div className={base.container}>
            <div className={styles.head}>
              <p className={styles.kicker}>Try it</p>
              <h2 className={styles.h2}>
                Weigh in. <em>Right here.</em>
              </h2>
              <p className={styles.sectionLead}>
                This is X Weigh-in, working: the app’s own screens, buttons and arithmetic. Turn the
                pages with <strong>UP</strong> and <strong>DOWN</strong>, press{' '}
                <strong>SELECT</strong> to weigh in, then go on to the next morning and watch the
                trend take each new weight a fifth at a time.
              </p>
            </div>
            <TryIt />
            <p className={styles.footnote}>
              The watch here is drawn by this page after the app’s real screens, which are below. The
              trend, the 0.1 kg steps, the hold-to-repeat timings and the graph’s scale are the app’s
              own rules, ported from its code and checked against its tests. The person is made up:
              the sample log the app’s own test tools write, carried on a day at a time. Nothing you
              enter leaves this page.
            </p>
          </div>
        </section>

        {/* ── The pages ─────────────────────────────────────────────────── */}
        <section id="pages" className={styles.section}>
          <div className={base.container}>
            <div className={styles.head}>
              <p className={styles.kicker}>On the watch</p>
              <h2 className={styles.h2}>
                Four pages, <em>a press apart.</em>
              </h2>
            </div>
            <ol className={styles.faces}>
              {FACES.map((f) => (
                <li key={f.key} className={base.reveal}>
                  <div className={styles.faceShot}>{f.shot}</div>
                  <h3 className={styles.h3}>{f.title}</h3>
                  <p>{f.body}</p>
                </li>
              ))}
            </ol>
            <p className={styles.footnote}>
              Home, Graph and Recent are the app’s real screens, from a made-up log. Body is drawn by
              this page with a made-up profile, as the app lays it out. BMI and resting kcal (the
              Mifflin-St Jeor equation) are estimates: X Weigh-in is a tracker, not a medical device.
            </p>
          </div>
        </section>

        {/* ── The glance ────────────────────────────────────────────────── */}
        <section id="glance" className={styles.section}>
          <div className={`${base.container} ${styles.split}`}>
            <div>
              <p className={styles.kicker}>The glance</p>
              <h2 className={styles.h2}>
                Your trend, <em>at a glance.</em>
              </h2>
              <p className={styles.sectionLead}>
                Add <strong>X Weigh-in Glance</strong> alongside the app and your trend sits on the
                watch’s glances screen, without opening anything: the trend, the week’s change, and
                your last 14 days as bars, one for each day you weighed in.
              </p>
              <ul className={styles.ticks}>
                <li>Reads your log, and never writes to it</li>
                <li>The same trend as Home, to the decimal</li>
                <li>Needs the X Weigh-in app, where you weigh in</li>
              </ul>
            </div>
            <ol className={styles.glances}>
              {GLANCES.map((g) => (
                <li key={g.src} className={base.reveal}>
                  <Shot src={g.src} alt={`The glance: ${g.title.toLowerCase()}.`} size={200} />
                  <strong>{g.title}</strong>
                  <span>{g.body}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className={base.container}>
            <p className={styles.footnote}>
              Drawn from the glance’s own layout code. The blue lines are the glances screen’s own
              separators, which the glance keeps between.
            </p>
          </div>
        </section>

        {/* ── Your data ─────────────────────────────────────────────────── */}
        <section id="data" className={styles.section}>
          <div className={`${base.container} ${styles.split} ${styles.splitRev}`}>
            <div className={`${styles.fileCard} ${base.reveal}`}>
              <div className={styles.fileHead}>
                <span>UNA WATCH (USB) / Apps / XWeighIn</span>
                <span>weighins.csv</span>
              </div>
              <ol className={styles.fileBody}>
                <li className={styles.fileHeader}>{LOG_HEADER}</li>
                <li className={styles.fileGap}>…</li>
                {tail.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ol>
            </div>
            <div>
              <p className={styles.kicker}>Your data</p>
              <h2 className={styles.h2}>
                It stays on your watch. <em>In a file you can open.</em>
              </h2>
              <p className={styles.sectionLead}>
                Your weigh-ins go nowhere: not to your phone, not to the UNA app, not to Strava. They
                live in one plain file on the watch, a line for each, that opens in any spreadsheet
                when you plug the watch into a computer.
              </p>
              <ul className={styles.ticks}>
                <li>Nothing sent to your phone, the UNA app or Strava</li>
                <li>Never saved as a workout, so no fake activities in your feed</li>
                <li>Date, time and kg, a line per weigh-in, every one kept</li>
                <li>Height from your UNA profile, so nothing to type twice</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── Where it's up to ──────────────────────────────────────────── */}
        <section className={styles.section}>
          <div className={base.container}>
            <div className={styles.head}>
              <p className={styles.kicker}>Where it’s up to</p>
              <h2 className={styles.h2}>
                Version 1.0. <em>Built one gate at a time.</em>
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
          </div>
        </section>

        <UnaSection
          appName="X Weigh-in"
          pitch="a watch you can keep for years, keeping a record that stays on it."
        />

        {/* ── Final call ────────────────────────────────────────────────── */}
        <section className={styles.final}>
          <div className={`${base.container} ${styles.finalInner}`}>
            <Wordmark app="Weigh-in" large />
            <h2 className={styles.finalTitle}>
              Weigh in <em>with UNA.</em>
            </h2>
            <p className={styles.lead}>
              X Weigh-in 1.0 is released for UNA Watch, with its glance alongside. Get the watch,
              step on the scale, and see where you’re heading.
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
          <FinalLine />
        </section>
      </main>

      <AppFooter appName="X Weigh-in" />
    </div>
  );
}
