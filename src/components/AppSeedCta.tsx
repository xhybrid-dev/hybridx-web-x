import { ArrowRight } from 'lucide-react';
import TrackedLink from '@/components/TrackedLink';
import { APP, appPriceLabel } from '@/lib/facts/product';
import { appSignupHref, type AppSeed } from '@/lib/app-seed';

interface AppSeedCtaProps {
  /** The tool's answers, carried into the app's sign-up form. */
  seed: AppSeed;
  heading: string;
  /** What the app does with these answers. The price and trial are added. */
  body: string;
  /** For analytics: which tool, and which result. */
  location: string;
  /** Extra buttons, e.g. one per ATHX edition. Each replaces the single button. */
  choices?: { label: string; seed: AppSeed }[];
  label?: string;
}

/**
 * "Train it in the app": a sign-up link that carries the tool's answers
 * (src/lib/app-seed.ts), so the app's form opens filled in and the athlete
 * starts on the plan the answers point to. TrackedLink adds the src that
 * credits the sign-up to this page, or to the article that sent the reader.
 */
export default function AppSeedCta({ seed, heading, body, location, choices, label = 'Start my free trial' }: AppSeedCtaProps) {
  const buttons = choices ?? [{ label, seed }];
  return (
    <section aria-label={heading} className="rounded-xl border-2 border-accent bg-card p-6 md:p-8">
      <h2 className="font-headline text-2xl font-bold">{heading}</h2>
      <p className="mt-2 max-w-xl font-body text-muted-foreground">
        {body} {APP.trialDays}-day free trial, then {appPriceLabel('words')}.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        {buttons.map((b) => (
          <TrackedLink
            key={b.label}
            href={appSignupHref(b.seed)}
            event="cta_app_click"
            eventParams={{ location, tool: b.seed.tool }}
            className="inline-flex h-12 items-center justify-center rounded-md bg-accent px-6 font-headline font-bold text-black hover:bg-accent/90"
          >
            {b.label} <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </TrackedLink>
        ))}
      </div>
    </section>
  );
}
