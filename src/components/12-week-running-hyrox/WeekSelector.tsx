'use client';

import React, { useCallback, useState } from 'react';
import { WeekPlan } from '@/lib/12-week-running-hyrox/types';
import { FileDown, Loader2, Calculator, BookOpen, Zap, Calendar as CalendarIcon } from 'lucide-react';
import { generateDocument } from '@/lib/12-week-running-hyrox/wordGenerator';
import CalendarModal from './CalendarModal';
import { downloadPlanCalendar } from '@/lib/12-week-running-hyrox/icsGenerator';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface WeekSelectorProps {
  weeks: WeekPlan[];
  selectedWeek: number;
  onSelectWeek: (week: number) => void;
}

const WeekSelector: React.FC<WeekSelectorProps> = ({ weeks, selectedWeek, onSelectWeek }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadError(null);
    setIsGenerating(true);
    try {
      await generateDocument(weeks);
    } catch (error) {
      console.error("Failed to generate document", error);
      setDownloadError('The guide could not be generated. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const closeCalendar = useCallback(() => setIsCalendarModalOpen(false), []);

  return (
    <div className="h-full flex flex-col bg-slate-950 border-r border-slate-900 w-full md:w-80 shrink-0 text-white shadow-2xl">
      <div className="p-8 border-b border-slate-800">
        <Link href="/" className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white">
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Back to hybridx.club
        </Link>
        <div className="mb-6 flex items-center justify-between gap-3">
          {/* The logo is black on transparent, so it is inverted for this dark background. */}
          <Link href="/" aria-label="HybridX home" className="inline-block rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400">
            <img src="/Full%20Logo%20(2).png" alt="HybridX" className="h-8 w-auto filter invert brightness-0 invert opacity-100" />
          </Link>
          <Link href="/calculators" className="text-xs font-semibold text-slate-300 hover:text-white underline-offset-4 hover:underline">
            Calculators
          </Link>
        </div>

        <h2 className="text-2xl font-headline font-bold text-white uppercase leading-none mb-2 tracking-tight">
            Faster Running <br/>
            <span className="text-yellow-400">For Hyrox</span>
        </h2>

        <p className="text-[10px] text-slate-400 font-medium leading-relaxed tracking-wide uppercase opacity-80">
          A Specialized Running Program to Boost VO2 Max, Threshold, and Race Day Speed for Hyrox
        </p>
      </div>

      <nav aria-label="Plan weeks" className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
        {/* Start Here Section */}
        <div className="mb-8 space-y-1">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-3 px-2">Start Here</h3>

          <button
            type="button"
            aria-current={selectedWeek === -1 ? 'page' : undefined}
            onClick={() => onSelectWeek(-1)}
            className={`w-full text-left p-3 rounded-lg transition-all flex items-center gap-3 border group ${
              selectedWeek === -1
                ? 'bg-slate-900 text-white border-slate-700 shadow-md'
                : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-900 hover:text-white'
            }`}
          >
            <div className={`p-1.5 rounded-md transition-colors ${selectedWeek === -1 ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-500 group-hover:text-white'}`}>
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="font-headline font-medium tracking-wide">Introduction & Science</span>
          </button>

          <button
            type="button"
            aria-current={selectedWeek === 0 ? 'page' : undefined}
            onClick={() => onSelectWeek(0)}
            className={`w-full text-left p-3 rounded-lg transition-all flex items-center gap-3 border group ${
              selectedWeek === 0
                ? 'bg-slate-900 text-white border-slate-700 shadow-md'
                : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-900 hover:text-white'
            }`}
          >
            <div className={`p-1.5 rounded-md transition-colors ${selectedWeek === 0 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500 group-hover:text-white'}`}>
              <Calculator className="w-4 h-4" />
            </div>
            <span className="font-headline font-medium tracking-wide">Threshold Test & Calculator</span>
          </button>
        </div>

        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-3 px-2">Training Plan</h3>
        {weeks.map((week) => {
           const isSelected = selectedWeek === week.weekNumber;
           return (
            <button
              type="button"
              key={week.weekNumber}
              aria-current={isSelected ? 'page' : undefined}
              onClick={() => onSelectWeek(week.weekNumber)}
              className={`w-full text-left p-3 rounded-lg transition-all border group relative overflow-hidden ${
                isSelected
                  ? 'bg-yellow-400 text-slate-950 border-yellow-400 shadow-lg'
                  : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex justify-between items-start relative z-10">
                <div className="flex items-start gap-3">
                   {/* Week Icon/Number */}
                   <div className={`shrink-0 w-8 h-8 rounded flex items-center justify-center font-headline font-bold text-sm mt-0.5 ${
                     isSelected ? 'bg-slate-950 text-yellow-400' : 'bg-slate-800 text-slate-500'
                   }`}>
                      {week.weekNumber}
                   </div>
                   <div>
                      <div className={`font-headline font-bold text-base uppercase leading-tight ${isSelected ? 'text-slate-900' : 'text-slate-300'}`}>
                        {week.title}
                      </div>
                      <div className={`text-[10px] uppercase tracking-wider font-bold mt-1 inline-block ${
                         isSelected ? 'text-slate-800 opacity-75' : 'text-slate-600'
                      }`}>
                        {week.phase}
                      </div>
                   </div>
                </div>
                {isSelected && <Zap className="w-5 h-5 text-slate-900 shrink-0" />}
              </div>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-3">
        <button
          type="button"
          onClick={handleDownload}
          disabled={isGenerating}
          className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-slate-950 py-3 px-4 rounded font-headline font-bold uppercase tracking-wider text-sm transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <FileDown className="w-4 h-4" />
              <span>Download Guide</span>
            </>
          )}
        </button>

        {downloadError && (
          <p role="alert" className="text-xs text-red-300">
            {downloadError}
          </p>
        )}
        <button
          type="button"
          onClick={() => setIsCalendarModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 px-4 rounded font-headline font-bold uppercase tracking-wider text-sm transition-colors shadow-sm"
        >
          <CalendarIcon className="w-4 h-4 text-yellow-400" />
          <span>Export Calendar</span>
        </button>
      </div>

      <CalendarModal
        isOpen={isCalendarModalOpen}
        onClose={closeCalendar}
        onConfirm={downloadPlanCalendar}
      />
    </div>
  );
};

export default WeekSelector;
