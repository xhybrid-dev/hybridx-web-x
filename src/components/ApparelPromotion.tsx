import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shirt, ArrowRight } from 'lucide-react';
import TrackedLink from '@/components/TrackedLink';

// Two plain cards that link to the store. They were live Ecwid widgets, which
// loaded Ecwid's script (and set its cookies) for every visitor to the homepage
// before they had chosen anything, even after Reject on the consent banner, and
// shifted the page by about 400 px when they arrived. Nothing here loads a
// third party: the store page itself asks before it loads Ecwid.
//
// Keep these in step with the products in the store (Ecwid 743426001 and
// 739862435); the store is the source of truth for price and stock.
const PRODUCTS = [
  { name: 'HybridX basketball jersey', price: '£25', blurb: 'Light, breathable and cut for training.' },
  { name: 'HybridX Solo Hat', price: '£18', blurb: 'The everyday hat for the walk to the gym.' },
] as const;

export default function ApparelPromotion() {
  return (
    <section id="apparel-promotion" className="py-20 md:py-28 bg-secondary/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12 md:mb-16">
          <Shirt className="h-16 w-16 text-accent-ink mx-auto mb-4" aria-hidden="true" />
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-primary mb-3">
            Gear Up. Look the Part.
          </h2>
          <p className="text-lg text-muted-foreground font-body max-w-2xl mx-auto">
            Train in comfort and style with the official HybridX apparel collection. High-performance gear designed for the hybrid athlete.
          </p>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {PRODUCTS.map((product) => (
            <li key={product.name} className="flex">
              <Card className="w-full shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col overflow-hidden bg-card/80 backdrop-blur-sm border-t-2 border-primary/30">
                <CardContent className="p-6 flex-grow flex flex-col items-center justify-center text-center">
                  <h3 className="font-headline text-xl font-bold text-primary">{product.name}</h3>
                  <p className="font-body text-muted-foreground mt-2">{product.blurb}</p>
                  <p className="font-headline text-2xl font-bold text-foreground mt-4">{product.price}</p>
                  <Link
                    href="/store"
                    className="mt-4 inline-flex items-center font-headline font-semibold text-primary underline underline-offset-4 hover:text-accent-foreground hover:bg-accent rounded px-1"
                  >
                    See it in the store <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                  </Link>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
        <div className="text-center mt-12">
          <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
            <TrackedLink href="/store" event="cta_store_click" eventParams={{ location: 'apparel_promotion' }}>
              Shop The Collection <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
            </TrackedLink>
          </Button>
        </div>
      </div>
    </section>
  );
}
