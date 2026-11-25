'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Calendar as CalendarIcon, X, Check, Flag } from 'lucide-react';
import { datesFromRace, datesFromStart, isYmd } from '@/lib/12-week-running-hyrox/schedule';
import { formatLongDate } from '@/lib/free-plan-dates';

export type CalendarMode = 'start' | 'race';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** `date` is a calendar day, 'YYYY-MM-DD', not a Date: see schedule.ts for why. */
  onConfirm: (date: string, mode: CalendarMode) => void;
}

const CalendarModal: React.FC<CalendarModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [mode, setMode] = useState<CalendarMode>('start');
  const [dateStr, setDateStr] = useState('');
  const titleId = useId();
  const dateId = useId();
  const dateRef = useRef<HTMLInputElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  // Focus the date on opening, give it back to the button that opened the dialog on closing,
  // and let Escape close it.
  useEffect(() => {
    if (!isOpen) return;
    returnTo.current = document.activeElement as HTMLElement | null;
    dateRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      returnTo.current?.focus?.();
    };
  }, [isOpen, onClose]);

  const preview = useMemo(() => {
    if (!isYmd(dateStr)) return null;
    const dates = mode === 'race' ? datesFromRace(dateStr) : datesFromStart(dateStr);
    return `Week 1 starts on ${formatLongDate(dates.start)}. Race day is ${formatLongDate(dates.raceDay)}.`;
  }, [dateStr, mode]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isYmd(dateStr)) return;
    onConfirm(dateStr, mode);
    onClose();
  };

  const modeButton = (value: CalendarMode, label: string, Icon: typeof CalendarIcon) => (
    <button
      type="button"
      onClick={() => setMode(value)}
      aria-pressed={mode === value}
      className={`p-4 rounded border flex flex-col items-center gap-2 transition-all ${
        mode === value ? 'bg-slate-800 border-yellow-400 text-white' : 'bg-transparent border-slate-700 text-slate-300 hover:bg-slate-900'
      }`}
    >
      <Icon className={`w-6 h-6 ${mode === value ? 'text-yellow-400' : 'text-slate-400'}`} aria-hidden="true" />
      <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form role="dialog" aria-modal="true" aria-labelledby={titleId} onSubmit={handleSubmit} className="bg-slate-950 border border-slate-800 rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-400 p-2 rounded text-slate-900">
              <CalendarIcon className="w-5 h-5" aria-hidden="true" />
            </div>
            <h2 id={titleId} className="font-headline font-bold text-white text-xl uppercase">
              Export calendar
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-slate-300 text-sm leading-relaxed">
            Download an <strong>.ics</strong> file to add this 12-week plan to Google Calendar, Apple Calendar or Outlook. Sessions are all-day events on Monday, Tuesday, Thursday and Saturday.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {modeButton('start', 'I know when to start', CalendarIcon)}
            {modeButton('race', 'I know my race date', Flag)}
          </div>

          <div>
            <label htmlFor={dateId} className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              {mode === 'start' ? 'Start date' : 'Race date'}
            </label>
            <input
              ref={dateRef}
              id={dateId}
              type="date"
              required
              className="w-full bg-slate-900 border border-slate-700 text-white rounded p-3 focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
            />
            <p className="text-xs text-slate-400 mt-2" aria-live="polite">
              {preview ??
                (mode === 'start'
                  ? 'Weeks begin on a Monday, so a start on any other day moves to the next Monday.'
                  : 'The 12 weeks are counted back so the last session is on this day, whether it is a Saturday or a Sunday.')}
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-end">
          <button
            type="submit"
            disabled={!isYmd(dateStr)}
            className="bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-bold uppercase tracking-wider px-6 py-3 rounded text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            Download file
          </button>
        </div>
      </form>
    </div>
  );
};

export default CalendarModal;
