import Link from 'next/link';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import JsonLd from '@/components/JsonLd';
import { AFFILIATE_DISCLOSURE } from '@/components/AffiliateDisclosure';
import { APP, ARTICLE_REVIEWER, ATHLETES, appPriceLabel } from '@/lib/facts';
import { REVIEWER_PROFILE } from '@/lib/about';
import { createBreadcrumbSchema, createMetadata, createPersonSchema, ORGANIZATION_ID, SITE_CONFIG } from '@/lib/seo';

// Everything here is either in the code already (the facts registry, the review process the
// guides follow, the disclosures the site makes elsewhere) or in src/lib/about.ts, which only
// its owner fills in. Nothing on this page is a claim that could not be checked: that is the
// point of the page. If a section stops being true, change it in the same commit.

export const metadata: Metadata = createMetadata({
  title: 'About HybridX',
  description:
    'Who runs HybridX, how our plans, guides and tools are made and checked, how we earn, and how we stay independent of HYROX and ATHX.',
  path: '/about',
});

const aboutSchema = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  url: `${SITE_CONFIG.url}/about`,
  name: 'About HybridX',
  mainEntity: { '@id': ORGANIZATION_ID },
};

export default function AboutPage() {
  const { bio, credentials, sameAs } = REVIEWER_PROFILE;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <JsonLd
        data={[
          aboutSchema,
          createPersonSchema({ name: ARTICLE_REVIEWER.name, jobTitle: ARTICLE_REVIEWER.role, description: bio, sameAs }),
          createBreadcrumbSchema([
            { name: 'Home', url: '/' },
            { name: 'About', url: '/about' },
          ]),
        ]}
      />
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <article className="container mx-auto max-w-3xl px-6 py-12 md:py-16">
          <h1 className="font-headline text-4xl font-bold text-primary md:text-5xl">About HybridX</h1>
          <p className="mt-5 font-body text-lg leading-relaxed text-muted-foreground">
            HybridX is a UK coaching brand for people who want to run well and be strong: HYROX, ATHX and hybrid athletes. We publish
            training plans and books, free calculators and short guides, and run a coaching app. {ATHLETES.wording}.
          </p>

          <section aria-labelledby="what-we-make" className="mt-10">
            <h2 id="what-we-make" className="font-headline text-2xl font-bold text-primary">
              What we make
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 font-body leading-relaxed text-muted-foreground">
              <li>
                <Link href="/free-hyrox-plan" className="font-semibold text-foreground underline underline-offset-4">
                  A free 12-week HYROX plan
                </Link>
                , dated back from your race day.
              </li>
              <li>
                <Link href="/guides" className="font-semibold text-foreground underline underline-offset-4">
                  Guides
                </Link>
                : short answers to single training questions, each approved by a person before it is published.
              </li>
              <li>
                <Link href="/calculators" className="font-semibold text-foreground underline underline-offset-4">
                  Free calculators
                </Link>
                : pacing, strength, running and nutrition tools that work in your browser.
              </li>
              <li>
                <Link href="/books" className="font-semibold text-foreground underline underline-offset-4">
                  Training books
                </Link>
                , sold as paperbacks on Amazon.
              </li>
              <li>
                <Link href="/app" className="font-semibold text-foreground underline underline-offset-4">
                  The HybridX app
                </Link>
                : {appPriceLabel()} after a {APP.trialDays}-day free trial.
              </li>
            </ul>
          </section>

          <section aria-labelledby="who" className="mt-10">
            <h2 id="who" className="font-headline text-2xl font-bold text-primary">
              Who is behind it
            </h2>
            <p className="mt-3 font-body leading-relaxed text-muted-foreground">
              HybridX is run by <strong className="text-foreground">{ARTICLE_REVIEWER.name}</strong>, {ARTICLE_REVIEWER.role}. Jon reviews and approves
              every guide on this site before it goes live.
            </p>
            {bio ? <p className="mt-3 font-body leading-relaxed text-muted-foreground">{bio}</p> : null}
            {credentials.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 font-body leading-relaxed text-muted-foreground">
                {credentials.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            ) : null}
          </section>

          <section aria-labelledby="how" className="mt-10">
            <h2 id="how" className="font-headline text-2xl font-bold text-primary">
              How the guides are made
            </h2>
            <p className="mt-3 font-body leading-relaxed text-muted-foreground">
              Our guides are drafted with the help of AI, working from the HybridX training method, then checked by code against the official
              rulebook figures we keep, and read, corrected and approved by Jon. We say so on every guide and explain each step on{' '}
              <Link href="/guides/how-we-write" className="font-semibold text-foreground underline underline-offset-4">
                How our guides are written
              </Link>
              . When the season&apos;s rules change, the guides that relied on the old ones are reviewed again, and each guide shows the date it
              was last checked.
            </p>
          </section>

          <section aria-labelledby="limits" className="mt-10">
            <h2 id="limits" className="font-headline text-2xl font-bold text-primary">
              What we do not do
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 font-body leading-relaxed text-muted-foreground">
              <li>We do not give medical advice. Pain or an injury goes to a physiotherapist or a doctor.</li>
              <li>We do not promise results, finish times or weight loss. No plan can.</li>
              <li>
                We are independent. HybridX is not affiliated with, endorsed by or a partner of HYROX or ATHX; we use their names only to
                describe the events.
              </li>
            </ul>
          </section>

          <section aria-labelledby="money" className="mt-10">
            <h2 id="money" className="font-headline text-2xl font-bold text-primary">
              How we earn
            </h2>
            <p className="mt-3 font-body leading-relaxed text-muted-foreground">
              From the app, the books and the downloads we sell. The guides and calculators are free to use. Some free downloads ask for an email
              address, and what we do with it is in the{' '}
              <Link href="/privacy-policy" className="font-semibold text-foreground underline underline-offset-4">
                privacy policy
              </Link>
              .
            </p>
            <p className="mt-3 font-body text-sm leading-relaxed text-muted-foreground">{AFFILIATE_DISCLOSURE}</p>
          </section>

          <section aria-labelledby="mistakes" className="mt-10">
            <h2 id="mistakes" className="font-headline text-2xl font-bold text-primary">
              Spotted a mistake?
            </h2>
            <p className="mt-3 font-body leading-relaxed text-muted-foreground">
              Tell us and we will check it and correct it.{' '}
              <Link href="/contact?topic=correction" className="font-semibold text-foreground underline underline-offset-4">
                Report a correction
              </Link>{' '}
              or write to{' '}
              <a href={`mailto:${SITE_CONFIG.contactEmail}`} className="font-semibold text-foreground underline underline-offset-4">
                {SITE_CONFIG.contactEmail}
              </a>
              .
            </p>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  );
}
