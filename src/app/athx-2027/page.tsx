import type { Metadata } from 'next';
import styles from './athx.module.css';
import EnduranceCalculator from '@/components/athx/EnduranceCalculator';
import AthxGuideForm from '@/components/athx/AthxGuideForm';

/*
 * The ATHX 2027 pre-launch funnel.
 *
 * A capture page for two training books that are not on sale yet. Every section
 * either builds credibility or moves the visitor toward the form, and there are
 * exactly two things on offer:
 *
 *   - the pacing calculator, ungated, which proves in about four seconds that
 *     whoever built this understands the sport;
 *   - the one-page guide, gated, which is what the visitor actually wants.
 *
 * The split is load-bearing. Gating the calculator would cost the credibility
 * that makes the form worth filling in.
 *
 * Deliberately standalone: no site header, no site footer, its own CSS module
 * and its own footer with the disclaimer. That is partly design — the page has
 * to look like the printed books rather than like the rest of hybridx.club —
 * and partly caution: ATHX is a live trademarked competition brand, and a
 * commercial landing page for an unofficial product should carry a disclaimer
 * and name no other competition.
 */

const PATH = '/athx-2027';
const TITLE = 'The run that doesn’t count | ATHX 2027 pacing';
const DESCRIPTION =
  'The ATHX Endurance Zone gives you 24 minutes and only the ski metres score. Work out your own number with a free pacing calculator, and take the one-page guide to ATHX.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // The site-wide keyword list is overridden rather than inherited: this page
  // names no other competition, and inheriting a list that does would undo
  // that at the level of the document head.
  keywords: [
    'athx',
    'athx 2027',
    'athx training',
    'athx endurance zone',
    'athx pacing',
    'athx scoring',
    'athx london 2027',
    'skierg pacing',
  ],
  alternates: { canonical: `https://hybridx.club${PATH}` },
  openGraph: {
    title: 'The run that doesn’t count',
    description: DESCRIPTION,
    type: 'website',
    url: `https://hybridx.club${PATH}`,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The run that doesn’t count',
    description: DESCRIPTION,
  },
};

const ZONE_CARDS = [
  {
    number: '01',
    heading: 'Rank, not raw numbers',
    body: 'Your score is the sum of three placings, lowest total wins. An athlete who wins two zones and finishes 40th in the third scores 42. One who goes 12th, 14th, 15th scores 41 and beats them.',
  },
  {
    number: '02',
    heading: 'A miss costs half',
    body: 'The deadlift score averages two one-minute windows. A missed window contributes zero, so opening at a personal best risks half the component, and can drop your Strength placing by dozens of positions.',
  },
  {
    number: '03',
    heading: 'Don’t cut weight',
    body: 'Every zone is scored in absolute terms. Nothing is divided by your bodyweight, and the only place mass costs you is a run that doesn’t score.',
  },
];

export default function AthxFunnelPage() {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#main">
        Skip to content
      </a>

      <main id="main">
        {/* ── 5.1 Hero ──────────────────────────────────────────────── */}
        <header className={styles.hero}>
          <div className={styles.container}>
            <div className={styles.heroGrid}>
              <div>
                <p className={styles.eyebrow}>HybridX Club · ATHX 2027</p>
                <h1 className={styles.h1}>The run that doesn’t count.</h1>
                <p className={styles.standfirst}>
                  The ATHX Endurance Zone gives you 24 minutes. Only the ski metres score. Most
                  athletes pace it wrong, and the maths says so.
                </p>
                <p className={styles.caption}>
                  Scroll for the free pacing calculator. No email needed for that one.
                </p>
              </div>

              <AthxGuideForm
                placement="hero"
                label="Get the one-page guide to ATHX"
                support="What it is, how the three zones work, how the scoring actually adds up, and the 2027 UK dates."
              />
            </div>
          </div>
        </header>

        {/* ── 5.2 The problem ───────────────────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.container}>
            <h2 className={styles.h2}>One trade, not two events</h2>
            <hr className={styles.rule} />
            <p className={`${styles.body} ${styles.lead}`}>
              ATHX splits into three scored zones across two and a half hours. The Endurance Zone
              is twenty-four minutes: a 3 km run, then maximum distance on the SkiErg.
            </p>
            <p className={styles.body}>Only the ski distance scores. The run is a buy-in.</p>
            <p className={styles.body}>
              Which means it isn’t two events. It’s one trade — every second spent running is a
              second not spent scoring. And unlike most pacing questions, this one has an exact
              answer.
            </p>
          </div>
        </section>

        {/* ── 5.3 The calculator ────────────────────────────────────── */}
        <section className={`${styles.section} ${styles.panelSection}`} id="calculator">
          <div className={styles.container}>
            <h2 className={styles.h2}>Work out your own number</h2>
            <hr className={styles.rule} />
            <p className={styles.body} style={{ marginBottom: 32 }}>
              Set your run pace and your ski pace. The model does the rest.
            </p>
            <EnduranceCalculator />
          </div>
        </section>

        {/* ── 5.4 Why this matters more than it looks ───────────────── */}
        <section className={styles.band}>
          <div className={styles.container}>
            <p className={styles.eyebrow}>Why this matters more than it looks</p>
            <div className={styles.bigNumberRow}>
              <p className={styles.bigNumber}>187m</p>
              <p className={styles.bigNumberNote}>
                What fifteen seconds per kilometre is worth at a 2:00/500m ski pace. Three
                kilometres, forty-five seconds, and every one of them buys ski distance.
              </p>
            </div>
            <div className={styles.callout}>
              <p>
                Run 15 s/km slower to arrive fresher and you’d need to ski 8% faster just to break
                even. Nobody achieves that. The standard advice to start easy is a scoring error.
              </p>
            </div>
          </div>
        </section>

        {/* ── 5.5 It isn't just the Endurance Zone ──────────────────── */}
        <section className={styles.section}>
          <div className={styles.container}>
            <h2 className={styles.h2}>It isn’t just the Endurance Zone</h2>
            <hr className={styles.rule} />
            <div className={styles.cards}>
              {ZONE_CARDS.map((card) => (
                <article className={styles.card} key={card.number}>
                  <p className={styles.cardNumber}>{card.number}</p>
                  <h3 className={styles.h3}>{card.heading}</h3>
                  <p>{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5.6 What's coming ─────────────────────────────────────── */}
        <section className={`${styles.section} ${styles.panelSection}`}>
          <div className={styles.container}>
            <h2 className={styles.h2}>What’s coming</h2>
            <hr className={styles.rule} />
            <p className={styles.body}>
              Half the book explains the event. Half is the plan — every day carrying the session,
              what to eat around it, what to drink, how to recover from it, and one thing worth
              knowing.
            </p>

            <div className={styles.editions}>
              <article className={`${styles.edition} ${styles.editionMens}`}>
                <div
                  className={styles.cover}
                  role="img"
                  aria-label="Men’s Edition cover: a black book with ATHX in white, 2027 in orange, and an orange stripe down the right-hand edge."
                >
                  <span className={styles.coverStripe} aria-hidden="true" />
                  <p className={styles.coverTitle} aria-hidden="true">
                    ATHX
                  </p>
                  <p className={styles.coverYear} aria-hidden="true">
                    2027
                  </p>
                  <p className={styles.coverEdition} aria-hidden="true">
                    Men’s Edition
                  </p>
                </div>
                <h3 className={styles.editionName}>Men’s Edition</h3>
                <p className={styles.editionMeta}>154 pages</p>
                <p className={styles.spec}>
                  7 × 10 in · 12-week plan · 84 daily pages · Lite, ATHX and Pro loadings
                </p>
              </article>

              <article className={`${styles.edition} ${styles.editionWomens}`}>
                <div
                  className={styles.cover}
                  role="img"
                  aria-label="Women’s Edition cover: a black book with ATHX in white, 2027 in purple, and a purple stripe down the right-hand edge."
                >
                  <span className={styles.coverStripe} aria-hidden="true" />
                  <p className={styles.coverTitle} aria-hidden="true">
                    ATHX
                  </p>
                  <p className={styles.coverYear} aria-hidden="true">
                    2027
                  </p>
                  <p className={styles.coverEdition} aria-hidden="true">
                    Women’s Edition
                  </p>
                </div>
                <h3 className={styles.editionName}>Women’s Edition</h3>
                <p className={styles.editionMeta}>156 pages · cycle-integrated block structure</p>
                <p className={styles.spec}>
                  7 × 10 in · 12-week plan · 84 daily pages · Lite, ATHX and Pro loadings
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* ── 5.7 Timing ────────────────────────────────────────────── */}
        <section className={styles.band}>
          <div className={styles.container}>
            <p className={styles.eyebrow}>Timing</p>
            <div className={styles.bigNumberRow}>
              <p className={styles.bigNumber}>12</p>
              <p className={styles.bigNumberNote}>
                Weeks in the build. ATHX London is 23–24 January 2027, so a twelve-week block
                starts in early November. If you’re targeting London, that’s when you need the
                plan.
              </p>
            </div>
          </div>
        </section>

        {/* ── 5.8 Final capture ─────────────────────────────────────── */}
        <section className={styles.section} id="guide">
          <div className={styles.container}>
            <div className={styles.heroGrid}>
              <div>
                <h2 className={styles.h2}>Still working out whether it’s for you?</h2>
                <hr className={styles.rule} />
                <p className={styles.body}>
                  Take the one-page guide. It covers the format, the scoring, and the 2027 UK
                  dates, and it will tell you in about three minutes whether ATHX is worth your
                  winter.
                </p>
              </div>

              <AthxGuideForm
                placement="footer"
                label="Get the one-page guide to ATHX"
                support="One page, no fluff. We email you the download link, then one more email when the plans launch."
              />
            </div>
          </div>
        </section>
      </main>

      {/* ── 5.9 Footer ──────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <p className={styles.wordmark}>
            HYBRID<span>X</span> CLUB
          </p>
          <p className={styles.caption}>hybridx.club</p>

          <div className={styles.footerLinks}>
            <a href="/privacy-policy">Privacy notice</a>
            <a href="/">HybridX Club</a>
          </div>

          {/* Not optional. ATHX is a live trademarked competition brand and
              these books are an independent product. */}
          <p className={styles.legal}>
            Unofficial and independently produced. Not affiliated with or endorsed by ATHX Games.
          </p>
        </div>
      </footer>
    </div>
  );
}
