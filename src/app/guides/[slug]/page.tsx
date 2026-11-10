import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArticleBody from '@/components/guides/ArticleBody';
import GuideByline from '@/components/guides/GuideByline';
import GuideEngagement from '@/components/guides/GuideEngagement';
import { createMetadata } from '@/lib/seo';
import { relatedGuides } from '@/lib/guides/related';
import { guideJsonLd, guidePath, jsonLdString } from '@/lib/guides/schema';
import { getPublicGuide, listPublishedGuides } from '@/lib/guides/store';
import { pillar as pillarOf, SITE_PAGES } from '@/lib/guides/topics';

// One article, read from Firestore at request time. Drafts are never served:
// getPublicGuide only knows published and retired articles. A retired article
// with somewhere to send its readers redirects there permanently; one without
// is gone.
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getPublicGuide(slug);
  if (!guide || guide.status !== 'published') return { robots: { index: false, follow: false } };
  // The root layout's template adds " | HybridX Hub".
  return createMetadata({
    title: guide.title,
    description: guide.description,
    type: 'article',
    path: guidePath(guide.slug),
  });
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = await getPublicGuide(slug);
  if (!guide) notFound();
  if (guide.status === 'retired') {
    if (guide.redirectTo) permanentRedirect(guide.redirectTo);
    notFound();
  }

  const published = await listPublishedGuides();
  const articles = new Set(published.map((g) => g.slug));
  const related = relatedGuides(guide, published);
  const pillar = pillarOf(guide.pillar);
  const pillarPage = SITE_PAGES.find((p) => p.route === pillar.page)?.title ?? pillar.name;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {guideJsonLd(guide).map((data, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />
      ))}
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-neutral-900 to-black py-14 text-white md:py-20">
          <div className="container mx-auto max-w-3xl px-6">
            <nav aria-label="Breadcrumb" className="mb-5 font-body text-sm text-white/70">
              <Link href="/guides" className="hover:text-white">
                Guides
              </Link>
              <span aria-hidden="true"> / </span>
              <Link href={pillar.page} className="hover:text-white">
                {pillar.name}
              </Link>
            </nav>
            <h1 className="font-headline text-3xl font-extrabold leading-tight md:text-5xl">{guide.title}</h1>
            <div className="mt-6">
              <GuideByline updatedAt={guide.updatedAt} />
            </div>
          </div>
        </section>

        <article id="guide-body" className="container mx-auto max-w-3xl px-6 py-10 md:py-14">
          <ArticleBody slug={guide.slug} blocks={guide.blocks} articles={articles} />

          <nav aria-label="More on this topic" className="mt-14 border-t border-border pt-8">
            <h2 className="font-headline text-sm font-bold uppercase tracking-widest text-muted-foreground">
              More on this topic
            </h2>
            <Link
              href={pillar.page}
              className="group mt-2 inline-flex items-center gap-2 font-headline text-lg font-bold text-foreground underline decoration-accent decoration-2 underline-offset-4"
            >
              {pillarPage}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            {related.length > 0 && (
              <>
                <h2 className="mt-8 font-headline text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  Related questions
                </h2>
                <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
                  {related.map((g) => (
                    <li key={g.slug}>
                      <Link
                        href={guidePath(g.slug)}
                        className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-secondary/60"
                      >
                        <span className="font-body font-semibold text-foreground">{g.title}</span>
                        <ArrowRight className="h-4 w-4 flex-none transition-transform group-hover:translate-x-1" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </nav>
        </article>
        <GuideEngagement slug={guide.slug} targetId="guide-body" />
      </main>
      <Footer />
    </div>
  );
}
