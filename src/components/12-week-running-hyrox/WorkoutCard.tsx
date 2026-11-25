'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Flame, Dumbbell, Wind, Info, Activity } from 'lucide-react';
import { DayPlan } from '@/lib/12-week-running-hyrox/types';

interface WorkoutCardProps {
  dayPlan: DayPlan;
}

const WorkoutCard: React.FC<WorkoutCardProps> = ({ dayPlan }) => {
  const [isOpen, setIsOpen] = useState(true);

  // Helper to determine icon based on title/focus
  const getIcon = () => {
    const text = (dayPlan.title + dayPlan.focus).toLowerCase();
    if (text.includes('run') || text.includes('interval') || text.includes('sprint')) return <Wind className="w-5 h-5 text-yellow-500" />;
    if (text.includes('strength') || text.includes('lift') || text.includes('squat')) return <Dumbbell className="w-5 h-5 text-slate-900" />;
    if (text.includes('rest') || text.includes('recovery')) return <Activity className="w-5 h-5 text-emerald-500" />;
    return <Flame className="w-5 h-5 text-red-500" />;
  };

  return (
    <div className="bg-white rounded border border-slate-200 overflow-hidden mb-4 transition-all hover:shadow-lg hover:border-slate-300">
      <div
        className="p-5 flex items-center justify-between cursor-pointer bg-white border-b border-slate-100 group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center bg-slate-50 rounded border border-slate-100 group-hover:bg-slate-100 transition-colors">
            {getIcon()}
          </div>
          <div>
            <h3 className="font-headline font-bold text-slate-900 text-xl uppercase tracking-tight">{dayPlan.day}</h3>
            <p className="text-sm text-slate-500 font-medium">{dayPlan.title}</p>
          </div>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </div>

      {isOpen && (
        <div className="p-6 space-y-8">
          {/* Focus Section */}
          <div className="flex items-start gap-4 p-4 bg-slate-50 rounded border-l-4 border-slate-900">
            <Info className="w-5 h-5 text-slate-900 shrink-0 mt-0.5" />
            <div>
              <span className="font-headline font-bold text-slate-900 text-sm uppercase block mb-1">Focus</span>
              <p className="text-slate-700 text-sm leading-relaxed">{dayPlan.focus}</p>
            </div>
          </div>

          {/* Activity List (For Rest Days) */}
          {dayPlan.activity && dayPlan.activity.length > 0 && (
             <div>
             <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Activity</h4>
             <ul className="space-y-3">
               {dayPlan.activity.map((item, idx) => (
                 <li key={idx} className="flex items-start gap-3 text-slate-700 text-sm">
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></span>
                   <span>{item}</span>
                 </li>
               ))}
             </ul>
           </div>
          )}

          {/* Warm Up */}
          {dayPlan.warmup && dayPlan.warmup.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Warm Up</h4>
              <ul className="space-y-3">
                {dayPlan.warmup.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-slate-700 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-2 shrink-0"></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Main Workout */}
          {dayPlan.mainWorkout && dayPlan.mainWorkout.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Main Workout</h4>
              <div className="bg-slate-50 rounded p-6 border border-slate-100">
                <ul className="space-y-4">
                  {dayPlan.mainWorkout.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-4 text-slate-900 text-sm font-semibold">
                      <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5 font-headline">
                        {idx + 1}
                      </div>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Cool Down */}
          {dayPlan.coolDown && dayPlan.coolDown.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Cool Down</h4>
              <ul className="space-y-3">
                {dayPlan.coolDown.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-slate-700 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2 shrink-0"></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Coach's Hint */}
          <div className="pt-2 border-t border-slate-100">
            <div className="bg-slate-900 rounded p-6 relative overflow-hidden text-white">
               <div className="absolute top-0 right-0 p-2 opacity-5">
                  <Flame className="w-24 h-24 text-white" />
               </div>
               <p className="text-xs font-bold text-yellow-400 uppercase mb-3 tracking-widest">Coach&apos;s Hint</p>
               <p className="text-slate-100 text-sm italic relative z-10 leading-relaxed">&ldquo;{dayPlan.coachHint}&rdquo;</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutCard;
