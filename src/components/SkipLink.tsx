/**
 * The first thing a keyboard or screen-reader user meets on every page: a way past the
 * header and navigation to the page's own content. Every page's main landmark carries
 * id="main-content" (pinned by skip-link.test.ts), so the link never lands nowhere.
 * Hidden until focused, then pinned top-left above everything, including the sticky header.
 */
export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[1000] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
    >
      Skip to main content
    </a>
  );
}
