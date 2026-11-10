import { ArrowRight, Calculator, Lightbulb, MessageSquareQuote, TriangleAlert } from 'lucide-react';
import TrackedLink from '@/components/TrackedLink';
import { ARTICLE_REVIEWER } from '@/lib/facts';
import { CTAS } from '@/lib/guides/ctas';
import { TOOLS } from '@/lib/guides/topics';
import type { Block } from '@/lib/guides/types';
import InlineText from './InlineText';

/**
 * An article's blocks, in order. Every block type has exactly one rendering
 * here, and nothing in an article reaches the page except through it.
 */
export default function ArticleBody({
  slug,
  blocks,
  articles,
}: {
  slug: string;
  blocks: Block[];
  /** Slugs of published articles, so links to anything else render as text. */
  articles: ReadonlySet<string>;
}) {
  return (
    <div className="space-y-6">
      {blocks.map((block, i) => (
        <BlockView key={i} slug={slug} block={block} articles={articles} />
      ))}
    </div>
  );
}

function BlockView({ slug, block, articles }: { slug: string; block: Block; articles: ReadonlySet<string> }) {
  const text = (t: string) => <InlineText text={t} articles={articles} />;

  switch (block.type) {
    case 'heading':
      return block.level === 2 ? (
        <h2 className="pt-4 text-2xl md:text-3xl font-headline font-bold text-primary">{block.text}</h2>
      ) : (
        <h3 className="pt-2 text-xl font-headline font-bold text-primary">{block.text}</h3>
      );

    case 'paragraph':
      return <p className="font-body text-lg leading-relaxed text-foreground/90">{text(block.text)}</p>;

    case 'list': {
      const items = block.items.map((item, i) => (
        <li key={i} className="pl-1">
          {text(item)}
        </li>
      ));
      const className = 'space-y-2 pl-6 font-body text-lg leading-relaxed text-foreground/90';
      return block.ordered ? (
        <ol className={`list-decimal ${className}`}>{items}</ol>
      ) : (
        <ul className={`list-disc marker:text-accent ${className}`}>{items}</ul>
      );
    }

    case 'callout': {
      const meta = {
        tip: { label: 'Tip', Icon: Lightbulb },
        warning: { label: 'Watch out', Icon: TriangleAlert },
        'coach-note': { label: `Coach's note · ${ARTICLE_REVIEWER.name}`, Icon: MessageSquareQuote },
      }[block.kind];
      return (
        <aside className="rounded-xl border-l-4 border-accent bg-accent/10 p-5">
          <p className="mb-2 flex items-center gap-2 font-headline text-sm font-bold uppercase tracking-wide text-foreground">
            <meta.Icon className="h-4 w-4" aria-hidden="true" />
            {meta.label}
          </p>
          <p className="font-body text-base leading-relaxed text-foreground/90">{text(block.text)}</p>
        </aside>
      );
    }

    case 'workout':
      return (
        <section className="rounded-xl border border-border bg-card p-5 md:p-6" aria-label={block.title}>
          <h3 className="font-headline text-xl font-bold text-primary">{block.title}</h3>
          {block.goal && <p className="mt-1 font-body text-muted-foreground">{block.goal}</p>}
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {(
              [
                ['Beginner or first race', block.beginner],
                ['Race pace', block.racePace],
              ] as const
            ).map(([label, option]) => (
              <div key={label} className="rounded-lg bg-secondary/60 p-4">
                <p className="mb-3 font-headline text-sm font-bold uppercase tracking-wide text-foreground">{label}</p>
                <ol className="list-decimal space-y-1.5 pl-5 font-body text-base text-foreground/90">
                  {option.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-body text-sm">
                  <dt className="font-semibold text-foreground">Effort</dt>
                  <dd className="text-foreground/80">{option.rpe}</dd>
                  <dt className="font-semibold text-foreground">Rest</dt>
                  <dd className="text-foreground/80">{option.rest}</dd>
                </dl>
              </div>
            ))}
          </div>
          {block.notes && <p className="mt-4 font-body text-base text-foreground/90">{text(block.notes)}</p>}
        </section>
      );

    case 'table':
      return (
        <figure className="overflow-x-auto rounded-xl border border-border">
          {/* Up to three columns wrap to fit a phone; wider tables scroll within the box. */}
          <table className={`w-full border-collapse font-body text-base ${block.header.length > 3 ? 'min-w-[480px]' : ''}`}>
            {block.caption && (
              <caption className="bg-secondary/60 px-4 py-2 text-left font-headline text-sm font-bold text-foreground">
                {block.caption}
              </caption>
            )}
            <thead>
              <tr className="border-b border-border">
                {block.header.map((h, i) => (
                  <th key={i} scope="col" className="px-4 py-3 text-left font-headline font-bold text-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className="border-b border-border last:border-0">
                  {row.map((cell, c) => (
                    <td key={c} className="px-4 py-3 align-top text-foreground/90">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      );

    case 'calculator': {
      const tool = TOOLS[block.tool];
      return (
        <TrackedLink
          // Through the click counter (step 7), which sends the reader on to the tool.
          href={`/api/guides/out?g=${slug}&tool=${block.tool}`}
          prefetch={false}
          rel="nofollow"
          event="guide_tool_click"
          eventParams={{ guide: slug, tool: block.tool }}
          className="group flex items-center gap-4 rounded-xl border-2 border-accent bg-card p-5 transition-colors hover:bg-accent/10"
        >
          <span className="flex h-12 w-12 flex-none items-center justify-center rounded-lg bg-accent text-black">
            <Calculator className="h-6 w-6" aria-hidden="true" />
          </span>
          <span className="flex-1">
            <span className="block font-headline text-lg font-bold text-foreground">Try it: {tool.name}</span>
            <span className="block font-body text-muted-foreground">{tool.blurb}</span>
          </span>
          <ArrowRight className="h-5 w-5 flex-none text-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </TrackedLink>
      );
    }

    case 'cta': {
      const cta = CTAS[block.variant];
      return (
        <section className="rounded-xl bg-neutral-950 p-6 text-white md:p-8">
          <h2 className="font-headline text-2xl font-bold">{cta.headline}</h2>
          <p className="mt-2 max-w-xl font-body text-white/80">{cta.body}</p>
          <TrackedLink
            // Through the click counter (step 7), which sends the reader on with
            // src=guide-<slug>, so a lead from it is credited to this article.
            href={`/api/guides/out?g=${slug}&cta=${block.variant}`}
            prefetch={false}
            rel="nofollow"
            event="guide_cta_click"
            eventParams={{ guide: slug, variant: block.variant }}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 font-headline font-bold text-black transition-colors hover:bg-accent/90"
          >
            {cta.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </TrackedLink>
        </section>
      );
    }

    case 'faq':
      return (
        <section aria-labelledby={`faq-${slug}`} className="space-y-4">
          <h2 id={`faq-${slug}`} className="pt-4 text-2xl font-headline font-bold text-primary">
            Questions
          </h2>
          {block.items.map((item, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-headline text-lg font-bold text-foreground">{item.question}</h3>
              <p className="mt-2 font-body text-base leading-relaxed text-foreground/90">{text(item.answer)}</p>
            </div>
          ))}
        </section>
      );

    case 'sources':
      return (
        <section aria-label="Sources" className="border-t border-border pt-6">
          <h2 className="font-headline text-sm font-bold uppercase tracking-wide text-muted-foreground">Sources</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5 font-body text-sm text-muted-foreground">
            {block.items.map((s, i) => (
              <li key={i}>
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
                    {s.title}
                  </a>
                ) : (
                  s.title
                )}
                {s.publisher && <span>, {s.publisher}</span>}
              </li>
            ))}
          </ol>
        </section>
      );
  }
}
