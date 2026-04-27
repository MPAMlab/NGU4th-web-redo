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
  const finalRed = Math.pow(data.teamScores.red, data.teamExponents.red);
  const finalBlue = Math.pow(data.teamScores.blue, data.teamExponents.blue);
  
  const currentProgress = (finalRed * finalBlue);
  const progressPercent = Math.min(100, (currentProgress / goal) * 100);

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-10 font-sans overflow-hidden flex flex-col gap-10">
      {/* Header / Active Match */}
      <div className="flex justify-between items-center bg-neutral-900/50 p-8 rounded-[3rem] border border-white/5 shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-primary to-blue-600 opacity-20"></div>
        
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
             <span className="text-red-500 font-black tracking-tighter text-2xl uppercase italic">红队当前输出 RED FORCE</span>
             {data.teamExponents.red > 1 && <span className="bg-red-600 text-[10px] font-black px-2 py-0.5 rounded uppercase shadow-lg">EXP ^{data.teamExponents.red}</span>}
          </div>
          <span className="text-8xl font-black tabular-nums tracking-tighter drop-shadow-[0_0_20px_rgba(220,38,38,0.3)]">
            {Math.round(finalRed).toLocaleString()}
          </span>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <div className="text-4xl font-black italic text-neutral-700 tracking-widest">VS</div>
          {data.activeMatch && (
            <div className="bg-primary/20 px-6 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.3em] animate-pulse text-primary border border-primary/30 shadow-[0_0_15px_rgba(var(--primary),0.2)]">
              正在接战 ENGAGEMENT ACTIVE
            </div>
          )}
        </div>

        <div className="flex flex-col items-end">
          <div className="flex items-center gap-3">
             {data.teamExponents.blue > 1 && <span className="bg-blue-600 text-[10px] font-black px-2 py-0.5 rounded uppercase shadow-lg">EXP ^{data.teamExponents.blue}</span>}
             <span className="text-blue-500 font-black tracking-tighter text-2xl uppercase italic">蓝队当前输出 BLUE FORCE</span>
          </div>
          <span className="text-8xl font-black tabular-nums tracking-tighter drop-shadow-[0_0_20px_rgba(37,99,235,0.3)]">
            {Math.round(finalBlue).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Progress Bar Area */}
      <div className="flex-1 flex flex-col justify-center items-center gap-8">
        <h2 className="text-3xl font-black uppercase tracking-[0.4em] text-neutral-500 italic">Phase 2 核心解锁进度</h2>
        <div className="w-full bg-neutral-900 h-32 rounded-[2.5rem] border-4 border-neutral-800 p-3 relative overflow-hidden shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 rounded-[1.5rem] transition-all ease-out shadow-[0_0_80px_rgba(147,51,234,0.6)] relative"
            style={{ width: `${progressPercent}%`, transitionDuration: '2000ms' }}
          >
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center drop-shadow-2xl">
            <span className="font-black text-5xl tabular-nums tracking-tighter italic">
              {currentProgress.toLocaleString()} / {goal.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold opacity-30 uppercase tracking-[1em] mt-2">Team Red * Team Blue</span>
          </div>
        </div>
        {progressPercent >= 100 && (
          <div className="text-7xl font-black text-yellow-400 animate-tada drop-shadow-[0_0_30px_rgba(250,204,21,0.5)] italic uppercase">Phase 2 目标达成！</div>
        )}
      </div>

      {/* Footer / Recent History */}
      <div className="grid grid-cols-3 gap-10">
        <div className="col-span-2 bg-neutral-900/30 p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
          <div className="absolute -right-10 -bottom-10 text-[10rem] font-black italic text-white/[0.02] uppercase pointer-events-none group-hover:text-white/[0.03] transition-all">History</div>
          <h3 className="text-xl font-black uppercase text-neutral-500 mb-8 tracking-[0.3em] flex items-center gap-3">
             <div className="w-2 h-2 bg-neutral-500 rounded-full"></div>
             最近回合记录 RECENT HISTORY
          </h3>
          <div className="space-y-4">
            {data.recentRounds.map((round, i) => (
              <div key={i} className="flex justify-between items-center bg-white/[0.03] p-5 rounded-2xl border border-white/5 hover:bg-white/[0.05] transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${round.team === 'red' ? 'bg-red-500' : 'bg-blue-500'} shadow-lg shadow-current/20`} />
                  <div>
                    <p className="font-black text-xl uppercase tracking-tighter leading-none">{round.username}</p>
                    <p className="text-[9px] font-bold text-neutral-500 uppercase mt-1 tracking-widest italic">{round.poker_hand || 'Unknown Hand'}</p>
                  </div>
                </div>
                <div className="flex gap-10 font-mono text-[10px] text-neutral-400 uppercase tracking-tighter">
                  <span className="bg-white/5 px-3 py-1 rounded-lg">基础分: {round.base_score}</span>
                  <span className="bg-white/5 px-3 py-1 rounded-lg">倍率: {round.multiplier}x</span>
                  {round.tarot_name && <span className="text-primary font-black italic">塔罗牌: {round.tarot_name}</span>}
                </div>
                <div className="font-black text-2xl text-green-400 tabular-nums drop-shadow-lg">+{Math.round(round.total_score).toLocaleString()}</div>
              </div>
            ))}
            {data.recentRounds.length === 0 && (
              <div className="text-center py-10 text-neutral-800 font-black italic uppercase tracking-widest text-2xl opacity-20">正在监测数据流...</div>
            )}
          </div>
        </div>

        <div className="bg-neutral-900/30 p-10 rounded-[2.5rem] border border-white/5 flex flex-col justify-center items-center text-center gap-6 relative overflow-hidden">
           <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-all"></div>
           {data.activeMatch ? (
             <>
               <span className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.5em] animate-pulse">当前场上选手 ON STAGE</span>
               <div className="flex flex-col gap-4">
                 <div className="text-5xl font-black text-red-500 italic tracking-tighter uppercase drop-shadow-lg">{data.activeMatch.red_player_name}</div>
                 <div className="text-xl font-black text-neutral-800 italic uppercase opacity-20">Versus</div>
                 <div className="text-5xl font-black text-blue-500 italic tracking-tighter uppercase drop-shadow-lg">{data.activeMatch.blue_player_name}</div>
               </div>
               <div className="mt-4 flex gap-2">
                  <div className="w-1 h-1 bg-red-600 rounded-full animate-ping"></div>
                  <div className="w-1 h-1 bg-blue-600 rounded-full animate-ping delay-100"></div>
                  <div className="w-1 h-1 bg-primary rounded-full animate-ping delay-200"></div>
               </div>
             </>
           ) : (
             <div className="flex flex-col items-center gap-4 opacity-20">
               <div className="text-6xl grayscale">🏁</div>
               <div className="text-neutral-500 font-black italic uppercase tracking-[0.2em] text-sm leading-tight text-center">等待下一场<br/>战术部署</div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
