import Link from 'next/link';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowRight, Calculator, FileDown, LifeBuoy, Mail, Newspaper } from 'lucide-react';

// A page that is not found tells search engines so (Next sends the 404 status and
// noindex), and tells a person where to go next. It used to be a bare black and
// white message with nothing to click, even for someone whose download link had
// expired, who most needs /resend.
export const metadata: Metadata = { title: 'Page not found' };

const WAYS = [
  { href: '/free-hyrox-plan', icon: FileDown, title: 'Free 12-week HYROX plan', body: 'A dated plan for your race, as a PDF and a calendar file.' },
  { href: '/calculators', icon: Calculator, title: 'Calculators and tools', body: 'Pacing, paces, strength and the HYROX tools.' },
  { href: '/guides', icon: Newspaper, title: 'Guides', body: 'One clear answer to one training question.' },
  { href: '/resend', icon: LifeBuoy, title: 'Lost a download link?', body: 'Enter your email and we send it again.' },
  { href: '/contact', icon: Mail, title: 'Ask us', body: 'Tell us what you were looking for.' },
] as const;

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main id="main-content" className="flex-1">
        <section className="container mx-auto max-w-4xl px-6 py-16 md:py-24">
          <p className="font-headline text-sm font-semibold uppercase tracking-widest text-accent-ink">404</p>
          <h1 className="mt-2 font-headline text-4xl font-bold text-primary md:text-5xl">Page not found</h1>
          <p className="mt-4 max-w-2xl font-body text-lg text-muted-foreground">
            That address does not lead anywhere on HybridX. It may have moved, or the link may be mistyped or out of date.
          </p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {WAYS.map((way) => (
              <li key={way.href}>
                <Link
                  href={way.href}
                  className="group flex h-full items-start gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-accent"
                >
                  <way.icon className="mt-0.5 h-6 w-6 flex-shrink-0 text-accent-ink" aria-hidden="true" />
                  <span>
                    <span className="block font-headline text-lg font-bold text-primary">{way.title}</span>
                    <span className="mt-1 block font-body text-sm text-muted-foreground">{way.body}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-10">
            <Link href="/" className="inline-flex items-center font-headline font-semibold text-primary underline underline-offset-4 hover:text-accent-ink">
              Back to the homepage <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
            </Link>
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
