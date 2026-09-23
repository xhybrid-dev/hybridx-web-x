import type { Metadata } from 'next';
import Image from 'next/image';
import styles from './race.module.css';
import LiveWatch from '@/components/race/LiveWatch';
import RaceBuilder from '@/components/race/RaceBuilder';

/*
 * race.hybridx.club: the page for HybridX Race, the HYROX-format race timer
 * for UNA Watch.
 *
 * Served at /race on hybridx.club and at the root of race.hybridx.club; the
 * middleware rewrites the subdomain's "/" here. Canonical is the subdomain.
 *
 * Standalone like the ATHX funnel: no site header or footer, its own CSS
 * module, dark whatever the site theme is. It sells two things at once — the
 * app, and the watch it runs on — and the second one quietly: UNA gets its own
 * section and every call to action that isn't "train with HybridX" goes to
 * unawatch.com.
 *
 * Written for athletes, not developers: no SDK, FIT or simulator talk in the
 * visible copy.
 *
 * UNA's trademark notice (TRADEMARK.md in github.com/UNAWatch/una-sdk) allows
 * nominative use — "for UNA Watch" — but nothing implying endorsement,
 * sponsorship or affiliation. So there is no "HybridX × UNA" lockup: the brands
 * meet in UNA's palette (teal #358d98 from the SDK docs' own stylesheet) and in
 * UNA's product render in the hero, and the page always says "for UNA Watch".
 * The render carries the UNA logo, and the MIT licence on the SDK does not
 * cover logos, so that image needs UNA's permission before this goes live.
 *
 * Honesty constraints, all deliberate:
 *   - The app is not in the UNA store yet, so nothing here says "download".
 *     The status line is "coming to UNA Watch".
 *   - The watch screens are pre-release captures and say so.
 *   - Claims about UNA are limited to what UNA says publicly about itself:
 *     modular, repairable and upgradable, open platform, from Scotland.
 *     No battery figures, no specs that could change before Jon hears them.
 *   - HYROX is someone else's trademark. The app is "HYROX-format" and the
 *     footer says it is independent, as the ATHX page does for ATHX.
 *   - Anything on the roadmap is labelled as the roadmap.
 */

const URL_CANONICAL = 'https://race.hybridx.club';
const UNA_URL = 'https://unawatch.com';
const HYBRIDX_URL = 'https://hybridx.club';
const HYBRIDX_APP_URL = 'https://hybridx.club/app';

const TITLE = 'HybridX Race — the HYROX-format race timer for UNA Watch';
const DESCRIPTION =
  'One button per split. Every run and every station timed as its own lap, with heart rate, and sent to Strava and Garmin Connect. The HYROX-format race timer for UNA Watch, by HybridX.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    'hybridx race',
    'una watch',
    'una watch app',
    'hyrox watch app',
    'hyrox race timer',
    'hyrox split timer',
    'hyrox splits',
    'hyrox simulation timer',
    'roxzone splits',
    'hyrox strava',
    'hybrid race watch',
    'modular sports watch',
    'repairable smartwatch',
  ],
  alternates: { canonical: URL_CANONICAL },
  openGraph: {
    title: 'HybridX Race for UNA Watch',
    description: DESCRIPTION,
    type: 'website',
    url: URL_CANONICAL,
    siteName: 'HybridX',
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HybridX Race for UNA Watch',
    description: DESCRIPTION,
  },
};

const appSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'HybridX Race',
  applicationCategory: 'SportsApplication',
  operatingSystem: 'UNA Watch',
  description: DESCRIPTION,
  url: URL_CANONICAL,
  publisher: { '@type': 'Organization', name: 'HybridX', url: HYBRIDX_URL },
};

const FEATURES = [
  {
    kicker: 'The split',
    title: 'Your split time, just when you need it',
    body: 'Press at the transition. The split lands the instant you press, the watch shows what you just finished, then gets out of the way. A buzz tells you run or station without looking.',
    accent: 'lemon',
  },
  {
    kicker: 'Split lock',
    title: 'Fumble-proof',
    body: 'After every split the button locks for 1 to 10 seconds — your choice. Sweaty hands on a sled handle press twice; the second press is quietly ignored.',
    accent: 'cyan',
  },
  {
    kicker: 'Undo',
    title: 'Take it back, exactly',
    body: 'Pressed on the way into the Roxzone instead of out? Undo it. The times either side are put back exactly as they were, as if you never pressed.',
    accent: 'orchid',
  },
  {
    kicker: 'Heart rate',
    title: 'Per lap, not per race',
    body: 'From the wrist or a chest strap, lap by lap — so afterwards you can see what the sleds cost you, separately from the runs.',
    accent: 'red',
  },
  {
    kicker: 'Safety net',
    title: 'It never loses a race',
    body: 'Lying on the floor after the wall balls? It saves your race by itself after a minute. Leave the app mid-race and the clock keeps running.',
    accent: 'teal',
  },
];

const SCREENS = [
  { src: '/race/start.png', title: 'Start', caption: 'Start race is already under your thumb. No sign-in, no GPS lock.' },
  { src: '/race/on-your-marks.png', title: 'On your marks', caption: 'Shows the race you are about to run, and waits as long as you do.' },
  { src: '/race/run.png', title: 'Run', caption: 'Blue for a run. This lap’s time big, race time beneath, next station named.' },
  { src: '/race/station.png', title: 'Station', caption: 'Yellow for a station. Heart rate and zone, live from the wrist.' },
  { src: '/race/split.png', title: 'Split', caption: 'Confirms what just ended and its time, then gets out of the way.' },
  { src: '/race/summary.png', title: 'Summary', caption: 'Where the time went, before you have found your phone.' },
];

const ROADMAP = [
  { tag: 'Next', title: 'Custom simulations', body: 'Choose the stations, the run distance and the rounds. Relay format for pairs.' },
  { tag: 'Then', title: 'Target pacing', body: 'A target finish from your HybridX coaching, sent straight to your watch.' },
  { tag: 'Later', title: 'Outdoor sims with GPS', body: 'Runs that end themselves at the set distance.' },
];

function Arrow() {
  return (
    <svg className={styles.arrow} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4.5 11.5l7-7M5.5 4.5h6v6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// The app's own wordmark: HybridX's mark, "RACE", and a nominative "for UNA
// Watch". Deliberately not a HybridX × UNA co-brand; see the note at the top.
function Wordmark({ large = false }: { large?: boolean }) {
  return (
    <span className={`${styles.wordmark} ${large ? styles.wordmarkLarge : ''}`}>
      <Image src="/Icon Logo.png" alt="HybridX" width={40} height={40} className={styles.xMark} />
      <span className={styles.wordRace}>Race</span>
      <span className={styles.wordFor}>for UNA Watch</span>
    </span>
  );
}

export default function RacePage() {
  return (
    <div id="top" className={styles.page}>
      <script
        id="race-app-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
      />

      <div className={styles.aurora} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <a href="#top" className={styles.brand} aria-label="HybridX Race for UNA Watch, back to top">
            <Wordmark />
          </a>
          <nav className={styles.navLinks} aria-label="Page">
            <a href="#format">The race</a>
            <a href="#features">Features</a>
            <a href="#screens">Screens</a>
            <a href="#una">UNA Watch</a>
          </nav>
          <a href={UNA_URL} className={styles.navCta} target="_blank" rel="noopener">
            Meet UNA <Arrow />
          </a>
        </div>
      </header>

      <main>
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className={styles.hero}>
          <div className={styles.container}>
            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <p className={styles.pill}>
                  <span className={styles.pulse} aria-hidden="true" />
                  Coming to UNA Watch
                </p>
                <h1 className={styles.h1}>
                  Track your Hyrox <span className={styles.gradientText}>with UNA</span>
                </h1>
                <p className={styles.lead}>
                  HybridX Race is the HYROX-format race timer for UNA Watch. Press once at every
                  transition, and every run and every station is timed as its own lap, with your
                  heart rate — then sent to Strava and Garmin Connect.
                </p>
                <div className={styles.ctaRow}>
                  <a href={UNA_URL} className={styles.btnPrimary} target="_blank" rel="noopener">
                    Discover UNA Watch <Arrow />
                  </a>
                  <a href="#format" className={styles.btnGhost}>
                    See how it works
                  </a>
                </div>
              </div>

              <div className={styles.heroWatch}>
                <div className={styles.watchHalo} aria-hidden="true" />
                <div className={styles.watchFloat}>
                  <LiveWatch />
                </div>
                <p className={styles.watchNote}>A race, fast-forwarded. Illustrative times.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── The race ──────────────────────────────────────────────────── */}
        <section id="format" className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <p className={styles.eyebrow}>The race, as it is scored</p>
              <h2 className={styles.h2}>
                Your watch records one effort.
                <span className={styles.dim}> This records all your splits.</span>
              </h2>
              <p className={styles.sectionLead}>
                Eight 1 km runs and eight stations, one after another. The watch knows the order,
                so you don’t have to: race it in full or train either half, and time your Roxzone
                transitions separately if you want to. Try it:
              </p>
            </div>
            <div className={`${styles.glassPanel} ${styles.reveal}`}>
              <RaceBuilder />
            </div>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────────────── */}
        <section id="features" className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <p className={styles.eyebrow}>Built for 180 bpm</p>
              <h2 className={styles.h2}>
                Everything you need <span className={styles.nowrap}>mid-effort.</span>
                <span className={styles.dim}> Nothing you don’t.</span>
              </h2>
            </div>

            <div className={styles.bento}>
              <article className={`${styles.card} ${styles.cardWide} ${styles.reveal}`}>
                <div className={styles.cardCopy}>
                  <p className={styles.kicker}>Strava &amp; Garmin Connect</p>
                  <h3 className={styles.h3}>Lands as a race, not a blob</h3>
                  <p>
                    Most watches save a race as one long workout. HybridX Race sends it to Strava
                    and Garmin Connect as sixteen laps, each run and each station in order — so
                    you can see exactly where the time went.
                  </p>
                </div>
                <div className={styles.lapChart} aria-hidden="true">
                  {[62, 58, 64, 40, 66, 55, 67, 51, 66, 60, 68, 24, 69, 54, 70, 74].map((h, i) => (
                    <span
                      key={i}
                      className={i % 2 === 0 ? styles.barRun : styles.barStation}
                      style={{ height: `${h}%`, animationDelay: `${i * 40}ms` }}
                    />
                  ))}
                </div>
              </article>

              {FEATURES.map((f) => (
                <article key={f.title} className={`${styles.card} ${styles.reveal}`} data-accent={f.accent}>
                  <p className={styles.kicker}>{f.kicker}</p>
                  <h3 className={styles.h3}>{f.title}</h3>
                  <p>{f.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Screens ───────────────────────────────────────────────────── */}
        <section id="screens" className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <p className={styles.eyebrow}>On the wrist</p>
              <h2 className={styles.h2}>
                Three presses to the start line.
                <span className={styles.dim}> One to every split after.</span>
              </h2>
            </div>
          </div>
          <ol className={styles.screens}>
            {SCREENS.map((s, i) => (
              <li key={s.src} className={styles.screen}>
                <div className={styles.screenDial}>
                  <Image src={s.src} alt={`${s.title} screen`} width={480} height={480} className={styles.screenImg} />
                </div>
                <p className={styles.screenTitle}>
                  <span className={styles.screenNum}>{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </p>
                <p className={styles.screenCaption}>{s.caption}</p>
              </li>
            ))}
          </ol>
          <div className={styles.container}>
            <p className={styles.footnote}>Pre-release screens. The finished app may differ slightly.</p>
          </div>
        </section>

        {/* ── UNA ───────────────────────────────────────────────────────── */}
        <section id="una" className={styles.section}>
          <div className={styles.container}>
            <div className={`${styles.unaPanel} ${styles.reveal}`}>
              <div className={styles.unaCopy}>
                <p className={styles.eyebrow}>Why UNA Watch</p>
                <h2 className={styles.h2}>
                  Built for a watch
                  <br />
                  you can fix.
                </h2>
                <p className={styles.sectionLead}>
                  UNA Watch is the modular GPS sports watch from Scotland: a watch you can repair
                  and upgrade rather than replace, open to apps made for the sport you actually
                  do. HybridX Race is made for it from the ground up — a watch that lasts as long
                  as your training does, running an app that understands your race.
                </p>
                <div className={styles.ctaRow}>
                  <a href={UNA_URL} className={styles.btnTeal} target="_blank" rel="noopener">
                    Explore UNA Watch <Arrow />
                  </a>
                </div>
              </div>
              <ul className={styles.unaPoints}>
                <li>
                  <span className={styles.unaIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z" /></svg>
                  </span>
                  <strong>Repairable</strong>
                  <span>Designed to be opened and fixed, not replaced.</span>
                </li>
                <li>
                  <span className={styles.unaIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><path d="M16.5 13v7M13 16.5h7" /></svg>
                  </span>
                  <strong>Modular</strong>
                  <span>Hardware that upgrades with you.</span>
                </li>
                <li>
                  <span className={styles.unaIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 5l-3 14" /></svg>
                  </span>
                  <strong>Made for your sport</strong>
                  <span>Open to specialist apps like this one, not just the big names.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── Coaching loop ─────────────────────────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.loopGrid}>
              <div>
                <p className={styles.eyebrow}>From your wrist to your coach</p>
                <h2 className={styles.h2}>
                  More than a stopwatch.
                  <span className={styles.dim}> An input to your training.</span>
                </h2>
                <p className={styles.sectionLead}>
                  Every lap knows whether it was a run, a station or a Roxzone. Next, we’re
                  joining that up with HybridX coaching: your race comes back to your plan, and
                  your targets go out to your wrist. Here’s what’s coming.
                </p>
              </div>
              <ol className={styles.roadmap}>
                {ROADMAP.map((r) => (
                  <li key={r.title} className={styles.reveal}>
                    <span className={styles.roadTag}>{r.tag}</span>
                    <strong>{r.title}</strong>
                    <span>{r.body}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ── Final call ────────────────────────────────────────────────── */}
        <section className={styles.final}>
          <div className={styles.container}>
            <Wordmark large />
            <h2 className={styles.finalTitle}>
              Race it on <span className={styles.gradientText}>UNA Watch.</span>
            </h2>
            <p className={styles.finalLead}>
              HybridX Race is coming to the UNA app store. Get the watch, and be on the start line
              when it lands.
            </p>
            <div className={`${styles.ctaRow} ${styles.ctaCenter}`}>
              <a href={UNA_URL} className={styles.btnPrimary} target="_blank" rel="noopener">
                Get UNA Watch <Arrow />
              </a>
              <a href={HYBRIDX_APP_URL} className={styles.btnGhost}>
                Train with HybridX
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <p>
            HybridX Race is an independent app for UNA Watch, made by{' '}
            <a href={HYBRIDX_URL}>HybridX</a>. It is not made, endorsed or sponsored by UNA Watch
            Ltd or by HYROX. UNA and UNA Watch are trademarks of UNA Watch Ltd; HYROX is a
            trademark of its owner.
          </p>
          <nav className={styles.footerLinks} aria-label="Footer">
            <a href={HYBRIDX_URL}>hybridx.club</a>
            <a href={UNA_URL} target="_blank" rel="noopener">
              unawatch.com
            </a>
            <a href={`${HYBRIDX_URL}/privacy-policy`}>Privacy</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
