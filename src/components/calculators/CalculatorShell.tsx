import Link from 'next/link';
import type { ReactNode } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import JsonLd from '@/components/JsonLd';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import CalculatorCTA from '@/components/calculators/CalculatorCTA';
import { CALCULATOR_GUIDES, calculatorBySlug } from '@/lib/calculators/registry';
import { createBreadcrumbSchema, createFAQSchema, createWebApplicationSchema } from '@/lib/seo';

interface CalculatorShellProps {
  /** A slug from the registry. */
  slug: string;
  /** The tool's heading and the line under it. */
  title: string;
  intro: string;
  /** The page's description, for the structured data. */
  description: string;
  keywords?: string[];
  children: ReactNode;
}

/**
 * What every older calculator page shares: the breadcrumb (and its structured data), the
 * tool in a card, the call to action, then what a visitor and a search engine both want
 * under it: how the number is worked out, the questions people ask, and what to try next.
 */
export default function CalculatorShell({ slug, title, intro, description, keywords, children }: CalculatorShellProps) {
  const info = calculatorBySlug(slug);
  const guide = CALCULATOR_GUIDES[slug];
  if (!info || !guide) throw new Error(`CalculatorShell: no registry entry for "${slug}"`);

  const related = guide.related.map((s) => calculatorBySlug(s)).filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <JsonLd
        data={[
          createBreadcrumbSchema([
            { name: 'Home', url: '/' },
            { name: 'Calculators', url: '/calculators' },
            { name: info.name, url: info.path },
          ]),
          createWebApplicationSchema({ name: info.name, description, url: info.path, keywords }),
          createFAQSchema(guide.faqs),
        ]}
      />
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          <nav aria-label="Breadcrumb" className="mb-4 font-body text-sm text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-x-2">
              <li>
                <Link href="/" className="underline-offset-4 hover:underline">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/calculators" className="underline-offset-4 hover:underline">
                  Calculators
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-foreground">
                {info.name}
              </li>
            </ol>
          </nav>

          <Card className="shadow-xl border-border/60">
            <CardHeader className="text-center pb-4">
              <CardTitle as="h1" className="text-3xl md:text-4xl font-headline text-primary">
                {title}
              </CardTitle>
              <CardDescription className="text-lg text-muted-foreground font-body mt-2">{intro}</CardDescription>
            </CardHeader>
            <CardContent>{children}</CardContent>
          </Card>

          <CalculatorCTA calculator={slug} />

          <section aria-labelledby="how-it-works" className="mt-12">
            <h2 id="how-it-works" className="font-headline text-2xl font-bold text-primary mb-3">
              How it works
            </h2>
            <div className="space-y-3 font-body leading-relaxed text-muted-foreground">
              {guide.how.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </section>

          <section aria-labelledby="questions" className="mt-10">
            <h2 id="questions" className="font-headline text-2xl font-bold text-primary mb-4">
              Questions
            </h2>
            <div className="space-y-6">
              {guide.faqs.map((f) => (
                <div key={f.question}>
                  <h3 className="font-headline text-lg font-semibold text-foreground">{f.question}</h3>
                  <p className="mt-1 font-body leading-relaxed text-muted-foreground">{f.answer}</p>
                </div>
              ))}
            </div>
          </section>

          {related.length > 0 && (
            <section aria-labelledby="related-tools" className="mt-10">
              <h2 id="related-tools" className="font-headline text-2xl font-bold text-primary mb-4">
                Related tools
              </h2>
              <ul className="grid gap-3 sm:grid-cols-3">
                {related.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={c.path}
                      className="block h-full rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary hover:bg-secondary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <span className="block font-headline font-semibold text-primary">{c.name}</span>
                      <span className="mt-1 block font-body text-sm text-muted-foreground">{c.blurb}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
