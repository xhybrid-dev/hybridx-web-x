import { jsonLdString } from '@/lib/json-ld';

/**
 * Structured data, written into the page's HTML on the server.
 *
 * Every page used to add its schema with next/script (strategy afterInteractive),
 * which puts the script in the page only once the browser has run JavaScript, so
 * crawlers that read the HTML alone (and AI answer engines among them) saw none
 * of it on 35 of 47 pages. A plain script element is in the HTML from the first
 * byte. A test bans the next/script form.
 */
export default function JsonLd({ data }: { data: object | object[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(item) }} />
      ))}
    </>
  );
}
