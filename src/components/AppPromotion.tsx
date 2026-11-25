
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Smartphone, CheckCircle, BarChart2, Zap, ArrowRight } from 'lucide-react';
import TrackedLink from '@/components/TrackedLink';

const appFeatures = [
    { icon: Zap, text: "Get your daily workout, instantly. No distractions." },
    { icon: BarChart2, text: "Track every rep and run to see real progress." },
    { icon: CheckCircle, text: "Stay laser-focused on the only thing that matters: results." },
];

export default function AppPromotion() {
  return (
    <section id="app-promotion" className="relative py-20 md:py-28 bg-secondary/30 overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 bg-subtle-x-light dark:bg-subtle-x-dark opacity-40 dark:opacity-25 mix-blend-multiply dark:mix-blend-screen"></div>
      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
          <div className="md:w-1/2 text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-primary mb-6">
              For the Digital Athlete: <span className="text-accent-ink">Your Coach In Your Pocket.</span>
            </h2>
            <p className="text-lg text-muted-foreground font-body mb-8">
              Get exactly what you need to know, with nothing you don't. Our app delivers your daily plan with zero fluff, so you can focus on the work.
            </p>
            <div className="space-y-3 mb-10 text-left">
                {appFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center">
                        <feature.icon className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-md text-muted-foreground">{feature.text}</span>
                    </div>
                ))}
            </div>
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg transform hover:scale-105 transition-transform duration-200" asChild>
              <TrackedLink
                href="/app"
                event="cta_app_click"
                eventParams={{ location: 'app_promotion' }}
              >
                <Smartphone className="mr-2 h-5 w-5" /> See the App <ArrowRight className="ml-2 h-5 w-5" />
              </TrackedLink>
            </Button>
          </div>
          <div className="md:w-1/2 mt-8 md:mt-0">
            <div className="relative aspect-[16/10] rounded-xl shadow-2xl overflow-hidden group">
              <Image
                src="/hyrox-app-showcase.png"
                alt="HybridX App Interface showing daily workout plans and a workout generator on a smartphone screen"
                width={1152}
                height={718}
                className="object-cover w-full h-full"
                sizes="(max-width: 767px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
