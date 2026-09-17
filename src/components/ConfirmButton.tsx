'use client';

// src/components/ConfirmButton.tsx
//
// The confirm step of a double opt-in, as a button rather than a page load.
//
// The whole point is that a machine cannot press it. Mail scanners GET every
// link in a message; none of them submit forms, so putting the consent grant
// behind a POST is what keeps a confirmed opt-in actually confirmed by a person.

import { useActionState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Loader2, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ConfirmState } from '@/lib/confirm-actions';

interface ConfirmButtonProps {
  email: string;
  token: string;
  action: (prev: ConfirmState, formData: FormData) => Promise<ConfirmState>;
}

export default function ConfirmButton({ email, token, action }: ConfirmButtonProps) {
  const [state, formAction, isPending] = useActionState(action, {
    status: '',
    message: '',
  } as ConfirmState);

  if (state.status === 'confirmed') {
    return (
      <>
        <CheckCircle2 className="h-12 w-12 text-green-500" aria-hidden="true" />
        <h1 className="mt-6 font-headline text-3xl font-bold">You are confirmed</h1>
        <p className="mt-3 text-muted-foreground">
          Thanks — {state.email || 'your address'} is on the list. Your first email is on its
          way, and every one after it has a one-click unsubscribe.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/app">
              Start training
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to HYBRIDX</Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <MailCheck className="h-12 w-12 text-accent" aria-hidden="true" />
      <h1 className="mt-6 font-headline text-3xl font-bold">One tap to confirm</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        {email ? (
          <>
            Confirm <span className="font-medium">{email}</span> and we will start sending your
            HYROX training email. Unsubscribe any time — every email has a one-click link.
          </>
        ) : (
          'Confirm your address and we will start sending your HYROX training email.'
        )}
      </p>

      <form action={formAction} className="mt-8">
        <input type="hidden" name="token" value={token} />
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Confirming…
            </>
          ) : (
            <>
              Yes, confirm my email
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </form>

      {state.status === 'error' && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {state.message}
        </p>
      )}
    </>
  );
}
