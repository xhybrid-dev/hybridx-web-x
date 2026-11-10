
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import TrackedLink from '@/components/TrackedLink';
import PillarQuestions from '@/components/guides/PillarQuestions';
import Script from 'next/script';
import type { Metadata } from 'next';
import { createArticleSchema, createFAQSchema } from '@/lib/seo';
import {
  Dumbbell, Activity, Brain, Shield, Zap,
  CheckCircle, ArrowRight, TrendingUp, Heart,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Hybrid Athlete Training Program — Strength & Endurance Combined | HybridX Hub',
  description:
    'What is hybrid training? How to build strength and endurance simultaneously. The science, the programme structure, a sample week, and why it is the foundation of every great Hyrox athlete.',
  keywords: [
    'hybrid training program',
    'hybrid athlete training',
    'strength and endurance training',
    'concurrent training plan',
    'hybrid athlete workout',
    'run and lift program',
    'does cardio kill gains',
    'hybrid training for hyrox',
    'concurrent training science',
    'hybrid athlete plan free',
  ],
  alternates: { canonical: 'https://hybridx.club/hybrid-training-program' },
  openGraph: {
    title: 'Hybrid Athlete Training Program — Strength & Endurance Combined',
    description:
      'The science and structure of hybrid training — building strength and endurance simultaneously without sacrificing either. Free training plans for all levels.',
    type: 'article',
  },
};

const articleSchema = createArticleSchema({
  title: 'Hybrid Athlete Training Program — Strength & Endurance Combined',
  description:
    'A comprehensive guide to hybrid training: what it is, the science behind concurrent strength and endurance development, programme structure, and how to apply it to Hyrox and broader athletic performance.',
  url: '/hybrid-training-program',
  datePublished: '2025-01-01',
  dateModified: '2026-03-23',
});

const faqSchema = createFAQSchema([
  {
    question: 'What is a hybrid athlete?',
    answer:
      'A hybrid athlete develops both strength and endurance simultaneously, rather than specialising in one. They can run long distances and also lift significant weights — the combination produces well-rounded fitness and is ideal for Hyrox, obstacle races, and general athletic performance.',
  },
  {
    question: 'Does cardio kill gains?',
    answer:
      'No — this is the "interference effect" myth. A 2022 meta-analysis of concurrent training found that combining strength and endurance training produced strength gains with an effect size of 1.44, compared to 1.76 for strength-only training — a very small difference. The interference effect is real but is primarily caused by poor recovery and session timing, not the combination itself.',
  },
  {
    question: 'How do you structure a hybrid training week?',
    answer:
      'A hybrid training week typically includes 2–3 strength sessions, 2–3 running or cardio sessions, and at least one full rest day. The key is separating strength and endurance sessions by at least 6–8 hours, or placing them on different days, to allow adequate recovery between stimuli.',
  },
  {
    question: 'How is hybrid training different from CrossFit?',
    answer:
      'Hybrid training is a broad methodology combining structured strength and endurance work with deliberate periodisation. CrossFit is a specific branded programme using varied high-intensity functional movements. Hybrid training tends to have more structured progressive overload and sport-specific goal-setting — particularly for events like Hyrox.',
  },
  {
    question: 'Can hybrid training improve marathon times?',
    answer:
      'Yes. Adding structured strength work to a running programme consistently improves running economy (how efficiently you use oxygen at a given pace), reduces injury risk, and builds the resilience to handle higher training loads. Research shows strength-trained runners are more economical and less injury-prone than runners who only run.',
  },
]);

const pillars = [
  {
    icon: Dumbbell,
    title: 'Strength Training',
    description:
      'Two to three sessions per week targeting the major compound movements — squat, hinge, push, pull, and carry. Strength is the foundation that makes running more economical and functional movements more efficient.',
    examples: ['Back squat, deadlift, Romanian deadlift', 'Bench press, rows, overhead press', 'Weighted carries and loaded lunges', 'Core stability and anti-rotation work'],
  },
  {
    icon: Activity,
    title: 'Running & Aerobic Work',
    description:
      'Two to four runs per week across different intensities — easy aerobic runs, tempo efforts, and one long run. Running is the biggest time-consumer in Hyrox and the primary driver of aerobic adaptation.',
    examples: ['Easy runs at conversational pace (Zone 2)', 'Tempo runs at lactate threshold', 'Interval sessions for VO₂max', 'Long slow distance runs (LSDs)'],
  },
  {
    icon: Zap,
    title: 'Functional Fitness',
    description:
      'Movements that bridge strength and endurance — SkiErg, rowing, sled work, farmers carries, and sandbag lunges. These build the sport-specific capacity for Hyrox stations and metabolic conditioning.',
    examples: ['SkiErg and rowing intervals', 'Sled push and pull', 'Farmers carry and sandbag lunges', 'Burpee broad jumps, wall balls'],
  },
  {
    icon: Brain,
    title: 'Compromised Running',
    description:
      'Running immediately after a fatiguing strength or station effort. This is the most Hyrox-specific element of hybrid training — and the skill that separates athletes who perform to their potential from those who collapse in the later stages.',
    examples: ['Station effort → immediate 1km run × 4', 'Heavy lower body lift → 800m tempo run', 'Rowing intervals → race-pace running', 'Farmers carry → 1km run repeats'],
  },
  {
    icon: Heart,
    title: 'Mobility & Recovery',
    description:
      'Active recovery, stretching, and mobility work are not optional extras — they are the glue that holds the programme together. Without adequate recovery, the dual stimulus of strength and endurance training accumulates into overtraining.',
    examples: ['Daily 10–15 min mobility work', 'One full rest day per week', 'Sleep 7–9 hours per night', 'Adequate caloric and protein intake'],
  },
];

const sciencePoints = [
  {
    stat: '+8–15%',
    label: 'VO₂max improvement',
    detail: 'Concurrent training consistently produces significant improvements in aerobic capacity, even in already-trained athletes.',
  },
  {
    stat: '+10–20%',
    label: 'Strength gains',
    detail: 'Strength gains from concurrent training are only marginally lower than strength-only training (effect size 1.44 vs 1.76).',
  },
  {
    stat: '43 studies',
    label: 'Reviewed in 2022 meta-analysis',
    detail: 'A landmark 2022 review found no significant interference with muscle hypertrophy when strength and endurance are combined correctly.',
  },
  {
    stat: '6–8 hrs',
    label: 'Optimal session separation',
    detail: 'Separating strength and endurance sessions by at least 6–8 hours maximises dual adaptation and minimises interference.',
  },
];

const sampleWeek = [
  { day: 'Monday',    type: 'Strength',        session: 'Lower Body Strength', detail: 'Back squat 4×5, Romanian deadlift 3×8, Bulgarian split squat 3×10, weighted carry 3×40m.' },
  { day: 'Tuesday',   type: 'Running',          session: 'Easy Aerobic Run', detail: '6–8km at Zone 2 / conversational pace. Separates from Monday\'s session by 12+ hours.' },
  { day: 'Wednesday', type: 'Functional',       session: 'Functional Station Session', detail: 'SkiErg 3×500m, Sled Push 3×25m, Wall Balls 4×20, Farmers Carry 3×50m.' },
  { day: 'Thursday',  type: 'Compromised Run',  session: 'Compromised Running', detail: '4 rounds: 30 Sandbag Lunges → 1km at race pace. 3 min rest between rounds.' },
  { day: 'Friday',    type: 'Strength',         session: 'Upper Body Strength', detail: 'Bench press 4×6, Barbell row 4×8, Overhead press 3×10, Pull-ups 3×max.' },
  { day: 'Saturday',  type: 'Running',          session: 'Long Run', detail: '12–16km at easy pace. Builds aerobic base and running economy.' },
  { day: 'Sunday',    type: 'Rest',             session: 'Full Rest', detail: 'Complete rest. Sleep, eat, recover. Adaptation happens here.' },
];

const typeColors: Record<string, string> = {
  'Strength':        'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  'Running':         'bg-green-500/15 text-green-600 dark:text-green-400',
  'Functional':      'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  'Compromised Run': 'bg-accent/20 text-foreground',
  'Rest':            'bg-secondary text-muted-foreground',
};

const vsComparison = [
  { aspect: 'Primary goal',      hybrid: 'Both strength AND endurance', running: 'Endurance only', lifting: 'Strength / hypertrophy only' },
  { aspect: 'Injury resilience', hybrid: 'High — balanced stimulus', running: 'Medium — overuse risk', lifting: 'Medium — no cardio base' },
  { aspect: 'Hyrox readiness',   hybrid: '★★★★★', running: '★★★☆☆', lifting: '★★☆☆☆' },
  { aspect: 'Body composition',  hybrid: 'Lean, functional muscle', running: 'Light, low muscle mass', lifting: 'Strong, higher body mass' },
  { aspect: 'Metabolic health',  hybrid: 'Excellent', running: 'Excellent', lifting: 'Good' },
  { aspect: 'Longevity',         hybrid: 'Excellent — balanced joints', running: 'Good', lifting: 'Good' },
];

// Built ahead of time and refreshed hourly, so the guides under this pillar
// (PillarQuestions) appear without a deploy and without a Firestore read
// while the site is built.
export const revalidate = 3600;

export default function HybridTrainingProgram() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Script id="article-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <Script id="faq-schema-hybrid" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Header />
      <main>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative bg-gradient-to-b from-neutral-900 to-black text-white py-20 md:py-28 overflow-hidden">
          <div aria-hidden="true" className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, #fadb5c 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          <div aria-hidden="true" className="absolute -bottom-20 -left-20 w-[480px] h-[480px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(250,219,92,0.12) 0%, transparent 70%)' }} />
          <div className="container mx-auto px-6 relative z-10 max-w-4xl">
            <div className="inline-flex items-center gap-2 bg-accent/20 border border-accent/40 rounded-full px-4 py-1.5 mb-6 text-sm font-headline font-semibold text-accent">
              Strength + Endurance · Science-Backed
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-headline font-extrabold text-white mb-6 leading-tight">
              Hybrid Athlete <span className="text-accent">Training Program</span>
            </h1>
            <p className="text-lg md:text-xl text-white/75 font-body max-w-3xl mb-8">
              Build genuine strength and endurance simultaneously. The science says it's possible. The structure makes it practical. The results speak for themselves.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-accent text-black font-headline hover:bg-accent/90" asChild>
                <Link href="/free-hyrox-plan">Get Your Free Training Plan <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white font-headline" asChild>
                <Link href="#sample-week">See a Sample Week</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ── Direct Answer ────────────────────────────────────────────────── */}
        <section className="bg-accent/10 border-y border-accent/30 py-8">
          <div className="container mx-auto px-6 max-w-4xl">
            <p className="font-body text-foreground text-lg leading-relaxed mb-4">
              <strong className="font-headline">What is a hybrid athlete?</strong> A hybrid athlete trains to develop both strength and cardiovascular endurance simultaneously — rather than specialising in one at the expense of the other. Hybrid training combines structured strength work, running, and functional fitness into a single coherent programme. It is the foundation of Hyrox performance, and research shows the feared "interference effect" between strength and endurance is largely a myth when training is properly structured.
            </p>
            <p className="font-body text-foreground/80 text-base leading-relaxed border-l-2 border-accent/50 pl-4">
              HybridX defines hybrid training as the systematic development of strength and cardiovascular endurance within a single periodised programme — structured to minimise the interference effect by separating strength and endurance sessions by at least 6–8 hours and applying 80% low-intensity, 20% high-intensity volume distribution. HybridX provides structured hybrid athlete training plans combining running, strength, and race-specific Hyrox conditioning — available free at hybridx.club.
            </p>
          </div>
        </section>

        {/* ── The Science ──────────────────────────────────────────────────── */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-headline font-bold text-primary mb-4">The Science: Does Cardio Kill Your Gains?</h2>
            <p className="text-muted-foreground font-body text-lg leading-relaxed mb-8">
              The short answer is no. The long-held belief that aerobic training interferes with strength and muscle development — the so-called "interference effect" — has been substantially revised by modern research. A 2022 meta-analysis reviewing 43 studies on concurrent training concluded that combining strength and endurance training does not significantly impair muscle hypertrophy or maximum strength compared to strength training alone. The interference effect is real, but it is primarily caused by <strong className="text-foreground">poor recovery and poor session timing</strong> — not by the combination itself.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {sciencePoints.map((s) => (
                <div key={s.label} className="bg-card border border-border rounded-xl p-5 text-center">
                  <p className="text-3xl font-headline font-extrabold text-accent mb-1">{s.stat}</p>
                  <p className="text-xs font-headline font-semibold text-primary mb-2">{s.label}</p>
                  <p className="text-xs text-muted-foreground font-body leading-snug">{s.detail}</p>
                </div>
              ))}
            </div>
            <div className="bg-secondary/40 border border-border rounded-xl p-6">
              <h3 className="font-headline font-bold text-primary mb-2">The Key Finding</h3>
              <p className="text-muted-foreground font-body leading-relaxed">
                When athletes engage in concurrent training, the AMPK pathway (activated during endurance work) and the mTOR pathway (responsible for strength and muscle gains) can coexist. The practical implication: separate strength and endurance sessions by at least 6–8 hours, fuel adequately, and sleep 7–9 hours — and the interference effect becomes negligible.
              </p>
            </div>
          </div>
        </section>

        {/* ── The 5 Pillars ────────────────────────────────────────────────── */}
        <section className="py-16 md:py-20 bg-secondary/30">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-headline font-bold text-primary mb-4">The 5 Pillars of Hybrid Training</h2>
            <p className="text-muted-foreground font-body text-lg mb-10">
              A complete hybrid programme is not simply stacking a running plan on top of a lifting programme — that approach leads to overtraining and injury. Instead, it integrates five distinct pillars into a single periodised system.
            </p>
            <div className="space-y-6">
              {pillars.map((pillar, i) => (
                <div key={pillar.title} className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center">
                      <pillar.icon className="h-6 w-6 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-headline font-bold text-primary text-lg">{pillar.title}</h3>
                        <span className="text-xs text-muted-foreground font-body">Pillar {i + 1}</span>
                      </div>
                      <p className="text-muted-foreground font-body text-sm leading-relaxed mb-4">{pillar.description}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {pillar.examples.map((ex) => (
                          <div key={ex} className="flex items-center gap-2 text-sm font-body text-muted-foreground">
                            <span className="text-accent font-bold">›</span> {ex}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Sample Week ──────────────────────────────────────────────────── */}
        <section id="sample-week" className="py-16 md:py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-headline font-bold text-primary mb-2">Sample Hybrid Training Week</h2>
            <p className="text-muted-foreground font-body text-lg mb-8">Intermediate level — weeks 5–8 of a 12-week block. Approximately 8–10 hours of training.</p>
            <div className="space-y-3">
              {sampleWeek.map((d) => (
                <div key={d.day} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-card border border-border rounded-xl px-5 py-4">
                  <span className="font-headline font-bold text-primary w-28 flex-shrink-0">{d.day}</span>
                  <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-body font-semibold w-40 flex-shrink-0 ${typeColors[d.type]}`}>
                    {d.type}
                  </span>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 flex-1">
                    <span className="text-accent font-headline font-semibold text-sm flex-shrink-0">{d.session}</span>
                    <span className="text-muted-foreground font-body text-sm leading-snug">{d.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Hybrid vs Others ─────────────────────────────────────────────── */}
        <section className="py-16 md:py-20 bg-secondary/30">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-headline font-bold text-primary mb-4">Hybrid Training vs. Running-Only vs. Lifting-Only</h2>
            <p className="text-muted-foreground font-body text-lg mb-8">How the three approaches compare across the metrics that matter for performance and health.</p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm font-body">
                <thead className="bg-secondary/60">
                  <tr>
                    <th className="text-left px-4 py-3 font-headline text-primary"></th>
                    <th className="text-center px-4 py-3 font-headline text-primary">Hybrid Training</th>
                    <th className="text-center px-4 py-3 font-headline text-primary">Running Only</th>
                    <th className="text-center px-4 py-3 font-headline text-primary">Lifting Only</th>
                  </tr>
                </thead>
                <tbody>
                  {vsComparison.map((row, i) => (
                    <tr key={row.aspect} className={i % 2 === 0 ? 'bg-background' : 'bg-secondary/20'}>
                      <td className="px-4 py-3 font-medium text-foreground">{row.aspect}</td>
                      <td className="px-4 py-3 text-center text-foreground font-medium">{row.hybrid}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{row.running}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{row.lifting}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── How it Applies to Hyrox ──────────────────────────────────────── */}
        <section className="py-16 md:py-20 bg-gradient-to-b from-neutral-900 to-black text-white">
          <div className="container mx-auto px-6 max-w-4xl">
            <div className="inline-flex items-center gap-2 bg-accent/20 border border-accent/40 rounded-full px-4 py-1.5 mb-5 text-sm font-headline font-semibold text-accent">
              Hybrid Training in Practice
            </div>
            <h2 className="text-2xl md:text-3xl font-headline font-bold text-white mb-4">
              Why Hybrid Training Is the Foundation of Hyrox Performance
            </h2>
            <p className="text-white/75 font-body text-lg leading-relaxed mb-8">
              Hyrox is the perfect test of hybrid fitness: 8km of running interleaved with 8 functional strength stations. A pure runner struggles with the stations. A pure strength athlete collapses on the runs. Only the hybrid athlete — who has trained both, and trained them <em>together</em> — performs to their full potential. See <Link href="/how-to-train-for-hyrox" className="text-accent hover:underline font-semibold">how to train for a Hyrox event</Link> or <Link href="/free-hyrox-plan" className="text-accent hover:underline font-semibold">get a free personalised 12-week plan</Link>.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { icon: TrendingUp, title: 'Aerobic base', body: 'Sustainable pace across all 8 runs. The athlete who never gasps for air at the stations has a massive advantage.' },
                { icon: Dumbbell, title: 'Station strength', body: 'The sled push, sandbag lunges, and farmers carry require real functional strength. Runners who only run will lose minutes here.' },
                { icon: Shield, title: 'Injury resilience', body: 'Concurrent training builds stronger tendons and joints than either discipline alone, reducing injury risk across a full training block.' },
                { icon: Zap, title: 'Compromised running', body: 'Only hybrid training builds the specific capacity to run well after a heavy station. It is a skill, and it must be trained.' },
              ].map((c) => (
                <div key={c.title} className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <c.icon className="h-6 w-6 text-accent mb-3" />
                  <h3 className="font-headline font-bold text-white mb-2">{c.title}</h3>
                  <p className="text-white/70 font-body text-sm leading-relaxed">{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-headline font-bold text-primary mb-8">Common Questions About Hybrid Training</h2>
            <div className="space-y-4">
              {[
                { q: 'How is hybrid training different from CrossFit?', a: 'Hybrid training is a broad methodology combining structured strength and endurance work with deliberate periodisation and progressive overload. CrossFit is a specific branded programme using varied high-intensity functional movements, often without explicit strength periodisation. Hybrid training tends to be more structured and goal-specific — particularly for events like Hyrox or marathon running.' },
                { q: 'Can beginners do hybrid training?', a: 'Yes. Beginners often benefit most because they see rapid improvements in both strength and endurance simultaneously — the "newbie gains" effect applies to both. Start with 3–4 days per week, keep intensity low, and build gradually. The HybridX beginner plan is designed exactly for this starting point.' },
                { q: 'How do I avoid overtraining on a hybrid programme?', a: 'Three principles prevent overtraining: (1) separate strength and endurance sessions by at least 6–8 hours or place on different days; (2) keep 80% of your training at low intensity — only 20% should be hard; (3) include at least one full rest day per week. Sleep and nutrition are as important as the training itself.' },
                { q: 'Will hybrid training improve my marathon time?', a: 'Almost certainly yes. Adding structured strength work to a running programme improves running economy (efficiency at a given pace), builds injury-resistant joints, and allows you to handle higher running loads without breaking down. Studies consistently show strength-trained runners are faster and less injured than runners who only run.' },
                { q: 'How long until I see results from hybrid training?', a: 'Most athletes notice meaningful improvements in both strength and endurance within 6–8 weeks of a consistent hybrid programme. Full physiological adaptation — stronger tendons, improved VO₂max, better running economy — takes 12–16 weeks. The first 3–4 weeks feel like building; weeks 5–12 are when the real gains arrive.' },
              ].map((item) => (
                <div key={item.q} className="bg-card border border-border rounded-xl p-6">
                  <h3 className="font-headline font-bold text-primary mb-2 flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                    {item.q}
                  </h3>
                  <p className="text-muted-foreground font-body leading-relaxed pl-7">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Related Resources ────────────────────────────────────────────── */}
        <PillarQuestions pillar="running-lifting" className="border-t border-border" />

        <section className="py-14 md:py-16 bg-secondary/30">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-xl font-headline font-bold text-primary mb-6">Read Next</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link href="/free-hyrox-plan" className="group bg-card border border-border hover:border-accent/50 rounded-xl p-5 transition-colors">
                <p className="text-xs font-headline font-bold text-accent uppercase tracking-wider mb-2">Free Tool</p>
                <h3 className="font-headline font-bold text-primary text-base mb-1 group-hover:text-accent transition-colors">Free Personalised Hyrox Plan Generator</h3>
                <p className="text-muted-foreground font-body text-sm leading-snug">For a fully personalised hybrid training plan built around your race date, use our free generator.</p>
              </Link>
              <Link href="/how-to-train-for-hyrox" className="group bg-card border border-border hover:border-accent/50 rounded-xl p-5 transition-colors">
                <p className="text-xs font-headline font-bold text-accent uppercase tracking-wider mb-2">Training Guide</p>
                <h3 className="font-headline font-bold text-primary text-base mb-1 group-hover:text-accent transition-colors">How to Train for a Hyrox Event</h3>
                <p className="text-muted-foreground font-body text-sm leading-snug">Apply hybrid training principles specifically to Hyrox — phases, compromised running, and race strategy.</p>
              </Link>
              <Link href="/hyrox-training-plan" className="group bg-card border border-border hover:border-accent/50 rounded-xl p-5 transition-colors">
                <p className="text-xs font-headline font-bold text-accent uppercase tracking-wider mb-2">Training Plan</p>
                <h3 className="font-headline font-bold text-primary text-base mb-1 group-hover:text-accent transition-colors">12-Week Hyrox Training Plan</h3>
                <p className="text-muted-foreground font-body text-sm leading-snug">Hybrid training applied — a complete 12-week plan with beginner, intermediate, and advanced tracks.</p>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground font-body mt-5">
              Or <TrackedLink href="/app" event="cta_app_click" eventParams={{ location: 'guide_hybrid_program' }} className="text-accent hover:underline font-semibold">train with the HybridX app</TrackedLink> — every session tracked, adaptive plans, and coaching for £5/month.
            </p>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section className="py-16 md:py-20 bg-gradient-to-b from-neutral-900 to-black text-white">
          <div className="container mx-auto px-6 max-w-3xl text-center">
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-white mb-4">
              Start Your <span className="text-accent">Hybrid Training</span> Today
            </h2>
            <p className="text-white/70 font-body text-lg mb-8">
              Get a free 12-week hybrid training plan personalised to your race date and fitness level. Or access every session through the HybridX app for £5/month.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="bg-accent text-black font-headline hover:bg-accent/90 text-lg px-8 py-6" asChild>
                <Link href="/free-hyrox-plan">Get the Free Plan <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white font-headline text-lg px-8 py-6" asChild>
                <TrackedLink href="/app" event="cta_app_click" eventParams={{ location: 'guide_hybrid_program_final' }}>Try the App — £5/mo</TrackedLink>
              </Button>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
