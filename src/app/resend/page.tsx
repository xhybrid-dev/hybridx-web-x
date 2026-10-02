import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ResendForm from '@/components/shop/ResendForm';
import { SHOP_SUPPORT_EMAIL } from '@/lib/shop/config';

export const metadata: Metadata = {
  title: 'Get your download link again',
  description: 'Lost the link to a HybridX download you bought? Enter your email address and we will send it again.',
  alternates: { canonical: 'https://hybridx.club/resend' },
  robots: { index: false, follow: true },
};

export default function ResendPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-xl flex-grow px-4 py-12 sm:px-6 md:py-16">
        <h1 className="mb-3 font-headline text-3xl font-bold">Get your download link again</h1>
        <p className="mb-8 text-muted-foreground">
          Enter the email address you used at checkout. If it has an order, we will email you the link to your
          download page.
        </p>
        <ResendForm />
        <p className="mt-10 text-sm text-muted-foreground">
          Still stuck? Email{' '}
          <a href={`mailto:${SHOP_SUPPORT_EMAIL}`} className="underline underline-offset-4">
            {SHOP_SUPPORT_EMAIL}
          </a>{' '}
          with your order number if you have it.
        </p>
      </main>
      <Footer />
    </div>
  );
}
