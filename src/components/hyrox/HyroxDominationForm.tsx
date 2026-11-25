'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { signUpForTrainingPlan, type SignUpFormState } from '@/app/free-hyrox-plan/actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, ArrowRight, Download, CalendarPlus } from 'lucide-react';
import { parseTrainingPlanCSV, groupWorkoutsByDay, parseLocalDate } from '@/lib/training-plan-utils';
import { trainingPlanPdfBlob, trainingPlanPdfFileName } from '@/lib/pdf-generator';
import { trainingCalendarBlob, trainingCalendarFileName } from '@/lib/ical-generator';
import {
  checkRaceDate,
  daysBetween,
  eventLabel,
  formatLongDate,
  matchesQuery,
  starterDates,
  tomorrow,
  upcomingEvents,
  type PlanMode,
} from '@/lib/free-plan-dates';
import { trackEvent } from '@/lib/analytics';
import TrackedLink from '@/components/TrackedLink';
import { appSignupHref, seedFromFreePlan } from '@/lib/app-seed';

export interface HyroxEvent {
  name: string;
  startDate: string | null;
  endDate: string | null;
  city: string | null;
  country: string | null;
  continent: string | null;
  bookingStatus: string | null;
  eventUrl: string | null;
  eventId: string | null;
}

interface HyroxDominationFormProps {
  initialEvents?: HyroxEvent[];
}

/** What the form asked for, kept past the form's reset so the files can be built from it. */
interface Submission {
  name: string;
  email: string;
  event: string;
  eventDate: string;
}

interface GeneratedFiles {
  pdfUrl: string;
  pdfName: string;
  icsUrl: string;
  icsName: string;
}

const STARTER_EVENT_NAME = 'Your first HYROX (race date to be booked)';
const CUSTOM_EVENT_NAME = 'My race (date chosen)';

function revokeFiles(files: GeneratedFiles | null) {
  if (!files) return;
  URL.revokeObjectURL(files.pdfUrl);
  URL.revokeObjectURL(files.icsUrl);
}

/** Start a download from a blob link, once. A blocked download is not an error: the buttons are the fallback. */
function triggerDownload(url: string, name: string) {
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Automatic download blocked:', error);
  }
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full py-4 px-6 bg-accent text-accent-foreground hover:bg-accent/90 font-bold
               text-base uppercase tracking-wider rounded-lg shadow-lg font-headline
               hover:shadow-xl hover:-translate-y-1 active:translate-y-0
               disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none
               transition-all duration-300"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating Plan...
        </>
      ) : (
        'Get My Free Plan'
      )}
    </Button>
  );
}

const fieldClass =
  'w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 font-body';

const MODES: { id: PlanMode; label: string; hint: string }[] = [
  { id: 'race', label: 'I have booked a race', hint: 'Pick it from the list' },
  { id: 'date', label: 'I know my race date', hint: 'Enter any date' },
  { id: 'starter', label: 'No race booked yet', hint: 'Start next Monday' },
];

export default function HyroxDominationForm({ initialEvents = [] }: HyroxDominationFormProps) {
  const initialState: SignUpFormState = { message: '', type: '' };
  const [state, formAction] = useFormState(signUpForTrainingPlan, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  const [hyroxEvents, setHyroxEvents] = useState<HyroxEvent[]>(initialEvents);
  const [eventsLoading, setEventsLoading] = useState(initialEvents.length === 0);
  const [mode, setMode] = useState<PlanMode>('race');
  const [query, setQuery] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventDay, setEventDay] = useState('');
  const [customDate, setCustomDate] = useState('');
  // "today" is read after mount: it differs between the server's render and the browser's.
  const [today, setToday] = useState<Date | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [completed, setCompleted] = useState(false);
  // Where the visitor came from (?src=, e.g. guide-<slug> from an article's call to
  // action), so the lead is credited to it; and ?race=YYYY-MM-DD from the plan finder.
  const [src, setSrc] = useState('');
  // The race date they chose, kept past the form's reset so the app link on the
  // success screen can carry it into sign-up.
  const [raceDate, setRaceDate] = useState('');
  const [files, setFiles] = useState<GeneratedFiles | null>(null);
  const filesRef = useRef<GeneratedFiles | null>(null);
  const submissionRef = useRef<Submission | null>(null);
  const leadFiredRef = useRef(false);

  useEffect(() => {
    setToday(new Date());
    const params = new URLSearchParams(window.location.search);
    setSrc(params.get('src') ?? '');
    const race = params.get('race') ?? '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(race)) {
      setMode('date');
      setCustomDate(race);
    }
    return () => revokeFiles(filesRef.current);
  }, []);

  useEffect(() => {
    if (initialEvents.length > 0) return;
    async function fetchEvents() {
      setEventsLoading(true);
      try {
        const response = await fetch('/api/hyrox-events');
        const data = await response.json();
        if (data.events) setHyroxEvents(data.events);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setEventsLoading(false);
      }
    }
    fetchEvents();
  }, [initialEvents]);

  const events = useMemo(() => (today ? upcomingEvents(hyroxEvents, today) : hyroxEvents), [hyroxEvents, today]);
  const matching = useMemo(() => events.filter((e) => matchesQuery(e, query)), [events, query]);
  const selected = events.find((e) => e.name === eventName) ?? null;
  const dayChoices = selected?.startDate && selected?.endDate ? daysBetween(selected.startDate, selected.endDate) : [];
  // A race with no published date, like the big city events still to be announced, takes a typed date.
  const needsTypedDate = mode === 'race' && !!selected && dayChoices.length === 0;

  const starter = today ? starterDates(today) : null;
  const chosenDate = mode === 'starter' ? (starter?.raceDay ?? '') : mode === 'date' || needsTypedDate ? customDate : eventDay;
  const chosenEvent = mode === 'starter' ? STARTER_EVENT_NAME : mode === 'date' ? CUSTOM_EVENT_NAME : eventName;
  const dateCheck = today && chosenDate ? checkRaceDate(chosenDate, today) : null;

  // Choosing a different race clears the day chosen for the last one.
  useEffect(() => {
    setEventDay('');
  }, [eventName]);

  useEffect(() => {
    if (state.type === 'success' && !leadFiredRef.current) {
      leadFiredRef.current = true;
      if (state.leadSaved !== false) {
        trackEvent('generate_lead', { placement: 'free_hyrox_plan', currency: 'GBP', value: 0, mode });
      } else {
        // The files still download, but the backend record failed to save.
        trackEvent('lead_storage_failed', { placement: 'free_hyrox_plan' });
      }
    }
    if (state.type === 'error' && state.message) {
      trackEvent('lead_submit_error', { placement: 'free_hyrox_plan', message: state.message });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    if (state.type !== 'success' || isGenerating) return;
    const submission = submissionRef.current;
    if (!submission) return;
    const generateFiles = async () => {
      setIsGenerating(true);
      try {
        setRaceDate(submission.eventDate);
        const rows = await parseTrainingPlanCSV('/training-plans/hyrox-fusion-86.csv');
        // The race date is a calendar day, parsed in the reader's own time zone.
        const workouts = groupWorkoutsByDay(rows, parseLocalDate(submission.eventDate));
        const options = {
          userName: submission.name,
          eventName: submission.event,
          eventDate: submission.eventDate,
          userEmail: submission.email,
          programName: rows[0]?.programName || 'Hyrox Fusion Prep',
          programDescription: rows[0]?.programDescription || '',
          workouts,
        };
        const generated: GeneratedFiles = {
          pdfUrl: URL.createObjectURL(trainingPlanPdfBlob(options)),
          pdfName: trainingPlanPdfFileName(options),
          icsUrl: URL.createObjectURL(trainingCalendarBlob(options)),
          icsName: trainingCalendarFileName(options),
        };
        revokeFiles(filesRef.current);
        filesRef.current = generated;
        setFiles(generated);
        // Try both now; the success screen has a button for each in case a phone blocks one.
        triggerDownload(generated.pdfUrl, generated.pdfName);
        setTimeout(() => triggerDownload(generated.icsUrl, generated.icsName), 400);
        formRef.current?.reset();
      } catch (error) {
        console.error('Error generating files:', error);
      } finally {
        setIsGenerating(false);
        setCompleted(true);
      }
    };
    generateFiles();
    // Only depend on state, or the reset loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    if (!chosenDate || (dateCheck && !dateCheck.ok)) {
      event.preventDefault();
      return;
    }
    submissionRef.current = {
      name: String(data.get('name') ?? '').trim(),
      email: String(data.get('email') ?? '').trim(),
      event: chosenEvent,
      eventDate: chosenDate,
    };
  }

  // Success state: the highest-intent moment on the site. Show the files and the app
  // trial instead of an empty form.
  if (completed) {
    return (
      <div className="text-center py-4" role="status" aria-live="polite">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="font-headline text-2xl font-bold text-primary mb-2">Your plan is ready</h3>
        <p className="font-body text-muted-foreground mb-4">
          Your plan is built in your browser and saved to this device, dated back from your race day. Open the{' '}
          <span className="font-semibold">.ics</span> file to add every session to your phone or computer&apos;s calendar.
        </p>
        {files && (
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90 font-headline">
              <a href={files.pdfUrl} download={files.pdfName}>
                <Download className="mr-2 h-4 w-4" /> Download PDF
              </a>
            </Button>
            <Button asChild variant="outline" className="font-headline">
              <a href={files.icsUrl} download={files.icsName}>
                <CalendarPlus className="mr-2 h-4 w-4" /> Download calendar (.ics)
              </a>
            </Button>
          </div>
        )}
        <p className="font-body text-sm text-muted-foreground/80 mb-6">
          Nothing downloaded? Use the buttons above. We do not email the plan, so save it before you leave this page.
        </p>

        <div className="rounded-xl border border-accent/40 bg-accent/10 p-5 text-left">
          <p className="font-headline font-bold text-primary mb-1">Want it guided, day by day?</p>
          <p className="font-body text-sm text-muted-foreground mb-4">
            The app delivers this plan one session at a time, tracks every rep and run, and keeps your race date in view.
            14-day free trial, cancel anytime.
          </p>
          <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-headline">
            {/* Straight to sign-up with the race date (src/lib/app-seed.ts);
                TrackedLink adds the src that credits this page or article. */}
            <TrackedLink
              href={appSignupHref(seedFromFreePlan(raceDate))}
              event="cta_app_click"
              eventParams={{ location: 'free_plan_success', tool: 'free-plan' }}
            >
              Try the App Free <ArrowRight className="ml-2 h-4 w-4" />
            </TrackedLink>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setCompleted(false)}
          className="mt-4 text-sm text-muted-foreground hover:text-accent-ink underline underline-offset-2 font-body"
        >
          Generate another plan
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} className="space-y-6">
      {src && <input type="hidden" name="src" value={src} />}
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="event" value={chosenEvent} />
      <input type="hidden" name="eventDate" value={chosenDate} />

      <div className="text-left">
        <Label htmlFor="name" className="block text-sm font-semibold text-foreground mb-2">
          Your Name
        </Label>
        <Input id="name" name="name" type="text" required minLength={2} autoComplete="name" placeholder="John Doe" className={fieldClass} />
      </div>

      <div className="text-left">
        <Label htmlFor="email" className="block text-sm font-semibold text-foreground mb-2">
          Email Address
        </Label>
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="your.email@example.com" className={fieldClass} />
      </div>

      <fieldset className="text-left">
        <legend className="block text-sm font-semibold text-foreground mb-2">When is your race?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {MODES.map((m) => (
            <label
              key={m.id}
              className={`cursor-pointer rounded-lg border-2 px-3 py-2.5 text-sm transition-colors ${
                mode === m.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              } focus-within:ring-4 focus-within:ring-primary/20`}
            >
              <input
                type="radio"
                name="mode-choice"
                value={m.id}
                checked={mode === m.id}
                onChange={() => setMode(m.id)}
                className="sr-only"
              />
              <span className="block font-headline font-semibold text-primary">{m.label}</span>
              <span className="block text-xs text-muted-foreground">{m.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {mode === 'race' && (
        <div className="space-y-4 text-left">
          <div>
            <Label htmlFor="event-search" className="block text-sm font-semibold text-foreground mb-2">
              Search the races
            </Label>
            <Input
              id="event-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="A city, country or race name"
              autoComplete="off"
              className={fieldClass}
              aria-controls="event-select"
            />
          </div>
          <div>
            <Label htmlFor="event-select" className="block text-sm font-semibold text-foreground mb-2">
              Your race
            </Label>
            <select
              id="event-select"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              required
              disabled={eventsLoading}
              className={`${fieldClass} h-auto`}
            >
              <option value="">
                {eventsLoading ? 'Loading races…' : matching.length ? `Choose your race (${matching.length} shown)` : 'No race matches that search'}
              </option>
              {matching.map((e) => (
                <option key={e.name} value={e.name}>
                  {eventLabel(e)}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Not listed, or no date yet? Choose &ldquo;I know my race date&rdquo; above and enter it.
            </p>
          </div>

          {selected && dayChoices.length > 0 && (
            <div>
              <Label htmlFor="event-day" className="block text-sm font-semibold text-foreground mb-2">
                The day you race
              </Label>
              <select
                id="event-day"
                value={eventDay}
                onChange={(e) => setEventDay(e.target.value)}
                required
                className={`${fieldClass} h-auto`}
              >
                <option value="">Choose your day…</option>
                {dayChoices.map((day) => (
                  <option key={day} value={day}>
                    {formatLongDate(day)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {(mode === 'date' || needsTypedDate) && (
        <div className="text-left">
          <Label htmlFor="race-date" className="block text-sm font-semibold text-foreground mb-2">
            {needsTypedDate ? `${selected?.name} has no published date yet. Enter the date you expect to race` : 'Your race date'}
          </Label>
          <Input
            id="race-date"
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            required
            min={today ? tomorrow(today) : undefined}
            className={fieldClass}
          />
        </div>
      )}

      {mode === 'starter' && starter && (
        <p className="rounded-lg border border-border bg-secondary/40 p-4 text-left font-body text-sm text-muted-foreground">
          Your plan starts on <strong className="text-foreground">{formatLongDate(starter.start)}</strong> and builds to a race day on{' '}
          <strong className="text-foreground">{formatLongDate(starter.raceDay)}</strong>, eleven weeks later. Book a race for that
          weekend, or come back and make a new plan once you have a date.
        </p>
      )}

      {dateCheck && (
        <p
          role={dateCheck.ok ? 'status' : 'alert'}
          className={`text-left text-sm font-body ${dateCheck.ok ? 'text-muted-foreground' : 'font-semibold text-destructive'}`}
        >
          {dateCheck.ok && chosenDate ? `Race day: ${formatLongDate(chosenDate)}. ` : ''}
          {dateCheck.message}
        </p>
      )}

      <SubmitButton />

      <p className="text-left font-body text-xs text-muted-foreground">
        Signing up means you will get training emails from HybridX. Unsubscribe any time. See our{' '}
        <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-primary">
          privacy policy
        </Link>
        .
      </p>

      {state.type === 'error' && state.message && (
        <div role="alert" className="mt-4 p-4 rounded-lg text-center font-semibold font-body bg-destructive/10 border border-destructive/20 text-destructive">
          {state.message}
        </div>
      )}
    </form>
  );
}
