
import { DailyWorkout, getWeekNumber, parseLocalDate } from './training-plan-utils';

// HybridX app link for CTAs
const APP_URL = 'https://app.hybridx.club/';

// Phase labels for calendar event context
function getPhaseLabel(weekNumber: number): string {
  if (weekNumber <= 4) return 'Phase 1: Base Building';
  if (weekNumber <= 6) return 'Phase 2: Build';
  if (weekNumber === 7) return 'Phase 2: Deload';
  if (weekNumber <= 10) return 'Phase 3: Competition Prep';
  return 'Phase 4: Taper & Race';
}

// CTA messages that rotate through calendar events
const CTA_MESSAGES = [
  `Track your progress and get personalised coaching - ${APP_URL}`,
  `Want a training plan built around YOUR strengths and weaknesses? - ${APP_URL}`,
  `Join the HybridX community of hybrid athletes - ${APP_URL}`,
  `Level up with personalised programming at HybridX Club - ${APP_URL}`,
  `Log this workout and track your gains in the HybridX app - ${APP_URL}`,
];

function getCTAForDay(dayNumber: number): string {
  return CTA_MESSAGES[dayNumber % CTA_MESSAGES.length];
}

// Milestone messages for key weeks
function getMilestoneMessage(weekNumber: number, dayNumber: number): string | null {
  if (dayNumber === 1) {
    return 'BENCHMARK DAY - Record your results! You\'ll retest at Week 8 to track progress.';
  }
  if (weekNumber === 4 && dayNumber === 28) {
    return 'Phase 1 Complete! You\'ve built a strong aerobic and strength foundation.';
  }
  if (weekNumber === 7) {
    return 'DELOAD WEEK - Reduced volume to let your body absorb the hard work. Trust the science.';
  }
  if (dayNumber === 52) {
    return 'BENCHMARK RETEST - Compare to Week 1 and celebrate your progress!';
  }
  if (dayNumber === 60) {
    return 'FULL DRESS REHEARSAL - Complete Hyrox simulation at race weights. Record your time!';
  }
  if (weekNumber === 11) {
    return 'RACE WEEK - The work is done. Focus on rest, nutrition, and mental preparation.';
  }
  if (dayNumber === 77) {
    return 'RACE DAY! Trust your training. Start controlled. Nail your transitions. HAVE FUN!';
  }
  return null;
}

/**
 * Escape special characters for iCalendar format
 */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Format a Date to iCalendar date format (YYYYMMDD for all-day events)
 */
function formatICSDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/** DTSTAMP is a UTC instant, so it comes from the UTC fields, not the local date. */
function icsTimestamp(now: Date = new Date()): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Format a Date to iCalendar datetime format for timed events
 */
function formatICSDateTime(date: Date, hours: number, minutes: number = 0): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(hours).padStart(2, '0');
  const min = String(minutes).padStart(2, '0');
  return `${y}${m}${d}T${h}${min}00`;
}

/**
 * Generate a UID for calendar events
 */
function generateUID(dayNumber: number, eventDate: string): string {
  return `hybridx-hyrox-day${dayNumber}-${eventDate}@hybridx.club`;
}

export interface CalendarGenerationOptions {
  userName: string;
  eventName: string;
  eventDate: string;
  workouts: DailyWorkout[];
  /** Preferred training time in 24h format (default: 7 for 7:00 AM) */
  preferredHour?: number;
  /** Use all-day events instead of timed events (default: false) */
  allDayEvents?: boolean;
}

// Backward-compatible alias for existing callers
export type ICSGenerationOptions = CalendarGenerationOptions;

/**
 * Generate an ICS calendar file with all training days
 */
export function generateTrainingCalendar(options: CalendarGenerationOptions): string {
  const { userName, eventName, workouts, preferredHour = 7, allDayEvents = false } = options;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HybridX Club//Hyrox Training Plan//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:HybridX - ${userName}'s Hyrox Plan`,
    'X-WR-CALDESC:Your personalised Hyrox training schedule from HybridX Club',
  ];

  workouts.forEach((workout) => {
    const weekNumber = getWeekNumber(workout.day);
    const phaseLabel = getPhaseLabel(weekNumber);
    const milestone = getMilestoneMessage(weekNumber, workout.day);
    const cta = getCTAForDay(workout.day);

    // Build description
    const descParts: string[] = [];

    descParts.push(`Week ${weekNumber} | ${phaseLabel}`);
    descParts.push('');

    if (milestone) {
      descParts.push(milestone);
      descParts.push('');
    }

    workout.exercises.forEach((exercise) => {
      descParts.push(`- ${exercise.name}`);
      if (exercise.details) {
        descParts.push(`  ${exercise.details}`);
      }
      descParts.push('');
    });

    const isRestDay = workout.workoutTitle.toLowerCase().includes('rest');
    if (!isRestDay) {
      descParts.push('---');
      descParts.push(cta);
    }

    const description = escapeICS(descParts.join('\n'));
    const eventSummary = escapeICS(`HybridX Day ${workout.day}: ${workout.workoutTitle}`);

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${generateUID(workout.day, options.eventDate)}`);
    lines.push(`DTSTAMP:${icsTimestamp()}`);

    if (allDayEvents || isRestDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatICSDate(workout.date)}`);
      const nextDay = new Date(workout.date);
      nextDay.setDate(nextDay.getDate() + 1);
      lines.push(`DTEND;VALUE=DATE:${formatICSDate(nextDay)}`);
    } else {
      lines.push(`DTSTART:${formatICSDateTime(workout.date, preferredHour)}`);
      lines.push(`DTEND:${formatICSDateTime(workout.date, preferredHour + 1)}`);

      // Add reminder 30 minutes before for training days
      lines.push('BEGIN:VALARM');
      lines.push('TRIGGER:-PT30M');
      lines.push('ACTION:DISPLAY');
      lines.push(`DESCRIPTION:Time to train! ${workout.workoutTitle}`);
      lines.push('END:VALARM');
    }

    lines.push(`SUMMARY:${eventSummary}`);
    lines.push(`DESCRIPTION:${description}`);
    lines.push(`URL:${APP_URL}`);
    lines.push(`CATEGORIES:HybridX,Hyrox Training,${phaseLabel}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  });

  // Add race day event with special formatting
  const raceDate = parseLocalDate(options.eventDate);
  lines.push('BEGIN:VEVENT');
  lines.push(`UID:hybridx-raceday-${options.eventDate}@hybridx.club`);
  lines.push(`DTSTAMP:${icsTimestamp()}`);
  lines.push(`DTSTART;VALUE=DATE:${formatICSDate(raceDate)}`);
  const raceDayEnd = new Date(raceDate);
  raceDayEnd.setDate(raceDayEnd.getDate() + 1);
  lines.push(`DTEND;VALUE=DATE:${formatICSDate(raceDayEnd)}`);
  lines.push(`SUMMARY:${escapeICS(`HYROX RACE DAY - ${eventName}`)}`);
  lines.push(`DESCRIPTION:${escapeICS(
    `RACE DAY: ${eventName}\n\n` +
    `Race Strategy Reminders:\n` +
    `1) Start controlled - don't sprint the first run\n` +
    `2) Pull back 2-3 sec/500m on SkiErg and Rower\n` +
    `3) Breaks on sleds and Wall Balls are OK\n` +
    `4) Nail your transitions - posture reset, breathing control\n` +
    `5) 85% effort through stations 1-6, then empty the tank\n\n` +
    `HAVE FUN! You've trained for this.\n\n` +
    `---\n` +
    `Share your result and plan your next race with HybridX Club - ${APP_URL}`
  )}`);
  lines.push(`URL:${APP_URL}`);
  lines.push('CATEGORIES:HybridX,Hyrox,Race Day');
  lines.push('STATUS:CONFIRMED');
  lines.push('END:VEVENT');

  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Generate and trigger download of the ICS calendar file
 */
export function trainingCalendarFileName(options: Pick<CalendarGenerationOptions, 'userName'>): string {
  return `HybridX-Hyrox-Training-${options.userName.replace(/\s+/g, '-')}.ics`;
}

/** The calendar as a Blob, for a download link that still works when an automatic download is blocked. */
export function trainingCalendarBlob(options: CalendarGenerationOptions): Blob {
  return new Blob([generateTrainingCalendar(options)], { type: 'text/calendar;charset=utf-8' });
}

export function downloadTrainingCalendar(options: CalendarGenerationOptions): void {
  const blob = trainingCalendarBlob(options);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = trainingCalendarFileName(options);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Backward-compatible alias used by HyroxDominationForm
export const downloadTrainingPlanICS = downloadTrainingCalendar;
export const generateICSContent = generateTrainingCalendar;
