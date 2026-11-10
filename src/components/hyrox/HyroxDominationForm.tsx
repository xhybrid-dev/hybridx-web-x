
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { signUpForTrainingPlan, type SignUpFormState } from '@/app/free-hyrox-plan/actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { parseTrainingPlanCSV, groupWorkoutsByDay } from '@/lib/training-plan-utils';
import { downloadTrainingPlanPDF } from '@/lib/pdf-generator';
import { downloadTrainingPlanICS } from '@/lib/ical-generator';
import { trackEvent } from '@/lib/analytics';

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

// Helper function to generate dates between start and end date
function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  const currentDate = new Date(start);
  while (currentDate <= end) {
    dates.push(new Date(currentDate).toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
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

const FormSchema = z.object({
  name: z.string().min(2, { message: "Please enter your name." }),
  email: z.string().email(),
  event: z.string().min(1, { message: "Please select an event." }),
  eventDate: z.string().min(1, { message: "Please select an event date." }),
});


export default function HyroxDominationForm({ initialEvents = [] }: HyroxDominationFormProps) {
  const initialState: SignUpFormState = { message: '', type: '' };
  const [state, formAction] = useFormState(signUpForTrainingPlan, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [hyroxEvents, setHyroxEvents] = useState<HyroxEvent[]>(initialEvents);
  const [eventsLoading, setEventsLoading] = useState(initialEvents.length === 0);
  const [selectedEvent, setSelectedEvent] = useState<HyroxEvent | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  // Where the visitor came from (?src=, e.g. guide-<slug> from an article's
  // call to action), so the lead is credited to it. Read once on mount.
  const [src, setSrc] = useState('');
  useEffect(() => {
    setSrc(new URLSearchParams(window.location.search).get('src') ?? '');
  }, []);
  const [completed, setCompleted] = useState(false);
  const leadFiredRef = useRef(false);

  // zod validation for client side
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      email: "",
      event: "",
      eventDate: "",
    },
  });

  useEffect(() => {
      // Only fetch events if we don't have initialEvents
      if (initialEvents.length > 0) {
          return;
      }

      async function fetchEvents() {
          setEventsLoading(true);
          try {
              const response = await fetch('/api/hyrox-events');
              const data = await response.json();

              if (data.events) {
                  setHyroxEvents(data.events);
              }
          } catch (error) {
              console.error("Error fetching events from Google Sheets:", error);
              // Optionally set an error state to show in the UI
          } finally {
              setEventsLoading(false);
          }
      }
      fetchEvents();
  }, [initialEvents]);

  // Handle event selection and generate available dates
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'event' && value.event) {
        const event = hyroxEvents.find(e => e.name === value.event);
        if (event) {
          setSelectedEvent(event);
          if (event.startDate && event.endDate) {
            const dates = generateDateRange(event.startDate, event.endDate);
            setAvailableDates(dates);
          } else {
            setAvailableDates([]);
          }
          // Reset the eventDate field when event changes
          form.setValue('eventDate', '');
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, hyroxEvents]);

  useEffect(() => {
    if (state.type === 'success' && !leadFiredRef.current) {
      leadFiredRef.current = true;
      if (state.leadSaved !== false) {
        trackEvent('generate_lead', { placement: 'free_hyrox_plan', currency: 'GBP', value: 0 });
      } else {
        // PDF still downloads for the user, but the backend record failed to save.
        trackEvent('lead_storage_failed', { placement: 'free_hyrox_plan' });
      }
    }
    if (state.type === 'error' && state.message) {
      trackEvent('lead_submit_error', { placement: 'free_hyrox_plan', message: state.message });
    }
  }, [state]);

  useEffect(() => {
    if (state.type === 'success' && !isGenerating) {
      // Generate and download the PDF and ICS files
      const generateFiles = async () => {
        setIsGenerating(true);
        try {
          const name = form.getValues('name');
          const email = form.getValues('email');
          const event = form.getValues('event');
          const eventDate = form.getValues('eventDate');

          // Parse the training plan CSV
          const trainingPlanRows = await parseTrainingPlanCSV('/training-plans/hyrox-fusion-86.csv');

          // Group workouts by day and calculate dates
          const workouts = groupWorkoutsByDay(trainingPlanRows, new Date(eventDate));

          const pdfAndIcsOptions = {
            userName: name,
            eventName: event,
            eventDate: eventDate,
            userEmail: email,
            programName: trainingPlanRows[0]?.programName || 'Hyrox Fusion Prep',
            programDescription: trainingPlanRows[0]?.programDescription || '',
            workouts: workouts
          };

          // Generate and download PDF
          downloadTrainingPlanPDF(pdfAndIcsOptions);
          // Generate and download ICS
          downloadTrainingPlanICS(pdfAndIcsOptions);


          // Reset form after PDF generation
          formRef.current?.reset();
          form.reset();
          setSelectedEvent(null);
          setAvailableDates([]);
        } catch (error) {
          console.error('Error generating files:', error);
          // Still reset the form even if generation fails
          formRef.current?.reset();
          form.reset();
          setSelectedEvent(null);
          setAvailableDates([]);
        } finally {
          setIsGenerating(false);
          setCompleted(true);
        }
      };

      generateFiles();
    }
    // Only depend on state to avoid infinite loop when form resets
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Success state: this is the highest-intent moment on the site — show the
  // download confirmation and the app trial CTA instead of an empty form.
  if (completed) {
    return (
      <div className="text-center py-4" role="status" aria-live="polite">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
        </div>
        <h3 className="font-headline text-2xl font-bold text-primary mb-2">Your plan is downloading</h3>
        <p className="font-body text-muted-foreground mb-1">
          Check your downloads for the PDF and the <span className="font-semibold">.ics</span> calendar file —
          open the .ics to add all 12 weeks to your phone or computer&apos;s calendar.
        </p>
        <p className="font-body text-sm text-muted-foreground/80 mb-6">A copy is also on its way to your inbox.</p>

        <div className="rounded-xl border border-accent/40 bg-accent/10 p-5 text-left">
          <p className="font-headline font-bold text-primary mb-1">Want it guided, day by day?</p>
          <p className="font-body text-sm text-muted-foreground mb-4">
            The app delivers this plan one session at a time, tracks every rep and run, and adapts as you go.
            14-day free trial — cancel anytime.
          </p>
          <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-headline">
            <Link
              href="/app"
              onClick={() => trackEvent('cta_app_click', { location: 'free_plan_success' })}
            >
              Try the App Free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setCompleted(false)}
          className="mt-4 text-sm text-muted-foreground hover:text-accent underline underline-offset-2 font-body"
        >
          Generate another plan
        </button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form ref={formRef} action={formAction} className="space-y-6">
        {src && <input type="hidden" name="src" value={src} />}
        <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
            <FormItem>
                <Label
                htmlFor="name"
                className="block text-sm font-semibold text-foreground mb-2 text-left"
                >
                Your Name
                </Label>
                <FormControl>
                <Input
                    type="text"
                    id="name"
                    placeholder="John Doe"
                    className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground placeholder-muted-foreground
                            focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20
                            transition-all duration-300 font-body"
                    {...field}
                />
                </FormControl>
                <input type="hidden" name="name" value={field.value || ''} />
                <FormMessage />
            </FormItem>
            )}
        />

        <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
            <FormItem>
                <Label
                htmlFor="email"
                className="block text-sm font-semibold text-foreground mb-2 text-left"
                >
                Email Address
                </Label>
                <FormControl>
                <Input
                    type="email"
                    id="email"
                    placeholder="your.email@example.com"
                    className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground placeholder-muted-foreground
                            focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20
                            transition-all duration-300 font-body"
                    {...field}
                />
                </FormControl>
                <FormMessage />
            </FormItem>
            )}
        />
       
        <FormField
            control={form.control}
            name="event"
            render={({ field }) => (
                <FormItem>
                    <Label htmlFor="event" className="block text-sm font-semibold text-foreground mb-2 text-left">
                        Select Your Hyrox Event
                    </Label>
                    <Select onValueChange={field.onChange} value={field.value} disabled={eventsLoading || hyroxEvents.length === 0}>
                        <FormControl>
                        <SelectTrigger className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground
                                                focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20
                                                transition-all duration-300 font-body h-auto">
                            <SelectValue placeholder={eventsLoading ? "Loading events..." : (hyroxEvents.length === 0 ? "No Events Found" : "Choose your race...")} />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {hyroxEvents.map((event, index) => (
                            <SelectItem key={index} value={event.name}>
                                {event.name}
                            </SelectItem>
                        ))}
                        {eventsLoading && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                        {!eventsLoading && hyroxEvents.length === 0 && <SelectItem value="no-events" disabled>No events found.</SelectItem>}
                        </SelectContent>
                    </Select>
                    {/* Hidden input for form submission */}
                    <input type="hidden" name="event" value={field.value || ''} />
                    <FormMessage />
                </FormItem>
            )}
        />

        <FormField
            control={form.control}
            name="eventDate"
            render={({ field }) => (
                <FormItem>
                    <Label htmlFor="eventDate" className="block text-sm font-semibold text-foreground mb-2 text-left">
                        Select Your Event Date
                    </Label>
                    <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!selectedEvent || availableDates.length === 0}
                    >
                        <FormControl>
                        <SelectTrigger className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground
                                                focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20
                                                transition-all duration-300 font-body h-auto">
                            <SelectValue placeholder={
                                !selectedEvent
                                    ? "Select an event first..."
                                    : availableDates.length === 0
                                        ? "No dates available"
                                        : "Choose your event date..."
                            } />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {availableDates.map((date) => {
                            const dateObj = new Date(date);
                            return (
                                <SelectItem key={date} value={date}>
                                    {dateObj.toLocaleDateString('en-US', {
                                        weekday: 'short',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </SelectItem>
                            );
                        })}
                        </SelectContent>
                    </Select>
                    {/* Hidden input for form submission */}
                    <input type="hidden" name="eventDate" value={field.value || ''} />
                    <FormMessage />
                </FormItem>
            )}
        />

        <SubmitButton />

        {state.message && (
            <div className={`mt-4 p-4 rounded-lg text-center font-semibold animate-in fade-in-from-top-2 font-body ${
            state.type === 'success' 
                ? 'bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400' 
                : 'bg-destructive/10 border border-destructive/20 text-destructive'
            }`}>
            {state.message}
            </div>
        )}
      </form>
    </Form>
  );
}
