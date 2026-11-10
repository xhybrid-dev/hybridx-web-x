
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import TrackedLink from '@/components/TrackedLink';
import PillarQuestions from '@/components/guides/PillarQuestions';
import Script from 'next/script';
import type { Metadata } from 'next';
import { createHowToSchema, createFAQSchema } from '@/lib/seo';
import {
  CheckCircle, AlertTriangle, Zap,
  ChevronRight, ArrowRight, Target,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'How to Train for a Hyrox Event — The Complete Guide | HybridX Hub',
  description:
    'The definitive guide to training for Hyrox. Learn the race format, weekly structure, compromised running, common mistakes, and how to build a 12-week plan. Free training plan included.',
  keywords: [
    'how to train for hyrox',
    'hyrox training guide',
    'hyrox preparation',
    'hyrox beginners guide',
    'compromised running hyrox',
    'hyrox weekly training plan',
    'hyrox mistakes to avoid',
    'hyrox race preparation',
  ],
  alternates: { canonical: 'https://hybridx.club/how-to-train-for-hyrox' },
  openGraph: {
    title: 'How to Train for a Hyrox Event — The Complete Guide',
    description:
      'Everything you need to prepare for your first or fastest Hyrox race. Race format, training phases, compromised running, mistakes, nutrition, and a free 12-week plan.',
    type: 'article',
  },
};

const howToSchema = createHowToSchema({
  name: 'How to Train for a Hyrox Event',
  description:
    'A step-by-step guide to preparing for a Hyrox race, covering base building, station-specific training, compromised running, and race-day strategy.',
  steps: [
    { name: 'Assess your starting fitness', text: 'Determine your current running base and strength levels to choose the right 8–16 week training timeline.' },
    { name: 'Build your aerobic base', text: 'Spend the first 3–4 weeks building consistent easy running (3–4 days/week) and general strength. Follow the 10% weekly mileage increase rule.' },
    { name: 'Introduce station-specific training', text: 'Add Hyrox-specific movements — SkiErg, sled push/pull, sandbag lunges, farmers carry, wall balls, and rowing — twice per week.' },
    { name: 'Train compromised running', text: 'Combine a hard station effort (e.g. 30 sandbag lunges) immediately followed by a 1km run at race pace. Repeat 3–4 times. This is the most important Hyrox-specific skill.' },
    { name: 'Build to race simulations', text: 'In weeks 8–10, run full or partial race simulations: alternate 1km runs with station efforts to replicate race conditions.' },
    { name: 'Taper for race week', text: 'Reduce volume by 40–50% in the final week. Focus on rest, mobility, and short easy runs. Do not attempt new sessions or heavy lifts.' },
    { name: 'Execute race-day strategy', text: 'Start conservatively — especially on the SkiErg. Control breathing in the first 100–200m of every run. Fuel every 45 minutes with carbohydrates.' },
  ],
});

const faqSchema = createFAQSchema([
  { question: 'How long does it take to train for Hyrox?', answer: 'Complete beginners need 12–16 weeks. Athletes who already run and lift regularly can be ready in 8–12 weeks. Never start with fewer than 8 weeks to race day.' },
  { question: 'Can a beginner do Hyrox?', answer: 'Yes. Hyrox is designed to be inclusive — every station uses accessible movements. With a structured 12-week plan, complete beginners can finish a Hyrox race comfortably.' },
  { question: 'How many days per week should I train for Hyrox?', answer: 'Beginners: 3–4 days per week. Intermediate and advanced athletes: 4–6 days. The split typically includes 2–3 running sessions and 2 strength/station sessions per week.' },
  { question: 'What is compromised running in Hyrox?', answer: 'Compromised running means running immediately after a fatiguing station effort — exactly what Hyrox requires. Only your first 1km is on fresh legs. Training this specifically is the single biggest performance lever.' },
  { question: 'What shoes should I wear for Hyrox?', answer: 'You need a hybrid or cross-training shoe — stable enough for sled work (152kg) but cushioned enough for 8km of running. Pure running shoes are too soft for the sleds; lifting shoes are too rigid for running.' },
]);

const phases = [
  { week: 'Weeks 1–3', name: 'Base Build', focus: 'Build aerobic base and general strength. 3 runs/week at easy pace, 2 gym sessions. No Hyrox-specific stations yet.' },
  { week: 'Weeks 4–7', name: 'Station Introduction', focus: 'Add 2× station-specific sessions. Begin compromised running — short station efforts followed immediately by 1km run.' },
  { week: 'Weeks 8–10', name: 'Race Simulation', focus: 'Partial and full race simulations. Higher intensity running. 4–5 station repetitions with runs in between.' },
  { week: 'Weeks 11–12', name: 'Peak & Taper', focus: 'Week 11: peak volume. Week 12: reduce by 40–50%. Rest, mobility, and race-day prep only.' },
];

const mistakes = [
  { title: 'Starting the SkiErg too hard', body: 'The first station feels easy on fresh legs. Going out hard spikes your heart rate and destroys your pacing for the next 7 runs. Start conservatively — steady effort always beats hero splits.' },
  { title: 'Training running and stations separately', body: 'If you never practise running immediately after station work, race day will be a shock. Compromised running must be trained specifically — it is the core Hyrox skill.' },
  { title: 'Increasing mileage too fast', body: 'Follow the 10% weekly rule — never increase total running volume by more than 10% per week. Faster progression leads to shin splints, stress fractures, and time off.' },
  { title: 'Skipping the easy runs', body: 'About 80% of your training should be low-intensity aerobic work. Athletes who hammer high intensity every session burn out, plateau, and get injured. Easy runs build the aerobic engine.' },
  { title: 'Ignoring race-day nutrition', body: 'A 90-minute effort requires active fuelling. Aim for 30–60g of carbohydrates per hour during the race. Test your gels and nutrition strategy in long training sessions — never on race day.' },
];

const exampleWeek = [
  { day: 'Monday',   session: 'Easy Run', detail: '5–6km at conversational pace (Zone 2). Focus on form, not speed.' },
  { day: 'Tuesday',  session: 'Station Strength', detail: 'SkiErg 3×500m, Sled Push 4×25m, Farmers Carry 3×50m, Wall Balls 4×20. Rest 90s between sets.' },
  { day: 'Wednesday',session: 'Rest / Mobility', detail: '20–30 min yoga, stretching, or foam rolling. Full recovery.' },
  { day: 'Thursday', session: 'Compromised Running', detail: '4 rounds: 30 Sandbag Lunges → 1km at race pace. 3 min rest between rounds.' },
  { day: 'Friday',   session: 'Tempo Run', detail: '6km with 3km at race pace. Practise breathing control and pacing.' },
  { day: 'Saturday', session: 'Long Easy Run', detail: '8–10km easy. Builds aerobic base and running economy.' },
  { day: 'Sunday',   session: 'Full Rest', detail: 'Complete rest. Sleep, eat well, recover.' },
];

const stations = [
  { name: 'SkiErg',           dist: '1,000m', tip: 'Pace evenly. Breathe with your pulls. This is Station 1 — do not blow up here.' },
  { name: 'Sled Push',        dist: '50m',    tip: 'Chest low, arms locked, drive through your feet. The carpet is much harder than a gym floor.' },
  { name: 'Sled Pull',        dist: '50m',    tip: 'Walk backwards using leg drive between rope pulls. Avoid spiking lactate — it ruins the next run.' },
  { name: 'Burpee Broad Jump',dist: '80m',    tip: 'Find a sustainable rhythm. Break into small sets if needed. Do not sprint and burn out.' },
  { name: 'Rowing',           dist: '1,000m', tip: 'Aim for a consistent split. Keep your stroke rate moderate (22–26 spm) to protect the legs.' },
  { name: 'Farmers Carry',    dist: '200m',   tip: 'Stay upright. Walk briskly. Set the weights down as few times as possible — every stop costs time.' },
  { name: 'Sandbag Lunges',   dist: '100m',   tip: 'These destroy your legs for the final run. Pace yourself. Shorter steps are more efficient.' },
  { name: 'Wall Balls',       dist: '100 reps',tip: 'The last station. Break into sets of 10–20 from the start — do not go unbroken and fail out.' },
];

// Built ahead of time and refreshed hourly, so the guides under this pillar
// (PillarQuestions) appear without a deploy and without a Firestore read
// while the site is built.
export const revalidate = 3600;

export default function HowToTrainForHyrox() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Script id="howto-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <Script id="faq-schema-guide" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Header />
      <main>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative bg-gradient-to-b from-neutral-900 to-black text-white py-20 md:py-28 overflow-hidden">
          <div aria-hidden="true" className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, #fadb5c 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          <div aria-hidden="true" className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(250,219,92,0.15) 0%, transparent 70%)' }} />
          <div className="container mx-auto px-6 relative z-10 max-w-4xl">
            <div className="inline-flex items-center gap-2 bg-accent/20 border border-accent/40 rounded-full px-4 py-1.5 mb-6 text-sm font-headline font-semibold text-accent">
              Complete Training Guide
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-headline font-extrabold text-white mb-6 leading-tight">
              How to Train for a <span className="text-accent">Hyrox Event</span>
            </h1>
            <p className="text-lg md:text-xl text-white/75 font-body max-w-3xl mb-8">
              Everything you need — race format, training phases, compromised running, the biggest mistakes, and a free 12-week plan.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-accent text-black font-headline hover:bg-accent/90" asChild>
                <Link href="/free-hyrox-plan">Get Your Free 12-Week Plan <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white font-headline" asChild>
                <Link href="#training-structure">See the Training Structure <ChevronRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ── Quick Answer Box ─────────────────────────────────────────────── */}
        <section className="bg-accent/10 border-y border-accent/30 py-8">
          <div className="container mx-auto px-6 max-w-4xl">
            <p className="font-body text-foreground text-lg leading-relaxed mb-4">
              <strong className="font-headline">The short answer:</strong> Training for Hyrox requires 8–16 weeks of structured preparation combining running endurance and functional strength. The key skill most athletes overlook is <strong>compromised running</strong> — the ability to maintain pace immediately after a heavy station effort. Build this specifically and you will finish faster than almost everyone who trains running and stations separately.
            </p>
            <p className="font-body text-foreground/80 text-base leading-relaxed border-l-2 border-accent/50 pl-4">
              HybridX recommends structuring Hyrox preparation around three weekly pillars: 2–3 running sessions (easy, tempo, and long run), 2 station-specific sessions targeting all 8 Hyrox movements, and 1 dedicated compromised running session — where a hard station effort is followed immediately by a race-pace 1km run. This combination, applied progressively over 12 weeks, produces the running endurance and race-specific fatigue resistance a Hyrox event demands.
            </p>
          </div>
        </section>

        {/* ── People Also Ask ──────────────────────────────────────────────── */}
        <section className="py-14 md:py-18 bg-secondary/30">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-xl font-headline font-bold text-primary mb-6 uppercase tracking-widest text-sm">People Also Ask</h2>
            <div className="space-y-6">

              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-headline font-bold text-primary text-lg mb-3 flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                  How do I train for a Hyrox event?
                </h3>
                <p className="text-muted-foreground font-body leading-relaxed mb-3 pl-7">
                  A complete Hyrox training programme combines running, functional strength, and compromised running — the ability to run immediately after a hard station effort. A solid week looks like:
                </p>
                <ul className="pl-7 space-y-1.5 text-muted-foreground font-body text-sm">
                  <li className="flex items-start gap-2"><span className="text-accent font-bold mt-0.5">→</span> 2–3 running sessions per week (easy, tempo, and long run)</li>
                  <li className="flex items-start gap-2"><span className="text-accent font-bold mt-0.5">→</span> 2 strength and station-specific sessions (SkiErg, sleds, sandbag, wall balls)</li>
                  <li className="flex items-start gap-2"><span className="text-accent font-bold mt-0.5">→</span> 1 compromised running session (station effort → 1km run, repeated 3–4 times)</li>
                  <li className="flex items-start gap-2"><span className="text-accent font-bold mt-0.5">→</span> Progressive overload across 12 weeks through 4 structured phases</li>
                </ul>
              </div>

              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-headline font-bold text-primary text-lg mb-3 flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                  Can I get a Hyrox training plan for free?
                </h3>
                <p className="text-muted-foreground font-body leading-relaxed pl-7 mb-4">
                  Yes — HybridX offers a free personalised Hyrox training plan that adapts to your race date and ability level. You enter your details, and a complete 12-week PDF plan is generated and emailed to you instantly. It covers all 4 training phases, every station, and compromised running sessions. No account required.
                </p>
                <div className="pl-7">
                  <Link href="/free-hyrox-plan" className="inline-flex items-center gap-2 bg-accent text-black font-headline font-bold text-sm px-4 py-2 rounded-lg hover:bg-accent/90 transition-colors">
                    Get the Free Hyrox Plan Generator <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-headline font-bold text-primary text-lg mb-3 flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                  How many weeks do I need to train for Hyrox?
                </h3>
                <p className="text-muted-foreground font-body leading-relaxed pl-7">
                  Most athletes need 12–16 weeks. Beginners with little running or gym background should allow 14–16 weeks. Intermediate athletes (already running and lifting regularly) need 10–12 weeks. Advanced athletes can be ready in 8–10 weeks. Never begin with fewer than 8 weeks to race day — the physiological adaptations required cannot happen faster than that.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ── What Hyrox Demands ───────────────────────────────────────────── */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-headline font-bold text-primary mb-4">What Hyrox Actually Demands</h2>
            <p className="text-muted-foreground font-body mb-8 text-lg leading-relaxed">
              Hyrox is a global fitness race with a fixed format: <strong>8 × 1km runs, each immediately followed by one functional workout station</strong>. The stations are always in the same order, at every event worldwide. Total distance is approximately 10km of running plus a full-body functional challenge.
            </p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm font-body">
                <thead className="bg-secondary/60">
                  <tr>
                    <th className="text-left px-4 py-3 font-headline text-primary">Station</th>
                    <th className="text-left px-4 py-3 font-headline text-primary">Distance / Reps</th>
                    <th className="text-left px-4 py-3 font-headline text-primary hidden md:table-cell">Race Tip</th>
                  </tr>
                </thead>
                <tbody>
                  {stations.map((s, i) => (
                    <tr key={s.name} className={i % 2 === 0 ? 'bg-background' : 'bg-secondary/20'}>
                      <td className="px-4 py-3 font-headline font-semibold text-primary">{s.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.dist}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{s.tip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground font-body mt-3">Average finish time: ~1:40 for men, ~1:54 for women. Good beginner target: 1:45–2:10 (men), 2:00–2:20 (women).</p>
          </div>
        </section>

        {/* ── How Long to Train ────────────────────────────────────────────── */}
        <section className="py-16 md:py-20 bg-secondary/30">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-headline font-bold text-primary mb-4">How Long Do You Need to Train?</h2>
            <p className="text-muted-foreground font-body mb-8 text-lg leading-relaxed">
              Your required training window depends entirely on your current fitness base. The absolute minimum is 8 weeks — less than this and the physiological adaptations simply cannot accumulate fast enough.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { level: 'Beginner', time: '12–16 weeks', desc: 'Little or no current running or gym base. Need to build aerobic fitness, strength, and movement patterns from scratch.' },
                { level: 'Intermediate', time: '10–12 weeks', desc: 'Runs 2–3× per week and trains in the gym regularly. Familiar with functional movements but new to Hyrox specifically.' },
                { level: 'Advanced', time: '8–10 weeks', desc: 'Strong aerobic base, familiar with most Hyrox stations. Needs race-specific conditioning and compromised running focus.' },
              ].map((t) => (
                <div key={t.level} className="bg-card border border-border rounded-xl p-6">
                  <div className="inline-flex items-center gap-1.5 bg-accent/15 border border-accent/30 rounded-full px-3 py-1 text-xs font-headline font-bold text-foreground mb-3">{t.level}</div>
                  <p className="text-3xl font-headline font-extrabold text-accent mb-2">{t.time}</p>
                  <p className="text-muted-foreground font-body text-sm leading-relaxed">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4-Phase Structure ────────────────────────────────────────────── */}
        <section id="training-structure" className="py-16 md:py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-headline font-bold text-primary mb-4">The 4-Phase Hyrox Training Structure</h2>
            <p className="text-muted-foreground font-body mb-10 text-lg leading-relaxed">
              A well-structured Hyrox programme follows four distinct phases. Each builds on the previous, ensuring you peak on race day rather than in week 6. For the complete week-by-week session breakdown, see the <Link href="/hyrox-training-plan" className="text-accent hover:underline font-semibold">12-week Hyrox training plan</Link>.
            </p>
            <div className="space-y-4">
              {phases.map((phase, i) => (
                <div key={phase.week} className="flex gap-5 items-start bg-card border border-border rounded-xl p-6">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent text-black font-headline font-bold text-lg flex items-center justify-center">{i + 1}</div>
                  <div>
                    <div className="flex flex-wrap items-center gap-3 mb-1.5">
                      <h3 className="font-headline font-bold text-primary text-lg">{phase.name}</h3>
                      <span className="text-xs text-muted-foreground font-body bg-secondary/60 px-2.5 py-0.5 rounded-full">{phase.week}</span>
                    </div>
                    <p className="text-muted-foreground font-body leading-relaxed">{phase.focus}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Compromised Running ──────────────────────────────────────────── */}
        <section className="py-16 md:py-20 bg-gradient-to-b from-neutral-900 to-black text-white">
          <div className="container mx-auto px-6 max-w-4xl">
            <div className="inline-flex items-center gap-2 bg-accent/20 border border-accent/40 rounded-full px-4 py-1.5 mb-5 text-sm font-headline font-semibold text-accent">
              The #1 Hyrox Skill
            </div>
            <h2 className="text-2xl md:text-3xl font-headline font-bold text-white mb-4">Compromised Running — Why It Changes Everything</h2>
            <p className="text-white/75 font-body text-lg leading-relaxed mb-8">
              <strong className="text-white">Compromised running is running under fatigue</strong> — specifically, immediately after a station effort. Only your very first 1km in a Hyrox race is on fresh legs. Every other run happens while your heart rate is still elevated and your muscles are loaded from the station before it.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <Zap className="h-6 w-6 text-accent mb-3" />
                <h3 className="font-headline font-bold text-white mb-2">How to Train It</h3>
                <p className="text-white/70 font-body text-sm leading-relaxed">Complete a hard station effort — 30 sandbag lunges, 500m SkiErg, or 20 burpee broad jumps — then immediately run 1km at your target race pace. Repeat 3–4 times with 3 minutes rest between rounds.</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <Target className="h-6 w-6 text-accent mb-3" />
                <h3 className="font-headline font-bold text-white mb-2">Breathing Reset</h3>
                <p className="text-white/70 font-body text-sm leading-relaxed">In the first 100–200m of every run, focus solely on breathing: inhale for 3 strides, exhale for 2. This settles your heart rate and resets your running form before you push the pace.</p>
              </div>
            </div>
            <div className="bg-accent/10 border border-accent/30 rounded-xl p-5">
              <p className="text-white font-body leading-relaxed"><strong className="text-accent">Key insight:</strong> Athletes who train running and stations separately consistently under-perform relative to their fitness level. Those who train compromised running specifically consistently over-perform. Build it into every second training week from Week 4 onwards.</p>
            </div>
          </div>
        </section>

        {/* ── Example Week ─────────────────────────────────────────────────── */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-headline font-bold text-primary mb-2">What a Good Hyrox Training Week Looks Like</h2>
            <p className="text-muted-foreground font-body mb-8 text-lg">Example intermediate week (Weeks 5–8 of a 12-week plan).</p>
            <div className="space-y-3">
              {exampleWeek.map((day) => (
                <div key={day.day} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-card border border-border rounded-xl px-5 py-4">
                  <span className="font-headline font-bold text-primary w-28 flex-shrink-0">{day.day}</span>
                  <span className="text-accent font-headline font-semibold text-sm w-44 flex-shrink-0">{day.session}</span>
                  <span className="text-muted-foreground font-body text-sm leading-snug">{day.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Common Mistakes ──────────────────────────────────────────────── */}
        <section className="py-16 md:py-20 bg-secondary/30">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-headline font-bold text-primary mb-2">The 5 Biggest Hyrox Training Mistakes</h2>
            <p className="text-muted-foreground font-body mb-8 text-lg">Avoid these and you will immediately be ahead of most first-timers.</p>
            <div className="space-y-4">
              {mistakes.map((m, i) => (
                <div key={m.title} className="flex gap-4 items-start bg-card border border-border rounded-xl p-6">
                  <div className="flex-shrink-0 mt-0.5">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-headline font-bold text-primary mb-1.5">
                      <span className="text-muted-foreground mr-2">#{i + 1}</span>{m.title}
                    </h3>
                    <p className="text-muted-foreground font-body text-sm leading-relaxed">{m.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Nutrition ────────────────────────────────────────────────────── */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-headline font-bold text-primary mb-4">Race Day Nutrition — The Basics</h2>
            <p className="text-muted-foreground font-body text-lg leading-relaxed mb-8">
              Hyrox is a 90-minute effort. Nutrition is not optional. Athletes who do not fuel actively almost always hit a wall in the final stations.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: '24–36 hrs before', heading: 'Carb Load', detail: 'Aim for 6–8g of carbohydrates per kg of bodyweight. Oats, rice, sweet potatoes, pasta. Reduce fat and fibre.' },
                { label: '3–4 hrs before start', heading: 'Pre-Race Meal', detail: 'High-carb, moderate protein, low fat and fibre. Easy to digest. Avoid anything you have not tested in training.' },
                { label: 'During the race', heading: 'Race Fuelling', detail: '30–60g of carbohydrates per hour via gels or chews. Sip water at every opportunity. Nothing new on race day.' },
              ].map((n) => (
                <div key={n.label} className="bg-card border border-border rounded-xl p-6">
                  <span className="text-xs text-muted-foreground font-body bg-secondary/60 px-2.5 py-0.5 rounded-full">{n.label}</span>
                  <h3 className="font-headline font-bold text-primary text-lg mt-3 mb-2">{n.heading}</h3>
                  <p className="text-muted-foreground font-body text-sm leading-relaxed">{n.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <PillarQuestions pillar="hyrox" className="border-t border-border" />

        {/* ── Related Resources ────────────────────────────────────────────── */}
        <section className="py-14 md:py-16 bg-secondary/30">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-xl font-headline font-bold text-primary mb-6">Read Next</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/free-hyrox-plan" className="group bg-card border border-border hover:border-accent/50 rounded-xl p-5 transition-colors">
                <p className="text-xs font-headline font-bold text-accent uppercase tracking-wider mb-2">Free Tool</p>
                <h3 className="font-headline font-bold text-primary text-base mb-1 group-hover:text-accent transition-colors">Free Personalised Hyrox Plan Generator</h3>
                <p className="text-muted-foreground font-body text-sm leading-snug">Enter your race date — get a complete 12-week PDF plan sent to your inbox instantly.</p>
              </Link>
              <Link href="/hyrox-training-plan" className="group bg-card border border-border hover:border-accent/50 rounded-xl p-5 transition-colors">
                <p className="text-xs font-headline font-bold text-accent uppercase tracking-wider mb-2">Training Plan</p>
                <h3 className="font-headline font-bold text-primary text-base mb-1 group-hover:text-accent transition-colors">12-Week Hyrox Training Plan</h3>
                <p className="text-muted-foreground font-body text-sm leading-snug">The full week-by-week breakdown — phases, sample weeks, and level comparison.</p>
              </Link>
              <Link href="/hybrid-training-program" className="group bg-card border border-border hover:border-accent/50 rounded-xl p-5 transition-colors">
                <p className="text-xs font-headline font-bold text-accent uppercase tracking-wider mb-2">Methodology</p>
                <h3 className="font-headline font-bold text-primary text-base mb-1 group-hover:text-accent transition-colors">Hybrid Athlete Training Program</h3>
                <p className="text-muted-foreground font-body text-sm leading-snug">The science behind combining strength and endurance — and why it is the foundation of Hyrox performance.</p>
              </Link>
              <Link href="/build-a-bigger-engine" className="group bg-card border border-border hover:border-accent/50 rounded-xl p-5 transition-colors">
                <p className="text-xs font-headline font-bold text-accent uppercase tracking-wider mb-2">Free Guide</p>
                <h3 className="font-headline font-bold text-primary text-base mb-1 group-hover:text-accent transition-colors">Build a Bigger Engine: VO2max</h3>
                <p className="text-muted-foreground font-body text-sm leading-snug">The science of raising your VO2max — the aerobic ceiling behind every Hyrox run.</p>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground font-body mt-5">
              Or <TrackedLink href="/app" event="cta_app_click" eventParams={{ location: 'guide_how_to_train' }} className="text-accent hover:underline font-semibold">access every session through the HybridX app</TrackedLink> — structured training, tracked progress, and coaching for £5/month.
            </p>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section className="py-16 md:py-20 bg-gradient-to-b from-neutral-900 to-black text-white">
          <div className="container mx-auto px-6 max-w-3xl text-center">
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-white mb-4">
              Ready to Start? Get Your Free <span className="text-accent">12-Week Plan</span>
            </h2>
            <p className="text-white/70 font-body text-lg mb-8">
              Personalised to your race date. Covers every phase, every station, and every compromised running session. Free to download — no excuses.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="bg-accent text-black font-headline hover:bg-accent/90 text-lg px-8 py-6" asChild>
                <Link href="/free-hyrox-plan">Download the Free Plan <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white font-headline text-lg px-8 py-6" asChild>
                <TrackedLink href="/app" event="cta_app_click" eventParams={{ location: 'guide_how_to_train_final' }}>Try the App — £5/mo</TrackedLink>
              </Button>
            </div>
          </div>
        </section>

        {/* ── Inline FAQ ───────────────────────────────────────────────────── */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-headline font-bold text-primary mb-8">Common Questions</h2>
            <div className="space-y-4">
              {[
                { q: 'Can a complete beginner do Hyrox?', a: 'Yes. All Hyrox stations use accessible movements — no Olympic lifting, no gymnastics. With a structured 12–16 week plan, complete beginners regularly finish races comfortably. The key is giving yourself enough time and starting slowly.' },
                { q: 'How many days per week should I train?', a: 'Beginners: 3–4 days per week. Intermediate: 4–5 days. Advanced: 5–6 days. The split typically includes 2–3 running sessions and 2 station-specific sessions per week, with one dedicated compromised running session.' },
                { q: 'Do I need a gym to train for Hyrox?', a: 'You need access to a gym with a SkiErg, rower, and sleds — or a Hyrox-certified gym. The running component can be done anywhere. Most commercial gyms that offer Hyrox classes will have the required equipment.' },
                { q: 'What is a realistic time goal for my first Hyrox?', a: 'Focus on finishing well rather than a specific time for your first race. Most well-prepared beginners finish in 1:45–2:10 (men) or 2:00–2:20 (women). You will almost certainly improve by 15–25 minutes in your second race.' },
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

      </main>
      <Footer />
    </div>
  );
}
