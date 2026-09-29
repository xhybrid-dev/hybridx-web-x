import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import EntrySection from '@/components/plan-finder/EntrySection';
import PlanFinderRoot from '@/components/plan-finder/PlanFinderRoot';

// The plan finder on its own page, for social bios, guides and ads. It takes
// ?goal=first|faster|athx|xenom|ultra|hybrid (and ?place=home|gym|both) to open
// at question 2, and utm_* tags, which the tracker records.
//
// noindex, and deliberately no canonical pointing at /: the two together send
// search engines conflicting signals (handover/entry-funnel/docs/03).
export const metadata: Metadata = {
  title: 'Find your training plan',
  description: 'Answer five short questions and get one recommended HybridX plan, book or tool, plus up to two useful extras.',
  robots: { index: false, follow: true },
};

export default function StartPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-grow bg-black">
        <EntrySection mode="page" />
      </main>
      <Footer />
      <PlanFinderRoot mode="page" />
    </div>
  );
}
