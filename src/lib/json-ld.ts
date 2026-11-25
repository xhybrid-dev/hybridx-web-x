// JSON for a <script type="application/ld+json">.
//
// Text in a page or an article ends up inside the script element, so anything
// that could close it or start an HTML comment is escaped: "<", ">" and "&",
// plus the two separators (U+2028 and U+2029) that older parsers read as line
// breaks inside a string.

export function jsonLdString(data: object): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(new RegExp('\\u2028', 'g'), '\\u2028')
    .replace(new RegExp('\\u2029', 'g'), '\\u2029');
}
