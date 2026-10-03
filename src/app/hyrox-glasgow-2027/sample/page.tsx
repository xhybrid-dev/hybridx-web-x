import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SampleConfirm from '@/components/shop/SampleConfirm';
import { verifyLeadToken } from '@/lib/lead-tokens';
import { GLASGOW_SAMPLE_MAGNET } from '@/lib/glasgow-sample-magnet';

/*
 * Where the sample's confirmation link lands. Renders; does not confirm.
 * Consent is the button's POST (see SampleConfirm).
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your HYROX Glasgow sample pages',
  robots: { index: false, follow: false },
};

const ERROR_COPY: Record<string, { heading: string; body: string }> = {
  expired: { heading: 'That link has expired', body: 'Links last 30 days. Ask for the sample again and we will send a fresh one.' },
  'bad-signature': {
    heading: 'That link is not valid',
    body: 'It may have been altered on the way to you, or copied incompletely from the email. Ask for the sample again for a working link.',
  },
  malformed: {
    heading: 'That link is incomplete',
    body: 'Some email clients break long links across lines. Try clicking it again from the email, or ask for a fresh one.',
  },
  'wrong-source': { heading: 'That link is not valid', body: 'It was issued for a different download. Ask for the sample again.' },
};

export default async function SampleConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const verified = verifyLeadToken(token, GLASGOW_SAMPLE_MAGNET.slug);
  const reason = verified.valid && !error ? null : error || (verified.valid ? null : verified.reason);
  const errorCopy = reason ? (ERROR_COPY[reason] ?? ERROR_COPY['bad-signature']) : null;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-grow px-4 py-12 sm:px-6 md:py-16">
        {errorCopy ? (
          <>
            <h1 className="font-headline text-3xl font-bold">{errorCopy.heading}</h1>
            <p className="mt-3 text-muted-foreground">{errorCopy.body}</p>
            <p className="mt-6">
              <Link href="/hyrox-glasgow-2027#sample" className="font-medium underline underline-offset-4">
                Ask for the sample again
              </Link>
            </p>
          </>
        ) : (
          <SampleConfirm token={token ?? ''} />
        )}
      </main>
      <Footer />
    </div>
  );
}
