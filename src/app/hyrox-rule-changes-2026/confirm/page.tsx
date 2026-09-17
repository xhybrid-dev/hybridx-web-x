import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import TrackedLink from '@/components/TrackedLink';
import { AlertCircle, ArrowRight, Printer } from 'lucide-react';
import { verifyLeadToken } from '@/lib/lead-tokens';
import { markLeadConfirmed } from '@/lib/leads';
import ConfirmedDownload from '@/components/hyrox-rules/ConfirmedDownload';

const SOURCE = 'hyrox_rules_card';

export const metadata: Metadata = {
  title: 'Your race day rules card',
  // A per-address utility page: never index it, never let it dilute the guide.
  robots: { index: false, follow: false },
};

const ERROR_COPY: Record<string, { heading: string; body: string }> = {
  expired: {
    heading: 'That link has expired',
    body: 'Confirmation links last 30 days. Request the card again and we will send you a fresh one.',
  },
  'bad-signature': {
    heading: 'That link is not valid',
    body: 'It may have been altered on its way to you, or copied incompletely from the email. Request the card again for a working link.',
  },
  malformed: {
    heading: 'That link is incomplete',
    body: 'Some email clients break long links across lines. Try clicking it again from the email, or request a fresh one.',
  },
  'wrong-source': {
    heading: 'That link is not valid',
    body: 'It was issued for a different download. Request the card again for a working link.',
  },
};

export default async function ConfirmRaceCardPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const verified = verifyLeadToken(token, SOURCE);

  // Record the confirmation. Best effort: a Firestore problem must not stand
  // between a confirmed subscriber and the file they came for.
  if (verified.valid) {
    try {
      await markLeadConfirmed(SOURCE, verified.email, ['hyrox-rules-card-2026']);
    } catch (err) {
      console.error('[race-card] Failed to mark lead confirmed:', err);
    }
  }

  const reason = verified.valid ? null : error || verified.reason;
  const errorCopy = reason ? (ERROR_COPY[reason] ?? ERROR_COPY['bad-signature']) : null;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />

      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-b from-neutral-900 to-black py-16 text-white md:py-24">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: 'radial-gradient(circle, #fadb5c 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          <div className="container relative z-10 mx-auto max-w-3xl px-6">
            {verified.valid ? (
              <>
                <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/20 px-4 py-1.5 font-headline text-sm font-semibold text-accent">
                  Email confirmed
                </span>
                <h1 className="mb-4 font-headline text-3xl font-extrabold leading-tight md:text-5xl">
                  Here is your race day rules card
                </h1>
                <p className="mb-8 font-body text-lg text-white/75">
                  Thanks for confirming. The card is yours below, and this link will keep working if
                  you need it again closer to your race.
                </p>

                <ConfirmedDownload downloadUrl={`/api/race-card/download?token=${encodeURIComponent(token ?? '')}`} />

                <p className="mt-6 flex items-start gap-2 font-body text-sm leading-relaxed text-white/60">
                  <Printer className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  Print A4 landscape, single sided, at 100% scale, then fold with the print facing
                  outwards.
                </p>

                <div className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-4">
                  <Image
                    src="/hyrox-rule-changes-2026/race-day-card-preview.png"
                    alt="The HYROX 2026/27 race day rules card: station completion standards, the penalty table, the missed lap scale and singles weights on a single folded A4 sheet."
                    width={1431}
                    height={1012}
                    className="w-full rounded-lg"
                    sizes="(max-width: 768px) 100vw, 768px"
                    priority
                  />
                </div>
              </>
            ) : (
              <>
                <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/20 px-4 py-1.5 font-headline text-sm font-semibold text-rose-300">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  Link problem
                </span>
                <h1 className="mb-4 font-headline text-3xl font-extrabold leading-tight md:text-5xl">
                  {errorCopy?.heading}
                </h1>
                <p className="mb-8 font-body text-lg text-white/75">{errorCopy?.body}</p>
                <Button size="lg" className="bg-accent font-headline text-black hover:bg-accent/90" asChild>
                  <Link href="/hyrox-rule-changes-2026#race-card">
                    Request the card again <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </section>

        <section className="py-14">
          <div className="container mx-auto max-w-3xl px-6">
            <h2 className="mb-3 font-headline text-2xl font-bold text-foreground">
              While you are here
            </h2>
            <p className="mb-6 font-body leading-relaxed text-muted-foreground">
              The card is the short version. The full breakdown of every 2026/27 change, including
              the penalty calculator, is on the guide.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="font-headline" asChild>
                <Link href="/hyrox-rule-changes-2026">Read the full rule changes</Link>
              </Button>
              <Button className="bg-foreground font-headline text-background hover:opacity-90" asChild>
                <TrackedLink
                  href="https://app.hybridx.club"
                  event="cta_app_click"
                  eventParams={{ location: 'race_card_confirm' }}
                >
                  Build a plan around your race date <ArrowRight className="ml-2 h-4 w-4" />
                </TrackedLink>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
