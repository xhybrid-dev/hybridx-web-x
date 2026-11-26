import { ArrowRight } from 'lucide-react';
import TrackedLink from '@/components/TrackedLink';

/**
 * The first thing under the header on the home page: a question for the visitor who came for ATHX
 * rather than HYROX, and a single link to the ATHX 2027 page. The site's home is mostly about
 * HYROX, and the plan finder's ATHX tile only leads to a book; this goes to the page that has the
 * guide, the UK dates, the pacing calculator and the books.
 *
 * Brand yellow with black text and a black button, whichever theme the site is in: the strip is
 * the same in light and dark mode, and black on #FADB5C is about 14:1 (athx-prompt.test.ts).
 */
export default function AthxPrompt() {
  return (
    <section aria-labelledby="athx-prompt-q" className="bg-hx-yellow text-black">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2.5 md:px-6">
        <div className="min-w-0">
          <p id="athx-prompt-q" className="font-headline text-base font-bold leading-tight md:text-lg">
            Are you interested in ATHX?
          </p>
          <p className="mt-0.5 text-sm leading-snug max-sm:hidden">The 2027 UK dates, a free guide, a pacing calculator and the training books.</p>
        </div>
        <TrackedLink
          href="/athx-2027"
          event="home_athx_click"
          eventParams={{ location: 'top' }}
          className="hx-focus inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border-2 border-black bg-black px-5 font-headline text-base font-bold leading-tight text-white transition-colors hover:bg-white hover:text-black"
        >
          See ATHX 2027
          <ArrowRight aria-hidden className="h-[18px] w-[18px] stroke-[2.4]" />
        </TrackedLink>
      </div>
    </section>
  );
}
