import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { readLeadToken } from '@/lib/lead-tokens';
import { confirmLead } from '@/lib/confirm-actions';
import ConfirmButton from '@/components/ConfirmButton';

// One confirmation page for every funnel.
//
// The race-day card has its own, because it also hands over a file and needs to
// say so. Everything else can land here: the funnel is read from the signed
// token rather than baked into the route, so adding double opt-in to a new
// promotion is a link in an email, not a new page.
//
// Confirming is what grants marketing consent, which is what raises
// `consentGranted` in the mailing system — the trigger a confirmed opt-in
// nurture sequence begins from. So this page is not a receipt. It is the step
// that starts the sequence.
//
// Which is exactly why the page load must not perform it. Corporate mail
// security — Outlook Safe Links, Proofpoint, Gmail's prefetch — issues a GET
// against every URL in an inbound message, so confirming on render means a
// scanner produces the strongest consent evidence in the system for someone who
// never opened the email. Double opt-in that a machine can complete is not
// double opt-in. The grant is behind the button below, which POSTs.

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Confirm your email | HYBRIDX',
  description: 'Confirm your email address to start receiving HYBRIDX training email.',
  robots: { index: false, follow: false },
};

const ERROR_COPY: Record<string, { heading: string; body: string }> = {
  malformed: {
    heading: 'That link looks incomplete',
    body: 'Email clients sometimes break long links across lines. Try copying the whole link into your browser, or sign up again to get a fresh one.',
  },
  'bad-signature': {
    heading: 'We could not verify that link',
    body: 'It may have been altered in transit. Sign up again and we will send you a new one.',
  },
  expired: {
    heading: 'That link has expired',
    body: 'Confirmation links last 30 days. Sign up again and we will send you a fresh one.',
  },
};

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const verified = readLeadToken(token);

  const error = verified.valid ? null : (ERROR_COPY[verified.reason] ?? ERROR_COPY['bad-signature']);

  return (
    <>
      <Header />
      <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-20 text-center">
        {error ? (
          <>
            <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
            <h1 className="mt-6 font-headline text-3xl font-bold">{error.heading}</h1>
            <p className="mt-3 text-muted-foreground">{error.body}</p>
            <Button asChild className="mt-8">
              <Link href="/">Back to HYBRIDX</Link>
            </Button>
          </>
        ) : (
          <ConfirmButton
            email={verified.valid ? verified.email : ''}
            token={token ?? ''}
            action={confirmLead}
          />
        )}
      </main>
      <Footer />
    </>
  );
}
