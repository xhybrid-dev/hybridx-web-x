import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { guidesByPillar } from '@/lib/guides/related';
import { listPublishedGuidesOutsideBuild } from '@/lib/guides/store';
import { pillar as pillarOf, type PillarId } from '@/lib/guides/topics';

/** A pillar name inside a sentence: "running and lifting together", but "HYROX stations and race". */
const inSentence = (name: string) => (/^[A-Z]{2,}\b/.test(name) ? name : name[0].toLowerCase() + name.slice(1));

/** How many questions a pillar page lists before pointing to the hub. */
export const PILLAR_QUESTIONS_SHOWN = 8;

/** The newest published articles under one pillar. Empty while the site is built. */
export async function pillarQuestions(pillar: PillarId) {
  const all = guidesByPillar(await listPublishedGuidesOutsideBuild()).get(pillar) ?? [];
  return { shown: all.slice(0, PILLAR_QUESTIONS_SHOWN), total: all.length };
}

/**
 * "Questions answered" on a pillar page: the short guides that sit under it,
 * newest first, so links run down from the pillar to each article as well as
 * up from each article to the pillar (docs/content-engine-plan.md, step 4b).
 *
 * The page that renders this must set `revalidate`: the list is read when the
 * page is refreshed, never while the site is built. Renders nothing until the
 * pillar has an article.
 */
export default async function PillarQuestions({ pillar, className = '' }: { pillar: PillarId; className?: string }) {
  const { shown, total } = await pillarQuestions(pillar);
  if (!shown.length) return null;
  const name = inSentence(pillarOf(pillar).name);

  return (
    <section aria-labelledby={`questions-${pillar}`} className={`py-14 md:py-16 ${className}`}>
      <div className="container mx-auto max-w-4xl px-6">
        <h2 id={`questions-${pillar}`} className="mb-2 font-headline text-xl font-bold text-primary">
          Questions answered
        </h2>
        <p className="mb-6 font-body text-sm text-muted-foreground">Short guides on {name}, each with a workout, a table or a tool.</p>
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {shown.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/guides/${g.slug}`}
                className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-secondary/60"
              >
                <span className="font-body text-base font-semibold text-foreground">{g.title}</span>
                <ArrowRight className="h-4 w-4 flex-none transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 font-body text-sm">
          <Link href={`/guides#pillar-${pillar}`} className="font-semibold underline decoration-accent decoration-2 underline-offset-4">
            {total > shown.length ? `All ${total} guides on ${name}` : 'Every HybridX guide'}
          </Link>
        </p>
      </div>
    </section>
  );
}
