import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  createFAQSchema,
  createHowToSchema,
  createArticleSchema,
  createBreadcrumbSchema,
  SITE_CONFIG,
  ORGANIZATION_ID,
} from '@/lib/seo';
import EngineLeadForm from '@/components/engine/EngineLeadForm';
import EngineLogo, { EngineX } from '@/components/engine/EngineLogo';
import StandaloneBar from '@/components/StandaloneBar';
import ConsentSettingsButton from '@/components/consent/ConsentSettingsButton';
import Heartbeat from '@/components/engine/Heartbeat';
import Rise from '@/components/engine/Rise';
import StickyCta from '@/components/engine/StickyCta';

import JsonLd from '@/components/JsonLd';
const PAGE_PATH = '/build-a-bigger-engine';

export const metadata: Metadata = {
  title: 'How to Improve VO2max: Free Science Guide',
  description:
    'How to improve VO2max in plain language: intervals, the Norwegian 4x4, the 80/20 rule and a sample week. A free guide for runners and hybrid athletes.',
  keywords: [
    'how to improve vo2max',
    'how to increase vo2max',
    'vo2max training',
    'best way to increase vo2max',
    'how to raise vo2max fast',
    'vo2max guide',
    'free vo2max guide',
    'vo2max intervals',
    'norwegian method',
    '4x4 interval training',
    'what is a good vo2max',
    'can you improve vo2max after 40',
    'how long to improve vo2max',
    'running endurance training',
    'hyrox engine',
    'hybrid training',
  ],
  alternates: { canonical: `${SITE_CONFIG.url}${PAGE_PATH}` },
  openGraph: {
    title: 'Build a Bigger Engine | Free VO2max Guide',
    description:
      'The science of raising your VO2max for running and hybrid performance. The stuff that actually works, in plain language. Free guide.',
    type: 'website',
    url: `${SITE_CONFIG.url}${PAGE_PATH}`,
    images: [
      {
        url: `${SITE_CONFIG.url}/build-a-bigger-engine/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Build a Bigger Engine - free VO2max guide from HybridX',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Build a Bigger Engine | Free VO2max Guide',
    description:
      'The science of raising your VO2max for running and hybrid performance. Free guide, plain language.',
    images: [`${SITE_CONFIG.url}/build-a-bigger-engine/og-image.png`],
  },
};

// ── Shared bits ──────────────────────────────────────────────────────────

function Kicker({ children, tone = 'dark' }: { children: React.ReactNode; tone?: 'dark' | 'light' }) {
  return (
    <p
      className={`font-archivo font-bold uppercase text-[13px] sm:text-sm mb-3 ${
        tone === 'dark' ? 'text-engine-heart' : 'text-engine-crimson'
      }`}
      style={{ letterSpacing: '0.2em' }}
    >
      {children}
    </p>
  );
}

function FreePill() {
  return (
    <span
      className="inline-flex items-center rounded-full bg-engine-crimson px-4 py-1.5 font-archivo font-extrabold uppercase text-engine-paper text-xs sm:text-sm"
      style={{ letterSpacing: '0.16em' }}
    >
      Free Guide
    </span>
  );
}

// ── Sections ─────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          'radial-gradient(120% 90% at 85% 0%, rgba(193,18,31,0.45) 0%, rgba(106,16,32,0.25) 35%, rgba(44,7,16,0) 70%), linear-gradient(160deg, #6A1020 0%, #3A0A12 45%, #1C050A 100%)',
      }}
    >
      {/* Faint X watermark */}
      <EngineX
        className="pointer-events-none absolute -bottom-16 -right-10 h-[420px] w-[420px] opacity-[0.06]"
        color="#FBF5EF"
      />

      <div className="container mx-auto max-w-6xl px-6 py-14 sm:py-20 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Copy + form */}
          <div className="relative z-10">
            <Link href="/" aria-label="HybridX home" className="mb-7 inline-block">
              <EngineLogo />
            </Link>
            <div className="mb-5">
              <FreePill />
            </div>

            <h1 className="font-anton uppercase text-engine-paper leading-[0.92] tracking-[0.005em]"
                style={{ fontSize: 'clamp(48px, 9vw, 88px)' }}>
              Build a Bigger
              <br />
              <span className="text-engine-crimson">Engine</span>
            </h1>

            <Heartbeat color="#E63946" animate className="my-6 h-7 w-64 max-w-full" />

            <p className="font-body text-engine-paper/85 max-w-xl mb-8"
               style={{ fontSize: 'clamp(16px, 2.4vw, 19px)', lineHeight: 1.55 }}>
              The science-backed guide to raising your VO2max for running and hybrid
              performance. The latest research, in plain language you can use this week.
            </p>

            <EngineLeadForm formId="hero" placement="hero" variant="dark" className="max-w-xl" />

            <p className="mt-5 font-body text-sm text-engine-paper/60 max-w-xl">
              Join runners and Hyrox athletes building a bigger engine.
            </p>
          </div>

          {/* Guide cover mockup */}
          <div className="relative z-10 flex justify-center lg:justify-end">
            <div
              className="relative"
              style={{ perspective: '1400px' }}
            >
              <div
                className="rounded-xl shadow-2xl ring-1 ring-white/10"
                style={{
                  transform: 'rotateY(-14deg) rotateX(3deg)',
                  transformStyle: 'preserve-3d',
                  boxShadow: '0 40px 80px -20px rgba(0,0,0,0.6)',
                }}
              >
                <Image
                  src="/build-a-bigger-engine/guide-cover.png"
                  alt="Build a Bigger Engine VO2max guide cover"
                  width={1241}
                  height={1754}
                  priority
                  sizes="(max-width: 1024px) 70vw, 380px"
                  className="h-auto w-[260px] sm:w-[320px] lg:w-[380px] rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProofStrip() {
  const stats = [
    { big: '~50%', cap: 'of your VO2max is genetic. The rest is trainable.' },
    { big: '100%', cap: 'worth training, at any level, at any age.' },
    { big: '11', cap: 'pages of cutting edge science in plain language.' },
  ];
  return (
    <section className="bg-engine-paper">
      <div className="container mx-auto max-w-5xl px-6 py-12 sm:py-14">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {stats.map((s) => (
            <Rise
              key={s.big}
              className="rounded-2xl border-t-[3px] border-engine-crimson bg-engine-blush px-6 py-7 text-center"
            >
              <p className="font-anton text-engine-ox leading-none" style={{ fontSize: 'clamp(40px, 7vw, 56px)' }}>
                {s.big}
              </p>
              <p className="mt-3 font-body text-sm text-engine-inkSoft">{s.cap}</p>
            </Rise>
          ))}
        </div>
        {/* Testimonials placeholder: drop real social proof here once available. */}
      </div>
    </section>
  );
}

function ValueTiles() {
  const tiles = [
    { n: '01', t: 'The 3 pillars', d: 'that actually decide your endurance.' },
    { n: '02', t: 'The interval formula', d: 'the newest meta-analyses keep landing on.' },
    { n: '03', t: 'The Norwegian method', d: 'explained for normal humans.' },
    { n: '04', t: 'The hybrid edge', d: 'train strength and engine without the trade-off.' },
    { n: '05', t: 'Free wins', d: 'sleep, heat, and what is genuinely overhyped.' },
    { n: '06', t: 'A full sample week', d: 'you can start on Monday.' },
  ];
  return (
    <section className="bg-engine-paper">
      <div className="container mx-auto max-w-5xl px-6 pb-16 sm:pb-20">
        <Rise className="text-center mb-10">
          <Kicker tone="light">Inside the guide</Kicker>
          <h2 className="font-anton uppercase text-engine-ink leading-[0.95]"
              style={{ fontSize: 'clamp(30px, 5vw, 46px)' }}>
            What you&apos;ll learn
          </h2>
        </Rise>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((tile) => (
            <Rise
              key={tile.n}
              className="rounded-2xl border border-engine-line bg-engine-blush p-6"
            >
              <p className="font-anton text-engine-crimson text-3xl leading-none mb-3">{tile.n}</p>
              <h3 className="font-archivo font-extrabold text-engine-ink text-lg leading-snug">
                {tile.t}
              </h3>
              <p className="mt-1 font-body text-engine-inkSoft">{tile.d}</p>
            </Rise>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Heartbeat color="#C1121F" className="h-6 w-72 max-w-full" />
        </div>
      </div>
    </section>
  );
}

function AuthoritySection() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          'radial-gradient(110% 80% at 10% 0%, rgba(193,18,31,0.35) 0%, rgba(106,16,32,0.2) 35%, rgba(44,7,16,0) 70%), linear-gradient(160deg, #3A0A12 0%, #2C0710 60%, #1C050A 100%)',
      }}
    >
      <EngineX
        className="pointer-events-none absolute -left-16 top-1/2 h-[360px] w-[360px] -translate-y-1/2 opacity-[0.05]"
        color="#FBF5EF"
      />
      <div className="container mx-auto max-w-4xl px-6 py-16 sm:py-20 relative z-10">
        <Rise>
          <Kicker tone="dark">Why your engine matters</Kicker>
          <h2 className="font-anton uppercase text-engine-paper leading-[0.95] mb-6"
              style={{ fontSize: 'clamp(30px, 5vw, 46px)' }}>
            VO2max is performance <span className="text-engine-crimson">and</span> health
          </h2>
          <p className="font-body text-engine-paper/85 mb-4" style={{ fontSize: 'clamp(16px, 2.4vw, 19px)', lineHeight: 1.6 }}>
            A bigger engine means faster run splits and faster recovery between every
            station. It is also one of the strongest predictors of long-term health we
            can measure. The same training that wins races protects your future.
          </p>
          <p className="font-body text-engine-paper/70" style={{ fontSize: 'clamp(16px, 2.4vw, 19px)', lineHeight: 1.6 }}>
            This guide turns that science into training you can actually run. No jargon
            walls, no lab required. Effort-based, and built for real weeks.
          </p>
        </Rise>
      </div>
    </section>
  );
}

function AnswerSection() {
  const sampleWeek = [
    { day: 'Mon', session: 'Easy aerobic', detail: '30 to 45 min genuinely easy. You should be able to hold a conversation.' },
    { day: 'Tue', session: 'VO2max intervals', detail: 'Warm up, then 5 x 3 min hard (3k to 5k effort) with 3 min easy between. 15 min of real quality.' },
    { day: 'Wed', session: 'Strength', detail: 'Lower body and core, kept away from your hard run. Heavy and clean.' },
    { day: 'Thu', session: 'Easy aerobic', detail: '30 to 40 min easy, or full rest if you need it.' },
    { day: 'Fri', session: 'Strength + short run', detail: 'Upper body strength, optional 20 min easy jog.' },
    { day: 'Sat', session: 'Long easy run', detail: '45 to 75 min at an easy, sustainable pace. This builds the aerobic base.' },
    { day: 'Sun', session: 'Rest', detail: 'Full rest or light mobility. Recovery is where the engine grows.' },
  ];

  return (
    <section id="how-to-improve-vo2max" className="bg-engine-paper scroll-mt-20">
      <div className="container mx-auto max-w-3xl px-6 py-16 sm:py-20">
        <Rise>
          <Kicker tone="light">The short answer</Kicker>
          <h2 className="font-anton uppercase text-engine-ink leading-[0.95] mb-6"
              style={{ fontSize: 'clamp(30px, 5vw, 46px)' }}>
            How to improve your VO2max
          </h2>
          <p className="font-body text-engine-ink mb-5" style={{ fontSize: 'clamp(17px, 2.6vw, 20px)', lineHeight: 1.6 }}>
            <strong>
              The fastest way to raise your VO2max is to spend regular time training at or near
              your maximum aerobic effort.
            </strong>{' '}
            One or two interval sessions a week at 90 percent or more of your max heart rate,
            built on a base of easy aerobic running and supported by strength work, will raise
            your VO2max at any age and almost any level. Roughly half of your VO2max is genetic.
            The other half is yours to train.
          </p>
          <p className="font-body text-engine-inkSoft" style={{ fontSize: 'clamp(16px, 2.4vw, 18px)', lineHeight: 1.6 }}>
            VO2max is the maximum amount of oxygen your body can take in and use during hard
            exercise. It is one of the best single predictors of endurance performance, and one
            of the strongest predictors of long-term health we can measure. The good news is that
            the training that raises it is simple and well understood.
          </p>
        </Rise>

        <div className="mt-12 space-y-10">
          <Rise>
            <h3 className="font-archivo font-extrabold text-engine-ink text-xl sm:text-2xl mb-2">
              1. Train at the right intensity
            </h3>
            <p className="font-body text-engine-inkSoft" style={{ fontSize: '17px', lineHeight: 1.6 }}>
              VO2max grows when you spend real time near your ceiling. The protocol most of the
              newest research keeps landing on is straightforward: reps of 3 to 5 minutes, long
              enough to climb high and hold it, with roughly equal work and rest. The goal is to
              accumulate time above 90 percent of your max heart rate. That is where the engine
              adapts.
            </p>
          </Rise>

          <Rise className="rounded-2xl border-l-[3px] border-engine-crimson bg-engine-blush px-6 py-6">
            <p className="font-archivo font-bold uppercase tracking-[0.14em] text-engine-crimson text-xs mb-3">
              The interval formula
            </p>
            <ul className="font-body text-engine-ink space-y-2" style={{ fontSize: '17px', lineHeight: 1.55 }}>
              <li><strong>Reps:</strong> 3 to 5 minutes each, hard but repeatable.</li>
              <li><strong>Rest:</strong> roughly equal to the work interval, easy.</li>
              <li><strong>Target:</strong> 90 percent or more of max heart rate during the reps.</li>
              <li><strong>Volume:</strong> 15 to 20 minutes of total hard time per session.</li>
              <li><strong>Frequency:</strong> once or twice a week, no more.</li>
            </ul>
          </Rise>

          <Rise>
            <h3 className="font-archivo font-extrabold text-engine-ink text-xl sm:text-2xl mb-2">
              2. Use the Norwegian method
            </h3>
            <p className="font-body text-engine-inkSoft" style={{ fontSize: '17px', lineHeight: 1.6 }}>
              The best known VO2max session is the Norwegian 4x4: four reps of 4 minutes at about
              90 to 95 percent of your max heart rate, with 3 minutes of easy recovery between
              each. It is brutally effective and backed by decades of research. The wider
              Norwegian approach also leans on controlled threshold work, but for raising VO2max
              specifically, the 4x4 is the classic place to start.
            </p>
          </Rise>

          <Rise>
            <h3 className="font-archivo font-extrabold text-engine-ink text-xl sm:text-2xl mb-2">
              3. Keep your easy days genuinely easy
            </h3>
            <p className="font-body text-engine-inkSoft" style={{ fontSize: '17px', lineHeight: 1.6 }}>
              The mistake almost everyone makes is running easy days too hard and hard days too
              soft, then living in a grey zone that builds neither. The best endurance athletes go
              about 80 percent genuinely easy and 20 percent genuinely hard. Easy should feel
              almost annoyingly gentle. That easy volume is what lets you hit your intervals hard
              enough to matter.
            </p>
          </Rise>

          <Rise>
            <h3 className="font-archivo font-extrabold text-engine-ink text-xl sm:text-2xl mb-2">
              4. Add strength and stay consistent
            </h3>
            <p className="font-body text-engine-inkSoft" style={{ fontSize: '17px', lineHeight: 1.6 }}>
              Lifting will not kill your engine. Done right, strength and endurance build each
              other: heavier legs make your running more economical, which means you use less
              oxygen at the same pace. Keep hard runs and hard lifts apart, then let consistency
              do the rest. Most people see a noticeable change in 6 to 8 weeks and larger gains
              over a few months.
            </p>
          </Rise>
        </div>

        <Rise className="mt-14">
          <h3 className="font-archivo font-extrabold text-engine-ink text-xl sm:text-2xl mb-2">
            A sample week you could start Monday
          </h3>
          <p className="font-body text-engine-inkSoft mb-6" style={{ fontSize: '16px' }}>
            One VO2max session, plenty of easy aerobic work, two strength sessions, and real
            recovery. This is the shape of a week that builds a bigger engine.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-engine-line">
            <table className="w-full text-left font-body text-sm">
              <thead className="bg-engine-blush">
                <tr>
                  <th className="px-4 py-3 font-archivo font-bold text-engine-ink">Day</th>
                  <th className="px-4 py-3 font-archivo font-bold text-engine-ink">Session</th>
                  <th className="px-4 py-3 font-archivo font-bold text-engine-ink hidden sm:table-cell">Detail</th>
                </tr>
              </thead>
              <tbody>
                {sampleWeek.map((row, i) => (
                  <tr key={row.day} className={i % 2 === 0 ? 'bg-engine-paper' : 'bg-engine-blush/40'}>
                    <td className="px-4 py-3 font-archivo font-bold text-engine-ink whitespace-nowrap">{row.day}</td>
                    <td className="px-4 py-3 text-engine-crimson font-semibold sm:whitespace-nowrap">
                      {row.session}
                      {/* The detail column is hidden below 640 px; it moves under the session instead of being dropped. */}
                      <span className="mt-1 block text-xs font-normal text-engine-inkSoft sm:hidden">{row.detail}</span>
                    </td>
                    <td className="px-4 py-3 text-engine-inkSoft hidden sm:table-cell">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="font-body text-engine-inkSoft mt-4" style={{ fontSize: '15px' }}>
            The full guide explains every piece of this in plain language, with the science behind
            it and how to adjust it for your level.{' '}
            <a href="#get-the-guide" className="text-engine-crimson font-semibold underline">
              Get the free guide
            </a>{' '}
            and put it into your next session.
          </p>
        </Rise>
      </div>
    </section>
  );
}

function PeopleAlsoAsk({ faqs }: { faqs: { question: string; answer: string }[] }) {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          'radial-gradient(110% 80% at 90% 0%, rgba(193,18,31,0.32) 0%, rgba(106,16,32,0.18) 35%, rgba(44,7,16,0) 70%), linear-gradient(160deg, #2C0710 0%, #1C050A 100%)',
      }}
    >
      <div className="container mx-auto max-w-3xl px-6 py-16 sm:py-20 relative z-10">
        <Rise className="mb-8">
          <Kicker tone="dark">People also ask</Kicker>
          <h2 className="font-anton uppercase text-engine-paper leading-[0.95]"
              style={{ fontSize: 'clamp(30px, 5vw, 46px)' }}>
            VO2max questions, answered
          </h2>
        </Rise>
        <div className="space-y-5">
          {faqs.map((faq) => (
            <Rise key={faq.question} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <h3 className="font-archivo font-bold text-engine-paper text-lg mb-2">{faq.question}</h3>
              <p className="font-body text-engine-paper/75" style={{ fontSize: '16px', lineHeight: 1.6 }}>
                {faq.answer}
              </p>
            </Rise>
          ))}
        </div>
      </div>
    </section>
  );
}

function ConversionBand() {
  return (
    <section id="get-the-guide" className="bg-engine-crimson scroll-mt-20">
      <div className="container mx-auto max-w-3xl px-6 py-14 sm:py-16 text-center">
        <Rise>
          <h2 className="font-anton uppercase text-engine-paper leading-[0.95] mb-3"
              style={{ fontSize: 'clamp(28px, 4.6vw, 44px)' }}>
            Get the 11-page guide free
          </h2>
          <p className="font-body text-engine-paper/90 mb-7" style={{ fontSize: 'clamp(16px, 2.4vw, 18px)' }}>
            Delivered to your inbox in seconds.
          </p>
          <EngineLeadForm
            formId="mid"
            placement="mid"
            variant="band"
            className="mx-auto max-w-xl text-left"
          />
        </Rise>
      </div>
    </section>
  );
}

function FaqSection({ faqs }: { faqs: { question: string; answer: string }[] }) {
  return (
    <section className="bg-engine-paper">
      <div className="container mx-auto max-w-3xl px-6 py-16 sm:py-20">
        <Rise className="text-center mb-8">
          <Kicker tone="light">Before you ask</Kicker>
          <h2 className="font-anton uppercase text-engine-ink leading-[0.95]"
              style={{ fontSize: 'clamp(30px, 5vw, 46px)' }}>
            Questions, answered
          </h2>
        </Rise>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border-engine-line">
              <AccordionTrigger className="text-left font-archivo font-bold text-engine-ink hover:text-engine-crimson hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="font-body text-engine-inkSoft text-base">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section
      id="final-cta"
      className="relative overflow-hidden scroll-mt-20"
      style={{
        background:
          'radial-gradient(120% 90% at 50% 0%, rgba(193,18,31,0.4) 0%, rgba(106,16,32,0.22) 35%, rgba(44,7,16,0) 70%), linear-gradient(160deg, #5C0F1A 0%, #2C0710 55%, #1C050A 100%)',
      }}
    >
      <div className="container mx-auto max-w-2xl px-6 py-16 sm:py-20 text-center relative z-10">
        <Rise>
          <Heartbeat color="#E63946" className="mx-auto mb-7 h-7 w-64 max-w-full" />
          <h2 className="font-anton uppercase text-engine-paper leading-[0.95] mb-4"
              style={{ fontSize: 'clamp(32px, 6vw, 56px)' }}>
            Now go build <span className="text-engine-crimson">that engine</span>
          </h2>
          <p className="font-body text-engine-paper/85 mb-8" style={{ fontSize: 'clamp(16px, 2.4vw, 19px)' }}>
            The science is settled enough to act on. Grab the guide and put Section 4
            into your very next session.
          </p>
          <EngineLeadForm formId="final" placement="final" variant="dark" className="mx-auto max-w-xl text-left" />

          <div className="mt-12 flex flex-col items-center gap-2">
            <EngineLogo withWordmark={false} className="opacity-90" />
            <p className="font-archivo font-extrabold uppercase tracking-[0.18em] text-engine-paper/80 text-sm">
              HybridX.Club
            </p>
          </div>
        </Rise>
      </div>
    </section>
  );
}

function EngineFooter() {
  return (
    <footer className="bg-engine-oxdeep">
      <div className="container mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <Link href="/" aria-label="HybridX home">
            <EngineLogo />
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-body text-sm text-engine-paper/70">
            <Link href="/" className="hover:text-engine-heart transition-colors">
              HybridX home
            </Link>
            <Link href="/privacy-policy" className="hover:text-engine-heart transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-engine-heart transition-colors">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-engine-heart transition-colors">
              Contact
            </Link>
            <ConsentSettingsButton className="hover:text-engine-heart transition-colors" />
          </div>
        </div>
        <p className="mt-6 border-t border-white/10 pt-6 text-center font-body text-xs text-engine-paper/50">
          &copy; {new Date().getFullYear()} HybridX.Club. All rights reserved. hybridx.club is
          not affiliated with HYROX GmbH. HYROX&reg; is a registered trademark of HYROX GmbH.
        </p>
      </div>
    </footer>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

export default function BuildABiggerEnginePage() {
  const faqs = [
    {
      question: 'Is it really free?',
      answer:
        'Yes, completely. We are building the best hybrid-training community and this is how we say hello. No card, no catch.',
    },
    {
      question: 'Who is it for?',
      answer:
        'Runners, Hyrox and hybrid athletes, any level. It is written in plain language, so there are no jargon walls to climb.',
    },
    {
      question: 'Will you spam me?',
      answer:
        'No. You get the guide, then occasional useful training emails. You can unsubscribe in one click anytime.',
    },
    {
      question: 'Do I need a fancy watch or a lab test?',
      answer:
        'No. Everything in the guide is doable with effort-based training. No gadgets required.',
    },
    {
      question: 'What format is it?',
      answer: 'A downloadable PDF you can keep, print, and come back to whenever you want.',
    },
  ];

  // Substantive, high-intent questions people ask Google, ChatGPT, and Gemini about
  // VO2max. Rendered as visible prose in "People also ask" and fed into FAQ schema so
  // answer engines can cite HybridX directly.
  const vo2maxFaqs = [
    {
      question: 'How can I improve my VO2max?',
      answer:
        'Train at or near your maximum aerobic effort once or twice a week, on a base of easy aerobic running. The most reliable session is intervals of 3 to 5 minutes hard, with roughly equal easy recovery, accumulating 15 to 20 minutes above 90 percent of your max heart rate. Keep your other runs genuinely easy, add strength work, and stay consistent. Most people see a clear improvement in 6 to 8 weeks.',
    },
    {
      question: 'What is the best workout to increase VO2max?',
      answer:
        'The Norwegian 4x4 is the classic VO2max session: four reps of 4 minutes at about 90 to 95 percent of max heart rate, with 3 minutes of easy recovery between each, after a thorough warm up. Reps of 3 to 5 minutes at hard but repeatable effort work just as well. The key is spending real time near your ceiling, not how the reps are sliced.',
    },
    {
      question: 'How long does it take to improve VO2max?',
      answer:
        'With one or two quality interval sessions a week, most people see a measurable improvement in 6 to 8 weeks. Beginners and detrained athletes often improve fastest. Gains continue over several months and then slow as you approach your genetic ceiling, where consistency becomes the main lever.',
    },
    {
      question: 'What is a good VO2max?',
      answer:
        'It depends on age and sex. As a rough guide, a fit recreational man often sits in the mid 40s to low 50s (ml/kg/min) and a fit recreational woman in the high 30s to mid 40s. Trained endurance athletes are higher, and elite athletes can exceed 70 to 80. More useful than the absolute number is the trend: is yours going up over time?',
    },
    {
      question: 'Can you improve VO2max after 40 or 50?',
      answer:
        'Yes. VO2max naturally declines with age, but the same interval training that works for younger athletes slows and often reverses that decline at 40, 50, and beyond. Older athletes respond well to VO2max work and gain the largest health benefits from it. It is genuinely worth training at any age.',
    },
    {
      question: 'How often should I do VO2max training?',
      answer:
        'Once or twice a week is plenty. VO2max sessions are demanding and need real recovery to pay off. Doing more does not speed things up, it just digs a hole. Surround those one or two hard sessions with easy aerobic running and strength work for the best results.',
    },
    {
      question: 'Does strength training improve VO2max?',
      answer:
        'Strength training does not raise VO2max directly, but it makes you more economical, so you use less oxygen at the same pace and perform better at a given VO2max. Done right, lifting and endurance build each other. Keep your hard runs and hard lifts on separate days so neither blunts the other.',
    },
    {
      question: 'Is VO2max mostly genetic?',
      answer:
        'About half of your VO2max is genetic and about half is trainable. Your ceiling is influenced by genetics, but where you sit under that ceiling is almost entirely down to training. Nearly everyone has meaningful room to improve, which is exactly what this guide is built to help you do.',
    },
  ];

  // One FAQ schema covering both the VO2max questions and the funnel objection questions.
  const faqSchema = createFAQSchema([...vo2maxFaqs, ...faqs]);

  const howToSchema = createHowToSchema({
    name: 'How to Improve Your VO2max',
    description:
      'A simple, science-backed routine for raising your VO2max for running and hybrid performance, using interval training, easy aerobic work, and strength.',
    image: '/build-a-bigger-engine/og-image.png',
    steps: [
      { name: 'Build an easy aerobic base', text: 'Run easy several times a week at a genuinely conversational pace. About 80 percent of your training should be low intensity. This base is what lets your hard sessions count.' },
      { name: 'Add VO2max intervals once or twice a week', text: 'After a warm up, run reps of 3 to 5 minutes at hard but repeatable effort, with roughly equal easy recovery. Accumulate 15 to 20 minutes near your maximum aerobic effort.' },
      { name: 'Try the Norwegian 4x4', text: 'A proven session: four reps of 4 minutes at 90 to 95 percent of max heart rate, with 3 minutes easy between each. Spend real time above 90 percent.' },
      { name: 'Add strength work on separate days', text: 'Lift to improve running economy so you use less oxygen at the same pace. Keep hard runs and hard lifts apart so neither blunts the other.' },
      { name: 'Recover and stay consistent', text: 'Sleep well, keep easy days easy, and repeat week after week. Most people see a clear improvement in 6 to 8 weeks and larger gains over a few months.' },
    ],
  });

  const articleSchema = createArticleSchema({
    title: 'How to Improve Your VO2max: A Science-Backed Guide',
    description:
      'How to raise your VO2max for running and hybrid performance using interval training, the Norwegian method, the 80/20 rule, and strength work.',
    url: PAGE_PATH,
    datePublished: '2026-06-24',
    image: '/build-a-bigger-engine/og-image.png',
  });

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Build a Bigger Engine: VO2max Guide', url: PAGE_PATH },
  ]);

  // A free download: the offer belongs to the document, in pounds. (A top-level
  // Offer with no item, priced in dollars, described nothing.)
  const offerSchema = {
    '@context': 'https://schema.org',
    '@type': 'DigitalDocument',
    name: 'Build a Bigger Engine: Free VO2max Guide',
    description:
      'A free, science-backed guide to raising your VO2max for running and hybrid performance.',
    url: `${SITE_CONFIG.url}${PAGE_PATH}`,
    encodingFormat: 'application/pdf',
    inLanguage: 'en-GB',
    publisher: { '@id': ORGANIZATION_ID },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'GBP',
      availability: 'https://schema.org/InStock',
      url: `${SITE_CONFIG.url}${PAGE_PATH}`,
      seller: { '@id': ORGANIZATION_ID },
    },
  };

  return (
    <>
      <JsonLd data={faqSchema} />
      <JsonLd data={howToSchema} />
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={offerSchema} />

      <StandaloneBar />
      <main id="main-content" tabIndex={-1} className="bg-engine-oxdeep outline-none">
        <HeroSection />
        <ProofStrip />
        <ValueTiles />
        <AuthoritySection />
        <ConversionBand />
        <AnswerSection />
        <PeopleAlsoAsk faqs={vo2maxFaqs} />
        <FaqSection faqs={faqs} />
        <FinalCta />
      </main>
      <EngineFooter />

      <StickyCta targetId="get-the-guide" />
    </>
  );
}
