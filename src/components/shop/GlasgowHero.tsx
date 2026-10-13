import Image from 'next/image';
import { formatPence } from '@/lib/shop/config';

/*
 * The first screen of /hyrox-glasgow-2027.
 *
 * Built to answer three things at a glance, in this order: where you are (the
 * Glasgow race, its dates and venue), what is on offer (two PDFs, shown as
 * their real covers, with prices), and what to do next (buy, or try the free
 * calculator first). The headline leads with the nudge; the tag above it, the
 * paragraph under it and the two covers say exactly what is being sold.
 *
 * The urgency is factual: real dates and the weeks genuinely left before race
 * week. There is no fake scarcity, because the files are unlimited downloads.
 *
 * Visual language comes from the PDFs themselves: black ground, the brand
 * yellow, and the strip of eight numbered station boxes from the guide's
 * cover. Copy rules otherwise: plain, no exclamation marks, no em dashes.
 */

interface HeroOffer {
  name: string;
  price: number;
  detail: string;
  cover: string;
  alt: string;
}

const STATS: Array<[string, string]> = [
  ['22', 'week plan'],
  ['5', 'sessions a week'],
  ['7', 'divisions'],
  ['40', 'target finish times'],
];

export default function GlasgowHero({
  guide,
  pack,
  bundlePrice,
  countdown,
}: {
  guide: HeroOffer;
  pack: HeroOffer;
  bundlePrice: number;
  /** "22 weeks to race week", or null once the race has passed. */
  countdown: string | null;
}) {
  return (
    <section aria-labelledby="hero-heading" className="relative isolate overflow-hidden bg-black text-white">
      {/* Ground: a faint grid and one yellow glow behind the covers. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse at 70% 40%, black 20%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 70% 40%, black 20%, transparent 75%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute -right-32 top-10 -z-10 h-[520px] w-[520px] rounded-full opacity-25 blur-3xl md:-right-10"
        style={{ background: 'radial-gradient(circle, #FADB5C 0%, transparent 65%)' }}
      />

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-6 md:pb-16 md:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.3fr_1fr] lg:gap-10">
          {/* ── Text ─────────────────────────────────────────────────── */}
          <div className="shop-rise">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-2 font-headline text-xs font-bold uppercase tracking-[0.16em] sm:text-sm">
              <span className="rounded-sm bg-accent px-2 py-1 text-black">Two PDF downloads</span>
              <span className="whitespace-nowrap text-accent">SEC Glasgow · 10 to 14 March 2027</span>
            </p>

            <h1
              id="hero-heading"
              className="mt-6 text-balance font-headline text-[2.6rem] font-bold leading-[0.95] tracking-tight sm:text-6xl lg:text-[3.6rem] xl:text-[4rem]"
            >
              <span className="block">Now is the time to prepare for</span>
              <span className="mt-2 block text-accent">HYROX Glasgow.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80 sm:text-xl">
              <strong className="font-headline font-bold text-white">Don&apos;t leave it too late.</strong> Everything
              you need to sharpen your preparation, in two PDFs: a 22-week plan from 12 October 2026 to race week, and
              split targets for every run and station. Download straight after payment. No account needed.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#buy"
                className="inline-flex h-14 items-center justify-center rounded-md bg-accent px-7 font-headline text-lg font-bold text-black transition-colors hover:bg-[#ffe680] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              >
                See prices and buy
              </a>
              <a
                href="#split-preview"
                className="inline-flex h-14 items-center justify-center rounded-md border border-white/30 px-7 font-headline text-lg font-bold text-white transition-colors hover:border-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              >
                Try the free split calculator
              </a>
            </div>

            {countdown ? (
              <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="inline-flex items-center gap-2 font-headline font-bold text-white">
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-accent" />
                  {countdown}
                </span>
                <span className="text-white/65">Starting later? The guide shows how to join at the right week.</span>
              </p>
            ) : null}
          </div>

          {/* ── The two products, as their covers ────────────────────── */}
          <div className="shop-rise shop-rise-delay grid grid-cols-2 gap-4 sm:gap-6">
            {[guide, pack].map((o, i) => (
              <figure key={o.name} className={i === 1 ? 'mt-10 sm:mt-14' : ''}>
                <div className="relative">
                  <Image
                    src={o.cover}
                    alt={o.alt}
                    width={900}
                    height={1273}
                    priority={i === 0}
                    sizes="(min-width: 1024px) 240px, (min-width: 640px) 40vw, 44vw"
                    className="h-auto w-full rounded-md shadow-[0_30px_60px_-15px_rgba(250,219,92,0.25)] ring-1 ring-white/15"
                  />
                  <span className="absolute -right-2 -top-3 rounded-full bg-accent px-3 py-1 font-headline text-base font-bold text-black shadow-lg sm:text-lg">
                    {formatPence(o.price)}
                  </span>
                </div>
                <figcaption className="mt-3">
                  <span className="block font-headline text-base font-bold sm:text-lg">{o.name}</span>
                  <span className="block text-sm text-white/65">{o.detail}</span>
                </figcaption>
              </figure>
            ))}
            <p className="col-span-2 rounded-md border border-accent/40 bg-accent/10 px-4 py-3 text-center text-sm sm:text-base">
              Both together <span className="font-headline font-bold text-accent">{formatPence(bundlePrice)}</span>
            </p>
          </div>
        </div>

        {/* ── Key numbers, set on the guide cover's station strip ────── */}
        <dl className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/15 bg-white/15 sm:grid-cols-4 md:mt-16">
          {STATS.map(([value, label]) => (
            <div key={label} className="flex flex-col-reverse bg-black px-4 py-5 sm:px-6">
              <dt className="mt-2 text-sm uppercase tracking-wider text-white/70">{label}</dt>
              <dd className="font-headline text-4xl font-bold leading-none text-accent sm:text-5xl">{value}</dd>
            </div>
          ))}
        </dl>

        <div aria-hidden="true" className="mt-6 grid grid-cols-8 gap-1.5 sm:gap-2">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex h-7 overflow-hidden rounded-sm border border-white/15 sm:h-9">
              <span className="flex-1" />
              <span className="flex w-1/2 items-center justify-center bg-accent font-headline text-xs font-bold text-black sm:text-sm">
                {i + 1}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-white/50">
          HybridX is independent. Not affiliated with, sponsored or endorsed by HYROX.
        </p>
      </div>
    </section>
  );
}
