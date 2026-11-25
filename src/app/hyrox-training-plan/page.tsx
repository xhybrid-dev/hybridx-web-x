
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import TrackedLink from '@/components/TrackedLink';
import Script from 'next/script';
import type { Metadata } from 'next';
import { createCourseSchema, createFAQSchema } from '@/lib/seo';
import { Download, CheckCircle, ArrowRight, Users, Calendar, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: '12 Week Hyrox Training Plan — Free & Downloadable | HybridX Hub',
  description:
    'Get a free 12-week Hyrox training plan dated back from your race day. Beginner scaling and advanced challenges on every session, with running, station work and compromised running.',
  keywords: [
    '12 week hyrox training plan',
    'hyrox training plan free',
    'hyrox training plan pdf',
    'hyrox training plan beginner',
    'hyrox training plan intermediate',
    'hyrox training plan advanced',
    'hyrox 12 week program',
    'free hyrox plan download',
  ],
  alternates: { canonical: 'https://hybridx.club/hyrox-training-plan' },
  openGraph: {
    title: '12 Week Hyrox Training Plan — Free & Downloadable',
    description: 'A free, personalised 12-week Hyrox training plan for all levels. Download your PDF and start training today.',
    type: 'article',
  },
};

const courseSchema = createCourseSchema({
  name: '12-Week Hyrox Training Plan',
  description:
    'A free 12-week Hyrox training plan dated back from your race day, with beginner scaling and advanced challenges. Includes running sessions, station-specific training, and compromised running workouts.',
  url: '/hyrox-training-plan',
  level: 'All levels',
});

const faqSchema = createFAQSchema([
  { question: 'Is the 12-week Hyrox training plan really free?', answer: 'Yes — the full 12-week PDF plan is completely free. You enter your race date and it downloads straight away as a dated PDF and calendar file. No account required.' },
  { question: 'What level is the 12-week Hyrox plan for?', answer: 'It is one 12-week plan with three to four main sessions a week, set by RPE. Every session has a scaling option for beginners and an advanced challenge, so the same plan works from first-timer to experienced racer.' },
  { question: 'What does the 12-week Hyrox plan include?', answer: 'Every week includes: 2–3 running sessions (easy, tempo, and long runs), 2 station-specific sessions targeting all 8 Hyrox movements, and 1 compromised running session (station efforts immediately followed by race-pace running).' },
  { question: 'Can I start the plan if I am not very fit?', answer: 'Yes. The beginner track starts conservatively and builds gradually over 12 weeks. If you have very little current fitness, consider starting 14–16 weeks out from your race to give yourself more time in the base phase.' },
]);

const phases = [
  {
    phase: 'Phase 1', weeks: 'Weeks 1–3', name: 'Aerobic Base', color: 'border-sky-500',
    items: ['3 easy runs per week (conversational pace)', 'General strength — squats, lunges, carries, rows', 'Introduce SkiErg and rowing technique', 'No high intensity — build the engine first'],
  },
  {
    phase: 'Phase 2', weeks: 'Weeks 4–7', name: 'Station Training', color: 'border-green-500',
    items: ['All 8 stations introduced and drilled', 'First compromised running sessions begin', 'Tempo runs and threshold work added', 'Station technique refined under moderate fatigue'],
  },
  {
    phase: 'Phase 3', weeks: 'Weeks 8–10', name: 'Race Simulation', color: 'border-accent',
    items: ['Partial and full race simulations', 'Highest training volume of the block', 'Compromised running at full race pace', 'Nutrition and pacing strategy practised'],
  },
  {
    phase: 'Phase 4', weeks: 'Weeks 11–12', name: 'Peak & Taper', color: 'border-purple-500',
    items: ['Week 11: final peak volume session', 'Week 12: 40–50% volume reduction', 'Easy runs and mobility only', 'Rest, sleep, eat well, and race'],
  },
];

const levelComparison = [
  { label: 'Training days / week', beginner: '3–4 days', intermediate: '4–5 days', advanced: '5–6 days' },
  { label: 'Weekly running volume', beginner: '15–25 km', intermediate: '25–40 km', advanced: '40–55 km' },
  { label: 'Station sessions / week', beginner: '1–2', intermediate: '2', advanced: '2–3' },
  { label: 'Compromised run sessions', beginner: '1× every 2 weeks', intermediate: '1× per week', advanced: '2× per week' },
  { label: 'Long run distance', beginner: '8–10 km', intermediate: '12–16 km', advanced: '16–20 km' },
  { label: 'Race simulations', beginner: '1 partial sim', intermediate: '1–2 full sims', advanced: '2–3 full sims' },
];

const beginnerSampleWeek = [
  { day: 'Mon', session: 'Easy Run', detail: '4–5km at easy conversational pace. Heart rate stays low.' },
  { day: 'Tue', session: 'Station Session', detail: 'SkiErg 3×400m · Farmers Carry 3×40m · Wall Balls 3×15. Rest generously between sets.' },
  { day: 'Wed', session: 'Rest / Mobility', detail: 'Full rest or 20 min light stretching.' },
  { day: 'Thu', session: 'Compromised Run', detail: '3 rounds: 20 Sandbag Lunges → 800m run. 4 min rest between rounds.' },
  { day: 'Fri', session: 'Rest', detail: 'Complete rest.' },
  { day: 'Sat', session: 'Long Easy Run', detail: '7–8km at comfortable pace. Focus on time on feet.' },
  { day: 'Sun', session: 'Rest', detail: 'Full recovery.' },
];

const intermediateSampleWeek = [
  { day: 'Mon', session: 'Tempo Run', detail: '8km with 4km at race pace. Structured effort with controlled breathing.' },
  { day: 'Tue', session: 'Station Session A', detail: 'SkiErg 3×500m · Sled Push 4×25m · Sled Pull 4×25m. High intensity, full rest.' },
  { day: 'Wed', session: 'Easy Run', detail: '6km easy. Active recovery run at conversational pace.' },
  { day: 'Thu', session: 'Compromised Run', detail: '4 rounds: 30 Sandbag Lunges + 500m Row → 1km at race pace. 3 min rest.' },
  { day: 'Fri', session: 'Station Session B', detail: 'Burpee Broad Jump 3×30m · Farmers Carry 3×50m · Wall Balls 4×20. Core work.' },
  { day: 'Sat', session: 'Long Run', detail: '12–14km easy. Builds aerobic ceiling and running economy.' },
  { day: 'Sun', session: 'Rest / Mobility', detail: 'Full rest. Recovery is when adaptation happens.' },
];

const planIncludes = [
  'Running sessions for every week (easy, tempo, long, and race-pace)',
  'Station-specific strength work targeting all 8 Hyrox movements',
  'Weekly compromised running sessions (the #1 performance lever)',
  'RPE-based intensity targets — scales to your current fitness',
  'Race-week taper protocol',
  'Nutrition timing guidelines for training and race day',
  'Personalised to your exact race date',
  'Beginner scaling and advanced challenges on every session',
];

export default function HyroxTrainingPlan() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Script id="course-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchema) }} />
      <Script id="faq-schema-plan" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Header />
      <main>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative bg-gradient-to-b from-neutral-900 to-black text-white py-20 md:py-28 overflow-hidden">
          <div aria-hidden="true" className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, #fadb5c 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          <div aria-hidden="true" className="absolute -top-20 -right-20 w-[480px] h-[480px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(250,219,92,0.15) 0%, transparent 70%)' }} />
          <div className="container mx-auto px-6 relative z-10 max-w-4xl">
            <div className="inline-flex items-center gap-2 bg-accent/20 border border-accent/40 rounded-full px-4 py-1.5 mb-6 text-sm font-headline font-semibold text-accent">
              Free Download · All Levels
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-headline font-extrabold text-white mb-6 leading-tight">
              12 Week Hyrox <span className="text-accent">Training Plan</span>
            </h1>
            <p className="text-lg md:text-xl text-white/75 font-body max-w-3xl mb-8">
              A free 12-week Hyrox training plan, dated back from your race day and built around the race demands, with beginner scaling and advanced challenges on every session.
            </p>
            <div className="flex flex-wrap gap-3 mb-10">
              {['100% Free PDF', 'Personalised to your race date', 'Beginner → Advanced tracks', 'Includes compromised running'].map((b) => (
                <span key={b} className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1.5 text-sm font-body text-white/90">
                  <CheckCircle className="h-3.5 w-3.5 text-accent flex-shrink-0" /> {b}
                </span>
              ))}
            </div>
            <Button size="lg" className="bg-accent text-black font-headline hover:bg-accent/90 text-lg px-8 py-6" asChild>
              <Link href="/free-hyrox-plan"><Download className="mr-2 h-5 w-5" /> Get the Free Plan Now</Link>
            </Button>
          </div>
        </section>

        {/* ── Direct Answer ────────────────────────────────────────────────── */}
        <section className="bg-accent/10 border-y border-accent/30 py-8">
          <div className="container mx-auto px-6 max-w-4xl">
            <p className="font-body text-foreground text-lg leading-relaxed mb-4">
              <strong className="font-headline">What this plan is:</strong> A free, structured 12-week Hyrox training programme with a scaling option for beginners and an advanced challenge on every session. It is built around four training phases — base building, station introduction, race simulation, and taper — and includes running sessions, station-specific training, and weekly compromised running workouts. It is dated back from your race day so every session counts down to your competition. For a full explanation of the training methodology behind this plan, read <Link href="/how-to-train-for-hyrox" className="text-accent-ink hover:underline font-semibold">How to Train for a Hyrox Event</Link>.
            </p>
            <p className="font-body text-foreground/80 text-base leading-relaxed border-l-2 border-accent/50 pl-4">
              HybridX's 12-week Hyrox training plan is structured across four phases: aerobic base (weeks 1–3), station-specific training (weeks 4–7), race simulation (weeks 8–10), and peak and taper (weeks 11–12). The plan is available free, personalised to your exact race date, and provides beginner, intermediate, and advanced tracks — each including running sessions, all 8 station movements, and weekly compromised running workouts.
            </p>
          </div>
        </section>

        {/* ── People Also Ask ──────────────────────────────────────────────── */}
        <section className="py-14 md:py-18 bg-secondary/30">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-sm font-headline font-bold text-primary mb-6 uppercase tracking-widest">People Also Ask</h2>
            <div className="space-y-5">

              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-headline font-bold text-primary text-lg mb-3 flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-accent-ink flex-shrink-0 mt-0.5" />
                  Can I get a Hyrox training plan for free?
                </h3>
                <p className="text-muted-foreground font-body leading-relaxed mb-4 pl-7">
                  Yes. HybridX offers a free personalised Hyrox training plan generator — you enter your race date, and a complete 12-week PDF and calendar file are built in your browser and download straight away. It covers all 4 training phases, running sessions, station-specific work, and compromised running. No account or payment required.
                </p>
                <div className="pl-7">
                  <Link href="/free-hyrox-plan" className="inline-flex items-center gap-2 bg-accent text-black font-headline font-bold text-sm px-4 py-2 rounded-lg hover:bg-accent/90 transition-colors">
                    Generate Your Free Hyrox Plan <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-headline font-bold text-primary text-lg mb-3 flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-accent-ink flex-shrink-0 mt-0.5" />
                  What should a 12-week Hyrox training plan include?
                </h3>
                <ul className="pl-7 space-y-1.5 text-muted-foreground font-body text-sm">
                  <li className="flex items-start gap-2"><span className="text-accent-ink font-bold mt-0.5">→</span> 2–3 running sessions per week (easy, tempo, and long run)</li>
                  <li className="flex items-start gap-2"><span className="text-accent-ink font-bold mt-0.5">→</span> 2 station-specific sessions targeting all 8 Hyrox movements</li>
                  <li className="flex items-start gap-2"><span className="text-accent-ink font-bold mt-0.5">→</span> Weekly compromised running sessions — station effort directly followed by a 1km run</li>
                  <li className="flex items-start gap-2"><span className="text-accent-ink font-bold mt-0.5">→</span> 4 structured phases: Base Build → Station Training → Race Simulation → Taper</li>
                  <li className="flex items-start gap-2"><span className="text-accent-ink font-bold mt-0.5">→</span> Progressive overload across all 12 weeks with a final taper of 40–50% volume reduction</li>
                </ul>
              </div>

              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-headline font-bold text-primary text-lg mb-3 flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-accent-ink flex-shrink-0 mt-0.5" />
                  Is 12 weeks enough time to train for Hyrox?
                </h3>
                <p className="text-muted-foreground font-body leading-relaxed pl-7">
                  For most athletes, yes. Intermediate athletes (those who already run 2–3× per week and train in the gym) can be fully prepared in 12 weeks. Complete beginners benefit from 14–16 weeks to allow more time in the aerobic base phase. Advanced athletes with a strong existing base may be ready in as few as 8–10 weeks.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ── What's Included ──────────────────────────────────────────────── */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-headline font-bold text-primary mb-8">What the 12-Week Plan Includes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {planIncludes.map((item) => (
                <div key={item} className="flex items-start gap-3 bg-card border border-border rounded-xl p-4">
                  <CheckCircle className="h-5 w-5 text-accent-ink flex-shrink-0 mt-0.5" />
                  <span className="font-body text-foreground text-sm leading-snug">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4 Phases ─────────────────────────────────────────────────────── */}
        <section className="py-16 md:py-20 bg-secondary/30">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-headline font-bold text-primary mb-4">The 4 Training Phases</h2>
            <p className="text-muted-foreground font-body text-lg mb-10">Each phase builds on the previous, so you peak at race day — not week 6.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {phases.map((phase) => (
                <div key={phase.phase} className={`bg-card border-l-4 ${phase.color} border border-border rounded-xl p-6`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-headline font-extrabold text-xl text-primary">{phase.name}</span>
                    <span className="text-xs font-body text-muted-foreground bg-secondary/60 px-2.5 py-0.5 rounded-full">{phase.weeks}</span>
                  </div>
                  <ul className="space-y-2">
                    {phase.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm font-body text-muted-foreground">
                        <span className="text-accent-ink mt-1 flex-shrink-0">›</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Level Comparison ─────────────────────────────────────────────── */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-headline font-bold text-primary mb-4">Scaling the Plan: Beginner, Intermediate &amp; Advanced</h2>
            <p className="text-muted-foreground font-body text-lg mb-8">The downloadable plan is one 12-week plan. Use each session's scaling option and advanced challenge to match the level that fits you.</p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm font-body">
                <thead className="bg-secondary/60">
                  <tr>
                    <th className="text-left px-4 py-3 font-headline text-primary"></th>
                    <th className="text-center px-4 py-3 font-headline text-primary">Beginner</th>
                    <th className="text-center px-4 py-3 font-headline text-primary">Intermediate</th>
                    <th className="text-center px-4 py-3 font-headline text-primary">Advanced</th>
                  </tr>
                </thead>
                <tbody>
                  {levelComparison.map((row, i) => (
                    <tr key={row.label} className={i % 2 === 0 ? 'bg-background' : 'bg-secondary/20'}>
                      <td className="px-4 py-3 text-foreground font-medium">{row.label}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{row.beginner}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{row.intermediate}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{row.advanced}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Sample Weeks ─────────────────────────────────────────────────── */}
        <section className="py-16 md:py-20 bg-secondary/30">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-headline font-bold text-primary mb-10">Sample Training Weeks</h2>

            <h3 className="text-xl font-headline font-bold text-primary mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-accent-ink" /> Beginner — Week 5 Sample
            </h3>
            <div className="space-y-2 mb-12">
              {beginnerSampleWeek.map((d) => (
                <div key={d.day} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-card border border-border rounded-xl px-5 py-3.5">
                  <span className="font-headline font-bold text-primary w-12 flex-shrink-0">{d.day}</span>
                  <span className="text-accent-ink font-headline font-semibold text-sm w-40 flex-shrink-0">{d.session}</span>
                  <span className="text-muted-foreground font-body text-sm">{d.detail}</span>
                </div>
              ))}
            </div>

            <h3 className="text-xl font-headline font-bold text-primary mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-accent-ink" /> Intermediate — Week 7 Sample
            </h3>
            <div className="space-y-2">
              {intermediateSampleWeek.map((d) => (
                <div key={d.day} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-card border border-border rounded-xl px-5 py-3.5">
                  <span className="font-headline font-bold text-primary w-12 flex-shrink-0">{d.day}</span>
                  <span className="text-accent-ink font-headline font-semibold text-sm w-40 flex-shrink-0">{d.session}</span>
                  <span className="text-muted-foreground font-body text-sm">{d.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why 12 Weeks ─────────────────────────────────────────────────── */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-headline font-bold text-primary mb-4">Why 12 Weeks?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: Calendar, heading: 'Enough base time', body: '12 weeks gives you 3 weeks of base building before any race-specific work begins. Rushing this phase leads to injury and plateau.' },
                { icon: Zap, heading: 'Physiological adaptation', body: 'Aerobic fitness, tendon strength, and movement efficiency each require 6–12 weeks of consistent stimulus to meaningfully improve. 12 weeks hits all three.' },
                { icon: CheckCircle, heading: 'Mental sustainability', body: 'Long enough to make real progress, short enough to stay motivated from day one to race day. A 20-week plan loses people by week 8.' },
              ].map((c) => (
                <div key={c.heading} className="bg-card border border-border rounded-xl p-6">
                  <c.icon className="h-6 w-6 text-accent-ink mb-3" />
                  <h3 className="font-headline font-bold text-primary mb-2">{c.heading}</h3>
                  <p className="text-muted-foreground font-body text-sm leading-relaxed">{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Related Resources ────────────────────────────────────────────── */}
        <section className="py-14 md:py-16 bg-secondary/30">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-xl font-headline font-bold text-primary mb-6">Read Next</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link href="/free-hyrox-plan" className="group bg-card border border-border hover:border-accent/50 rounded-xl p-5 transition-colors">
                <p className="text-xs font-headline font-bold text-accent-ink uppercase tracking-wider mb-2">Free Tool</p>
                <h3 className="font-headline font-bold text-primary text-base mb-1 group-hover:text-accent-ink transition-colors">Free Personalised Hyrox Plan Generator</h3>
                <p className="text-muted-foreground font-body text-sm leading-snug">For a fully personalised version of this plan, use our generator — enter your race date and get a PDF sent instantly.</p>
              </Link>
              <Link href="/how-to-train-for-hyrox" className="group bg-card border border-border hover:border-accent/50 rounded-xl p-5 transition-colors">
                <p className="text-xs font-headline font-bold text-accent-ink uppercase tracking-wider mb-2">Training Guide</p>
                <h3 className="font-headline font-bold text-primary text-base mb-1 group-hover:text-accent-ink transition-colors">How to Train for a Hyrox Event</h3>
                <p className="text-muted-foreground font-body text-sm leading-snug">The complete guide — race format, compromised running, mistakes to avoid, and race-day nutrition.</p>
              </Link>
              <Link href="/hybrid-training-program" className="group bg-card border border-border hover:border-accent/50 rounded-xl p-5 transition-colors">
                <p className="text-xs font-headline font-bold text-accent-ink uppercase tracking-wider mb-2">Methodology</p>
                <h3 className="font-headline font-bold text-primary text-base mb-1 group-hover:text-accent-ink transition-colors">Hybrid Athlete Training Program</h3>
                <p className="text-muted-foreground font-body text-sm leading-snug">Understand the science of combining strength and endurance — and why it underpins every Hyrox plan.</p>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground font-body mt-5">
              Or <TrackedLink href="/app" event="cta_app_click" eventParams={{ location: 'guide_training_plan' }} className="text-accent-ink hover:underline font-semibold">use the HybridX app</TrackedLink> — structured programmes, session logging and Edge Coach for £5/month.
            </p>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section className="py-16 md:py-20 bg-gradient-to-b from-neutral-900 to-black text-white">
          <div className="container mx-auto px-6 max-w-3xl text-center">
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-white mb-4">
              Get Your Free Plan — <span className="text-accent">Personalised to Your Race</span>
            </h2>
            <p className="text-white/70 font-body text-lg mb-8">
              Enter your race date and level. Download your plan instantly. No account, no payment, no catch.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="bg-accent text-black font-headline hover:bg-accent/90 text-lg px-8 py-6" asChild>
                <Link href="/free-hyrox-plan"><Download className="mr-2 h-5 w-5" /> Download the Free Plan <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white font-headline text-lg px-8 py-6" asChild>
                <TrackedLink href="/app" event="cta_app_click" eventParams={{ location: 'guide_training_plan_final' }}>Use the App — £5/mo</TrackedLink>
              </Button>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
