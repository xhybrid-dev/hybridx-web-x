
import Papa from 'papaparse';

export interface TrainingPlanRow {
  programName: string;
  programDescription: string;
  workoutDay: number;
  workoutTitle: string;
  exerciseName: string;
  exerciseDetails: string;
}

export interface DailyWorkout {
  day: number;
  date: Date;
  workoutTitle: string;
  exercises: Array<{
    name: string;
    details: string;
  }>;
}

/**
 * Parse the training plan CSV file
 */
export async function parseTrainingPlanCSV(csvPath: string): Promise<TrainingPlanRow[]> {
  const response = await fetch(csvPath);
  const csvText = await response.text();

  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as TrainingPlanRow[];
        // Convert workoutDay to number and filter out invalid rows
        const processedRows = rows
          .map(row => ({
            ...row,
            workoutDay: parseInt(row.workoutDay as any, 10)
          }))
          .filter(row => {
            // Filter out rows with invalid workoutDay
            if (isNaN(row.workoutDay)) {
              console.warn('Skipping row with invalid workoutDay:', row);
              return false;
            }
            return true;
          });
        resolve(processedRows);
      },
      error: (error: Error) => {
        reject(error);
      }
    });
  });
}

/** The plan's race day is Day 77 in the CSV: Days 78-84 are the recovery week after it. */
export const RACE_DAY_NUMBER = 77;

/**
 * Parse a YYYY-MM-DD string as that calendar day in the reader's own time zone.
 * `new Date('2027-03-13')` is midnight UTC, which is still the 12th west of
 * Greenwich, so every date in the plan would land a day early there.
 */
export function parseLocalDate(isoDate: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return new Date(isoDate);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/**
 * Calculate the start date given the event (race) date.
 * Race day is Day 77, so Day 1 = race day - 76 days.
 */
export function calculateStartDate(raceDate: Date): Date {
  const startDate = new Date(raceDate);
  startDate.setDate(startDate.getDate() - (RACE_DAY_NUMBER - 1));
  return startDate;
}

/**
 * Calculate the date for a specific workout day
 */
export function calculateWorkoutDate(raceDate: Date, workoutDay: number): Date {
  // Validate inputs
  if (isNaN(raceDate.getTime())) {
    console.error('Invalid race date:', raceDate);
    return new Date(); // Return current date as fallback
  }

  if (isNaN(workoutDay) || workoutDay < 0) {
    console.error('Invalid workout day:', workoutDay);
    return new Date(); // Return current date as fallback
  }

  const startDate = calculateStartDate(raceDate);
  // Day 0 is the "how to use this plan" page: it is dated with Day 1, the
  // first day of training, not with today.
  if (workoutDay === 0) return startDate;
  const workoutDate = new Date(startDate);
  workoutDate.setDate(workoutDate.getDate() + (workoutDay - 1)); // Day 1 is startDate + 0
  return workoutDate;
}

/**
 * Group exercises by workout day and add calculated dates
 */
export function groupWorkoutsByDay(
  rows: TrainingPlanRow[],
  raceDate: Date
): DailyWorkout[] {
  const grouped = new Map<number, DailyWorkout>();

  rows.forEach(row => {
    if (!grouped.has(row.workoutDay)) {
      grouped.set(row.workoutDay, {
        day: row.workoutDay,
        date: calculateWorkoutDate(raceDate, row.workoutDay),
        workoutTitle: row.workoutTitle,
        exercises: []
      });
    }

    const workout = grouped.get(row.workoutDay)!;
    workout.exercises.push({
      name: row.exerciseName,
      details: row.exerciseDetails
    });
  });

  // Convert to array and sort by day
  return Array.from(grouped.values()).sort((a, b) => a.day - b.day);
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseLocalDate(date) : date;

  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    console.error('Invalid date:', date);
    return 'Invalid Date';
  }

  return dateObj.toLocaleDateString('en-GB', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDateShort(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseLocalDate(date) : date;

  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    console.error('Invalid date:', date);
    return 'Invalid Date';
  }

  // Local calendar day, not toISOString(): a local midnight in UK summer time
  // is the evening before in UTC.
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format date for ICS file (YYYYMMDD)
 */
export function formatDateForICS(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}


/**
 * Get week number for a given day (1-12 weeks)
 */
export function getWeekNumber(day: number): number {
  return Math.ceil(day / 7);
}
