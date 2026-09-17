import Image from 'next/image';
import Script from 'next/script';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TrackedLink from '@/components/TrackedLink';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpenCheck, ShoppingCart, ArrowUpRight } from 'lucide-react';
import { createMetadata, createBookSchema, SITE_CONFIG } from '@/lib/seo';
import { books } from '@/lib/books';

export const metadata = createMetadata({
  title: 'Hyrox Training Books | Paperback Plans by HybridX',
  description:
    'HybridX Hyrox training books on Amazon — 12-week paperback plans for beginners, elite competitors, home training, and 45 advanced Hyrox workouts. For the athlete who wants a plan on paper.',
  path: '/books',
  keywords: [
    'hyrox training book',
    'hyrox book',
    'hyrox training plan book',
    'hyrox workout book',
    'hyrox paperback',
  ],
});

export default function BooksPage() {
  const bookSchemas = books.map((book) =>
    createBookSchema({
      name: book.title,
      description: book.description,
      image: book.imageUrl,
      url: `${SITE_CONFIG.url}/books#${book.id}`,
    })
  );

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {bookSchemas.map((schema, i) => (
        <Script
          key={`book-schema-${i}`}
          id={`book-schema-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <Header />
      <main>
        <section className="relative bg-background text-center py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-subtle-x-light dark:bg-subtle-x-dark opacity-30 dark:opacity-20 mix-blend-multiply dark:mix-blend-screen"></div>
          <div className="container mx-auto px-6 relative z-10">
            <BookOpenCheck className="h-14 w-14 text-accent mx-auto mb-4" />
            <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary mb-4 leading-tight">
              Hyrox Training Books
            </h1>
            <p className="text-lg text-muted-foreground font-body max-w-2xl mx-auto">
              For the athlete who wants to unplug and train from a printed page. Four 12-week paperback
              programmes covering every level, from your first Hyrox to advanced competition prep — available
              on Amazon.
            </p>
          </div>
        </section>

        <section className="pb-20 md:pb-28">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
              {books.map((book) => (
                <Card
                  key={book.id}
                  id={book.id}
                  className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col overflow-hidden bg-card/80 backdrop-blur-sm border-t-2 border-primary/30 scroll-mt-24"
                >
                  <div className="flex flex-col sm:flex-row">
                    <div className="w-full sm:w-2/5 flex-shrink-0 p-6 flex items-center justify-center bg-muted/10">
                      <div className="relative w-full max-w-[180px] aspect-[2/3]">
                        <Image
                          src={book.imageUrl}
                          alt={book.title}
                          fill
                          style={{ objectFit: 'contain' }}
                          sizes="180px"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col flex-grow p-6">
                      <CardHeader className="p-0 mb-2">
                        {book.level && (
                          <span className="inline-block w-fit text-xs font-headline font-bold uppercase tracking-wider text-accent bg-accent/10 px-2.5 py-1 rounded-full mb-2">
                            {book.level}
                          </span>
                        )}
                        <CardTitle className="font-headline text-lg text-primary">{book.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 flex-grow">
                        <p className="font-body text-sm text-muted-foreground">
                          {book.longDescription || book.description}
                        </p>
                      </CardContent>
                      <CardFooter className="p-0 mt-4">
                        <Button className="bg-accent text-accent-foreground hover:bg-accent/90 w-full font-headline" asChild>
                          <TrackedLink
                            href={book.amazonUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            event="cta_book_click"
                            eventParams={{ book_id: book.id, location: 'books_page' }}
                          >
                            <ShoppingCart className="mr-2 h-4 w-4" /> View on Amazon <ArrowUpRight className="ml-1.5 h-4 w-4" />
                          </TrackedLink>
                        </Button>
                      </CardFooter>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground font-body mt-12">
              Prefer training day-by-day with tracking built in? Try{' '}
              <TrackedLink href="/app" event="cta_app_click" eventParams={{ location: 'books_page' }} className="text-accent hover:underline font-semibold">
                the HybridX app
              </TrackedLink>
              , or get the{' '}
              <TrackedLink href="/free-hyrox-plan" event="cta_free_plan_click" eventParams={{ location: 'books_page' }} className="text-accent hover:underline font-semibold">
                free 12-week PDF plan
              </TrackedLink>{' '}
              instead.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
