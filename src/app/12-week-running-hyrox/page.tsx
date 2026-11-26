'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { trainingPlan } from '@/lib/12-week-running-hyrox/data';
import type { WeekPlan } from '@/lib/12-week-running-hyrox/types';
import WeekSelector from '@/components/12-week-running-hyrox/WeekSelector';
import WorkoutCard from '@/components/12-week-running-hyrox/WorkoutCard';
import Calculator from '@/components/12-week-running-hyrox/Calculator';
import Introduction from '@/components/12-week-running-hyrox/Introduction';
import { Menu, X, Trophy } from 'lucide-react';

// -1 = Introduction, 0 = Calculator, 1-12 = Weeks
const INTRO = -1;
const CALCULATOR = 0;

function hashFor(view: number): string {
  if (view === INTRO) return '#introduction';
  if (view === CALCULATOR) return '#calculator';
  return `#week-${view}`;
}

function viewFromHash(hash: string): number {
  if (hash === '#calculator') return CALCULATOR;
  const week = /^#week-(\d{1,2})$/.exec(hash)?.[1];
  if (week && Number(week) >= 1 && Number(week) <= trainingPlan.length) return Number(week);
  return INTRO;
}

function WeekView({ week }: { week: WeekPlan }) {
  return (
    <>
      {/* Week Header Section */}
      <div className="mb-10 animate-fade-in">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-bold tracking-widest text-white uppercase bg-slate-900 px-3 py-1 rounded-sm">{week.phase}</span>
          <span className="text-xs font-bold tracking-widest text-slate-500 uppercase">Week {week.weekNumber}</span>
        </div>
        <h2 className="text-4xl md:text-6xl font-headline font-bold text-slate-900 mb-6 tracking-tight uppercase leading-none">{week.title}</h2>

        {week.context && (
          <div className="bg-slate-900 text-slate-300 p-8 rounded shadow-xl mb-10 border-l-4 border-yellow-400 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800 rounded-full blur-3xl opacity-20 -mr-16 -mt-16"></div>
            <h3 className="text-yellow-400 font-headline font-bold text-lg uppercase tracking-wider mb-2 flex items-center gap-2 relative z-10">
              <Trophy className="w-5 h-5" aria-hidden="true" />
              Phase Context
            </h3>
            <p className="leading-relaxed text-lg relative z-10 text-slate-100">{week.context}</p>
          </div>
        )}
      </div>

      {/* Daily Workout Cards */}
      <div className="space-y-6">
        {week.days.map((day, index) => (
          <WorkoutCard key={`${week.weekNumber}-${index}`} dayPlan={day} />
        ))}
      </div>

      {/* Footer for the Week */}
      <div className="mt-16 text-center text-slate-500 text-sm uppercase tracking-widest font-bold">
        <p>End of Week {week.weekNumber}</p>
        <div className="w-24 h-1 bg-slate-200 mx-auto mt-4"></div>
      </div>
    </>
  );
}

export default function TwelveWeekRunningHyroxPage() {
  const [selected, setSelected] = useState(INTRO);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // A week has an address: /12-week-running-hyrox#week-3. Read it after mount (the server
  // renders the introduction), and follow the browser's back and forward.
  useEffect(() => {
    const sync = () => setSelected(viewFromHash(window.location.hash));
    sync();
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  // On a phone the menu closes over the button that was pressed, so focus moves to the
  // content rather than being lost with it.
  const select = useCallback(
    (view: number) => {
      setSelected(view);
      if (window.location.hash !== hashFor(view)) window.history.pushState(null, '', hashFor(view));
      if (isSidebarOpen) {
        setIsSidebarOpen(false);
        mainRef.current?.focus({ preventScroll: true });
      }
    },
    [isSidebarOpen],
  );

  // Every view starts at its top, however it was reached.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [selected]);

  useEffect(() => {
    if (!isSidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSidebarOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isSidebarOpen]);

  const mobileTitle = selected === INTRO ? 'INTRO' : selected === CALCULATOR ? 'CALC' : `WEEK ${selected}`;

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} aria-hidden="true" />}

      {/* Sidebar Navigation. Out of sight on a phone until opened, so it is also out of the tab order. */}
      <div
        id="plan-sidebar"
        className={`fixed inset-y-0 left-0 z-50 transform transition-[transform,visibility] duration-300 ease-in-out md:relative md:translate-x-0 md:visible w-80 ${
          isSidebarOpen ? 'translate-x-0 visible' : '-translate-x-full invisible'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            setIsSidebarOpen(false);
            menuButtonRef.current?.focus();
          }}
          aria-label="Close plan menu"
          className="md:hidden absolute right-3 top-3 z-10 p-2 rounded text-slate-300 hover:text-white hover:bg-slate-800"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
        <WeekSelector weeks={trainingPlan} selectedWeek={selected} onSelectWeek={select} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full bg-slate-50">
        {/* Top Mobile Header */}
        <header className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between sticky top-0 z-30 text-white">
          <div className="flex items-center gap-3">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open plan menu"
              aria-expanded={isSidebarOpen}
              aria-controls="plan-sidebar"
              className="p-2 -ml-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
            >
              <Menu className="w-6 h-6" aria-hidden="true" />
            </button>
            <Link href="/" aria-label="HybridX home">
              <img src="/Full%20Logo%20(2).png" alt="HybridX" className="h-6 w-auto filter invert brightness-0 invert" />
            </Link>
          </div>
          <div className="text-xs font-bold bg-slate-800 px-3 py-1 rounded text-yellow-400 whitespace-nowrap ml-2 uppercase tracking-wider" aria-live="polite">
            {mobileTitle}
          </div>
        </header>

        {/* Scrollable content. Every view stays in the page, hidden when not chosen, so the
            whole plan is there for search engines and for the reader's find-in-page. */}
        <main id="main-content" tabIndex={-1} ref={mainRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 lg:p-12">
          <div className="max-w-5xl mx-auto pb-12">
            <section hidden={selected !== INTRO} aria-label="Introduction and science">
              <Introduction />
            </section>
            <section hidden={selected !== CALCULATOR} aria-label="Threshold test and calculator">
              <Calculator />
            </section>
            {trainingPlan.map((week) => (
              <section key={week.weekNumber} hidden={selected !== week.weekNumber} aria-label={`Week ${week.weekNumber}: ${week.title}`}>
                <WeekView week={week} />
              </section>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
