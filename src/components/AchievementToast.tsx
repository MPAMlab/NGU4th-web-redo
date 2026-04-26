import React, { useEffect, useState } from 'react';
import { Star, Award, X } from 'lucide-react';

export interface Achievement {
  id: number;
  name: string;
  condition: string;
}

export const AchievementToast = ({ achievement, onClose }: { achievement: Achievement, onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-right-10 duration-500">
      <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-2 border-indigo-500/30 flex items-center gap-6 relative overflow-hidden group">
        <div className="absolute inset-0 bg-indigo-600/5 animate-pulse"></div>
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
           <Star size={32} fill="currentColor" className="text-white" />
        </div>
        <div className="space-y-1 relative z-10">
           <p className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.3em]">Achievement Unlocked</p>
           <h4 className="text-xl font-black italic uppercase tracking-tighter">{achievement.name}</h4>
           <p className="text-[10px] font-bold text-slate-400 uppercase italic">{achievement.condition}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all relative z-10">
           <X size={16} />
        </button>
      </div>
    </div>
  );
};
