// src/lib/guides/inline.ts
//
// The only formatting an article's text may carry: **bold**, *italic* and
// [links](/path). Parsed into tokens that the renderer turns into React
// elements, so article text is never HTML and never code. That matters
// because some of what reaches a draft is text anyone can influence (a Search
// Console query is whatever somebody typed into Google).
//
// Links are allowed to two places only: a page in the topic map (or an article
// under /guides), and the app. Anything else is rejected when an article is
// saved (src/lib/guides/types.ts) and rendered as plain text if it ever gets
// through.

import { isSiteRoute } from './topics';

export type InlineToken =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'italic'; text: string }
  | { kind: 'link'; text: string; href: string };

const TOKEN = /\*\*([^*]+?)\*\*|\*([^*]+?)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
const ARTICLE = /^\/guides\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const APP_URL = /^https:\/\/app\.hybridx\.club(?:\/[a-z0-9\-/]*)?$/;

export function parseInline(source: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let at = 0;
  for (const m of source.matchAll(TOKEN)) {
    if (m.index! > at) tokens.push({ kind: 'text', text: source.slice(at, m.index) });
    if (m[1] !== undefined) tokens.push({ kind: 'bold', text: m[1] });
    else if (m[2] !== undefined) tokens.push({ kind: 'italic', text: m[2] });
    else tokens.push({ kind: 'link', text: m[3], href: m[4] });
    at = m.index! + m[0].length;
  }
  if (at < source.length) tokens.push({ kind: 'text', text: source.slice(at) });
  return tokens;
}

/** A path on this site an article may link to, or the app. */
export function isAllowedHref(href: string): boolean {
  if (APP_URL.test(href)) return true;
  const [path, fragment, ...rest] = href.split('#');
  if (rest.length > 0 || (fragment !== undefined && !/^[a-z0-9-]+$/.test(fragment))) return false;
  return isSiteRoute(path) || ARTICLE.test(path);
}

/** The hrefs in `source` that an article may not link to. */
export function disallowedLinks(source: string): string[] {
  return parseInline(source)
    .filter((t): t is Extract<InlineToken, { kind: 'link' }> => t.kind === 'link')
    .map((t) => t.href)
    .filter((href) => !isAllowedHref(href));
}

/** The text a reader sees, with the markup removed: for metadata and checks. */
export function plainText(source: string): string {
  return parseInline(source)
    .map((t) => t.text)
    .join('');
}
