
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import Script from 'next/script';
import { createFAQSchema } from '@/lib/seo';
import {
  Trophy, Clock, Calendar, Zap, Footprints, Dumbbell,
  GitCompare, Utensils, AlertTriangle, ClipboardList,
  Users, Smartphone,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  categoryStyle: string;
  icon: LucideIcon;
}

const faqItems: FaqItem[] = [
  {
    id: 'faq1',
    category: 'Race Basics',
    categoryStyle: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    icon: Trophy,
    question: 'What exactly happens in a Hyrox race?',
    answer:
      'Every Hyrox race follows an identical format worldwide: 8 × 1km runs, each immediately followed by one functional workout station. The stations always appear in the same fixed order — SkiErg (1,000m), Sled Push (50m), Sled Pull (50m), Burpee Broad Jump (80m), Rowing (1,000m), Farmers Carry (200m), Sandbag Lunges (100m), and Wall Balls (100 reps). This totals approximately 10km of running and a full-body functional challenge. Because the format never changes event to event, you can train specifically for every station and every run-to-station transition — which is exactly what our 12-week plans are built around.',
  },
  {
    id: 'faq2',
    category: 'Race Basics',
    categoryStyle: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    icon: Clock,
    question: 'What is a good Hyrox time for a beginner?',
    answer:
      'For a first Hyrox race, a realistic and respectable target is 1:45–2:10 for men and 2:00–2:20 for women — this puts you comfortably in the top half of all finishers. The global average finish time is approximately 1:40 for men and 1:54 for women across all divisions. The encouraging news: most athletes improve their time by 15–25 minutes between their first and second race through experience and smarter pacing alone — no extra fitness required. Rather than chasing a specific time on your debut, focus on finishing strong and not blowing up on the early stations. Our training plans teach you exactly how to pace each run and each station to get the most from your first race.',
  },
  {
    id: 'faq3',
    category: 'Training',
    categoryStyle: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    icon: Calendar,
    question: 'How many weeks do I need to train for Hyrox?',
    answer:
      'It depends on your starting point. Complete beginners should allow 12–16 weeks to build both running endurance and functional strength safely. If you already train regularly — running, lifting, or both — 8–12 weeks is sufficient. As a firm rule, never start a Hyrox prep block with fewer than 8 weeks to race day; the cumulative fitness adaptations simply cannot be rushed. Our 12-week plans sit in the sweet spot for most athletes: long enough to build a meaningful base, short enough to stay focused and motivated from Week 1 to race day. The plan adjusts to your race date, so wherever you are in your training calendar, we can fit a structured build around it.',
  },
  {
    id: 'faq4',
    category: 'Training',
    categoryStyle: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    icon: Zap,
    question: 'What is "compromised running" and why does it matter for Hyrox?',
    answer:
      'Compromised running means running in a pre-fatigued state — exactly what Hyrox demands after every station. Only your very first 1km is on fresh legs; the remaining seven runs come immediately after heavy functional efforts like the sled push, sandbag lunges, and farmers carry. Most athletes train running and station work in isolation, which is why pace often collapses in the later stages of a race. The fix is training the two together: complete a hard station effort (e.g. 30 sandbag lunges or 500m on the SkiErg) and then immediately run 1km at race pace — repeat 3–4 times. This conditions your breathing, heart rate, and running mechanics to handle the transition. In the first 100–200m of each run, focus on controlling your breath (inhale for 3 strides, exhale for 2) to settle your heart rate before pushing the pace. This type of session is built into every week of our training plans.',
  },
  {
    id: 'faq5',
    category: 'Training',
    categoryStyle: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    icon: AlertTriangle,
    question: 'What are the biggest Hyrox training mistakes beginners make?',
    answer:
      'The five most common mistakes: (1) Going out too hard — the SkiErg is your first station and it\'s tempting to sprint; a fast start often turns the final runs into a survival shuffle. Steady effort always beats hero splits. (2) Training running and stations in isolation — without practising compromised running in training, race-day transitions will destroy your pace. (3) Increasing mileage too quickly — follow the 10% weekly rule to avoid shin splints, stress fractures, and runner\'s knee. (4) Neglecting the 80/20 training split — roughly 80% of sessions should be low-intensity aerobic work; constant high-intensity training leads to burnout and injury. (5) Ignoring nutrition — fuelling is consistently the most overlooked element of preparation, yet it\'s critical for a 90-minute effort. Our training plans are specifically structured to help you avoid all five pitfalls from Week 1.',
  },
  {
    id: 'faq6',
    category: 'Training',
    categoryStyle: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    icon: Dumbbell,
    question: 'What is Hybrid Training and how does it apply to Hyrox?',
    answer:
      'Hybrid training is the practice of developing strength and cardiovascular endurance simultaneously within a single structured programme — rather than specialising in just one. For Hyrox, this means combining running (aerobic base and compromised running), strength work (sled push, carries, lunges), and functional endurance (SkiErg, rowing) into a concurrent training system. The science is clear: a 2022 meta-analysis found concurrent training produces strong gains in both disciplines, with VO₂max improvements of 8–15% and strength gains of 10–20% in key lifts. The long-held myth that "cardio kills your gains" has been largely debunked — the interference effect is primarily caused by poor recovery and poor session timing, not the combination itself. Our plans are built on these principles, with careful sequencing of strength and endurance sessions to maximise adaptations in both.',
  },
  {
    id: 'faq7',
    category: 'Race Basics',
    categoryStyle: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    icon: GitCompare,
    question: 'How does Hyrox compare to CrossFit and marathon running?',
    answer:
      'Hyrox sits in a distinct middle ground between the two. Compared to CrossFit, Hyrox is far more accessible — the eight stations use straightforward movements with no Olympic lifting or advanced gymnastics required, the format is identical at every event worldwide, and success rewards pacing and endurance over raw power output. Compared to a marathon, Hyrox is shorter (average ~90 minutes vs. 3–5 hours) but far more total-body demanding, thanks to the functional strength stations between each run. Marathon runners often find the running side manageable but are blindsided by station fatigue; gym-goers are often the opposite. The ideal Hyrox athlete trains both — which is the entire premise of HybridX.',
  },
  {
    id: 'faq8',
    category: 'Gear & Nutrition',
    categoryStyle: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    icon: Footprints,
    question: 'What shoes should I wear for Hyrox training and on race day?',
    answer:
      'Shoe choice is one of the most impactful equipment decisions for Hyrox — and the most common mistake is wearing pure running shoes. Hyrox involves 8km of running AND pushing a 152kg sled, which means you need a hybrid or cross-training shoe: stable enough for sled work and lunges, but light and cushioned enough for running. Avoid pure running shoes (too soft under sled load), lifting shoes (too rigid for 8km of running), and minimalist shoes (insufficient cushion). Look for functional fitness or cross-training shoes from brands like NOBULL, On, or Nike Metcon. Whichever shoe you choose, break it in across at least 3–4 training sessions before race day — never wear brand-new shoes on race morning.',
  },
  {
    id: 'faq9',
    category: 'Gear & Nutrition',
    categoryStyle: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    icon: Utensils,
    question: 'What should I eat before and during a Hyrox race?',
    answer:
      'Pre-race nutrition for Hyrox follows a clear, evidence-based protocol. In the 24–36 hours before your race, aim for 6–8g of carbohydrates per kg of bodyweight — oats, rice, sweet potatoes, pasta, and wraps all work well. Your last full meal should be 3–4 hours before your start: high carb, moderate protein, low fat and fibre for easy digestion. A small carb snack (banana, energy bar, or carbohydrate drink) 60–90 minutes before the gun tops up glycogen stores. During the race (typically 90+ minutes), target 30–60g of carbohydrates per hour via gels or chews, and sip water whenever available. The golden rule that applies to everything: never try anything new on race day. Test your entire nutrition strategy during your longer training simulations so there are zero surprises on the start line.',
  },
  {
    id: 'faq10',
    category: 'Our Products',
    categoryStyle: 'bg-accent/20 text-foreground border-accent/30',
    icon: ClipboardList,
    question: 'Do you offer Hyrox training plans for all ability levels?',
    answer:
      'Yes — our 12-week Hyrox training plans are built with beginner, intermediate, and advanced tracks. Each plan is personalised to your specific race date and uses RPE (Rate of Perceived Exertion) rather than fixed paces, so the intensity automatically scales to your fitness level. Every week includes running sessions, station-specific strength work, and dedicated compromised running workouts. You can follow the plan as a free downloadable PDF, work through it in our books, or track every session inside the HybridX app for a fully guided experience.',
  },
  {
    id: 'faq11',
    category: 'Our Products',
    categoryStyle: 'bg-accent/20 text-foreground border-accent/30',
    icon: Users,
    question: 'Who are the HybridX plans and books designed for?',
    answer:
      'HybridX resources are built for anyone wanting to improve at Hyrox or hybrid training — from complete beginners entering their first race to competitive athletes chasing a sub-60-minute finish. If you currently run, lift, or both, there is a plan structured around where you are right now. The books suit athletes who prefer a comprehensive offline reference to annotate and return to. The app is ideal for athletes who want a daily guided experience with built-in workout logging. And the free PDF plan is the perfect first step for anyone who isn\'t sure where to start.',
  },
  {
    id: 'faq12',
    category: 'Our Products',
    categoryStyle: 'bg-accent/20 text-foreground border-accent/30',
    icon: Smartphone,
    question: 'How do I access the HybridX app and what does it include?',
    answer:
      'The HybridX app is web-based and works on any device — visit app.hybridx.club and bookmark it for quick access. At £5/month with a 14-day free trial, it is a very affordable way to follow structured Hyrox training. Inside you\'ll find your daily workout delivered clearly and concisely with zero noise, session logging across the full 12 weeks to track your progress, and the ability to set your race date so the plan automatically aligns to your competition calendar. Unlike the PDF or book, the app removes all planning from the equation — you simply open it and train.',
  },
];

export default function FaqSection() {
  const schemaItems = faqItems.map(({ question, answer }) => ({ question, answer }));
  const faqSchema = createFAQSchema(schemaItems);

  return (
    <>
      <Script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <section id="faq" className="relative py-20 md:py-28 bg-secondary/30 overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 bg-subtle-x-light dark:bg-subtle-x-dark opacity-40 dark:opacity-25 mix-blend-multiply dark:mix-blend-screen" />
        <div className="container mx-auto px-6 relative z-10">

          {/* Section header */}
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-flex items-center gap-2 bg-accent/15 border border-accent/40 rounded-full px-4 py-1.5 mb-5 text-sm font-headline font-semibold text-foreground">
              Everything You Need to Know
            </div>
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-primary mb-3">
              Hyrox Training &amp; Hybrid Fitness FAQs
            </h2>
            <p className="text-lg text-muted-foreground font-body max-w-2xl mx-auto">
              Real answers to the questions athletes search for most — covering race format, training, nutrition, gear, and our products.
            </p>
          </div>

          {/* Category key */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {[
              { label: 'Race Basics',     style: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'      },
              { label: 'Training',        style: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' },
              { label: 'Gear & Nutrition',style: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
              { label: 'Our Products',    style: 'bg-accent/20 text-foreground border-accent/30'                        },
            ].map((cat) => (
              <span key={cat.label} className={`inline-flex items-center text-xs px-3 py-1 rounded-full font-body font-medium border ${cat.style}`}>
                {cat.label}
              </span>
            ))}
          </div>

          {/* Accordion */}
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="w-full space-y-2">
              {faqItems.map((item) => (
                <AccordionItem
                  key={item.id}
                  value={item.id}
                  className="border border-border/60 hover:border-accent/40 transition-colors duration-200 rounded-xl shadow-sm bg-background overflow-hidden"
                >
                  <AccordionTrigger className="px-5 py-4 text-left font-headline text-base md:text-lg text-primary hover:no-underline hover:bg-secondary/30 transition-colors duration-150 [&>svg]:flex-shrink-0">
                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                      <div className="flex-shrink-0 p-1.5 bg-accent/15 rounded-lg">
                        <item.icon className="h-4 w-4 text-accent" />
                      </div>
                      <span className="flex-1 text-left leading-snug">{item.question}</span>
                      <span className={`hidden sm:inline-flex flex-shrink-0 items-center text-xs px-2.5 py-0.5 rounded-full font-body font-medium border whitespace-nowrap ${item.categoryStyle}`}>
                        {item.category}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 pt-1 font-body text-muted-foreground leading-relaxed border-t border-border/40">
                    <div className="pt-3">{item.answer}</div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

        </div>
      </section>
    </>
  );
}
