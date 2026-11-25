
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import VDOTCalculatorForm from '@/components/calculators/VDOTCalculatorForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import CalculatorCTA from '@/components/calculators/CalculatorCTA';
import {
  createMetadata,
  createFAQSchema,
  createBreadcrumbSchema,
  createWebApplicationSchema,
  SITE_CONFIG,
} from '@/lib/seo';

import JsonLd from '@/components/JsonLd';
export const metadata = createMetadata({
  title: 'Free VDOT Calculator: Jack Daniels Paces',
  description:
    'Work out your Jack Daniels VDOT from any race result and get your Easy, Marathon, Threshold, Interval and Repetition paces. Free for runners and HYROX athletes.',
  path: '/vdot',
  keywords: [
    'VDOT calculator',
    'Jack Daniels VDOT',
    'VDOT running',
    'running training zones',
    'VDOT score',
    'Jack Daniels running formula',
    'easy pace calculator',
    'threshold pace calculator',
    'interval pace calculator',
    'running pace zones',
    'VO2max running calculator',
    'marathon training pace',
    'Hyrox running training',
    'VDOT table',
    'Daniels running formula paces',
  ],
});

const FAQS = [
  {
    question: 'What is VDOT?',
    answer:
      'VDOT is a measure of running ability developed by exercise physiologist Jack Daniels in his book "Daniels\' Running Formula". It reflects the effective VO₂max you demonstrate during a race — two runners with the same VDOT score have equivalent running fitness regardless of individual physiology. A higher VDOT indicates greater aerobic capacity.',
  },
  {
    question: 'What is a good VDOT score?',
    answer:
      'VDOT scores typically range from 30 (recreational joggers) to 85+ (elite athletes). A score of 40–50 represents a solid recreational runner; 50–60 is competitive club level; 60+ is sub-elite to elite. As a reference: a 5K in 25 minutes gives a VDOT of around 38, while a 20-minute 5K is approximately 48.',
  },
  {
    question: 'How do I use VDOT training paces?',
    answer:
      'Your VDOT score maps to five training zones. The majority of your weekly running (around 80%) should be at Easy (E) pace — conversational and aerobic. Threshold (T) runs build lactate clearance. Interval (I) and Repetition (R) sessions develop VO₂max and running economy. Matching your daily effort to the correct zone maximises adaptation and reduces injury risk.',
  },
  {
    question: 'How often should I recalculate my VDOT?',
    answer:
      'Recalculate after any significant race result, or every 4–8 weeks using a time trial. As your fitness improves, your VDOT rises and your training paces should be updated to continue the stimulus. Avoid chasing a higher VDOT by inputting unrealistic times — accurate inputs give accurate zones.',
  },
  {
    question: 'Can I use VDOT for Hyrox training?',
    answer:
      'Yes. For Hyrox athletes, Easy (E) and Threshold (T) paces are the primary targets. Easy pace builds your aerobic base for the 1km running segments, while Threshold work raises your lactate threshold — directly improving your ability to sustain pace after the functional stations. Interval work is useful in peak training blocks.',
  },
];

const HOW_TO_STEPS = [
  { name: 'Select your race distance', text: 'Choose the distance you ran from the grid — options range from 1,500m to a full Marathon.' },
  { name: 'Enter your finish time', text: 'Type your race finish time into the HH:MM:SS fields. Hours can be left blank for races under 60 minutes.' },
  { name: 'Calculate your VDOT', text: 'Press "Calculate VDOT". Your score will appear along with colour-coded training zone paces for all five Daniels zones.' },
  { name: 'Read your training paces', text: 'Use the Easy (E) pace for the bulk of your running. Use Threshold (T) for tempo work, and Interval (I) for track sessions.' },
  { name: 'Switch between km and miles', text: 'Use the km / mi toggle to display paces in your preferred unit.' },
];

export default function VDOTCalculatorPage() {
  const webAppSchema = createWebApplicationSchema({
    name: 'VDOT Calculator — Jack Daniels Training Paces',
    description:
      'Free calculator to compute your Jack Daniels VDOT score from any race result and generate training zone paces for Easy, Marathon, Threshold, Interval, and Repetition efforts.',
    url: '/vdot',
    keywords: ['VDOT', 'Jack Daniels', 'running training zones', 'pace calculator', 'VO2max'],
  });

  const faqSchema = createFAQSchema(FAQS);

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Calculators', url: '/calculators' },
    { name: 'Running Calculators', url: '/calculators/running' },
    { name: 'VDOT Calculator', url: '/vdot' },
  ]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Structured data */}
      <JsonLd data={webAppSchema} />
      <JsonLd data={faqSchema} />
      <JsonLd data={breadcrumbSchema} />

      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-lg mx-auto space-y-8">

          {/* Calculator card */}
          <Card className="shadow-xl border-border/60">
            <CardHeader className="text-center pb-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
                HybridX Club · Training Tools
              </p>
              <CardTitle as="h1" className="text-3xl md:text-4xl font-headline text-foreground leading-tight">
                Jack Daniels<br />
                <span className="text-primary">VDOT Calculator</span>
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground font-body mt-2">
                Enter a recent race result to get your VDOT score and all five training zone paces.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VDOTCalculatorForm />
            </CardContent>
          </Card>

          <CalculatorCTA calculator="vdot-calculator" />

          {/* FAQ — collapsible, subordinate to the tool */}
          <section aria-label="VDOT frequently asked questions">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              About VDOT
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border-border/50">
                  <AccordionTrigger className="text-sm font-medium text-foreground/90 hover:text-foreground text-left hover:no-underline py-3">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-3">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

        </div>
      </main>
      <Footer />
    </div>
  );
}
