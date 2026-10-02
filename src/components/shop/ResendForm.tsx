'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';

export default function ResendForm() {
  const emailId = useId();
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setPending(true);
    try {
      const res = await fetch('/api/shop/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, website: honeypot }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) setError(data.error || 'That did not work. Please try again in a minute.');
      else setMessage(data.message || 'If this address has an order, a link has been sent.');
    } catch {
      setError('That did not work. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
        </label>
      </div>
      <div>
        <label htmlFor={emailId} className="mb-1.5 block font-medium">
          Email address used for the order
        </label>
        <input
          id={emailId}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
        />
      </div>
      <Button type="submit" size="lg" disabled={pending} className="font-headline text-base focus-visible:ring-foreground">
        {pending ? 'Sending…' : 'Send my download link'}
      </Button>
      <div aria-live="polite">
        {message ? <p className="font-medium">{message}</p> : null}
        {error ? <p className="font-medium text-destructive">{error}</p> : null}
      </div>
    </form>
  );
}
