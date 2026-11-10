import Link from 'next/link';
import { ARTICLE_AUTHOR, ARTICLE_REVIEWER } from '@/lib/facts';

const DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/London',
});

/**
 * "By HybridX · Reviewed by Jon Lee, HybridX trainer · Updated 10 November 2026",
 * linked to how the guides are written. The brand is the author and Jon is the
 * reviewer, because articles are AI-drafted and Jon approves every one.
 */
export default function GuideByline({ updatedAt, tone = 'dark' }: { updatedAt: string; tone?: 'dark' | 'light' }) {
  const muted = tone === 'dark' ? 'text-white/70' : 'text-muted-foreground';
  const strong = tone === 'dark' ? 'text-white' : 'text-foreground';
  return (
    <p className={`font-body text-sm ${muted}`}>
      By <span className={`font-semibold ${strong}`}>{ARTICLE_AUTHOR.name}</span>
      <span aria-hidden="true"> · </span>
      Reviewed by <span className={`font-semibold ${strong}`}>{ARTICLE_REVIEWER.name}</span>, {ARTICLE_REVIEWER.role}
      <span aria-hidden="true"> · </span>
      Updated <time dateTime={updatedAt}>{DATE.format(new Date(updatedAt))}</time>
      <span aria-hidden="true"> · </span>
      <Link href="/guides/how-we-write" className={`underline decoration-accent decoration-2 underline-offset-4 ${strong}`}>
        How our guides are written
      </Link>
    </p>
  );
}
