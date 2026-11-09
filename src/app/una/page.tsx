import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { HYBRIDX_APP_URL, HYBRIDX_URL, UNA_URL } from '@/components/una-app/Chrome';
import { anton, grotesk, mono } from '@/components/una/fonts';
import FamilyRail from '@/components/una/FamilyRail';
import WeekMachine from '@/components/una/WeekMachine';
import { FAMILY, LINE_FIELDS, RECORDERS, STORE_STATUS, STREAK, icon, type FamilyApp } from '@/lib/una-family';
import styles from './una.module.css';

/*
 * hybridx.club/una: the X family, the six HybridX apps for UNA Watch that are
 * linked on the wrist (hybridx-link/ in the watch repo, xhybrid-dev/una-hyrox).
 *
 * The page has one job the single-app pages do not: show six apps as six
 * separate things and as one system, at once. So:
 *   - each app keeps its own colourway, full bleed, and they never blend;
 *   - one white line runs through all of them (the hero's thread, the rail
 *     beside the chapters, the black "down the line" strip in each chapter),
 *     and it is the only thing that never changes colour;
 *   - the link is shown as what it literally is: one line of eight numbers in
 *     a folder on the watch, and a machine you can press to watch it work.
 *
 * It deliberately does not use the glass-and-gradient look of the single-app
 * pages (components/una-app/): flat colour, hard edges, Anton at poster size,
 * the family's store-art system (hybridx-link/Tools/Brand).
 *
 * Honesty constraints, all deliberate:
 *   - Facts are the watch repo's checked store text (see lib/una-family.ts).
 *   - Store status is one constant, STORE_STATUS, to edit as listings go live.
 *   - VO2max is "an estimate for tracking your own trend, not a lab test", as
 *     the store text says. No accuracy claim against a lab or another watch.
 *   - Only the family's own apps count in X Streak. UNA's built-in apps do
 *     not, and the page says so rather than letting someone find out.
 *   - Watch screens are the apps' own, from UNA's simulator, and say so.
 *   - Branding follows UNA's trademark notice (components/una-app/Chrome.tsx):
 *     "for UNA Watch", nothing implying endorsement. HYROX is someone else's
 *     trademark; Race is "HYROX-format".
 */

const URL_CANONICAL = `${HYBRIDX_URL}/una`;
const TITLE = 'The X family — six linked apps for UNA Watch, by HybridX';
const DESCRIPTION =
  'Race, Run, Trail, Ride, Workout and Streak: six HybridX apps for UNA Watch, one for each thing you do, linked on the wrist. Every session counts in X Streak, with its training load, and every run feeds your VO2max.';

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
      description: a.blurb,
      url: `${URL_CANONICAL}#${a.slug}`,
      publisher: { '@type': 'Organization', name: 'HybridX', url: HYBRIDX_URL },
    },
  })),
};

// One real line, as HybridX Run leaves it: a 45-minute, 5.4 km run at UTC+1.
const SAMPLE_LINE = ['1791980037', '1500', '2700', '5400', '152', '171', '1', '39'];

function Arrow() {
  return (
    <svg className={styles.arrow} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </svg>
  );
}

// "X RUN" and "HYBRIDX RACE" set as two words, so the X can take the accent.
function splitName(name: string): [string, string] {
  const i = name.indexOf(' ');
  return [name.slice(0, i), name.slice(i + 1)];
}

function Dial({ src, label, priority = false }: { src: string; label: string; priority?: boolean }) {
  return (
    <figure className={styles.dial}>
      <span className={styles.dialRing}>
        <Image src={src} alt={`Watch screen: ${label}`} width={480} height={480} priority={priority} />
      </span>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

function Chapter({ app, index }: { app: FamilyApp; index: number }) {
  const [x, word] = splitName(app.name);
  const isStreak = app.slug === 'streak';
  return (
    <section
      id={app.slug}
      className={styles.chapter}
      data-flip={index % 2 === 1}
      style={{
        ['--ground' as string]: app.ground,
        ['--ink' as string]: app.ink,
        ['--accent' as string]: app.accent,
        ['--on-accent' as string]: app.onAccent,
        gridRow: index + 1,
      }}
    >
      <div className={styles.chapterInner}>
        <p className={styles.chapterMeta}>
          <span className={styles.tag}>{app.colourway}</span>
          <span>
            {String(index + 1).padStart(2, '0')} / 06 · {isStreak ? 'counts them all' : `for ${app.does.toLowerCase()}`}
          </span>
        </p>

        <h3 className={styles.chapterName}>
          <span>{x}</span> {word}
        </h3>

        <div className={styles.chapterGrid}>
          <div className={styles.chapterCopy}>
            <p className={styles.chapterLine}>{app.line}</p>
            <p className={styles.chapterBlurb}>{app.blurb}</p>
            <ul className={styles.facts}>
              {app.facts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            {app.notYet ? <p className={styles.notYet}>Not yet: {app.notYet}</p> : null}
            {app.page ? (
              <Link href={app.page.href} className={styles.btnInk}>
                {app.page.label} <Arrow />
              </Link>
            ) : null}
          </div>

          <div className={styles.dials}>
            {app.screens.map((sc) => (
              <Dial key={sc.src} src={sc.src} label={sc.label} />
            ))}
          </div>
        </div>

        {/* The constant: the same black strip in every chapter, whatever the colour around it. */}
        <div className={styles.downLine}>
          <p className={styles.downHead}>{isStreak ? 'Back up the line' : 'Down the line'}</p>
          <ul>
            <li>
              <span className={styles.route}>
                <Image src={icon(app.slug)} alt="" width={28} height={28} />
                <Arrow />
                <Image src={icon(isStreak ? 'race' : 'streak')} alt="" width={28} height={28} />
                {isStreak ? <i>and the other four</i> : null}
              </span>
              <span>{app.hands}</span>
            </li>
            {app.also ? (
              <li>
                <span className={styles.route}>
                  <Image src={icon('trail')} alt="" width={28} height={28} />
                  <Arrow />
                  <Image src={icon('run')} alt="" width={28} height={28} />
                </span>
                <span>{app.also}</span>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default function UnaFamilyPage() {
  return (
    <div id="top" className={`${styles.page} ${anton.variable} ${grotesk.variable} ${mono.variable}`}>
      <script
        id="una-family-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listSchema) }}
      />

      {/* ── Bar ─────────────────────────────────────────────────────────── */}
      <header className={styles.bar}>
        <a href="#top" className={styles.mark} aria-label="The X family for UNA Watch, back to top">
          <Image src={icon('race')} alt="" width={32} height={32} />
          <span>The X family</span>
          <i>for UNA Watch</i>
        </a>
        <nav className={styles.barLinks} aria-label="Page">
          <a href="#line">The link</a>
          <a href="#week">Try a week</a>
          <a href="#apps">The six</a>
          <Link href="/una/nerdy-bits">The nerdy bits</Link>
        </nav>
        <a href={UNA_URL} className={styles.barCta} target="_blank" rel="noopener">
          Meet UNA <Arrow />
        </a>
      </header>

      <main>
        {/* ── Hero: six bands, one thread ───────────────────────────────── */}
        <section className={styles.hero}>
          <div className={styles.heroHead}>
            <h1 className={styles.h1}>
              The <span>X</span> family
            </h1>
            <div className={styles.heroSub}>
              <p className={styles.lead}>
                Six apps for UNA Watch. One for each thing you do, each built for that and nothing
                else. <strong>And every session you save lands in the same place.</strong>
              </p>
              <p className={styles.status}>
                <span aria-hidden="true" />
                {STORE_STATUS}
              </p>
            </div>
          </div>

          <ol className={styles.bands}>
            {FAMILY.map((a, i) => (
              <li
                key={a.slug}
                className={styles.band}
                style={{
                  ['--ground' as string]: a.ground,
                  ['--ink' as string]: a.ink,
                  ['--accent' as string]: a.accent,
                }}
              >
                <a href={`#${a.slug}`}>
                  <span className={styles.bandDisc}>
                    <Image src={icon(a.slug)} alt="" width={96} height={96} priority />
                  </span>
                  <span className={styles.bandDoes}>{a.slug === 'streak' ? 'All of it' : a.does}</span>
                  <span className={styles.bandName}>{a.name}</span>
                  <span className={styles.bandLine}>{a.line}</span>
                  <span className={styles.bandDial} aria-hidden="true">
                    <Image src={a.screens[i === 1 ? 1 : 0].src} alt="" width={480} height={480} priority />
                  </span>
                </a>
              </li>
            ))}
          </ol>
          <p className={styles.heroFoot}>
            <span>Five that record</span>
            <span>one that counts</span>
          </p>
        </section>

        {/* ── The link, as it literally is ──────────────────────────────── */}
        <section id="line" className={styles.paper}>
          <div className={styles.wrap}>
            <p className={styles.over}>How six separate apps become one</p>
            <h2 className={styles.h2}>
              No account. No cloud.
              <br />
              <em>Eight numbers.</em>
            </h2>
            <p className={styles.para}>
              The apps do not share a login or a server. When you save a session, the app that
              recorded it leaves one short line in a folder on the watch. X Streak reads that
              folder. That is the whole link, and it never leaves your wrist.
            </p>

            <div className={styles.tape} role="img" aria-label="One line of eight numbers, as HybridX Run leaves it after a 45 minute run">
              <span className={styles.tapeFile}>act_run.json</span>
              <ol>
                {LINE_FIELDS.map((f, i) => (
                  <li key={f.key} data-hot={i >= 6}>
                    <b>{SAMPLE_LINE[i]}</b>
                    <span>{f.label}</span>
                    <i>{f.note}</i>
                  </li>
                ))}
              </ol>
            </div>

            <ol className={styles.steps}>
              <li>
                <Dial src="/una/screens/workout/circuit-station.png" label="You train, in the app made for it" />
                <p>
                  <b>1.</b> Each app does one job properly. It records to its own file, which
                  syncs to the UNA app and on to Strava as it always did.
                </p>
              </li>
              <li>
                <Dial src="/una/screens/streak/session-found.png" label="X Streak finds it" />
                <p>
                  <b>2.</b> On save, the app leaves its line. Next time X Streak opens, the
                  session is there: counted once, as the right kind, with its training load.
                </p>
              </li>
              <li>
                <Dial src="/una/screens/ride/saved.png" label="And every app knows your week" />
                <p>
                  <b>3.</b> X Streak leaves a line of its own. So the moment you save a ride, a
                  run or a race, the Saved screen already shows your week and your streak.
                </p>
              </li>
            </ol>
          </div>
        </section>

        {/* ── The machine ───────────────────────────────────────────────── */}
        <section id="week" className={styles.black}>
          <div className={styles.wrap}>
            <p className={styles.over}>Try it</p>
            <h2 className={styles.h2}>
              Run a week <em>through it.</em>
            </h2>
            <p className={styles.para}>
              Save sessions in any order. Watch the line each app leaves, what X Streak makes of
              it, and what the app says back.
            </p>
            <WeekMachine />
          </div>
        </section>

        {/* ── The six ───────────────────────────────────────────────────── */}
        <section id="apps" className={styles.sixHead}>
          <div className={styles.wrap}>
            <p className={styles.over}>The six</p>
            <h2 className={styles.h2}>
              Separate on purpose.
              <br />
              <em>Joined by the line.</em>
            </h2>
            <p className={styles.para}>
              A race timer should not carry a route map, and a turbo session should not carry a
              rest timer for sets. So each app is small, and good at one thing. Install the ones
              you need; each works alone. Add X Streak and they start adding up.
            </p>
          </div>
        </section>

        <div className={styles.six}>
          <FamilyRail />
          {RECORDERS.map((a, i) => (
            <Chapter key={a.slug} app={a} index={i} />
          ))}
          <Chapter app={STREAK} index={5} />
        </div>

        {/* ── What the load becomes ─────────────────────────────────────── */}
        <section className={styles.glacier}>
          <div className={styles.wrap}>
            <p className={styles.over}>What the numbers add up to</p>
            <h2 className={styles.h2}>
              Fitness. Fatigue. <em>Form.</em>
            </h2>
            <div className={styles.trio}>
              <div>
                <b>Load</b>
                <p>
                  Every session scores itself from your heart rate: a minute in zone 1 is one
                  point, a minute in zone 5 is five. A hard hour and an easy hour are not the same
                  hour, in any app.
                </p>
              </div>
              <div>
                <b>Fitness &amp; fatigue</b>
                <p>
                  X Streak keeps two running averages of your daily load: one slow, over six
                  weeks, and one fast, over seven days. What you have built, and what it is
                  costing you.
                </p>
              </div>
              <div>
                <b>Form</b>
                <p>
                  The gap between them, in a word: Fresh, Steady, Building or Overreaching. A ride
                  counts towards it exactly as a run or a race does, because your heart does not
                  know which app was open.
                </p>
              </div>
            </div>

            <div className={styles.glances}>
              <div>
                <p className={styles.glanceHead}>And two glances, for the screen you see without opening anything</p>
                <ul>
                  <li>
                    <Image src="/una/screens/streak/glance-climbing.png" alt="X Streak Glance: 7 week streak, Snowdon in 5 weeks" width={408} height={165} />
                    <span>
                      <b>X Streak Glance</b> Your streak, this week against your target, and what
                      is next.
                    </span>
                  </li>
                  <li>
                    <Image src="/una/screens/run/glance-getting-fitter.png" alt="VO2max Glance: 52.7, up 0.4 on the last run, with the last ten runs as bars" width={368} height={165} />
                    <span>
                      <b>VO2max Glance</b> Your figure from X Run, the change at your latest run,
                      and your last ten runs as bars.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Straight answers ──────────────────────────────────────────── */}
        <section className={styles.paper}>
          <div className={styles.wrap}>
            <p className={styles.over}>Straight answers</p>
            <h2 className={styles.h2}>
              What it does <em>not</em> do.
            </h2>
            <dl className={styles.answers}>
              <div>
                <dt>Do the watch’s built-in apps count?</dt>
                <dd>
                  No. An app on UNA Watch cannot read another app’s activities, so X Streak counts
                  the family’s sessions and anything you log by hand, today or yesterday. A run
                  recorded in UNA’s own Running app will not appear by itself.
                </dd>
              </div>
              <div>
                <dt>Do I need all six?</dt>
                <dd>
                  No. Each app works alone and saves its own activity. X Streak is the one that
                  turns them into a week; without it the others simply do not show the streak
                  line.
                </dd>
              </div>
              <div>
                <dt>How good is the VO2max?</dt>
                <dd>
                  It is an estimate for tracking your own trend, not a lab test. It uses published
                  methods and shows its workings on the watch, including whether your maximum
                  heart rate was measured or estimated from your age, which matters more than
                  anything else. <Link href="/una/nerdy-bits">The nerdy bits</Link> has the method
                  and its limits.
                </dd>
              </div>
              <div>
                <dt>Does anything go to a HybridX server?</dt>
                <dd>
                  No. The link is a folder on the watch. Your activities sync through the UNA app,
                  and on to Strava if you have connected it, exactly as any UNA activity does.
                </dd>
              </div>
              <div>
                <dt>What about the other HybridX apps for UNA?</dt>
                <dd>
                  <Link href="/weigh-in">X Weigh-in</Link> and{' '}
                  <Link href="/trail-quest">Trail Quest</Link> are on the same watch but outside
                  the link: neither records a training session, so neither has anything to count.
                </dd>
              </div>
              <div>
                <dt>What is still missing?</dt>
                <dd>
                  Bike power, cadence and speed sensors (the watch does not connect them yet),
                  routes sent from the phone (USB for now), and rep counting, which X Workout does
                  not attempt.
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* ── The nerdy bits ────────────────────────────────────────────── */}
        <section className={styles.graph}>
          <div className={styles.wrap}>
            <div className={styles.nerd}>
              <div>
                <p className={styles.over}>For the curious</p>
                <h2 className={styles.h2}>
                  The nerdy <em>bits.</em>
                </h2>
                <p className={styles.para}>
                  Nothing in the family is a black box. The VO2max, the load and the form are all
                  published methods, done in whole numbers on the watch. The theory, the formulas,
                  the papers they come from, and where each one stops being trustworthy.
                </p>
                <Link href="/una/nerdy-bits" className={styles.btnBlack}>
                  Read the nerdy bits <Arrow />
                </Link>
              </div>
              <ul className={styles.formulas} aria-label="Three of the formulas">
                <li>
                  <span>Oxygen cost of running</span>
                  <code>VO₂ = 3.5 + 0.2·v + 0.9·v·grade</code>
                </li>
                <li>
                  <span>VO2max from a steady minute</span>
                  <code>VO₂max = 3.5 + (VO₂ − 3.5) ÷ %HRR</code>
                </li>
                <li>
                  <span>Training load</span>
                  <code>load = Σ minutes in zone × zone</code>
                </li>
                <li>
                  <span>Fitness, each day</span>
                  <code>fitness += (load − fitness) ÷ 42</code>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── UNA ───────────────────────────────────────────────────────── */}
        <section id="una" className={styles.black}>
          <div className={`${styles.wrap} ${styles.una}`}>
            <div>
              <p className={styles.over}>The watch</p>
              <h2 className={styles.h2}>
                Built for a watch <em>you can fix.</em>
              </h2>
            </div>
            <div>
              <p className={styles.para}>
                UNA Watch is the modular GPS sports watch from Scotland: one you can repair and
                upgrade rather than replace, and open to apps made for the sport you actually do.
                That openness is the only reason a family like this can exist.
              </p>
              <div className={styles.ctas}>
                <a href={UNA_URL} className={styles.btnWhite} target="_blank" rel="noopener">
                  Explore UNA Watch <Arrow />
                </a>
                <a href={HYBRIDX_APP_URL} className={styles.btnLine}>
                  Train with HybridX
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.wrap}>
          <p>
            The X family are independent apps for UNA Watch, made by <a href={HYBRIDX_URL}>HybridX</a>.
            They are not made, endorsed or sponsored by UNA Watch Ltd or by HYROX. UNA and UNA
            Watch are trademarks of UNA Watch Ltd; HYROX is a trademark of its owner. Watch
            screens are the apps’ own, captured in UNA’s simulator.
          </p>
          <nav aria-label="Footer">
            <Link href="/race">HybridX Race</Link>
            <Link href="/streak">X Streak</Link>
            <Link href="/trail">X Trail</Link>
            <Link href="/weigh-in">X Weigh-in</Link>
            <Link href="/trail-quest">Trail Quest</Link>
            <Link href="/una/nerdy-bits">The nerdy bits</Link>
            <a href={HYBRIDX_URL}>hybridx.club</a>
            <a href={UNA_URL} target="_blank" rel="noopener">
              unawatch.com
            </a>
            <Link href="/privacy-policy">Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
