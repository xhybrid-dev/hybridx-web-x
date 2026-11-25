'use client';

import React from 'react';
import { introContent } from '@/lib/12-week-running-hyrox/data';
import { BookOpen, Activity, Zap, Brain, ArrowRight } from 'lucide-react';

const Introduction: React.FC = () => {
  const { title, subtitle, sections } = introContent;

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-fade-in space-y-12">
      {/* Header */}
      <div className="border-b border-slate-200 pb-8">
         <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-bold tracking-[0.2em] text-white uppercase bg-slate-900 px-3 py-1 rounded-sm">
            Chapter 1
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-headline font-bold text-slate-900 mb-3 tracking-tight uppercase leading-none">{title}</h1>
        <p className="text-xl md:text-2xl text-slate-500 font-light">{subtitle}</p>
      </div>

      {/* Sections */}
      <div className="space-y-16">
        {sections.map((section, idx) => (
          <div key={idx} className="prose prose-slate max-w-none">
            <h2 className="text-3xl font-headline font-bold text-slate-900 mb-6 pb-2 border-b border-slate-100 uppercase">{section.title}</h2>
            {section.content.map((para, pIdx) => (
              <p key={pIdx} className="text-slate-700 leading-relaxed mb-4 text-lg">{para}</p>
            ))}

            {/* Subsections (Zone 2, 4, 5 etc) */}
            {section.subsections && (
              <div className="grid grid-cols-1 gap-8 mt-10">
                {section.subsections.map((sub, sIdx) => (
                  <div key={sIdx} className="bg-white p-8 rounded border border-slate-200 shadow-sm hover:border-slate-300 transition-colors relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                    <h3 className="text-2xl font-headline font-bold text-slate-900 mb-4 relative z-10 uppercase">{sub.title}</h3>
                    <div className="space-y-5 text-sm relative z-10">
                      <div>
                        <span className="font-headline font-bold text-yellow-600 block text-sm uppercase tracking-wide mb-1">Physiological Focus</span>
                        <span className="text-slate-800 font-bold text-lg">{sub.focus}</span>
                      </div>
                      <div>
                         <span className="font-headline font-bold text-slate-400 block text-xs uppercase tracking-wide mb-2">The Mechanism</span>
                         <span className="text-slate-600 block leading-relaxed bg-slate-50 p-4 rounded border-l-2 border-slate-200">{sub.mechanism}</span>
                      </div>
                      {sub.whyItMatters && (
                        <div className="mt-6">
                           <span className="font-headline font-bold text-slate-900 block text-sm uppercase mb-3 flex items-center gap-2">
                             <Zap className="w-4 h-4 text-yellow-500" /> Why It Matters for Hyrox
                           </span>
                           <ul className="space-y-2">
                             {sub.whyItMatters.map((point, ptIdx) => (
                               <li key={ptIdx} className="text-slate-700 flex items-start gap-3">
                                 <span className="w-1.5 h-1.5 rounded-full bg-slate-900 mt-2 shrink-0"></span>
                                 <span className="leading-relaxed">{point}</span>
                               </li>
                             ))}
                           </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Glossary */}
            {section.glossary && (
              <div className="bg-slate-900 rounded text-white divide-y divide-slate-800 mt-10">
                 {section.glossary.map((term, gIdx) => (
                   <div key={gIdx} className="p-8">
                      <h3 className="text-xl font-headline font-bold text-white mb-4 flex items-center gap-3 uppercase">
                        <Activity className="w-5 h-5 text-yellow-400" />
                        {term.term}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                        <div>
                           <span className="font-bold text-slate-500 text-xs uppercase block mb-2 tracking-widest">The Movement</span>
                           <p className="text-slate-300 leading-relaxed">{term.movement}</p>
                        </div>
                        <div>
                           <span className="font-bold text-slate-500 text-xs uppercase block mb-2 tracking-widest">The Science</span>
                           <p className="text-slate-300 leading-relaxed bg-slate-800 p-4 rounded">{term.science}</p>
                        </div>
                      </div>
                   </div>
                 ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Introduction;
