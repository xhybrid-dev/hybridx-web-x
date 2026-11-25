'use client';

import React, { useState, useEffect } from 'react';
import { trainingPlan } from '@/lib/12-week-running-hyrox/data';
import WeekSelector from '@/components/12-week-running-hyrox/WeekSelector';
import WorkoutCard from '@/components/12-week-running-hyrox/WorkoutCard';
import Calculator from '@/components/12-week-running-hyrox/Calculator';
import Introduction from '@/components/12-week-running-hyrox/Introduction';
import { Menu, X, Trophy } from 'lucide-react';

export default function TwelveWeekRunningHyroxPage() {
  // -1 = Introduction, 0 = Calculator, 1-12 = Weeks
  const [selectedWeekNum, setSelectedWeekNum] = useState(-1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar on mobile when week changes
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [selectedWeekNum]);

  const currentWeek = trainingPlan.find(w => w.weekNumber === selectedWeekNum);

  const getMobileTitle = () => {
    if (selectedWeekNum === -1) return 'INTRO';
    if (selectedWeekNum === 0) return 'CALC';
    return `WEEK ${selectedWeekNum}`;
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 w-80 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <WeekSelector
          weeks={trainingPlan}
          selectedWeek={selectedWeekNum}
          onSelectWeek={setSelectedWeekNum}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full bg-slate-50">
        {/* Top Mobile Header */}
        <header className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between sticky top-0 z-30 text-white">
          <div className="flex items-center gap-3">
             <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
            >
              <Menu className="w-6 h-6" />
            </button>
            <img
             src="https://hybridx.club/Full%20Logo%20(2).png"
             alt="HybridX"
             className="h-6 w-auto filter invert brightness-0 invert"
           />
          </div>
          <div className="text-xs font-bold bg-slate-800 px-3 py-1 rounded text-yellow-400 whitespace-nowrap ml-2 uppercase tracking-wider">
            {getMobileTitle()}
          </div>
        </header>

        {/* Scrollable Content */}
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 lg:p-12">
          <div className="max-w-5xl mx-auto pb-12">

            {selectedWeekNum === -1 ? (
              <Introduction />
            ) : selectedWeekNum === 0 ? (
              <Calculator />
            ) : (
              currentWeek && (
                <>
                  {/* Week Header Section */}
                  <div className="mb-10 animate-fade-in">
                    <div className="flex items-center gap-3 mb-3">
                       <span className="text-xs font-bold tracking-widest text-white uppercase bg-slate-900 px-3 py-1 rounded-sm">
                         {currentWeek.phase}
                       </span>
                       <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                         Week {currentWeek.weekNumber}
                       </span>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-heading font-bold text-slate-900 mb-6 tracking-tight uppercase leading-none">
                      {currentWeek.title}
                    </h2>

                    {currentWeek.context && (
                      <div className="bg-slate-900 text-slate-300 p-8 rounded shadow-xl mb-10 border-l-4 border-yellow-400 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800 rounded-full blur-3xl opacity-20 -mr-16 -mt-16"></div>
                        <h3 className="text-yellow-400 font-heading font-bold text-lg uppercase tracking-wider mb-2 flex items-center gap-2 relative z-10">
                          <Trophy className="w-5 h-5" />
                          Phase Context
                        </h3>
                        <p className="leading-relaxed text-lg relative z-10 text-slate-100">{currentWeek.context}</p>
                      </div>
                    )}
                  </div>

                  {/* Daily Workout Cards */}
                  <div className="space-y-6">
                    {currentWeek.days.map((day, index) => (
                      <WorkoutCard key={`${currentWeek.weekNumber}-${index}`} dayPlan={day} />
                    ))}
                  </div>

                   {/* Footer for the Week */}
                   <div className="mt-16 text-center text-slate-400 text-sm uppercase tracking-widest font-bold">
                      <p>End of Week {currentWeek.weekNumber}</p>
                      <div className="w-24 h-1 bg-slate-200 mx-auto mt-4"></div>
                   </div>
                </>
              )
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
