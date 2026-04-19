import React, { useEffect, useState } from 'react';

interface LiveData {
  activeMatch: any;
  teamScores: { red: number, blue: number };
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
    <div className="min-h-screen bg-black text-white flex items-center justify-center font-black text-4xl animate-pulse tracking-widest">
      正在连接计分引擎...
    </div>
  );

  const goal = 100000000;
  const currentProgress = (data.teamScores.red * data.teamScores.blue);
  const progressPercent = Math.min(100, (currentProgress / goal) * 100);

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-10 font-sans overflow-hidden flex flex-col gap-10">
      {/* Header / Active Match */}
      <div className="flex justify-between items-center bg-neutral-900/50 p-8 rounded-3xl border border-white/5 shadow-2xl">
        <div className="flex flex-col">
          <span className="text-red-500 font-black tracking-tighter text-2xl uppercase italic">红队当前总分 Red Team</span>
          <span className="text-8xl font-black tabular-nums tracking-tighter">
            {data.teamScores.red.toLocaleString()}
          </span>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <div className="text-4xl font-black italic text-neutral-500">VS</div>
          {data.activeMatch && (
            <div className="bg-white/10 px-6 py-1 rounded-full text-xs font-bold uppercase tracking-widest animate-bounce text-green-400 border border-green-400/30">
              比赛进行中 MATCH ACTIVE
            </div>
          )}
        </div>

        <div className="flex flex-col items-end">
          <span className="text-blue-500 font-black tracking-tighter text-2xl uppercase italic">蓝队当前总分 Blue Team</span>
          <span className="text-8xl font-black tabular-nums tracking-tighter">
            {data.teamScores.blue.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Progress Bar Area */}
      <div className="flex-1 flex flex-col justify-center items-center gap-6">
        <h2 className="text-3xl font-black uppercase tracking-widest text-neutral-400">Phase 2 解锁进度</h2>
        <div className="w-full bg-neutral-900 h-24 rounded-full border-4 border-neutral-800 p-2 relative overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 rounded-full transition-all duration-1000 ease-out shadow-[0_0_50px_rgba(147,51,234,0.5)]"
            style={{ width: `${progressPercent}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center font-black text-4xl drop-shadow-lg tabular-nums">
            {currentProgress.toLocaleString()} / {goal.toLocaleString()}
          </div>
        </div>
        {progressPercent >= 100 && (
          <div className="text-6xl font-black text-yellow-400 animate-tada">PHASE 2 目标达成！</div>
        )}
      </div>

      {/* Footer / Recent History */}
      <div className="grid grid-cols-3 gap-10">
        <div className="col-span-2 bg-neutral-900/30 p-8 rounded-3xl border border-white/5">
          <h3 className="text-xl font-black uppercase text-neutral-500 mb-6 tracking-widest">最近回合记录 RECENT HISTORY</h3>
          <div className="space-y-4">
            {data.recentRounds.map((round, i) => (
              <div key={i} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${round.team === 'red' ? 'bg-red-500' : 'bg-blue-500'}`} />
                  <span className="font-bold text-lg">{round.username}</span>
                </div>
                <div className="flex gap-10 font-mono text-sm text-neutral-400 uppercase tracking-tighter">
                  <span>基础分: {round.base_score}</span>
                  <span>倍数: {round.multiplier}x</span>
                  <span>次方: ^{round.exponent}</span>
                </div>
                <div className="font-black text-xl text-green-400 tabular-nums">+{Math.round(round.total_score).toLocaleString()}</div>
              </div>
            ))}
            {data.recentRounds.length === 0 && (
              <div className="text-center py-10 text-neutral-700 font-bold italic uppercase">等待第一轮数据提交...</div>
            )}
          </div>
        </div>

        <div className="bg-neutral-900/30 p-8 rounded-3xl border border-white/5 flex flex-col justify-center items-center text-center gap-4">
           {data.activeMatch ? (
             <>
               <span className="text-xs font-black text-neutral-500 uppercase tracking-widest">当前场上选手 ON STAGE</span>
               <div className="flex flex-col gap-2">
                 <div className="text-5xl font-black text-red-500 italic tracking-tighter uppercase">{data.activeMatch.red_name}</div>
                 <div className="text-2xl font-black text-neutral-600 italic uppercase">Versus</div>
                 <div className="text-5xl font-black text-blue-500 italic tracking-tighter uppercase">{data.activeMatch.blue_name}</div>
               </div>
             </>
           ) : (
             <div className="text-neutral-600 font-black italic uppercase tracking-widest">等待下一场对阵...</div>
           )}
        </div>
      </div>
    </div>
  );
};
