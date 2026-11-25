'use client';

import React, { useEffect, useId, useState } from 'react';
import { Calculator as CalcIcon, Activity, Timer, Heart, Info, ChevronDown, ChevronUp, BookOpen, ArrowRight } from 'lucide-react';
import { chapterTwoContent } from '@/lib/12-week-running-hyrox/data';
import { formatPaceSec } from '@/lib/format-pace';

const STORAGE_KEY = 'hybridx-run-zones';

const Calculator: React.FC = () => {
  const [lthr, setLthr] = useState<string>('');
  const [paceMin, setPaceMin] = useState<string>('');
  const [paceSec, setPaceSec] = useState<string>('');
  const lthrId = useId();
  const paceMinId = useId();
  const paceSecId = useId();

  // The reader's numbers stay on their device between visits (and between weeks of the plan),
  // so a test done once does not have to be typed in again. Storage can be blocked: carry on without it.
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
      if (saved && typeof saved === 'object') {
        if (typeof saved.lthr === 'string') setLthr(saved.lthr.slice(0, 3));
        if (typeof saved.paceMin === 'string') setPaceMin(saved.paceMin.slice(0, 2));
        if (typeof saved.paceSec === 'string') setPaceSec(saved.paceSec.slice(0, 2));
      }
    } catch {
      /* nothing saved, or storage is unavailable */
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ lthr, paceMin, paceSec }));
    } catch {
      /* storage is unavailable */
    }
  }, [loaded, lthr, paceMin, paceSec]);

  const { title, subtitle, intro, part1, part2, part3, part4, example, finalNote } = chapterTwoContent;

  // Helper: Convert MM:SS to total seconds
  const toSeconds = (min: number, sec: number) => min * 60 + sec;

  // Helper: Convert total seconds back to MM:SS string
  const toTimeStr = (totalSec: number) => formatPaceSec(totalSec);

  const calculateZones = () => {
    const hr = parseInt(lthr);
    const min = parseInt(paceMin);
    const sec = parseInt(paceSec) || 0;

    // Numbers a person could not have run or measured give no zones, rather than a pace below zero.
    if (!(hr >= 80 && hr <= 230) || !(min >= 2 && min <= 15) || sec < 0 || sec > 59) return null;

    const basePaceSeconds = toSeconds(min, sec);

    return {
      zone2: {
        hr: Math.round(hr * 0.85),
        paceSlow: toTimeStr(basePaceSeconds + 90),
        paceFast: toTimeStr(basePaceSeconds + 60),
      },
      threshold: {
        hr: hr,
        pace: toTimeStr(basePaceSeconds),
      },
      vo2max: {
        paceSlow: toTimeStr(basePaceSeconds - 30),
        paceFast: toTimeStr(basePaceSeconds - 45),
      },
      racePace: {
        paceSlow: toTimeStr(basePaceSeconds + 20),
        paceFast: toTimeStr(basePaceSeconds + 15),
      }
    };
  };

  const results = calculateZones();

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-fade-in space-y-12">

      {/* Header Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold tracking-widest text-slate-900 uppercase bg-yellow-400 px-3 py-1 rounded-sm">
            Field Test & Calculator
          </span>
        </div>
        <h2 className="text-4xl md:text-5xl font-headline font-bold text-slate-900 mb-2 uppercase tracking-tight">
          {title.split(':')[1]}
        </h2>
        <h3 className="text-xl text-slate-500 font-medium mb-6">{subtitle}</h3>
        <div className="prose prose-slate text-slate-700 max-w-none">
          {intro.map((para, i) => (
            <p key={i} className="mb-2 leading-relaxed">{para}</p>
          ))}
        </div>
      </div>

      {/* Part 1: The Protocol */}
      <div className="bg-white rounded border border-slate-200 p-8 shadow-sm">
        <h3 className="text-2xl font-headline font-bold text-slate-900 mb-6 uppercase border-b border-slate-100 pb-4">{part1.title}</h3>

        <div className="mb-8">
          <h4 className="font-headline font-bold text-slate-900 uppercase text-sm tracking-wide mb-3">Equipment Needed</h4>
          <ul className="space-y-2 text-slate-600 text-sm">
             {part1.equipment.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-slate-900 mt-1.5 shrink-0"></div>
                   {item}
                </li>
             ))}
          </ul>
        </div>

        <div className="bg-slate-900 p-6 rounded text-white mb-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400 opacity-10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <h4 className="font-headline font-bold text-yellow-400 uppercase text-lg mb-2">The Mission</h4>
          <p className="text-slate-300 text-sm leading-relaxed relative z-10">{part1.mission}</p>
        </div>

        <div className="space-y-8">
           {part1.steps.map((step, i) => (
             <div key={i} className="relative pl-8 border-l-2 border-slate-200">
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-slate-900 flex items-center justify-center">
                </div>
                <h4 className="font-headline font-bold text-slate-900 text-lg uppercase mb-3">{step.title}</h4>
                <ul className="space-y-3 text-slate-600 text-sm">
                  {step.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <ArrowRight className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
             </div>
           ))}
        </div>

        <div className="mt-10 bg-slate-50 p-5 rounded border border-slate-200 text-sm text-slate-700 italic border-l-4 border-l-yellow-400">
          <strong>Note: </strong> {part1.note}
        </div>
      </div>

      {/* Part 2: Extracting Data */}
      <div className="prose prose-slate text-slate-700 max-w-none">
         <h3 className="text-3xl font-headline font-bold text-slate-900 mb-6 uppercase">{part2.title}</h3>
         {part2.content.map((p, i) => <p key={i}>{p}</p>)}
      </div>

      {/* Part 3: Calculator (Worksheet) */}
      <div className="bg-slate-950 text-white rounded-lg shadow-2xl overflow-hidden border border-slate-800">
        <div className="p-8 border-b border-slate-800 bg-slate-900">
           <h3 className="text-2xl font-headline font-bold text-white mb-2 flex items-center gap-3 uppercase tracking-wide">
             <CalcIcon className="w-6 h-6 text-yellow-400" />
             {part3.title}
           </h3>
           <p className="text-slate-400 text-sm whitespace-pre-line leading-relaxed">{part3.intro}</p>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
           {/* Inputs */}
           <div className="space-y-8">
              <div>
                <label htmlFor={lthrId} className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                  1. Threshold Heart Rate (LTHR)
                </label>
                <div className="relative group">
                  <input
                    id={lthrId}
                    type="number"
                    inputMode="numeric"
                    min={80}
                    max={230}
                    value={lthr}
                    onChange={(e) => setLthr(e.target.value)}
                    placeholder="e.g. 170"
                    className="w-full p-4 pl-12 bg-slate-900 border border-slate-700 rounded focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 focus:outline-none transition-all font-mono text-xl text-white placeholder-slate-400"
                  />
                  <Heart className="w-5 h-5 text-slate-400 absolute left-4 top-4 group-focus-within:text-yellow-400 transition-colors" />
                  <span className="absolute right-4 top-4 text-slate-400 text-xs font-bold uppercase">BPM</span>
                </div>
              </div>

              <div>
                <p className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                  2. Threshold Pace (TP), minutes and seconds per km
                </p>
                <div className="flex gap-4 items-center">
                  <div className="relative flex-1 group">
                    <input
                      id={paceMinId}
                      aria-label="Threshold pace, minutes per km"
                      type="number"
                      inputMode="numeric"
                      min={2}
                      max={15}
                      value={paceMin}
                      onChange={(e) => setPaceMin(e.target.value)}
                      placeholder="Min"
                      className="w-full p-4 pl-12 bg-slate-900 border border-slate-700 rounded focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 focus:outline-none transition-all font-mono text-xl text-white placeholder-slate-400"
                    />
                    <Timer className="w-5 h-5 text-slate-400 absolute left-4 top-4 group-focus-within:text-yellow-400 transition-colors" />
                  </div>
                  <span className="text-slate-400 font-headline font-bold text-xl">:</span>
                  <div className="relative flex-1">
                    <input
                      id={paceSecId}
                      aria-label="Threshold pace, seconds"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={59}
                      value={paceSec}
                      onChange={(e) => setPaceSec(e.target.value)}
                      placeholder="Sec"
                      className="w-full p-4 bg-slate-900 border border-slate-700 rounded focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 focus:outline-none transition-all font-mono text-xl text-center text-white placeholder-slate-400"
                    />
                  </div>
                  <span className="text-slate-400 text-xs font-bold uppercase whitespace-nowrap">/ km</span>
                </div>
              </div>

              {!results && (
                <div className="p-6 rounded bg-slate-900 border border-slate-800 text-sm text-slate-400 italic">
                  Enter your results above to unlock your training zones.
                </div>
              )}
           </div>

           {/* Outputs (Cheat Sheet) */}
           <div aria-live="polite" className={`relative transition-all duration-700 motion-reduce:transition-none ${results ? 'opacity-100 translate-y-0' : 'opacity-30 blur-sm translate-y-4'}`}>
              <h4 className="text-xs font-bold text-yellow-400 uppercase tracking-[0.2em] mb-6 border-b border-slate-800 pb-2">{part4.title}</h4>

              <div className="space-y-4">
                 {/* Zone 2 */}
                 <div className="bg-slate-900 rounded p-4 border-l-4 border-blue-500 hover:bg-slate-800 transition-colors">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-blue-400 font-headline font-bold text-lg uppercase">Zone 2 <span className="text-xs text-slate-400 ml-1 font-sans capitalize">(Aerobic Base)</span></span>
                      <span className="text-white font-mono font-bold text-lg">{results ? `< ${results.zone2.hr}` : '---'} <span className="text-xs text-slate-400">BPM</span></span>
                    </div>
                    <div className="text-xs text-slate-400 flex justify-between items-center">
                      <span className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded">RPE 3-4</span>
                      <span className="font-mono text-white">{results ? `${results.zone2.paceFast} - ${results.zone2.paceSlow}` : '---'} <span className="text-slate-400">/km</span></span>
                    </div>
                 </div>

                 {/* Threshold */}
                 <div className="bg-slate-900 rounded p-4 border-l-4 border-yellow-500 hover:bg-slate-800 transition-colors">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-yellow-400 font-headline font-bold text-lg uppercase">Zone 4 <span className="text-xs text-slate-400 ml-1 font-sans capitalize">(Threshold)</span></span>
                      <span className="text-white font-mono font-bold text-lg">{results ? `~ ${results.threshold.hr}` : '---'} <span className="text-xs text-slate-400">BPM</span></span>
                    </div>
                    <div className="text-xs text-slate-400 flex justify-between items-center">
                      <span className="bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded">RPE 7-8</span>
                      <span className="font-mono text-white">{results ? `${results.threshold.pace}` : '---'} <span className="text-slate-400">/km</span></span>
                    </div>
                 </div>

                 {/* VO2 Max */}
                 <div className="bg-slate-900 rounded p-4 border-l-4 border-red-500 hover:bg-slate-800 transition-colors">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-red-500 font-headline font-bold text-lg uppercase">Zone 5 <span className="text-xs text-slate-400 ml-1 font-sans capitalize">(VO2 Max)</span></span>
                      <span className="text-slate-400 font-bold text-xs uppercase tracking-wide">Ignore HR</span>
                    </div>
                    <div className="text-xs text-slate-400 flex justify-between items-center">
                      <span className="bg-red-500/10 text-red-500 px-2 py-1 rounded">RPE 9</span>
                      <span className="font-mono text-white">{results ? `${results.vo2max.paceFast} - ${results.vo2max.paceSlow}` : '---'} <span className="text-slate-400">/km</span></span>
                    </div>
                 </div>
              </div>

              {/* Hyrox Pace */}
               <div className="mt-8 pt-6 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-headline font-bold text-white text-lg uppercase">Est. Hyrox Race Pace</h4>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Target for Race Day</p>
                  </div>
                  <div className="font-mono font-bold text-yellow-400 text-2xl tracking-tighter">
                    {results ? `${results.racePace.paceFast} - ${results.racePace.paceSlow}` : '---'} <span className="text-sm text-slate-400">/km</span>
                  </div>
                </div>
             </div>
           </div>
        </div>
      </div>

      {/* Example & Final Note */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="bg-white rounded p-8 border border-slate-200">
            <h4 className="font-headline font-bold text-slate-900 uppercase mb-4 text-lg">{example.title}</h4>
            <ul className="space-y-3 text-sm text-slate-600">
              {example.items.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2 shrink-0"></div>
                   <span>{item}</span>
                </li>
              ))}
            </ul>
         </div>

         <div className="bg-slate-900 rounded p-8 border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-400/5 rounded-full -mr-10 -mt-10"></div>
            <h4 className="font-headline font-bold text-yellow-400 uppercase mb-4 text-lg">{finalNote.title}</h4>
             <div className="space-y-3 text-sm text-slate-300 leading-relaxed relative z-10">
              {finalNote.content.map((item, i) => <p key={i}>{item}</p>)}
            </div>
         </div>
      </div>

    </div>
  );
};

export default Calculator;
