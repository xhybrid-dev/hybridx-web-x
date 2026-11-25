import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ContactForm from '@/components/contact/ContactForm';
import { createMetadata } from '@/lib/seo';
import { APP_LOGIN_URL } from '@/lib/app-links';
import { Mail, LifeBuoy, LogIn, HelpCircle } from 'lucide-react';

export const metadata = createMetadata({
  title: 'Contact HybridX',
  description:
    'Ask HybridX a question about training plans, the app, an order or a download, or the UNA Watch apps. We reply by email.',
  path: '/contact',
});

const SHORTCUTS = [
  {
    icon: LifeBuoy,
    title: 'Lost your download link?',
    body: 'Enter the email you bought with and we send it again.',
    href: '/resend',
    label: 'Resend my download link',
  },
  {
    icon: LogIn,
    title: 'Already a member?',
    body: 'Sign in to the app for your workouts, account and billing.',
    href: APP_LOGIN_URL,
    label: 'Member log in',
  },
  {
    icon: HelpCircle,
    title: 'Quick answers',
    body: 'Prices, the free trial, plans and equipment are answered on the homepage.',
    href: '/#faq',
    label: 'Read the FAQ',
  },
] as const;

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main id="main-content" className="flex-1">
        <section className="container mx-auto max-w-5xl px-6 py-14 md:py-20">
          <h1 className="font-headline text-4xl font-bold text-primary md:text-5xl">Contact HybridX</h1>
          <p className="mt-4 max-w-2xl font-body text-lg text-muted-foreground">
            Questions about a plan, the app, an order or a download? Send a message and we will reply by email.
          </p>

          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <ContactForm />

            <aside aria-label="Other ways to get help" className="space-y-5">
              {SHORTCUTS.map((s) => (
                <div key={s.title} className="rounded-xl border border-border bg-card p-5">
                  <s.icon className="mb-2 h-6 w-6 text-accent-ink" aria-hidden="true" />
                  <h2 className="font-headline text-lg font-bold text-primary">{s.title}</h2>
                  <p className="mt-1 font-body text-sm text-muted-foreground">{s.body}</p>
                  <Link
                    href={s.href}
                    className="mt-3 inline-block font-headline text-sm font-semibold text-primary underline underline-offset-4 hover:text-accent-ink"
                  >
                    {s.label}
                  </Link>
                </div>
              ))}
              <div className="rounded-xl border border-border bg-card p-5">
                <Mail className="mb-2 h-6 w-6 text-accent-ink" aria-hidden="true" />
                <h2 className="font-headline text-lg font-bold text-primary">Prefer email?</h2>
                <p className="mt-1 font-body text-sm text-muted-foreground">
                  Write to{' '}
                  <a href="mailto:training@hybridx.club" className="font-semibold text-foreground underline underline-offset-4">
                    training@hybridx.club
                  </a>
                  .
                </p>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
