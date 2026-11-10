
import { Button } from '@/components/ui/button';
import TrackedLink from '@/components/TrackedLink';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Download, BookOpen, Smartphone, ArrowRight, ShieldCheck, Users, BookMarked, TrendingUp } from 'lucide-react';

const trainingOptions = [
  {
    icon: Download,
    title: "Free Personalized Plan",
    price: "£0",
    description: "Your race, your dates, your personalized 12-week PDF plan. The perfect starting point.",
    cta: "Get Your Free PDF",
    href: "/free-hyrox-plan",
    variant: "secondary" as const,
  },
  {
    icon: BookOpen,
    title: "Paperback Books",
    price: "From £8",
    description: "For the analog athlete. Unplug and focus with our popular, in-depth training guides.",
    cta: "Browse the Books",
    href: "/#book-promotion",
    variant: "outline" as const,
  },
  {
    icon: Smartphone,
    title: "The Pro App",
    price: "£5/mo",
    description: "Very affordable at £5 a month. Daily workouts, tracking, and more. 14-day free trial.",
    cta: "Explore The App",
    href: "/app",
    variant: "default" as const,
    isExternal: false,
  }
];

const stats = [
  { icon: Users,      value: "2,000+", label: "Athletes Trained"  },
  { icon: BookMarked, value: "1800",   label: "Books Sold"        },
  { icon: TrendingUp, value: "200+",   label: "App Members"       },
];

export default function HeroSection() {
  return (
    <section className="bg-background text-foreground">
      {/* Top Light Section */}
      <div className="container mx-auto px-6 text-center pt-16 md:pt-20 pb-12 md:pb-16">

        {/* Credibility badge */}
        <div className="inline-flex items-center gap-2 bg-accent/15 border border-accent/40 rounded-full px-4 py-1.5 mb-6 text-sm font-headline font-semibold text-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
          </span>
          <ShieldCheck className="h-4 w-4 text-accent" />
          Over 2,000 athletes have trained with HybridX plans
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-headline font-extrabold text-primary mb-4 leading-tight">
          Your Path to <span className="text-accent">Peak Hyrox Performance</span> Starts Here.
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground font-body max-w-3xl mx-auto mb-10">
          Whatever your budget or training style, we have a scientifically-backed plan to help you achieve your best. Choose the option that's right for you.
        </p>

        {/* Stats row */}
        <div className="inline-grid grid-cols-3 divide-x divide-border/60 border border-border/60 rounded-xl overflow-hidden bg-secondary/40">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center px-6 py-4 gap-1">
              <stat.icon className="h-5 w-5 text-accent" />
              <span className="text-2xl font-headline font-extrabold text-primary leading-none">{stat.value}</span>
              <span className="text-xs text-muted-foreground font-body">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dark Section with texture, glow and cards */}
      <div
        className="relative bg-gradient-to-b from-neutral-900 to-black text-white pt-24 md:pt-32 pb-16 md:pb-24 overflow-hidden"
        style={{ clipPath: 'polygon(0 15%, 100% 0, 100% 100%, 0% 100%)' }}
      >
        {/* Dot grid texture */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle, #fadb5c 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Radial glow — top right */}
        <div
          aria-hidden="true"
          className="absolute -top-32 -right-32 w-[560px] h-[560px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(250,219,92,0.18) 0%, transparent 70%)' }}
        />

        {/* Radial glow — bottom left */}
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -left-24 w-[420px] h-[420px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(250,219,92,0.10) 0%, transparent 70%)' }}
        />

        {/* Hairline accent stripe along the clipped top edge */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(250,219,92,0.5) 50%, transparent 100%)' }}
        />

        <div className="container mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {trainingOptions.map((option, index) => (
              <Card
                key={option.title}
                className="flex flex-col text-left shadow-2xl hover:-translate-y-2 transition-transform duration-300 bg-gray-900/40 backdrop-blur-sm border border-accent/20 group"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <CardHeader className="flex-row items-center space-x-4 pb-3 pt-6">
                  <div className="p-3 bg-accent/20 rounded-lg">
                    <option.icon className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="font-headline text-lg text-white">{option.title}</CardTitle>
                    <p className="font-bold text-md text-accent font-headline">{option.price}</p>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow pt-1">
                  <CardDescription className="font-body text-white/70 text-sm">
                    {option.description}
                  </CardDescription>
                </CardContent>
                <CardFooter className="pb-6">
                  <Button className="w-full font-headline bg-accent text-accent-foreground hover:bg-accent/80 transition-colors" variant={option.variant === 'default' ? 'default' : 'secondary'} asChild>
                    <TrackedLink
                      href={option.href}
                      target={option.isExternal ? '_blank' : '_self'}
                      event={option.href.includes('app.hybridx.club') || option.href === '/app' ? 'cta_app_click' : undefined}
                      eventParams={{ location: 'hero' }}
                    >
                      {option.cta} <ArrowRight className="ml-2 h-4 w-4" />
                    </TrackedLink>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
