'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export const CONTACT_TOPICS = [
  'A training plan or race question',
  'The HybridX app or my membership',
  'An order or a download',
  'Books or the store',
  'The UNA Watch apps',
  'A correction to something on the site',
  'Something else',
] as const;

/** The topic a link such as /contact?topic=correction opens the form on. */
export const CORRECTION_TOPIC: (typeof CONTACT_TOPICS)[number] = 'A correction to something on the site';

/**
 * What /contact?topic=correction&page=/guides/some-guide puts in the form. The page must be a
 * path on this site, short and made of ordinary URL characters: it ends up in a message that a
 * person reads, so it is never taken on trust.
 */
export function prefillFromSearch(search: string): { topic?: (typeof CONTACT_TOPICS)[number]; message?: string } {
  const q = new URLSearchParams(search);
  if (q.get('topic') !== 'correction') return {};
  const page = q.get('page') ?? '';
  const safePage = /^\/(?!\/)[A-Za-z0-9\-_/.]{0,150}$/.test(page) && !page.includes('..') ? page : '';
  return {
    topic: CORRECTION_TOPIC,
    message: `${safePage ? `Page: https://hybridx.club${safePage}\n\n` : ''}What is wrong, and what it should say instead:\n`,
  };
}

type Status = 'idle' | 'sending' | 'sent' | 'error';

const fieldClass = 'bg-background border-border focus:border-primary';

/**
 * The contact form. It posts to /api/talk, the endpoint behind the plan finder's
 * "Talk to us" step, which stores the message and emails it to the team. It
 * used to be the only way to write to us, and only at Step 7 of that quiz.
 */
export default function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [topic, setTopic] = useState<string>(CONTACT_TOPICS[0]);
  const [message, setMessage] = useState('');

  // A link from a guide or the About page opens the form on "a correction", with the page named.
  useEffect(() => {
    const pre = prefillFromSearch(window.location.search);
    if (pre.topic) setTopic(pre.topic);
    if (pre.message) setMessage(pre.message);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'sending') return;
    const data = new FormData(event.currentTarget);
    setStatus('sending');
    setError('');
    try {
      const response = await fetch('/api/talk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(data.get('name') ?? ''),
          email: String(data.get('email') ?? ''),
          goal: String(data.get('topic') ?? ''),
          message: String(data.get('message') ?? ''),
          source: 'page',
        }),
      });
      if (response.ok) {
        setStatus('sent');
        return;
      }
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error || 'We could not send that just now. Please try again, or email training@hybridx.club.');
      setStatus('error');
    } catch {
      setError('We could not send that just now. Please try again, or email training@hybridx.club.');
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div role="status" aria-live="polite" className="rounded-xl border border-border bg-card p-8 text-center">
        <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-green-600" aria-hidden="true" />
        <h2 className="font-headline text-2xl font-bold text-primary">Message sent</h2>
        <p className="mt-2 font-body text-muted-foreground">
          Thanks. We read every message and reply by email, so keep an eye on your inbox (and your junk folder).
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate={false}>
      <div>
        <Label htmlFor="contact-name" className="mb-2 block font-semibold">
          Your name
        </Label>
        <Input id="contact-name" name="name" required maxLength={100} autoComplete="name" className={fieldClass} />
      </div>
      <div>
        <Label htmlFor="contact-email" className="mb-2 block font-semibold">
          Email address
        </Label>
        <Input
          id="contact-email"
          name="email"
          type="email"
          required
          maxLength={200}
          autoComplete="email"
          className={fieldClass}
        />
      </div>
      <div>
        <Label htmlFor="contact-topic" className="mb-2 block font-semibold">
          What is it about?
        </Label>
        <select
          id="contact-topic"
          name="topic"
          required
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
        >
          {CONTACT_TOPICS.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="contact-message" className="mb-2 block font-semibold">
          Your message
        </Label>
        <Textarea
          id="contact-message"
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={10}
          maxLength={3000}
          rows={6}
          className={fieldClass}
        />
      </div>
      <p className="font-body text-xs text-muted-foreground">
        We use your name and email only to reply, and delete the message after 12 months. For an order, include the email
        you bought with. See our{' '}
        <Link href="/privacy-policy" className="underline underline-offset-4 hover:text-primary">
          privacy policy
        </Link>
        .
      </p>
      <div aria-live="polite">
        {status === 'error' ? <p className="font-body text-sm font-medium text-destructive">{error}</p> : null}
      </div>
      <Button
        type="submit"
        disabled={status === 'sending'}
        className="w-full bg-accent font-headline text-accent-foreground hover:bg-accent/90 sm:w-auto"
      >
        {status === 'sending' ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> Sending…
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" aria-hidden="true" /> Send message
          </>
        )}
      </Button>
    </form>
  );
}
