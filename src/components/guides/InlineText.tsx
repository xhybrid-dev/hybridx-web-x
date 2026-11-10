import Link from 'next/link';
import { isAllowedHref, parseInline } from '@/lib/guides/inline';

/**
 * Article text: bold, italic and links, never HTML (src/lib/guides/inline.ts).
 *
 * A link to an article that is not published (a draft, a retired page, a typo)
 * renders as plain text rather than a link to a 404, and so does any link the
 * schema should have refused.
 *
 * Links are the body colour with a yellow underline: yellow text on the white
 * theme fails contrast.
 */
export default function InlineText({ text, articles }: { text: string; articles: ReadonlySet<string> }) {
  return (
    <>
      {parseInline(text).map((token, i) => {
        if (token.kind === 'bold') {
          return (
            <strong key={i} className="font-semibold text-foreground">
              {token.text}
            </strong>
          );
        }
        if (token.kind === 'italic') return <em key={i}>{token.text}</em>;
        if (token.kind === 'text') return <span key={i}>{token.text}</span>;

        const article = token.href.match(/^\/guides\/([a-z0-9-]+)$/)?.[1];
        const live = isAllowedHref(token.href) && (!article || article === 'how-we-write' || articles.has(article));
        if (!live) return <span key={i}>{token.text}</span>;

        const className =
          'font-semibold text-foreground underline decoration-accent decoration-2 underline-offset-4 hover:decoration-foreground';
        return token.href.startsWith('https://') ? (
          <a key={i} href={token.href} className={className}>
            {token.text}
          </a>
        ) : (
          <Link key={i} href={token.href} className={className}>
            {token.text}
          </Link>
        );
      })}
    </>
  );
}
