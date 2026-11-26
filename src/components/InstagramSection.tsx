
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Instagram, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

const instagramPosts = [
  { id: 1, src: '/insta/insta1.png', alt: 'Instagram post from HybridX Club' },
  { id: 2, src: '/insta/insta2.png', alt: 'Instagram post from HybridX Club' },
  { id: 3, src: '/insta/insta3.png', alt: 'Instagram post from HybridX Club' },
  { id: 4, src: '/insta/insta4.png', alt: 'Instagram post from HybridX Club' },
  { id: 5, src: '/insta/insta5.png', alt: 'Instagram post from HybridX Club' },
  { id: 6, src: '/insta/insta6.png', alt: 'Instagram post from HybridX Club' },
];

export default function InstagramSection() {
  return (
    <section id="instagram-section" className="py-20 md:py-28 bg-secondary/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12 md:mb-16">
          <Instagram className="h-16 w-16 text-accent-ink mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-primary mb-3">
            Join the <span className="text-accent-ink">HybridX</span> Community
          </h2>
          <p className="text-lg text-muted-foreground font-body max-w-2xl mx-auto">
            Follow our journey on Instagram for daily motivation, training tips, and community highlights. See how athletes just like you are smashing their goals.
          </p>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4 mb-10">
          {instagramPosts.map(post => (
            <Link key={post.id} href="https://www.instagram.com/hybridx.club" target="_blank" rel="noopener noreferrer" className="block relative aspect-square overflow-hidden rounded-lg group">
              <Image
                src={post.src}
                alt={post.alt}
                width={400}
                height={400}
                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-300 ease-in-out"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                <Instagram className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg transform hover:scale-105 transition-transform duration-200" asChild>
            <Link href="https://www.instagram.com/hybridx.club" target="_blank" rel="noopener noreferrer">
              <Instagram className="mr-2 h-5 w-5" /> Follow @hybridx.club <ArrowUpRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
