import React, { useEffect, useState } from 'react';
import { Star, Award, X } from 'lucide-react';

export interface Achievement {
  id: number;
  name: string;
  condition: string;
  scene: string;
  earned_at?: string;
}

export const AchievementToast = ({ achievement, onClose }: { achievement: Achievement, onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 left-4 md:left-auto md:top-6 md:right-6 z-[100] animate-in slide-in-from-top-10 md:slide-in-from-right-10 duration-500">
      <div className="bg-slate-900 text-white p-4 md:p-5 rounded-2xl md:rounded-[2rem] shadow-2xl border border-indigo-500/30 flex items-center gap-4 md:gap-6 relative overflow-hidden group max-w-sm mx-auto md:mx-0">
        <div className="absolute inset-0 bg-indigo-600/5 animate-pulse"></div>
        <div className="w-12 h-12 md:w-14 md:h-14 bg-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
           <Star size={24} fill="currentColor" className="text-white w-6 h-6 md:w-7 md:h-7" />
        </div>
        <div className="space-y-0.5 relative z-10 min-w-0">
           <p className="text-[8px] md:text-[9px] font-black uppercase text-indigo-400 tracking-[0.2em]">New Achievement</p>
           <h4 className="text-base md:text-lg font-black italic uppercase tracking-tighter truncate">{achievement.name}</h4>
           <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase italic truncate">{achievement.condition}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all relative z-10 flex-shrink-0">
           <X size={14} />
        </button>
      </div>
    </div>
  );
};
