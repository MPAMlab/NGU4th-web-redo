import React, { useEffect, useState } from 'react';

interface LiveData {
  activeMatch: any;
  teamScores: { red: number, blue: number };
  teamExponents: { red: number, blue: number };
  recentRounds: any[];
}

export const LiveView = () => {
  const [data, setData] = useState<LiveData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource('/api/match/live');
    
    eventSource.onmessage = (event) => {
      setData(JSON.parse(event.data));
      setError(false);
    };

    eventSource.onerror = () => {
      setError(true);
      eventSource.close();
      // Auto reconnect after 5s
      setTimeout(() => window.location.reload(), 5000);
    };

    return () => eventSource.close();
  }, []);

  if (!data) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center font-black text-4xl animate-pulse tracking-widest uppercase">
      NGU-ENGINE 正在连接...
    </div>
  );

  const goal = 100000000;
  
  // Calculate Final Scores: (BaseSum * 1) ^ Exponent
  // (We use a multiplier of 1 here as the individual round totals already include their specific multipliers)
  const finalRed = data.teamScores.red;
  const finalBlue = data.teamScores.blue;
  
  const currentProgress = (finalRed * finalBlue);
  const progressPercent = Math.min(100, (currentProgress / goal) * 100);

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-10 font-sans overflow-x-hidden flex flex-col gap-6 md:gap-10">
      {/* Header / Active Match */}
      <div className="flex flex-col lg:flex-row justify-between items-center bg-neutral-900/50 p-6 md:p-8 rounded-2xl md:rounded-[3rem] border border-white/5 shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden gap-6 md:gap-0">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-indigo-500 to-blue-600 opacity-20"></div>
        
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
          <div className="flex items-center gap-3">
             <span className="text-red-500 font-black tracking-tighter text-lg md:text-2xl uppercase italic">RED FORCE</span>
             {data.teamExponents.red > 1 && <span className="bg-red-600 text-[8px] md:text-[10px] font-black px-2 py-0.5 rounded uppercase">EXP ^{data.teamExponents.red.toFixed(4)}</span>}
          </div>
          <span className="text-5xl md:text-8xl font-black tabular-nums tracking-tighter drop-shadow-[0_0_20px_rgba(220,38,38,0.3)]">
            {Math.round(finalRed).toLocaleString()}
          </span>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <div className="text-2xl md:text-4xl font-black italic text-neutral-700 tracking-widest">VS</div>
          {data.activeMatch && (
            <div className="bg-indigo-500/20 px-4 md:px-6 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] animate-pulse text-indigo-400 border border-indigo-500/30">
              ENGAGEMENT ACTIVE
            </div>
          )}
        </div>

        <div className="flex flex-col items-center lg:items-end text-center lg:text-right">
          <div className="flex items-center gap-3">
             {data.teamExponents.blue > 1 && <span className="bg-blue-600 text-[8px] md:text-[10px] font-black px-2 py-0.5 rounded uppercase">EXP ^{data.teamExponents.blue.toFixed(4)}</span>}
             <span className="text-blue-500 font-black tracking-tighter text-lg md:text-2xl uppercase italic">BLUE FORCE</span>
          </div>
          <span className="text-5xl md:text-8xl font-black tabular-nums tracking-tighter drop-shadow-[0_0_20px_rgba(37,99,235,0.3)]">
            {Math.round(finalBlue).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Progress Bar Area */}
      <div className="flex-1 flex flex-col justify-center items-center gap-4 md:gap-8">
        <h2 className="text-sm md:text-3xl font-black uppercase tracking-[0.2em] md:tracking-[0.4em] text-neutral-500 italic text-center px-4">Phase 2 核心解锁进度</h2>
        <div className="w-full bg-neutral-900 h-16 md:h-32 rounded-xl md:rounded-[2.5rem] border-2 md:border-4 border-neutral-800 p-1.5 md:p-3 relative overflow-hidden shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 rounded-lg md:rounded-[1.5rem] transition-all ease-out shadow-[0_0_80px_rgba(147,51,234,0.6)] relative"
            style={{ width: `${progressPercent}%`, transitionDuration: '2000ms' }}
          >
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center drop-shadow-2xl">
            <span className="font-black text-xl md:text-5xl tabular-nums tracking-tighter italic">
              {Math.round(currentProgress).toLocaleString()} / {goal.toLocaleString()}
            </span>
            <span className="text-[6px] md:text-[10px] font-bold opacity-30 uppercase tracking-[0.5em] md:tracking-[1em] mt-1 md:mt-2 text-center">RED FORCE * BLUE FORCE</span>
          </div>
        </div>
        {progressPercent >= 100 && (
          <div className="text-2xl md:text-7xl font-black text-yellow-400 animate-tada drop-shadow-[0_0_30px_rgba(250,204,21,0.5)] italic uppercase text-center">Phase 2 Clear!</div>
        )}
      </div>

      {/* Footer / Recent History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
        <div className="lg:col-span-2 bg-neutral-900/30 p-5 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
          <div className="absolute -right-10 -bottom-10 text-[6rem] md:text-[10rem] font-black italic text-white/[0.02] uppercase pointer-events-none group-hover:text-white/[0.03] transition-all">Archives</div>
          <h3 className="text-sm md:text-xl font-black uppercase text-neutral-500 mb-4 md:mb-8 tracking-[0.2em] md:tracking-[0.3em] flex items-center gap-3">
             <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full"></div>
             RECENT HISTORY 回合记录
          </h3>
          <div className="space-y-3 md:space-y-4">
            {data.recentRounds.map((round, i) => (
              <div key={i} className="flex justify-between items-center bg-white/[0.02] p-3 md:p-5 rounded-xl md:rounded-2xl border border-white/5 hover:bg-white/[0.04] transition-all">
                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                  <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${round.team === 'red' ? 'bg-red-500' : 'bg-blue-500'} shadow-lg`} />
                  <div className="min-w-0">
                    <p className="font-black text-sm md:text-xl uppercase tracking-tighter leading-none truncate">{round.username}</p>
                    <p className="text-[7px] md:text-[9px] font-bold text-neutral-600 uppercase mt-1 tracking-widest italic truncate">{round.poker_hand || 'Hand unknown'}</p>
                  </div>
                </div>
                <div className="hidden sm:flex gap-4 md:gap-10 font-mono text-[8px] md:text-[10px] text-neutral-500 uppercase tracking-tighter">
                  <span className="bg-white/5 px-2 py-0.5 rounded">BASE: {Math.floor(round.base_score)}</span>
                  <span className="bg-white/5 px-2 py-0.5 rounded">MULT: {round.multiplier.toFixed(1)}x</span>
                </div>
                <div className="font-black text-lg md:text-2xl text-green-500 tabular-nums">+{Math.round(round.total_score).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-neutral-900/30 p-6 md:p-10 rounded-2xl md:rounded-[2.5rem] border border-white/5 flex flex-col justify-center items-center text-center gap-4 md:gap-6 relative overflow-hidden order-first lg:order-last">
           {data.activeMatch ? (
             <>
               <span className="text-[8px] md:text-[10px] font-black text-neutral-600 uppercase tracking-[0.4em] md:tracking-[0.5em] animate-pulse">ON STAGE</span>
               <div className="flex flex-col gap-2 md:gap-4">
                 <div className="text-2xl md:text-5xl font-black text-red-500 italic tracking-tighter uppercase">{data.activeMatch.red_player_name}</div>
                 <div className="text-xs md:text-xl font-black text-neutral-800 italic uppercase opacity-20">Versus</div>
                 <div className="text-2xl md:text-5xl font-black text-blue-500 italic tracking-tighter uppercase">{data.activeMatch.blue_player_name}</div>
               </div>
             </>
           ) : (
             <div className="flex flex-col items-center gap-3 opacity-10 py-4">
               <div className="text-4xl md:text-6xl">🏁</div>
               <div className="text-neutral-500 font-black italic uppercase tracking-widest text-[8px] md:text-sm">Waiting for Match</div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
