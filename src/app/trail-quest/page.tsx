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
import { pixel } from '@/components/trailquest/fonts';
import { SPIRIT_COUNT } from '@/components/trailquest/data';
import HeroWatch from '@/components/trailquest/HeroWatch';
import RidgeScene from '@/components/trailquest/RidgeScene';
import DuelDemo from '@/components/trailquest/DuelDemo';
import FieldGuide from '@/components/trailquest/FieldGuide';
import Screen from '@/components/trailquest/Screen';
import Sprite from '@/components/trailquest/Sprite';
import styles from './trailquest.module.css';

/*
 * hybridx.club/trail-quest: the page for Trail Quest, the turn-based
 * trail-running adventure for UNA Watch (trailquest/ in the watch repo).
 *
 * The fifth sibling, after Race, Streak, Trail and X Weigh-in. It shares the
 * HybridX mark, the watch render, the UNA section and the footer
 * (components/una-app/), and takes its look from the game: Press Start 2P,
 * the navy outline, the display's colour grid, stepped animation. Where the
 * others show a tool working, this one lets you play: the hero runs the
 * Ridge stage by stage, the centrepiece is a duel with the Red Fox, and the
 * field guide holds every spirit in the game, drawn from the game's own art.
 *
 * Honesty constraints:
 *   - Version 1.0.0 is finished and its App ID issued; whether the listing is
 *     live is not known here, so the page says "for UNA Watch" and "in the
 *     UNA app store" only as where to find it, never "download now". When it
 *     is live, say so in the hero pill.
 *   - Watch screens are the game's own, from the UNA simulator. The sprites
 *     are exported from Tools/Art/gen_art.py. The duel is drawn by the page
 *     and says it is a cut-down version (DuelDemo.tsx lists what is real).
 *   - Claims follow SUBMISSION.md's checked store text; its "not claimed"
 *     list stays unclaimed (no Daily Trail, rare spirits or link to running
 *     data). Needs firmware 1.6 or newer.
 *   - The watch render carries UNA's logo: permission needed before launch,
 *     as for the other pages.
 *   - No subdomain yet, so the canonical is this path, as for /weigh-in.
 */

const URL_CANONICAL = 'https://hybridx.club/trail-quest';

const TITLE = 'Trail Quest — a trail-running adventure for UNA Watch';
const DESCRIPTION =
  'A turn-based trail-running game for UNA Watch. Cross five stages from the valley to the summit, choose your way at every fork, and beat the Trail Spirits with a well-timed press. By HybridX.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    'trail quest',
    'una watch',
    'una watch app',
    'una watch game',
    'smartwatch game',
    'trail running game',
    'running game watch',
    'pixel art watch game',
  ],
  alternates: { canonical: URL_CANONICAL },
  openGraph: {
    title: 'Trail Quest for UNA Watch',
    description: DESCRIPTION,
    type: 'website',
    url: URL_CANONICAL,
    siteName: 'HybridX',
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trail Quest for UNA Watch',
    description: DESCRIPTION,
  },
};

const appSchema = {
  '@context': 'https://schema.org',
  '@type': 'VideoGame',
  name: 'Trail Quest',
  genre: ['Adventure', 'Turn-based'],
  gamePlatform: 'UNA Watch',
  applicationCategory: 'GameApplication',
  operatingSystem: 'UNA Watch',
  description: DESCRIPTION,
  url: URL_CANONICAL,
  publisher: { '@type': 'Organization', name: 'HybridX', url: HYBRIDX_URL },
};

const STATS = [
  { n: '5', label: 'stages, valley to summit' },
  { n: String(SPIRIT_COUNT), label: 'Trail Spirits to meet' },
  { n: '5', label: 'bosses, one a stage' },
  { n: '13', label: 'buzz patterns you can feel' },
];

const LOOP = [
  {
    screen: 'q3-11-map',
    alt: 'The stage map at 06:00: paths between a spirit, a hut, a cache and the boss. Woods path is chosen: a spirit lies that way.',
    title: 'Choose your way',
    body: 'Each stage is a map of forks. The watch tells you what lies down each path: a spirit, a hazard, a hut, supplies, or nothing at all. The short way, or the detour to the hut?',
  },
  {
    screen: 'q3-16-duel-beat',
    alt: 'A duel with the Sand Crab: Skill chosen, and the timing bar with the needle running towards the green.',
    title: 'Time your press',
    body: 'Pick a move, then press as the needle crosses the green. Perfect hits hard, a miss barely lands. The needle speeds up through the stages, and you can turn it off.',
  },
  {
    screen: 'q3-33-boss-intro',
    alt: 'The Old Tortoise boss card: guards the valley’s end. Has never once hurried.',
    title: 'Beat the boss',
    body: 'Every stage ends with one. Bosses tell you before they charge or guard, so you can brace or hold your best move. Beat it and the next stage opens.',
  },
];

const ADVICE = [
  { tag: 'Energy', line: 'Running low? Take a Gel before you hit the wall.', sprite: 'bear' },
  { tag: 'Cramp', line: 'Cramp slows you: take a Salt tab. Drained: Water.', sprite: 'gnat_swarm' },
  { tag: 'The climb', line: 'Steep. Pace it, save energy.', sprite: 'great_stag', boss: true },
  { tag: 'Scree', line: 'Loose rock. Short steps, eyes ahead.', sprite: 'rock_goat' },
  { tag: 'The ridge', line: 'Wind and drops. Keep a short, low stride.', sprite: 'wind_sprite' },
  { tag: 'The dark', line: 'Doubt in the dark. Slow your breathing.', sprite: 'barn_owl' },
];

const BAG = [
  { name: 'Gel', body: 'Plus 15 stamina. Take it before the wall, not after.' },
  { name: 'Water', body: 'Plus 8, and it clears a drain.' },
  { name: 'Salt tab', body: 'Plus 4, and it ends cramp.' },
  { name: 'Poles', body: 'More Form for the rest of the duel. Good on rock.' },
  { name: 'Headtorch', body: 'Kept for good. The clock runs through the day, and night is dark without one.' },
];

const KNOW = [
  { title: 'Your pack', body: 'Beat a spirit and it may ask to join you. Carry up to three, and play their moves in a duel.' },
  { title: 'Fatigue carries over', body: 'Your stamina goes from one fight to the next. A hut fills it back up; the trail gives you a breather.' },
  { title: 'The second lap', body: 'Reach the summit and run the Ridge again. Same valley, tougher spirits.' },
  { title: 'Saved as you go', body: 'Saved after every step. Close it on the map, and it opens right where you left it.' },
  { title: 'Felt, not just seen', body: 'Thirteen buzz patterns, each one different on the wrist, and short jingles: good news rises, bad news falls.' },
  { title: 'Stays on your watch', body: 'Nothing goes to your phone or to Strava, and a game is never logged as a workout.' },
];

const GALLERY = [
  { screen: 'q3-02-story-ridge', title: 'The opening', caption: 'Five stages from valley to summit. You, in new shoes.' },
  { screen: 'q3-17-duel-verdict', title: 'GOOD', caption: 'Every press is judged: PERFECT, GOOD or MISS.' },
  { screen: 'q4-skill-1-list-best', title: 'Your partners', caption: 'Pick whose move to play. The Red Fox’s Pounce.' },
  { screen: 'q3-20-offer', title: 'Joins you?', caption: 'The Sand Crab asks to come along.' },
  { screen: 'q3-24-hut', title: 'Valley hut', caption: 'Rested. Stamina full.' },
  { screen: 'q4-eagle-4-tell', title: 'It dives!', caption: 'A boss warns you. Settle to brace.' },
  { screen: 'q3-37-stage-clear', title: 'Well run', caption: 'Valley Path cleared, three duels won.' },
  { screen: 'finale', title: 'The summit', caption: 'Lap 1 done. Then run it again, harder.' },
];

export default function TrailQuestPage() {
  return (
    <div id="top" className={`${base.page} ${styles.theme} ${pixel.variable}`}>
      <script
        id="trailquest-app-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
      />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className={base.nav}>
        <div className={base.navInner}>
          <a href="#top" className={base.brand} aria-label="Trail Quest for UNA Watch, back to top">
            <Wordmark app="Trail Quest" />
          </a>
          <nav className={base.navLinks} aria-label="Page">
            <a href="#play">How it plays</a>
            <a href="#duel">Try a duel</a>
            <a href="#spirits">The spirits</a>
            <a href="#una">UNA Watch</a>
          </nav>
          <a href={UNA_URL} className={base.navCta} target="_blank" rel="noopener">
            Meet UNA <Arrow />
          </a>
        </div>
      </header>

      <main>
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className={styles.hero}>
          <div className={`${base.container} ${styles.heroGrid}`}>
            <div>
              <p className={styles.pill}>
                <span className={styles.pillDot} aria-hidden="true" />A game for UNA Watch
              </p>
              <h1 className={styles.h1}>
                Run the Ridge.
                <span>On your wrist.</span>
              </h1>
              <p className={styles.lead}>
                Trail Quest is a pixel-art trail-running adventure you play on your watch, a few
                buttons at a time. Five stages from the valley floor to a snowy summit. Pick your
                route at every fork, take on the Trail Spirits in short duels, and decide when to eat
                your last Gel.
              </p>
              <div className={base.ctaRow}>
                <a href="#duel" className={styles.btnPixel}>
                  Play a duel now
                </a>
                <a href={UNA_URL} className={base.btnGhost} target="_blank" rel="noopener">
                  Discover UNA Watch <Arrow />
                </a>
              </div>
            </div>
            <div className={styles.heroWatch}>
              <HeroWatch />
            </div>
          </div>
        </section>

        <RidgeScene />

        {/* ── The numbers ───────────────────────────────────────────────── */}
        <section className={styles.stats} aria-label="Trail Quest in numbers">
          <ul className={base.container}>
            {STATS.map((s) => (
              <li key={s.label}>
                <strong>{s.n}</strong>
                <span>{s.label}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── How it plays ──────────────────────────────────────────────── */}
        <section id="play" className={styles.section}>
          <div className={base.container}>
            <div className={styles.head}>
              <p className={styles.kicker}>How it plays</p>
              <h2 className={styles.h2}>
                Map, duel, boss. <em>Then the next stage.</em>
              </h2>
              <p className={styles.sectionLead}>
                It is turn-based, so you play at your own speed: on the sofa, on the train, or
                stretching after a long run. A stage takes a few minutes.
              </p>
            </div>
            <ol className={styles.loop}>
              {LOOP.map((s, i) => (
                <li key={s.title} className={base.reveal}>
                  <span className={styles.loopN}>{i + 1}</span>
                  <Screen name={s.screen} alt={s.alt} size={230} />
                  <h3 className={styles.h3}>{s.title}</h3>
                  <p>{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── The duel ──────────────────────────────────────────────────── */}
        <section id="duel" className={`${styles.section} ${styles.duelSection}`}>
          <div className={base.container}>
            <div className={styles.head}>
              <p className={styles.kicker}>Try a duel</p>
              <h2 className={styles.h2}>
                The Red Fox is a stitch. <em>Beat it.</em>
              </h2>
              <p className={styles.sectionLead}>
                Choose a move, then press when the needle is in the green. Faster moves hit harder
                but give you less time. Moves follow a wheel: <strong>Pace</strong> beats{' '}
                <strong>Form</strong>, Form beats <strong>Grit</strong>, Grit beats Pace. The fox is
                all Pace.
              </p>
            </div>
            <DuelDemo />
            <p className={styles.footnote}>
              A cut-down duel drawn by this page, built on the game’s timing, its wheel and its
              moves. The needle moves at ten frames a second, exactly as on the watch. The real
              thing has partners, more items, weather and bosses that change tactics.
            </p>
          </div>
        </section>

        {/* ── The spirits ───────────────────────────────────────────────── */}
        <section id="spirits" className={styles.section}>
          <div className={base.container}>
            <div className={styles.head}>
              <p className={styles.kicker}>The Trail Spirits</p>
              <h2 className={styles.h2}>
                {SPIRIT_COUNT} creatures. <em>Every one is a bad patch on a run.</em>
              </h2>
              <p className={styles.sectionLead}>
                The fox is a side stitch. The bear is the bonk. The gnats are calf cramp. If you
                have run far, you have met most of them already.
              </p>
            </div>
            <FieldGuide />
          </div>
        </section>

        {/* ── Advice ────────────────────────────────────────────────────── */}
        <section className={styles.section}>
          <div className={base.container}>
            <div className={styles.head}>
              <p className={styles.kicker}>Written by runners</p>
              <h2 className={styles.h2}>
                Advice that works in the game. <em>And on Saturday’s long run.</em>
              </h2>
            </div>
            <ul className={styles.advice}>
              {ADVICE.map((a) => (
                <li key={a.tag} className={base.reveal}>
                  <Sprite id={a.sprite} px={a.boss ? 2.25 : 3} grid={a.boss ? 32 : 24} />
                  <div>
                    <p className={styles.adviceTag}>{a.tag}</p>
                    <p className={styles.adviceLine}>{a.line}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── The bag, and what else to know ────────────────────────────── */}
        <section className={styles.section}>
          <div className={`${base.container} ${styles.split}`}>
            <div>
              <p className={styles.kicker}>In your bag</p>
              <h2 className={styles.h2}>
                Fuel is a decision. <em>Not a button.</em>
              </h2>
              <p className={styles.sectionLead}>
                The bag holds six. Using one in a duel costs you the turn. Caches beside the huts
                restock you, if you take the detour.
              </p>
              <ul className={styles.bag}>
                {BAG.map((b) => (
                  <li key={b.name}>
                    <strong>{b.name}</strong>
                    <span>{b.body}</span>
                  </li>
                ))}
              </ul>
            </div>
            <ul className={styles.know}>
              {KNOW.map((k) => (
                <li key={k.title} className={base.reveal}>
                  <h3 className={styles.h3}>{k.title}</h3>
                  <p>{k.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Screens ───────────────────────────────────────────────────── */}
        <section id="screens" className={styles.section}>
          <div className={base.container}>
            <div className={styles.head}>
              <p className={styles.kicker}>On the watch</p>
              <h2 className={styles.h2}>
                Every pixel, <em>exactly as it looks on UNA.</em>
              </h2>
              <p className={styles.sectionLead}>
                Real screens from the game. One font, chunky sprites, and a word by each button so
                you always know what it does.
              </p>
            </div>
            <ol className={styles.gallery}>
              {GALLERY.map((g) => (
                <li key={g.screen} className={base.reveal}>
                  <Screen name={g.screen} alt={`${g.title}: ${g.caption}`} size={210} />
                  <strong>{g.title}</strong>
                  <span>{g.caption}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <UnaSection
          appName="Trail Quest"
          pitch="a proper game with real buttons, made for the watch you run in."
        />

        {/* ── Final call ────────────────────────────────────────────────── */}
        <section className={styles.final}>
          <div className={`${base.container} ${styles.finalInner}`}>
            <div className={styles.summit} aria-hidden="true">
              <Sprite id="runner" px={5} />
              <Sprite id="summit_wolf" px={4} grid={32} />
            </div>
            <h2 className={styles.finalTitle}>
              The wolf has kept pace <span>since the valley.</span>
            </h2>
            <p className={styles.lead}>
              Trail Quest is for UNA Watch, in the UNA app store. It needs watch firmware 1.6 or newer.
            </p>
            <div className={`${base.ctaRow} ${styles.center}`}>
              <a href={UNA_URL} className={styles.btnPixel} target="_blank" rel="noopener">
                Get UNA Watch <Arrow />
              </a>
              <a href={HYBRIDX_APP_URL} className={base.btnGhost}>
                Train with HybridX
              </a>
            </div>
          </div>
        </section>
      </main>

      <AppFooter appName="Trail Quest" />
    </div>
  );
}
