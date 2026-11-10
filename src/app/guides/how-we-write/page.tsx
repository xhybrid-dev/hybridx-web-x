import Link from 'next/link';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ARTICLE_AUTHOR, ARTICLE_REVIEWER } from '@/lib/facts';
import { createMetadata } from '@/lib/seo';

// Linked from every article's byline. With a brand as the author, this page is
// what tells a reader, and a search engine, who stands behind the advice and
// how it is checked. Keep it true to the process in docs/content-engine-plan.md:
// if the process changes, this page changes with it.

export const metadata: Metadata = createMetadata({
  title: 'How Our Guides Are Written',
  description:
    'Who writes and checks the HybridX guides: drafted from the HybridX training method, checked against the official rulebook, and reviewed by trainer Jon Lee.',
  path: '/guides/how-we-write',
});

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: 'Who stands behind them',
    body: [
      `Every guide is published by ${ARTICLE_AUTHOR.name} and reviewed by ${ARTICLE_REVIEWER.name}, ${ARTICLE_REVIEWER.role}, before it goes live. Nothing is published without that approval.`,
    ],
  },
  {
    heading: 'How a guide is made',
    body: [
      'Each guide answers one question, and only one. It opens with the answer, then explains why, then gives you something to use: a workout scaled for a beginner and for race pace, a table, or one of our free calculators.',
      'Drafts are written with the help of AI, working from the HybridX training method: the same approach behind our training plans and the HybridX app. AI drafts are a starting point. Every one is read, corrected and approved by Jon before anyone else sees it.',
    ],
  },
  {
    heading: 'How the facts are checked',
    body: [
      'Race standards, such as station loads, distances and reps, come from the official HYROX rulebook for the current season, kept in one record that our trainer has checked. Every number in a draft is compared with that record before it reaches review. When the rulebook changes, the guides that relied on the old figures are reviewed again.',
      'We cite only sources we have checked exist. We do not give medical advice: if something hurts, see a physiotherapist or doctor.',
      'HybridX is independent. We are not affiliated with HYROX or ATHX, and we use their names only to describe the events.',
    ],
  },
  {
    heading: 'Corrections',
    body: [
      'Each guide shows the date it was last updated. If you spot something wrong, email training@hybridx.club and we will check it and correct it.',
      'When a new guide is published, we may add a link to it from older guides on the same subject, so you can find it from where you are reading. Those links are approved like everything else, and count as an update.',
    ],
  },
];

export default function HowWeWrite() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-neutral-900 to-black py-14 text-white md:py-20">
          <div className="container mx-auto max-w-3xl px-6">
            <nav aria-label="Breadcrumb" className="mb-5 font-body text-sm text-white/70">
              <Link href="/guides" className="hover:text-white">
                Guides
              </Link>
            </nav>
            <h1 className="font-headline text-3xl font-extrabold leading-tight md:text-5xl">How our guides are written</h1>
          </div>
        </section>
        <div className="container mx-auto max-w-3xl space-y-10 px-6 py-12">
          {SECTIONS.map((s) => (
            <section key={s.heading}>
              <h2 className="font-headline text-2xl font-bold text-primary">{s.heading}</h2>
              {s.body.map((p, i) => (
                <p key={i} className="mt-3 font-body text-lg leading-relaxed text-foreground/90">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
