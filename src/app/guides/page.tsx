import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { createMetadata } from '@/lib/seo';
import { guidesByPillar } from '@/lib/guides/related';
import { listPublishedGuides } from '@/lib/guides/store';
import { PILLARS, SITE_PAGES } from '@/lib/guides/topics';
import type { Guide } from '@/lib/guides/types';

// Articles are read from Firestore when the page is requested, never while the
// site is built (docs/content-engine-plan.md, section 4.2).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = createMetadata({
  title: 'HYROX and Hybrid Training Guides',
  description:
    'Short, specific answers to HYROX and hybrid training questions, each with a workout, a table or a tool, and reviewed by HybridX trainer Jon Lee.',
  path: '/guides',
});

async function publishedOrNone(): Promise<Guide[]> {
  try {
    return await listPublishedGuides();
  } catch (error) {
    // The hub still lists the hand-built guides if Firestore is unreachable.
    console.error('[guides] hub served without articles:', error instanceof Error ? error.message : error);
    return [];
  }
}

export default async function GuidesHub() {
  const byPillar = guidesByPillar(await publishedOrNone());

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-neutral-900 to-black py-16 text-white md:py-20">
          <div className="container mx-auto max-w-4xl px-6">
            <p className="mb-4 font-headline text-sm font-semibold uppercase tracking-widest text-accent">HybridX guides</p>
            <h1 className="font-headline text-4xl font-extrabold leading-tight md:text-5xl">
              One question, <span className="text-accent">one clear answer</span>
            </h1>
            <p className="mt-5 max-w-2xl font-body text-lg text-white/75">
              Short guides to HYROX and hybrid training. Each answers a single question with something you can use
              today: a workout, a table or a tool.{' '}
              <Link href="/guides/how-we-write" className="text-white underline decoration-accent decoration-2 underline-offset-4">
                How our guides are written
              </Link>
              .
            </p>
          </div>
        </section>

        <div className="container mx-auto max-w-4xl space-y-14 px-6 py-14">
          {PILLARS.map((pillar) => {
            const pages = SITE_PAGES.filter((p) => p.pillar === pillar.id && p.hub);
            const articles = byPillar.get(pillar.id) ?? [];
            return (
              <section key={pillar.id} aria-labelledby={`pillar-${pillar.id}`}>
                <h2 id={`pillar-${pillar.id}`} className="font-headline text-2xl font-bold text-primary md:text-3xl">
                  {pillar.name}
                </h2>
                <p className="mt-2 font-body text-muted-foreground">{pillar.blurb}</p>

                <ul className="mt-6 grid gap-4 md:grid-cols-2">
                  {pages.map((page) => (
                    <li key={page.route}>
                      <Link
                        href={page.route}
                        className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-accent"
                      >
                        <span className="font-headline text-lg font-bold text-foreground">{page.title}</span>
                        <span className="mt-1 flex-1 font-body text-sm text-muted-foreground">{page.hub}</span>
                        <span className="mt-3 inline-flex items-center gap-1 font-headline text-sm font-semibold text-foreground">
                          Read <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>

                {articles.length > 0 && (
                  <>
                    <h3 className="mt-8 font-headline text-sm font-bold uppercase tracking-widest text-muted-foreground">
                      Questions answered
                    </h3>
                    <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
                      {articles.map((g) => (
                        <li key={g.slug}>
                          <Link
                            href={`/guides/${g.slug}`}
                            className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-secondary/60"
                          >
                            <span className="font-body text-base font-semibold text-foreground">{g.title}</span>
                            <ArrowRight className="h-4 w-4 flex-none transition-transform group-hover:translate-x-1" aria-hidden="true" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
