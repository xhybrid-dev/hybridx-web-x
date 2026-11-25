'use client';

// The last resort: an error in the root layout itself, where no site styles or
// components can be relied on. Plain, self-contained, and with a way out.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-GB">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Something went wrong</h1>
        <p style={{ maxWidth: '32rem', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
          HybridX hit a problem loading this page. Try again, or email training@hybridx.club
          {error.digest ? ` and quote ${error.digest}` : ''}.
        </p>
        <button type="button" onClick={reset} style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', cursor: 'pointer' }}>
          Try again
        </button>
        <p style={{ marginTop: '1.5rem' }}>
          <a href="/">Go to the homepage</a>
        </p>
      </body>
    </html>
  );
}
