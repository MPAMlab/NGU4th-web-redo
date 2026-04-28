import React from 'react';
import { ShieldAlert, ChevronLeft, Home, Compass } from 'lucide-react';

export const NotFound = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60rem] h-[60rem] border border-white/20 rounded-full animate-[spin_60s_linear_infinite]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] border border-indigo-500/30 rounded-full animate-[spin_30s_linear_infinite_reverse]"></div>
      </div>

      <div className="relative z-10 text-center space-y-8 max-w-lg">
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-red-600/20 text-red-500 rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(220,38,38,0.3)] animate-bounce border-2 border-red-500/50">
            <ShieldAlert size={48} />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-9xl font-black italic tracking-tighter text-white leading-none">404</h1>
          <p className="text-indigo-400 font-black uppercase tracking-[0.4em] text-xs italic">Sector Not Found / 坐标丢失</p>
        </div>

        <p className="text-slate-400 font-bold italic text-lg leading-relaxed">
          你尝试访问的区域未在 NGU-ENGINE 核心矩阵中登记，或者该数据节点已被永久抹除。
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <a 
            href="/" 
            className="bg-white text-slate-950 hover:bg-indigo-500 hover:text-white px-8 py-4 rounded-2xl font-black uppercase italic tracking-tighter transition-all shadow-2xl flex items-center justify-center gap-3 group"
          >
            <Home size={18} /> 返回指挥部 HOME
          </a>
          <a 
            href="/history" 
            className="bg-slate-900 border-2 border-white/10 hover:bg-white/5 text-white px-8 py-4 rounded-2xl font-black uppercase italic tracking-tighter transition-all flex items-center justify-center gap-3"
          >
            <Compass size={18} /> 查看档案库 ARCHIVES
          </a>
        </div>
      </div>

      <div className="absolute bottom-10 left-10 opacity-5 rotate-12">
        <ShieldAlert size={300} />
      </div>
    </div>
  );
};
