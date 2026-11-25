import FileSaver from 'file-saver';
import { buildIcs, datesFromRace, datesFromStart, ICS_FILE_NAME, isYmd, planEvents } from './schedule';

/**
 * Download the plan as a calendar file. `chosen` is a calendar day, 'YYYY-MM-DD': the Monday
 * week 1 begins on (or the next Monday after it), or the race day itself.
 */
export function downloadPlanCalendar(chosen: string, mode: 'start' | 'race'): void {
  if (!isYmd(chosen)) return;
  const dates = mode === 'race' ? datesFromRace(chosen) : datesFromStart(chosen);
  const blob = new Blob([buildIcs(planEvents(dates))], { type: 'text/calendar;charset=utf-8' });
  const saveAs = (FileSaver as unknown as { saveAs?: typeof FileSaver }).saveAs ?? FileSaver;
  saveAs(blob, ICS_FILE_NAME);
}
