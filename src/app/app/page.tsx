
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import TrackedLink from '@/components/TrackedLink';
import { APP_SIGNUP_URL } from '@/lib/app-links';
import Script from 'next/script';
import {
  Smartphone, Calendar, LineChart, Sparkles, ArrowRight, CheckCircle,
} from 'lucide-react';
import { createMetadata, createFAQSchema } from '@/lib/seo';

// Every "Start your free trial" here goes straight to the app's sign-up form.
const APP_URL = APP_SIGNUP_URL;

export const metadata = createMetadata({
  title: 'HybridX App — Hyrox & Hybrid Training, £5/month',
  description:
    'Daily workouts, program library, and an AI training coach — built for Hyrox and hybrid athletes. 14-day free trial, cancel anytime in two clicks.',
  path: '/app',
  keywords: ['hyrox training app', 'hybrid training app', 'hyrox app', 'hyrox coaching app'],
});

const features = [
  {
    icon: Calendar,
    title: 'Structured programs',
    description: 'A full library of periodized Hyrox and hybrid programs — pick one and follow it day by day, no planning required.',
  },
  {
    icon: LineChart,
    title: 'Progress tracking',
    description: 'Log every session and benchmark, and see your trends over time instead of guessing whether the plan is working.',
  },
  {
    icon: Sparkles,
    title: 'Edge Coach',
    description: 'An AI coach built into the app for questions on technique, pacing, and adjusting your plan around how you\'re actually recovering.',
  },
  {
    icon: Smartphone,
    title: 'Works anywhere',
    description: 'Fully web-based — open app.hybridx.club on your phone, bookmark it, and it works like an app with no download required.',
  },
];

const faqs = [
  {
    question: 'How much does the app cost?',
    answer: '£5 per month, with a 14-day free trial. No setup fee, no long-term contract.',
  },
  {
    question: 'How do I cancel?',
    answer: 'Cancel anytime from your account settings inside the app — it takes two clicks and stops the next billing cycle. No phone calls, no emails required.',
  },
  {
    question: 'What\'s the difference between the free plan and the app?',
    answer: 'The free 12-week PDF plan is a fixed, personalised training block you download once. The app gives you a full library of programs, day-by-day tracking, benchmark logging, and the Edge Coach for ongoing guidance — it adapts as you go rather than staying static.',
  },
  {
    question: 'What devices does it work on?',
    answer: 'Any device with a browser — phone, tablet, or desktop. It\'s a web app, so there\'s nothing to install or update.',
  },
];

const faqSchema = createFAQSchema(faqs);

export default function AppLandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Script id="app-faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Header />
      <main>
        {/* Hero */}
        <section className="relative bg-background py-16 md:py-24 overflow-hidden">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 bg-accent/15 border border-accent/40 rounded-full px-4 py-1.5 mb-6 text-sm font-headline font-semibold text-foreground">
                  14-day free trial
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-headline font-extrabold text-primary mb-4 leading-tight">
                  Your Hyrox Coach, <span className="text-accent">In Your Pocket.</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground font-body max-w-xl mx-auto lg:mx-0 mb-8">
                  Structured programs, daily workouts, and an AI coach for the questions a PDF can&apos;t answer. £5/month. 14-day free trial. Cancel anytime.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                  <Button size="lg" asChild className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg">
                    <TrackedLink href={APP_URL} target="_blank" rel="noopener noreferrer" event="cta_app_click" eventParams={{ location: 'app_page_hero' }}>
                      Start Your Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                    </TrackedLink>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="#pricing">See Pricing</Link>
                  </Button>
                </div>
              </div>
              <div className="relative">
                <Image
                  src="/hyrox-app-showcase.png"
                  alt="HybridX app showing training programs and a workout generator on two phones"
                  width={1000}
                  height={670}
                  className="w-full h-auto"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 md:py-24 bg-secondary/30">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-headline font-bold text-primary mb-3">Everything you need, nothing you don&apos;t</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {features.map((f) => (
                <Card key={f.title} className="p-6">
                  <CardContent className="p-0">
                    <f.icon className="h-8 w-8 text-accent mb-3" />
                    <h3 className="font-headline text-lg font-bold text-primary mb-1">{f.title}</h3>
                    <p className="text-muted-foreground text-sm">{f.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Screenshots */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-headline font-bold text-primary mb-3">A look inside</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-2xl mx-auto items-start">
              <Image
                src="/App snapshots/dark-mode.png"
                alt="HybridX app program library"
                width={683}
                height={1350}
                className="w-full h-auto"
              />
              <Image
                src="/App snapshots/pink-mode.png"
                alt="HybridX app workout screen with Edge Coach"
                width={681}
                height={1350}
                className="w-full h-auto"
              />
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-16 md:py-24 bg-secondary/30">
          <div className="container mx-auto px-6">
            <div className="max-w-md mx-auto">
              <Card className="border-2 border-accent shadow-2xl text-center p-8">
                <CardContent className="p-0">
                  <p className="font-headline text-sm uppercase tracking-widest text-accent mb-2">HybridX App</p>
                  <p className="text-5xl font-headline font-extrabold text-primary mb-1">£5<span className="text-lg text-muted-foreground font-body">/month</span></p>
                  <p className="text-muted-foreground font-body mb-6">14-day free trial. Cancel anytime in two clicks — no calls, no emails.</p>
                  <ul className="text-left space-y-2 mb-6 font-body">
                    <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-accent flex-shrink-0" /> Full program library</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-accent flex-shrink-0" /> Daily workout tracking</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-accent flex-shrink-0" /> Edge Coach, built in</li>
                  </ul>
                  <Button size="lg" asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    <TrackedLink href={APP_URL} target="_blank" rel="noopener noreferrer" event="cta_app_click" eventParams={{ location: 'app_page_pricing' }}>
                      Start Your Free Trial
                    </TrackedLink>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-6 max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-headline font-bold text-primary text-center mb-8">FAQ</h2>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((item, i) => (
                <AccordionItem value={`faq-${i + 1}`} key={item.question}>
                  <AccordionTrigger>{item.question}</AccordionTrigger>
                  <AccordionContent>{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
