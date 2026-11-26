import { Users } from 'lucide-react';

export default function SocialProofSection() {
  return (
    <section id="social-proof" className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-6 py-6 md:py-8">
        <div className="flex flex-col md:flex-row items-center justify-center text-center gap-4">
          {/* bg-primary is black in light mode and yellow in dark mode, so the icon is yellow on black, then black on yellow. */}
          <Users className="h-10 w-10 text-accent dark:text-primary-foreground flex-shrink-0" aria-hidden="true" />
          <h2 className="text-xl md:text-2xl font-headline font-semibold tracking-wide">
            Join Thousands of Athletes Achieving Peak Performance with HybridX
          </h2>
        </div>
      </div>
    </section>
  );
}
