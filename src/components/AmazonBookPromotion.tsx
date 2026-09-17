
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpenCheck, ShoppingCart, ArrowUpRight, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import TrackedLink from '@/components/TrackedLink';
import { books } from '@/lib/books';

export default function AmazonBookPromotion() {
  return (
    <section id="book-promotion" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12 md:mb-16">
          <BookOpenCheck className="h-16 w-16 text-accent mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-primary mb-3">
            For the Analog Athlete: <span className="text-accent">Your Plan, On Paper.</span>
          </h2>
          <p className="text-lg text-muted-foreground font-body max-w-2xl mx-auto">
            Tired of screen-time distractions? Our training books are for the athlete who wants to unplug and focus. Physically record your progress, avoid notifications, and own your plan.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-stretch">
          {books.map((book) => (
            <Card key={book.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col overflow-hidden bg-card/80 backdrop-blur-sm group border-t-2 border-primary/30">
              <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-1/3 flex-shrink-0 p-4 flex items-center justify-center bg-muted/10 md:rounded-l-lg md:rounded-tr-none rounded-t-lg">
                  <div className="relative w-full max-w-[200px] md:max-w-full aspect-[2/3]">
                    <Image
                      src={book.imageUrl}
                      alt={book.title}
                      width={200} 
                      height={300}
                      style={{ objectFit: 'contain' }}
                      sizes="(max-width: 767px) 200px, 33vw"
                      className="group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                  </div>
                </div>
                <div className="flex flex-col flex-grow p-6">
                  <CardHeader className="p-0 mb-2">
                    <CardTitle className="font-headline text-xl md:text-2xl text-primary group-hover:text-accent transition-colors duration-300">{book.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 flex-grow">
                    <CardDescription className="font-body text-sm md:text-base text-muted-foreground mb-4">
                      {book.description}
                    </CardDescription>
                  </CardContent>
                  <CardFooter className="p-0 mt-4">
                    <Button className="bg-accent text-accent-foreground hover:bg-accent/90 w-full md:w-auto transition-colors duration-300 font-headline py-3 text-sm md:text-base" asChild>
                      <TrackedLink
                        href={book.amazonUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        event="cta_book_click"
                        eventParams={{ book_id: book.id, location: 'book_promotion' }}
                      >
                        <ShoppingCart className="mr-2 h-5 w-5" /> Get Your Copy <ArrowUpRight className="ml-1.5 h-4 w-4" />
                      </TrackedLink>
                    </Button>
                  </CardFooter>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/books"
            className="inline-flex items-center text-sm font-headline font-semibold text-foreground/80 hover:text-accent transition-colors"
          >
            See all books &amp; details <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
