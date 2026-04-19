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
    <div className="min-h-screen bg-black text-white flex items-center justify-center font-black text-4xl animate-pulse">
      WAITING FOR ENGINE...
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
          <span className="text-red-500 font-black tracking-tighter text-2xl uppercase italic">Red Team Contribution</span>
          <span className="text-8xl font-black tabular-nums tracking-tighter">
            {data.teamScores.red.toLocaleString()}
          </span>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <div className="text-4xl font-black italic text-neutral-500">VS</div>
          {data.activeMatch && (
            <div className="bg-white/10 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest animate-bounce">
              Match Active
            </div>
          )}
        </div>

        <div className="flex flex-col items-end">
          <span className="text-blue-500 font-black tracking-tighter text-2xl uppercase italic">Blue Team Contribution</span>
          <span className="text-8xl font-black tabular-nums tracking-tighter">
            {data.teamScores.blue.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Progress Bar Area */}
      <div className="flex-1 flex flex-col justify-center items-center gap-6">
        <h2 className="text-3xl font-black uppercase tracking-widest text-neutral-400">Phase 2 Unlock Progress</h2>
        <div className="w-full bg-neutral-900 h-24 rounded-full border-4 border-neutral-800 p-2 relative overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 rounded-full transition-all duration-1000 ease-out shadow-[0_0_50px_rgba(147,51,234,0.5)]"
            style={{ width: `${progressPercent}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center font-black text-4xl drop-shadow-lg">
            {currentProgress.toLocaleString()} / {goal.toLocaleString()}
          </div>
        </div>
        {progressPercent >= 100 && (
          <div className="text-6xl font-black text-yellow-400 animate-tada">PHASE 2 READY!</div>
        )}
      </div>

      {/* Footer / Recent History */}
      <div className="grid grid-cols-3 gap-10">
        <div className="col-span-2 bg-neutral-900/30 p-8 rounded-3xl border border-white/5">
          <h3 className="text-xl font-black uppercase text-neutral-500 mb-6">Recent Round History</h3>
          <div className="space-y-4">
            {data.recentRounds.map((round, i) => (
              <div key={i} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${round.team === 'red' ? 'bg-red-500' : 'bg-blue-500'}`} />
                  <span className="font-bold text-lg">{round.username}</span>
                </div>
                <div className="flex gap-10 font-mono text-sm text-neutral-400">
                  <span>BASE: {round.base_score}</span>
                  <span>MULT: {round.multiplier}x</span>
                  <span>EXP: ^{round.exponent}</span>
                </div>
                <div className="font-black text-xl text-green-400">+{Math.round(round.total_score).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-neutral-900/30 p-8 rounded-3xl border border-white/5 flex flex-col justify-center items-center text-center gap-4">
           {data.activeMatch ? (
             <>
               <span className="text-xs font-black text-neutral-500 uppercase tracking-widest">Currently On Stage</span>
               <div className="flex flex-col gap-2">
                 <div className="text-4xl font-black text-red-500">{data.activeMatch.red_name}</div>
                 <div className="text-2xl font-black text-neutral-600 italic">vs</div>
                 <div className="text-4xl font-black text-blue-500">{data.activeMatch.blue_name}</div>
               </div>
             </>
           ) : (
             <div className="text-neutral-600 font-black italic">NEXT MATCH PENDING</div>
           )}
        </div>
      </div>
    </div>
  );
};
