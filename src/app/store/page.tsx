
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import EcwidStore from '@/components/EcwidStore';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: '/store' },
  title: 'HybridX Store | Training Gear and Apparel',
  description: 'Shop official HybridX training gear, apparel, and accessories. Get equipped to dominate your training and races.',
  keywords: [
    'hybrid training gear',
    'fitness apparel',
    'workout clothes',
    'training accessories',
    'hyrox gear',
  ],
  openGraph: {
    title: 'HybridX Store | Training Gear and Apparel',
    description: 'Shop official HybridX training gear, apparel, and accessories. Get equipped to dominate your training.',
    url: 'https://hybridx.club/store',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HybridX Store | Training Gear',
    description: 'Shop official HybridX training gear, apparel, and accessories.',
  },
};

export default function StorePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-xl border-border/60">
            <CardHeader className="text-center pb-4">
              <h1 className="text-3xl md:text-4xl font-headline font-semibold leading-none tracking-tight text-primary">HybridX Store</h1>
              <CardDescription className="text-lg text-muted-foreground font-body mt-2">
                Get the official gear to support your training journey.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <p className="font-body text-muted-foreground text-center max-w-2xl mx-auto">
                Official HybridX apparel: the basketball jersey (£25) and the Solo Hat (£18), with more
                added as it is made. Sizes, colours and delivery options are shown on each product.
              </p>
              <EcwidStore />
              <p className="font-body text-sm text-muted-foreground text-center">
                Looking for a training plan instead? Try the{' '}
                <Link href="/books" className="underline underline-offset-4 hover:text-primary">paperback books</Link>,
                the{' '}
                <Link href="/free-hyrox-plan" className="underline underline-offset-4 hover:text-primary">free 12-week plan</Link>
                {' '}or the{' '}
                <Link href="/app" className="underline underline-offset-4 hover:text-primary">HybridX app</Link>.
                Questions about an order: training@hybridx.club.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
