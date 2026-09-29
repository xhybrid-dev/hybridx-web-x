// The plan finder's opening section: headline, three reassurance lines and
// question 1 as six tiles. A Server Component, so it is in the HTML with its
// final height and paints before any JavaScript runs.
//
//   mode="entry"  above the existing homepage (#hx-entry). A skip link to
//                 #hx-home sits in its top bar, and the headline is an <h2>,
//                 because the homepage keeps its own <h1>.
//   mode="page"   the stand-alone /start page (#hx-start), with an <h1>.
//
// Tiles open the dialog through PlanFinderRoot. Without JavaScript they are
// hidden and plain links take their place.

import { ArrowRight, Check } from 'lucide-react';
import { funnel } from '@/lib/plan-finder/content';

const H = funnel.copy.hero;

// Runs as the HTML is parsed, before first paint, so a visitor who skipped
// earlier in this tab, or who arrives on /?entry=off, never sees the section
// appear and then vanish. Nothing is stored for ?entry=off.
const HIDE_BEFORE_PAINT = `(function(){try{var e=document.getElementById('hx-entry');if(e&&(/[?&]entry=off(&|$)/.test(location.search)||sessionStorage.getItem('hx_entry')))e.hidden=true}catch(x){}})();`;

export default function EntrySection({ mode }: { mode: 'entry' | 'page' }) {
  const entry = mode === 'entry';
  const Heading = entry ? 'h2' : 'h1';
  const [before, after] = H.title.split(H.titleHighlight);

  return (
    <>
      <section
        id={entry ? 'hx-entry' : 'hx-start'}
        aria-labelledby={entry ? 'hx-entry-h' : undefined}
        className="relative overflow-hidden bg-black pb-6 font-body text-white md:pb-[clamp(48px,5vw,72px)]"
        style={{ paddingTop: entry ? 20 : 'clamp(48px, 5vw, 72px)' }}
        // The inline script below may add `hidden` before hydration.
        suppressHydrationWarning
      >
        <span
          aria-hidden
          className="pointer-events-none absolute right-[-220px] top-5 aspect-[649/525] w-[620px] select-none bg-[url('/plan-finder/hybridx-x-mark.jpg')] bg-contain bg-center bg-no-repeat lg:right-[-140px] lg:top-[-20px] lg:w-[1040px]"
        />
        <div className="relative mx-auto max-w-[1440px] px-[clamp(20px,6.67vw,96px)]">
          {entry && (
            <div className="mb-4 flex items-center justify-between gap-4 border-b border-hx-line pb-3 md:mb-[clamp(28px,3vw,44px)]">
              <span className="text-sm leading-snug text-hx-mute">{funnel.copy.skip.hint}</span>
              <a
                href="#hx-home"
                data-skip="bar"
                className="hx-focus inline-flex min-h-11 shrink-0 items-center gap-2 font-semibold text-white underline decoration-hx-yellow decoration-[3px] underline-offset-[5px] hover:decoration-white"
              >
                {funnel.copy.entry.skipLabel}
                <ArrowRight aria-hidden className="h-[18px] w-[18px] stroke-[2.4] text-hx-yellow" />
              </a>
            </div>
          )}

          <div className="grid grid-cols-1 items-center gap-6 md:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,576px)] lg:gap-[72px]">
            <div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="hx-chip">{H.chip}</span>
                <span className="text-sm text-hx-mute max-md:hidden">{H.meta}</span>
              </div>
              <Heading
                id={entry ? 'hx-entry-h' : undefined}
                className="hx-h1 mt-4 max-md:text-[clamp(34px,10vw,40px)] md:mt-7"
              >
                {before}
                <span className="text-hx-yellow">{H.titleHighlight}</span>
                {after}
              </Heading>
              <p className="mt-7 max-w-[540px] text-[clamp(17px,1.4vw,20px)] leading-relaxed text-hx-mute max-md:hidden">
                {H.lead}
              </p>
              <ul className="mt-4 flex flex-wrap gap-x-7 gap-y-3 text-[15px] md:mt-9">
                {H.ticks.map((t) => (
                  <li key={t} className="flex items-center gap-2.5">
                    <Check aria-hidden className="h-[18px] w-[18px] stroke-[2.6] text-hx-yellow" />
                    {t}
                  </li>
                ))}
                <li className="flex items-center gap-2.5">
                  <Check aria-hidden className="h-[18px] w-[18px] stroke-[2.6] text-hx-yellow" />
                  {/* Switched to the "saved" wording in the browser only when tracking is really on. */}
                  <span data-privacy-tick>{funnel.copy.privacy.tickOff}</span>
                </li>
              </ul>
            </div>

            <div
              role="group"
              aria-labelledby="q1t"
              className="rounded-xl border border-t-[6px] border-hx-line border-t-hx-yellow bg-hx-card p-4 md:p-[clamp(22px,2.2vw,32px)]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="hx-label text-hx-yellow">Station 01 of 05</span>
                <div aria-hidden className="flex gap-1.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <i key={i} className={`h-1.5 w-7 rounded-sm ${i === 0 ? 'bg-hx-yellow' : 'bg-hx-line'}`} />
                  ))}
                </div>
              </div>
              <h2 id="q1t" className="mb-1.5 mt-3.5 font-headline text-[clamp(26px,2.2vw,32px)] font-bold leading-[1.15] tracking-[-0.01em] md:mt-5">
                {funnel.steps[1].title}
              </h2>
              <p className="mb-3.5 text-[15px] leading-normal text-hx-mute md:mb-[22px]">{H.q1Help}</p>
              <div data-js className="grid grid-cols-2 gap-2 md:gap-3">
                {funnel.goals.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    data-goal={g.id}
                    className="tile hx-focus flex min-h-[72px] flex-col justify-between gap-2 rounded-[10px] border border-hx-line bg-black p-3 text-left text-white transition-colors hover:border-hx-yellow md:min-h-[104px] md:px-5 md:py-[18px]"
                  >
                    <span className="flex items-start justify-between gap-2 font-headline text-base font-bold leading-tight md:text-lg">
                      {g.label}
                      <ArrowRight aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 stroke-[2.4] text-hx-yellow" />
                    </span>
                    <span className="text-sm leading-snug text-hx-mute max-md:hidden">{g.sub}</span>
                  </button>
                ))}
              </div>
              <noscript>
                <style>{'[data-js]{display:none}'}</style>
                <p className="text-[15px] leading-normal text-hx-mute">
                  The plan finder needs JavaScript. You can go straight to a{' '}
                  <a href="/free-hyrox-plan" className="text-white underline">
                    free plan
                  </a>
                  , the{' '}
                  <a href="/books" className="text-white underline">
                    books
                  </a>
                  , the{' '}
                  <a href="https://app.hybridx.club" className="text-white underline">
                    app
                  </a>{' '}
                  or the{' '}
                  <a href="/calculators" className="text-white underline">
                    free tools
                  </a>
                  .
                </p>
              </noscript>
              <p data-start-today className="mt-5 text-sm text-hx-mute">
                {H.startTodayLine}{' '}
                <a
                  href="/free-hyrox-plan"
                  className="hx-focus font-semibold text-white underline decoration-hx-yellow decoration-2 underline-offset-4"
                >
                  {H.startTodayLink}
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>
      {entry && (
        <>
          <script dangerouslySetInnerHTML={{ __html: HIDE_BEFORE_PAINT }} />
          {/* The "why did you skip" strip is rendered here after a skip, outside the hidden section. */}
          <div id="hx-skipwhy-slot" />
        </>
      )}
    </>
  );
}
