import type { Metadata } from 'next';
import styles from './athx.module.css';
import EnduranceCalculator from '@/components/athx/EnduranceCalculator';
import AthxGuideForm from '@/components/athx/AthxGuideForm';
import {
  ATHX_EUROPE_CITIES,
  ATHX_FAQS,
  ATHX_TOTAL_WORKING_MINUTES,
  ATHX_UK_DATES,
  ATHX_ZONES,
} from '@/lib/athx-content';
import {
  createArticleSchema,
  createBreadcrumbSchema,
  createFAQSchema,
  createSpeakableSchema,
  createWebApplicationSchema,
} from '@/lib/seo';

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
 * The page sells ATHX before it sells the pacing insight. Earlier versions
 * opened straight into the Endurance Zone — a hook that lands hard on somebody
 * who already knows what ATHX is, and lands on nothing for the reader who
 * doesn't, which is most of the search and AI traffic this page exists to earn.
 * So the order is: what ATHX actually is, how the day works, all three zones,
 * how scoring works — and only then the one zone with an exact pacing answer.
 * Everything in that explainer is traceable to lib/athx-content.ts, which is
 * itself traceable to the guide (private/what-is-athx.pdf). Nothing here should
 * be written from impression; if a fact isn't in that guide, it doesn't belong
 * on this page.
 *
 * Deliberately standalone: no site header, no site footer, its own CSS module
 * and its own footer with the disclaimer. That is partly design — the page has
 * to look like the printed books rather than like the rest of hybridx.club —
 * and partly caution: ATHX is a live trademarked competition brand, and a
 * commercial landing page for an unofficial product should carry a disclaimer
 * and name no other competition. That second constraint is why the page never
 * writes the word most readers would use to compare it to something else —
 * comparative editorial is fine on social, and inviting on a commercial landing
 * page is not — and instead gestures at "a hybrid or functional fitness
 * competition" wherever that comparison is genuinely useful to a reader who has
 * done one before.
 */

const PATH = '/athx-2027';

const TITLE = 'What Is ATHX? Zones, Scoring & 2027 UK Dates';
const DESCRIPTION =
  'What is ATHX? The adidas-backed hybrid competition explained: three zones, real scoring rules, 2027 UK dates, and a free pacing calculator.';
const HOOK_TITLE = 'Three zones. One score. No hiding a weak one.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // The site-wide keyword list is overridden rather than inherited: this page
  // names no other competition, and inheriting a list that does would undo
  // that at the level of the document head. Drawn from the questions this page
  // actually answers, in the phrasing somebody would type or ask.
  keywords: [
    'what is athx',
    'athx',
    'athx 2027',
    'athx competition',
    'athx explained',
    'athx zones',
    'athx scoring',
    'athx strength zone',
    'athx endurance zone',
    'athx metcon x',
    'athx vs other hybrid competitions',
    'athx london 2027',
    'athx uk dates 2027',
    'athx glasgow',
    'athx dublin',
    'athx birmingham',
    'athx liverpool',
    'is athx worth it',
    'athx training plan',
    'athx pacing calculator',
    'skierg pacing calculator',
    'hybrid fitness competition',
    'adidas hybrid competition',
  ],
  alternates: { canonical: `https://hybridx.club${PATH}` },
  openGraph: {
    title: HOOK_TITLE,
    description: DESCRIPTION,
    type: 'website',
    url: `https://hybridx.club${PATH}`,
  },
  twitter: {
    card: 'summary_large_image',
    title: HOOK_TITLE,
    description: DESCRIPTION,
  },
};

// ── Structured data ─────────────────────────────────────────────────────────
//
// Built from the same content module the page renders from (see the file
// header), so the JSON-LD and the visible page cannot say different things —
// the classic way structured data quietly goes stale is a second, hand-typed
// copy of a fact that the page itself later changes.

const articleSchema = createArticleSchema({
  title: TITLE,
  description: DESCRIPTION,
  url: PATH,
  datePublished: '2026-08-30',
  // Overrides the site's Hyrox-flavoured default. Naming this page's real
  // subject rather than inheriting a topic array built for a different one.
  about: [
    { '@type': 'Thing', name: 'ATHX' },
    { '@type': 'Thing', name: 'Hybrid Fitness Competition' },
    { '@type': 'Thing', name: 'Functional Fitness' },
  ],
});

const faqSchema = createFAQSchema(ATHX_FAQS as unknown as { question: string; answer: string }[]);

const breadcrumbSchema = createBreadcrumbSchema([
  { name: 'Home', url: '/' },
  { name: 'ATHX 2027', url: PATH },
]);

const toolSchema = createWebApplicationSchema({
  name: 'ATHX Endurance Zone Pacing Calculator',
  description:
    'Free interactive calculator that works out ski distance and the exact pacing trade-off between the run and the SkiErg in the ATHX Endurance Zone.',
  url: `${PATH}#calculator`,
  keywords: ['athx pacing calculator', 'athx endurance zone', 'skierg pacing'],
});

// Marks the sections worth reading aloud or extracting whole — the direct
// "what is ATHX" answer and the FAQ — for voice assistants and AI answer
// engines that support SpeakableSpecification.
const speakableSchema = createSpeakableSchema(['h1', '#what-is-athx', '#faq']);

const INSIGHT_CARDS = [
  {
    number: '01',
    heading: 'A genuine one-rep max',
    body: 'The Strength zone opens with a one-rep max shoulder to overhead, then a two-rep back squat and a three-rep deadlift — with your warm-up inside the same fifteen-minute clock. Most hybrid racing never asks for a true 1RM. This does, and it comes early.',
  },
  {
    number: '02',
    heading: 'The finisher is a straight race',
    body: 'MetCon X closes the day: row, dumbbell ground to overhead, dumbbell bench press, sandbag squats, a 30 m sandbag carry, burpees over a bench, then row again — capped at twenty-five minutes. Unlike Strength or Endurance, it’s scored purely on time taken to finish.',
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
      {/*
        Plain <script> tags, deliberately not next/script.

        next/script's default strategy ("afterInteractive") inserts the tag
        into the DOM after hydration — a browser or a crawler that executes
        JavaScript (Googlebot included) sees it, but a crawler that only
        fetches raw HTML does not. A meaningful share of AI crawlers fetch raw
        HTML only, which would make every fact in this JSON-LD invisible to
        exactly the audience "optimise for AI" is asking to reach. A plain
        script element in a Server Component's output is static HTML from the
        first byte, so this is the shape Next's own docs recommend for JSON-LD
        specifically — data to parse, not code that needs a loading strategy.
      */}
      <script
        id="athx-article-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        id="athx-faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        id="athx-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        id="athx-tool-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(toolSchema) }}
      />
      <script
        id="athx-speakable-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableSchema) }}
      />

      <a className={styles.skipLink} href="#main">
        Skip to content
      </a>

      <main id="main">
        {/* ── Hero ──────────────────────────────────────────────────── */}
        <header className={styles.hero}>
          <div className={styles.container}>
            <div className={styles.heroGrid}>
              <div>
                <p className={styles.eyebrow}>HybridX Club · ATHX 2027</p>
                <h1 className={styles.h1}>{HOOK_TITLE}</h1>
                <p className={styles.standfirst}>
                  ATHX is the hybrid fitness competition backed by adidas — three judged zones in
                  one session, ranked on placings rather than raw numbers, in more than twenty
                  European cities for 2027. Here&rsquo;s what actually happens on the day, and the
                  one pacing call in the Endurance Zone that quietly decides who wins.
                </p>
                <p className={styles.caption}>
                  Scroll for the full breakdown — the pacing calculator further down needs no
                  email either.
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

        {/* ── What is ATHX? ─────────────────────────────────────────── */}
        <section className={styles.section} id="what-is-athx">
          <div className={styles.container}>
            <h2 className={styles.h2}>What is ATHX?</h2>
            <hr className={styles.rule} />

            <p className={`${styles.body} ${styles.lead}`}>
              ATHX is a hybrid fitness competition. It started in the UK in 2023, it&rsquo;s
              backed by adidas, and by 2027 it runs in more than twenty cities across Europe —
              five of them in the UK and Ireland.
            </p>
            <p className={styles.body}>
              You&rsquo;re at the venue for about two and a half hours, completing three judged
              zones with recovery between them. You are not racing continuously from a gun to a
              finish line.
            </p>

            <div className={styles.bigNumberRow}>
              <p className={styles.bigNumber}>{ATHX_TOTAL_WORKING_MINUTES}</p>
              <p className={styles.bigNumberNote}>
                Minutes of actual working time. The rest of the two and a half hours at the venue
                is recovery and transition between zones.
              </p>
            </div>

            <p className={styles.body}>
              If you&rsquo;ve done a hybrid or functional fitness competition before, a lot of
              ATHX will be familiar. The shape of the day is different enough that it&rsquo;s
              worth understanding properly before you enter one — which is what the rest of this
              page, and the guide below, are for.
            </p>

            <div className={styles.tableWrap}>
              <table className={`${styles.table} ${styles.zoneTable}`}>
                <caption>The three ATHX zones</caption>
                <thead>
                  <tr>
                    <th scope="col">Zone</th>
                    <th scope="col">Time</th>
                    <th scope="col">What you do</th>
                    <th scope="col">How it&rsquo;s scored</th>
                  </tr>
                </thead>
                <tbody>
                  {ATHX_ZONES.map((zone) => (
                    <tr key={zone.id}>
                      <th scope="row">{zone.name}</th>
                      <td>{zone.time}</td>
                      <td>{zone.whatYouDo}</td>
                      <td>{zone.scoring}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className={styles.h3} style={{ marginTop: 40 }}>
              How the scoring works
            </h3>
            <p className={styles.body}>
              Each zone gives you a placing rather than a raw number. Your final score is the sum
              of the three placings, and the lowest total wins. Winning a zone outright is worth
              one point, whether you take it by four metres or forty — a bad zone tends to cost
              you more than a good one gains.
            </p>
            <div className={styles.callout}>
              <p>
                An athlete who wins two zones and finishes 40th in the third scores 42. One who
                goes 12th, 14th and 15th scores 41 — and beats them.
              </p>
            </div>

            <p className={styles.body} style={{ marginTop: 32 }}>
              Two of the three zones you figure out by racing them. The third — Endurance — has an
              exact right answer, and almost nobody uses it.
            </p>
          </div>
        </section>

        {/* ── One trade, not two events ──────────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.container}>
            <h2 className={styles.h2}>One trade, not two events</h2>
            <hr className={styles.rule} />
            <p className={`${styles.body} ${styles.lead}`}>
              In the Endurance Zone, only the ski distance scores. The 3 km run is a buy-in —
              however fast or slow you run it, the run itself is worth nothing.
            </p>
            <p className={styles.body}>
              Which means it isn&rsquo;t two events. It&rsquo;s one trade — every second spent
              running is a second not spent scoring. And unlike most pacing questions, this one
              has an exact answer.
            </p>
          </div>
        </section>

        {/* ── The calculator ────────────────────────────────────────── */}
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

        {/* ── Why this matters more than it looks ───────────────────── */}
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

        {/* ── Three things worth knowing ─────────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.container}>
            <h2 className={styles.h2}>Three things worth knowing before you sign up</h2>
            <hr className={styles.rule} />
            <div className={styles.cards}>
              {INSIGHT_CARDS.map((card) => (
                <article className={styles.card} key={card.number}>
                  <p className={styles.cardNumber}>{card.number}</p>
                  <h3 className={styles.h3}>{card.heading}</h3>
                  <p>{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── What's coming ─────────────────────────────────────────── */}
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

        {/* ── Timing ─────────────────────────────────────────────────── */}
        <section className={styles.band}>
          <div className={styles.container}>
            <p className={styles.eyebrow}>Timing</p>
            <div className={styles.bigNumberRow}>
              <p className={styles.bigNumber}>12</p>
              <p className={styles.bigNumberNote}>
                Weeks in the build. If you&rsquo;re targeting London — the earliest UK date,
                23&ndash;24 January — a twelve-week block starts in early November.
              </p>
            </div>

            <dl className={styles.dateList}>
              {ATHX_UK_DATES.map((date) => (
                <div className={styles.dateRow} key={date.city}>
                  <dt className={styles.dateCity}>{date.city}</dt>
                  <dd className={styles.dateValue}>{date.dates}</dd>
                </div>
              ))}
            </dl>
            <p className={styles.caption} style={{ marginTop: 16 }}>
              Plus more than twenty other cities across Europe in 2027, including{' '}
              {ATHX_EUROPE_CITIES.join(', ')}.
            </p>
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────────────────── */}
        <section className={styles.section} id="faq">
          <div className={styles.container}>
            <h2 className={styles.h2}>Questions people ask about ATHX</h2>
            <hr className={styles.rule} />
            <div className={styles.faqList}>
              {ATHX_FAQS.map((faq) => (
                <details className={styles.faqItem} key={faq.question}>
                  <summary className={styles.faqQuestion}>
                    <span>{faq.question}</span>
                    <span className={styles.faqIndicator} aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p className={styles.faqAnswer}>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final capture ──────────────────────────────────────────── */}
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

      {/* ── Footer ─────────────────────────────────────────────────── */}
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
