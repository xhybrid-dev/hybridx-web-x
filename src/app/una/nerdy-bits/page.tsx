import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { HYBRIDX_URL, UNA_URL } from '@/components/una-app/Chrome';
import { grotesk, inter, mono } from '@/components/una/fonts';
import { LoadBench, Vo2Bench } from '@/components/una/Benches';
import FormChart from '@/components/una/FormChart';
import { LINE_FIELDS } from '@/lib/una-family';
import styles from './nerdy.module.css';

import { OG_DEFAULTS, TWITTER_DEFAULTS } from '@/lib/seo';
/*
 * hybridx.club/una/nerdy-bits: the method behind the X family's numbers, for
 * the reader who wants to check them.
 *
 * Published, citable methods only. Every formula mirrors xhybrid-dev/una-hyrox,
 * restated in src/lib/una-maths.ts and pinned by unit tests.
 */

const URL_CANONICAL = `${HYBRIDX_URL}/una/nerdy-bits`;
const TITLE = 'The X Family Sports Science: VO2max, Load and Form';
const DESCRIPTION = 'The sports science behind the HybridX apps for UNA Watch: Edwards zone-weighted load, Banister fitness and fatigue, %HRR VO2max and Daniels-Gilbert paces.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: URL_CANONICAL },
  openGraph: {
    ...OG_DEFAULTS,
    title: 'The nerdy bits: the X family’s maths',
    description: DESCRIPTION,
    type: 'article',
    url: URL_CANONICAL,
    siteName: 'HybridX',
    locale: 'en_GB',
  },
  twitter: { ...TWITTER_DEFAULTS, card: 'summary_large_image', title: 'The nerdy bits: the X family’s maths', description: DESCRIPTION },
};

type Ref = { id: number; text: React.ReactNode; href?: string; where?: string };

const REFS: Ref[] = [
  {
    id: 1,
    text: (
      <>
        American College of Sports Medicine. <i>ACSM’s Guidelines for Exercise Testing and Prescription</i>,
        11th ed. Wolters Kluwer, 2021. Metabolic calculations: the running equation.
      </>
    ),
  },
  {
    id: 2,
    text: (
      <>
        Swain DP, Leutholtz BC. Heart rate reserve is equivalent to %VO2 reserve, not to %VO2max.{' '}
        <i>Med Sci Sports Exerc</i> 1997;29(3):410–414.
      </>
    ),
    href: 'https://doi.org/10.1097/00005768-199703000-00018',
    where: 'doi',
  },
  {
    id: 3,
    text: (
      <>
        Tanaka H, Monahan KD, Seals DR. Age-predicted maximal heart rate revisited.{' '}
        <i>J Am Coll Cardiol</i> 2001;37(1):153–156.
      </>
    ),
    href: 'https://pubmed.ncbi.nlm.nih.gov/11153730/',
    where: 'PubMed',
  },
  {
    id: 4,
    text: (
      <>
        Molina-Garcia P, et al. Validity of estimating the maximal oxygen consumption by consumer
        wearables: a systematic review with meta-analysis and expert statement of the INTERLIVE
        network. <i>Sports Med</i> 2022;52:1577–1597.
      </>
    ),
    href: 'https://doi.org/10.1007/s40279-021-01639-y',
    where: 'doi, open access',
  },
  {
    id: 5,
    text: (
      <>
        Daniels J, Gilbert J. <i>Oxygen Power: Performance Tables for Distance Runners</i>. Tempe, AZ,
        1979.
      </>
    ),
  },
  {
    id: 6,
    text: (
      <>
        Edwards S. <i>The Heart Rate Monitor Book</i>. 1993. The five-zone, summated
        heart-rate-zone score.
      </>
    ),
  },
  {
    id: 7,
    text: (
      <>
        Foster C, Florhaug JA, Franklin J, et al. A new approach to monitoring exercise training.{' '}
        <i>J Strength Cond Res</i> 2001;15(1):109–115.
      </>
    ),
  },
  {
    id: 8,
    text: (
      <>
        Calvert TW, Banister EW, Savage MV, Bach T. A systems model of the effects of training on
        physical performance. <i>IEEE Trans Syst Man Cybern</i> 1976;SMC-6(2):94–102.
      </>
    ),
    href: 'https://doi.org/10.1109/TSMC.1976.5409179',
    where: 'doi',
  },
  {
    id: 9,
    text: (
      <>
        Morton RH, Fitz-Clarke JR, Banister EW. Modeling human performance in running.{' '}
        <i>J Appl Physiol</i> 1990;69(3):1171–1177.
      </>
    ),
    href: 'https://pubmed.ncbi.nlm.nih.gov/2246166/',
    where: 'PubMed',
  },
  {
    id: 10,
    text: (
      <>
        Allen H, Coggan A, McGregor S. <i>Training and Racing with a Power Meter</i>, 3rd ed. VeloPress,
        2019. The 42-day and 7-day averages in everyday use.
      </>
    ),
  },
];

function Cite({ n }: { n: number | number[] }) {
  const list = Array.isArray(n) ? n : [n];
  return (
    <sup className={styles.cite}>
      {list.map((i, k) => (
        <a key={i} href={`#ref-${i}`} aria-label={`Reference ${i}`}>
          {k > 0 ? ',' : ''}
          {i}
        </a>
      ))}
    </sup>
  );
}

function Formula({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.formula}>
      <span>{label}</span>
      <code>{children}</code>
    </div>
  );
}

const SECTIONS = [
  { id: 'rules', n: '0', title: 'Ground rules' },
  { id: 'link', n: '1', title: 'The shared folder' },
  { id: 'load', n: '2', title: 'Training load' },
  { id: 'form', n: '3', title: 'Fitness, fatigue, form' },
  { id: 'vo2max', n: '4', title: 'VO2max estimate' },
  { id: 'trail', n: '5', title: 'Trail & Training → Run' },
  { id: 'training', n: '6', title: 'X Training paces' },
  { id: 'small', n: '7', title: 'The smaller sums' },
  { id: 'refs', n: '8', title: 'References' },
];

const MINUTE_RULES: [string, string][] = [
  ['It is past the warm-up', 'The first 5 minutes never count: heart rate has not caught up with the pace.'],
  ['The data is good', 'At least 55 of the 60 seconds have a trusted heart rate and a real GPS speed.'],
  ['You are running', '134 m/min (7:28 /km) or faster, the foot of the running equation’s range.'],
  ['It is steady', 'Speed varies by no more than 8 %, and heart rate by no more than 12 bpm.'],
  ['It is not steep', 'The minute’s average gradient is between −3 % and +10 %.'],
  ['It is hard enough', 'At least half your heart-rate reserve. Easier than that and the estimate is unreliable.'],
  ['Nothing just changed', 'Not the minute after a pause, or after the pace moved by more than 10 % (heart-rate lag guard).'],
];

export default function NerdyBitsPage() {
  return (
    <div id="top" className={`${styles.page} ${grotesk.variable} ${inter.variable} ${mono.variable}`}>
      <header className={styles.bar}>
        <Link href="/una" className={styles.back}>
          <Image src="/icon-logo.png" alt="HybridX" width={28} height={28} />
          <span>← Back to the X family</span>
        </Link>
        <a href={UNA_URL} target="_blank" rel="noopener" className={styles.barUna}>
          for UNA Watch
        </a>
      </header>

      <div className={styles.head}>
        <div className={styles.over}>// THE X FAMILY · SPORTS SCIENCE &amp; ARCHITECTURE</div>
        <h1 className={styles.h1}>
          The nerdy <em>bits.</em>
        </h1>
        <p className={styles.lead}>
          What all seven X apps work out on your wrist, how they share data without a phone or server,
          whose published research backs every formula, and where each estimate stops being
          trustworthy.
        </p>
      </div>

      <div className={styles.body}>
        <nav className={styles.toc} aria-label="Contents">
          <ol>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>
                  <b>{s.n}</b>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <main id="main-content" tabIndex={-1} className={styles.main}>
          {/* 0 ─ Ground rules */}
          <section id="rules">
            <h2>
              <b>0</b> Ground rules
            </h2>
            <ul className={styles.rules}>
              <li>
                <b>Published methods only.</b> Every figure the family shows comes from a method in
                the literature, cited below. Where a threshold is our own choice, it says so.
              </li>
              <li>
                <b>Done on the watch.</b> No phone, no server. The sums run natively on your wrist,
                and are tested against hand-worked answers on every change.
              </li>
              <li>
                <b>An estimate is called an estimate.</b> Each method’s limits sit beside it, in
                the same size type.
              </li>
            </ul>
          </section>

          {/* 1 ─ The shared folder */}
          <section id="link">
            <h2>
              <b>1</b> The shared folder
            </h2>
            <p>
              Apps on UNA Watch are sandboxed: one app cannot read another’s private activities.
              Each can, though, read and write one shared folder. Whenever you save a session in any
              of the six activity apps — <b>X Training</b> (<code>act_training.json</code>),{' '}
              <b>HybridX Race</b> (<code>act_race.json</code>), <b>X Run</b> (<code>act_run.json</code>),{' '}
              <b>X Trail</b> (<code>act_trail.json</code>), <b>X Ride</b> (<code>act_ride.json</code>) or{' '}
              <b>X Workout</b> (<code>act_workout.json</code>) — that app writes one row of eight whole
              numbers to its own slot, keeping its latest sixteen sessions.
            </p>
            <p>
              <b>X Streak</b> reads all six slots, folds every session into your weekly target and
              Banister load averages, and writes <code>streak_now.json</code> back to the same folder so
              all six activity apps display your live Streak Line and Load immediately on their Saved
              screen. <b>X Streak Glance</b> also projects directly from those files before you even open
              X Streak.
            </p>
            <div className={styles.tableWrap}>
              <table className={styles.fields}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Holds</th>
                    <th>As</th>
                  </tr>
                </thead>
                <tbody>
                  {LINE_FIELDS.map((f, i) => (
                    <tr key={f.key}>
                      <td>{i + 1}</td>
                      <td>{f.label}</td>
                      <td>{f.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className={styles.notes}>
              <li>
                <b>One file per app, and that app is its only writer.</b> Two apps can never
                corrupt each other’s record.
              </li>
              <li>
                <b>Written only after the activity itself has saved.</b> A discarded session leaves
                nothing; a failed write of the line never costs you the activity.
              </li>
              <li>
                <b>Counted once.</b> X Streak deduplicates every session it has seen, so opening it
                twice never doubles your week.
              </li>
            </ul>
          </section>

          {/* 2 ─ Training load */}
          <section id="load">
            <h2>
              <b>2</b> Training load
            </h2>
            <p>
              A hard forty minutes and an easy forty minutes are not the same training. All six
              activity apps score every session identically using the heart-rate-zone method
              described by Sally Edwards
              <Cite n={6} /> and widely used in sports-science literature
              <Cite n={7} />: each minute counts for the number of the zone it was spent in.
            </p>
            <Formula label="Edwards’ training load">
              load = 1·(min in zone 1) + 2·(zone 2) + 3·(zone 3) + 4·(zone 4) + 5·(zone 5)
            </Formula>
            <p>
              The zones are the watch’s own, the ones set in your UNA profile, so the load agrees
              with what the watch already shows you. Time below zone 1, or with no heart rate,
              scores nothing.
            </p>
            <div className={styles.worked}>
              <p className={styles.workedHead}>Worked example: a real 16-minute ride</p>
              <code>
                6:41 in zone 1 → 6.68 × 1 = 6.7
                <br />
                1:28 in zone 2 → 1.47 × 2 = 2.9
                <br />
                4:25 in zone 3 → 4.42 × 3 = 13.3
                <br />
                3:56 in zone 4 → 3.93 × 4 = 15.7
                <br />
                <b>load = 38.6 → 39</b>
              </code>
              <p>The watch showed “Load 39”. A test pins that figure, there and on this site.</p>
            </div>
            <h3>Try it</h3>
            <LoadBench />
            <h3>Where it stops being trustworthy</h3>
            <ul className={styles.limits}>
              <li>
                <b>It is only as good as the heart rate.</b> A wrist sensor that drops out
                under-counts the load. A chest strap fixes that; nothing in the app smooths it over.
              </li>
              <li>
                <b>Heart rate undersells heavy lifting.</b> A set of five hard squats barely moves
                it, so treat a strength session’s load as a floor, not a measure.
              </li>
              <li>
                <b>Your zones have to be yours.</b> Default thresholds on a fit athlete, or the
                reverse, shift every score the same way.
              </li>
            </ul>
          </section>

          {/* 3 ─ Fitness, fatigue, form */}
          <section id="form">
            <h2>
              <b>3</b> Fitness, fatigue, form
            </h2>
            <p>
              In 1976 Calvert, Banister and colleagues modelled an athlete as a system with one
              input, training, and two responses that both fade with time: a slow one that helps,
              fitness, and a fast one that hurts, fatigue
              <Cite n={8} />. Performance is the balance between them, an idea later tested on
              runners through training and taper
              <Cite n={9} />.
            </p>
            <p>
              X Streak runs the everyday form of that model across all six apps: two running
              averages of your daily load. Their time constants, 42 days and 7 days, are the
              convention endurance software settled on
              <Cite n={10} />; the original paper fitted 50 and 15 days to a single swimmer.
            </p>
            <Formula label="Each day, on the watch">
              fitness ← fitness + (load − fitness) ÷ 42
              <br />
              fatigue ← fatigue + (load − fatigue) ÷ 7
              <br />
              form = fitness − fatigue
            </Formula>
            <FormChart />
            <h3>The word</h3>
            <p>
              A form of −15 means something different at a fitness of 30 than at 120, so X Streak
              reads form as a share of fitness before it names it.
            </p>
            <div className={styles.tableWrap}>
              <table className={styles.fields}>
                <thead>
                  <tr>
                    <th>Form, as a share of fitness</th>
                    <th>Word</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>above +10 %</td>
                    <td>Fresh</td>
                  </tr>
                  <tr>
                    <td>−10 % to +10 %</td>
                    <td>Steady</td>
                  </tr>
                  <tr>
                    <td>−30 % to −10 %</td>
                    <td>Building</td>
                  </tr>
                  <tr>
                    <td>below −30 %</td>
                    <td>Overreaching</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <h3>Where it stops being trustworthy</h3>
            <ul className={styles.limits}>
              <li>
                <b>The bands are ours, and provisional.</b> The model is published; where “Building”
                becomes “Overreaching” is a judgement we are still tuning against real seasons.
              </li>
              <li>
                <b>It needs two weeks.</b> Started from zero, the model calls any regular athlete
                overreached for a month. So X Streak says “Learning: day N of 14”, then seeds both
                averages from those first fourteen days.
              </li>
              <li>
                <b>It only knows what the family recorded.</b> A session logged by hand counts for
                the streak but carries no load, and a run in another app is invisible to it.
              </li>
              <li>
                <b>It describes; it does not predict.</b> X Streak shows the two averages and their
                gap. It does not turn them into a race time.
              </li>
            </ul>
          </section>

          {/* 4 ─ VO2max */}
          <section id="vo2max">
            <h2>
              <b>4</b> VO2max estimate
            </h2>
            <p>
              VO2max is the most oxygen your body can use, per kilogram, per minute. A lab measures
              it with a mask and a treadmill. X Run estimates it from something every steady run
              already contains: how fast you were going, and how much of your heart’s range that
              cost you.
            </p>

            <h3>Step 1 · What the running cost</h3>
            <p>
              The ACSM running equation gives the oxygen cost of running at a given speed and
              gradient
              <Cite n={1} />. It is the standard clinical equation, built for level and uphill
              running, so X Run treats a gentle downhill as level and leaves steep ground out.
            </p>
            <Formula label="ACSM running equation · v in m/min, grade as a fraction">
              VO₂ = 3.5 + 0.2·v + 0.9·v·grade
            </Formula>

            <h3>Step 2 · How hard that was for you</h3>
            <p>
              Swain and Leutholtz showed that the share of your heart-rate reserve in use matches
              the share of your oxygen reserve in use, not the share of VO2max itself
              <Cite n={2} />. Reserve means the range above resting: 3.5 ml/kg/min is the oxygen
              cost of sitting still.
            </p>
            <Formula label="Heart-rate reserve in use">%HRR = (HR − HRrest) ÷ (HRmax − HRrest)</Formula>

            <h3>Step 3 · Scale up</h3>
            <p>
              If a minute cost you this much oxygen at this share of your reserve, the full reserve
              is the cost divided by the share.
            </p>
            <Formula label="VO2max estimate from one steady minute">VO₂max = 3.5 + (VO₂ − 3.5) ÷ %HRR</Formula>

            <div className={styles.worked}>
              <p className={styles.workedHead}>Worked example: the minute the tests pin</p>
              <code>
                5:00 /km on the level → v = 200 m/min
                <br />
                VO₂ = 3.5 + 0.2 × 200 = 43.5
                <br />
                HR 160, resting 50, maximum 190 → %HRR = 110 ÷ 140 = 0.786
                <br />
                <b>VO₂max = 3.5 + 40 ÷ 0.786 = 54.4</b>
              </code>
            </div>

            <h3>Try it</h3>
            <Vo2Bench />

            <h3>Which minutes count</h3>
            <p>
              One minute proves little, so each outdoor run is cut into one-minute windows and each
              must pass all seven gates below. These are the watch’s current values; the app marks
              them provisional as field data comes in.
            </p>
            <dl className={styles.minuteRules}>
              {MINUTE_RULES.map(([t, d]) => (
                <div key={t}>
                  <dt>{t}</dt>
                  <dd>{d}</dd>
                </div>
              ))}
            </dl>
            <ul className={styles.notes}>
              <li>
                <b>A run’s figure</b> is the median of its accepted minutes (minimum five), so one
                odd minute cannot drag it.
              </li>
              <li>
                <b>The figure you see</b> averages your latest five runs weighted by accepted
                minutes, within 42 days of the newest.
              </li>
              <li>
                <b>Maximum heart rate</b> uses the value you enter (with 2-run protection against
                single-run wrist spikes). Without one, Tanaka’s formula, 208 − 0.7 × age
                <Cite n={3} />, is used and clearly labelled “(age)”.
              </li>
              <li>
                <b>Change your numbers and the past is re-scored.</b> X Run keeps each run’s
                raw steady minutes, so entering a measured maximum retroactively re-scores your
                history.
              </li>
            </ul>

            <h3>Where it stops being trustworthy</h3>
            <ul className={styles.limits}>
              <li>
                <b>Maximum heart rate dominates.</b> Ten beats too high reads about 7 % too fit. A
                measured maximum is the single best thing you can give it.
              </li>
              <li>
                <b>Cardiac drift &amp; economy.</b> Heart rate creeps up on long steady runs and
                running economy varies between individuals; no field estimate sees running economy
                directly.
              </li>
              <li>
                <b>Different scale from Daniels’ running tables.</b> Daniels and Gilbert
                <Cite n={5} /> price the same running speed lower than ACSM does (about a sixth
                lower at 5:00 /km), because they were fitted to trained runners. Do not mix an ACSM
                VO2max estimate directly with pace tables fitted on another curve.
              </li>
              <li>
                <b>Not lab-validated.</b> A systematic review found wearable VO2max estimates are
                close on average yet can sit several ml/kg/min either side of a lab test for an
                individual
                <Cite n={4} />. Treat it as your personal trend on the same watch over months.
              </li>
            </ul>
          </section>

          {/* 5 ─ Trail & Training into Run */}
          <section id="trail">
            <h2>
              <b>5</b> Trail &amp; Training into Run
            </h2>
            <p>
              A steady run followed in <b>X Trail</b> or coached in <b>X Training</b> is still a
              run, and its steady outdoor minutes are just as informative as an X Run session. Both
              apps build identical 1-minute steady windows (verified by build checks against X Run)
              and write them to dedicated slots in the shared folder.
            </p>
            <p>
              The next time <b>X Run</b> opens, it judges those minutes by your current heart-rate
              profile, deduplicates each run, updates your rolling 42-day VO2max estimate, and
              publishes <code>vo2max.json</code> back to the shared folder — updating both{' '}
              <b>VO2max Glance</b> and <b>X Training’s Plan screen</b> so you can track your aerobic
              trend across a 10K, Half Marathon or 8-week VO2max block.
            </p>
          </section>

          {/* 6 ─ X Training paces */}
          <section id="training">
            <h2>
              <b>6</b> X Training paces &amp; review
            </h2>
            <p>
              <b>X Training</b> derives your Easy, Marathon, Threshold, Interval and Repetition
              paces directly from a recent 5K time using the published Daniels–Gilbert equations
              <Cite n={5} />, verified in host tests against all 66 rows of Daniels’ running tables.
            </p>
            <Formula label="Daniels–Gilbert oxygen cost & sustainable fraction">
              VO₂(v) = −4.60 + 0.182258·v + 0.000104·v²
              <br />
              F(t) = 0.8 + 0.1894393·e^(−0.012778·t) + 0.2989558·e^(−0.1932605·t)
              <br />
              index = VO₂(distance ÷ t) ÷ F(t)
            </Formula>
            <div className={styles.worked}>
              <p className={styles.workedHead}>Worked example: a 22:00 5K on the watch</p>
              <code>
                v = 5000 m ÷ 22.0 min = 227.3 m/min
                <br />
                VO₂(v) = −4.60 + 41.42 + 5.37 = 42.19 ml/kg/min
                <br />
                F(22.0) = 0.8 + 0.1430 + 0.0043 = 0.9473
                <br />
                <b>race-fitness index = 42.19 ÷ 0.9473 = 44.5</b>
              </code>
              <p>
                X Training inverts VO₂(v) at each training intensity fraction to set your exact pace
                bands — and switches cleanly to km/h or mph belt speeds in Treadmill mode.
              </p>
            </div>
            <ul className={styles.notes}>
              <li>
                <b>Optional Half Marathon endurance check.</b> Supply a recent half-marathon time
                alongside your 5K and X Training compares the two indices; if endurance lags speed,
                it flags that long runs matter most for your block.
              </li>
              <li>
                <b>Session Review &amp; 3-run hold-plan threshold.</b> Structured workouts record
                percent time spent inside your target pace band (plus late-rep fade) and pair it
                with your post-run Feel rating (Fresh to Spent) across the last 8 runs. Only after
                three consecutive off-pace slow runs does it offer to repeat a week — and never
                during race taper.
              </li>
              <li>
                <b>General training guidance.</b> Plan paces and hold-week prompts are general
                coaching aids, not medical advice: stop if something hurts.
              </li>
            </ul>
          </section>

          {/* 7 ─ The smaller sums */}
          <section id="small">
            <h2>
              <b>7</b> The smaller sums
            </h2>
            <dl className={styles.minuteRules}>
              <div>
                <dt>Step length</dt>
                <dd>Speed divided by cadence, each second; the average is weighted by cadence, so it equals distance over steps.</dd>
              </div>
              <div>
                <dt>Treadmill distance</dt>
                <dd>Cadence through a stride model (or set belt speed in X Training), then calibrated to the console’s distance when you enter it after the run.</dd>
              </div>
              <div>
                <dt>Calories in Workout and Ride</dt>
                <dd>
                  A MET value for each heart-rate zone, times your weight, each second. A rough
                  figure, and rougher on a bike: it is a general table, not a cycling one.
                </dd>
              </div>
              <div>
                <dt>Race splits</dt>
                <dd>Stamped at the button press, guarded by a 1–10 s split lockout, and merged back with lossless heart-rate samples on an undo.</dd>
              </div>
            </dl>
          </section>

          {/* 8 ─ References */}
          <section id="refs">
            <h2>
              <b>8</b> References
            </h2>
            <ol className={styles.refs}>
              {REFS.map((r) => (
                <li key={r.id} id={`ref-${r.id}`}>
                  {r.text}{' '}
                  {r.href ? (
                    <a href={r.href} target="_blank" rel="noopener">
                      {r.where}
                    </a>
                  ) : null}
                </li>
              ))}
            </ol>
            <p className={styles.small}>
              This page explains how the apps work. Training advice is general, not medical: stop
              if something hurts, and a VO2max estimate from a watch is not a clinical measurement.
            </p>
            <Link href="/una" className={styles.btn}>
              ← Back to the X family
            </Link>
          </section>
        </main>
      </div>

      <footer className={styles.footer}>
        <p>
          The X family are independent apps for UNA Watch, made by <a href={HYBRIDX_URL}>HybridX</a>. They
          are not made, endorsed or sponsored by UNA Watch Ltd. UNA and UNA Watch are trademarks of
          UNA Watch Ltd.
        </p>
      </footer>
    </div>
  );
}
