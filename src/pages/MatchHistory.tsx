import React, { useEffect, useState } from 'react';
import { History, ChevronLeft, Search, Clock, Award, Zap } from 'lucide-react';

interface Round {
  id: number;
  username: string;
  team: string;
  round_type: string;
  base_score: number;
  multiplier: number;
  total_score: number;
  tarot_name?: string;
  poker_hand?: string;
  created_at: string;
  game_name: string;
}

export const MatchHistory = () => {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetch('/api/match/history')
      .then(res => res.json())
      .then(data => {
        setRounds(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredRounds = rounds.filter(r => 
    r.username.toLowerCase().includes(filter.toLowerCase()) || 
    r.game_name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 md:p-10 relative overflow-hidden">
        <div className="container mx-auto max-w-5xl relative z-10">
          <div className="flex justify-between items-center mb-6">
            <a href="/" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors font-black uppercase text-[9px] tracking-widest">
              <ChevronLeft size={14} /> BACK
            </a>
            <div className="flex gap-2">
              <span className="bg-indigo-600 px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest italic shadow-lg shadow-indigo-500/20">Archive Hub</span>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter leading-none">全量对战档案<br/><span className="text-indigo-400">Match Archives</span></h1>
              <p className="text-slate-400 font-bold uppercase text-[8px] tracking-[0.3em] italic opacity-60">NGU-ENGINE 全局数据同步流记录</p>
            </div>
            
            <div className="relative w-full md:w-72 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
              <input 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="搜索选手或赛季..." 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-6 text-xs outline-none focus:bg-white/10 focus:border-indigo-500 transition-all font-bold italic"
              />
            </div>
          </div>
        </div>
        
        <div className="absolute -right-16 -bottom-16 opacity-5 rotate-12 pointer-events-none scale-125">
           <History size={300} />
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-5xl px-3 md:px-4 -mt-6 relative z-20">
        <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
          <div className="bg-slate-50/80 p-4 md:p-5 flex justify-between items-center border-b border-slate-100 sticky top-0 backdrop-blur-md z-30">
             <div className="flex items-center gap-2">
                <Clock size={14} className="text-indigo-600" />
                <h3 className="font-black italic uppercase text-[10px] tracking-widest">数据同步历史 LOG</h3>
             </div>
             <div className="px-3 py-0.5 bg-white border border-slate-200 rounded-full font-black text-[8px] uppercase text-slate-400 tracking-widest">
                {filteredRounds.length} Entries
             </div>
          </div>

          <div className="divide-y divide-slate-50">
            {loading ? (
              <div className="p-12 text-center animate-pulse space-y-3">
                 <div className="w-10 h-10 bg-slate-100 rounded-xl mx-auto flex items-center justify-center text-slate-300"><Zap size={20}/></div>
                 <p className="font-black uppercase italic text-[10px] tracking-widest text-slate-300">Retrieving Records...</p>
              </div>
            ) : filteredRounds.map((r, i) => (
              <div key={r.id} className="p-5 md:p-6 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-8 hover:bg-slate-50/50 transition-all group">
                <div className="flex items-center gap-4 w-full md:w-auto">
                   <div className="flex flex-col items-center flex-shrink-0">
                      <div className={`w-2.5 h-2.5 rounded-full ${r.team === 'red' ? 'bg-red-500 shadow-red-200' : 'bg-blue-500 shadow-blue-200'} shadow group-hover:scale-110 transition-transform`} />
                      <div className="w-px h-6 bg-slate-100 mt-2"></div>
                   </div>
                   <div className="min-w-0">
                      <div className="flex items-center gap-2 truncate">
                         <span className="font-black text-lg uppercase tracking-tighter text-slate-900 leading-none">{r.username}</span>
                         <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[7px] font-black uppercase text-slate-400 italic flex-shrink-0">{r.game_name}</span>
                      </div>
                      <div className="flex gap-2 mt-1 truncate">
                         <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider italic">{r.poker_hand || 'NO HAND'}</span>
                         {r.tarot_name && <span className="text-[9px] font-black uppercase text-indigo-400 italic">✦ {r.tarot_name}</span>}
                      </div>
                   </div>
                </div>

                <div className="flex-1 w-full md:w-auto">
                   <div className="bg-white border border-slate-100 rounded-xl p-3 flex justify-around items-center group-hover:border-indigo-100 transition-all">
                      <div className="text-center">
                         <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Base</p>
                         <p className="font-mono text-[10px] font-black italic">{Math.floor(r.base_score).toLocaleString()}</p>
                      </div>
                      <div className="w-px h-4 bg-slate-100"></div>
                      <div className="text-center">
                         <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Mult</p>
                         <p className="font-mono text-[10px] font-black italic text-indigo-500">{r.multiplier.toFixed(2)}x</p>
                      </div>
                      <div className="w-px h-4 bg-slate-100"></div>
                      <div className="text-center">
                         <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Time</p>
                         <p className="font-mono text-[8px] font-bold italic opacity-30">{new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                   </div>
                </div>

                <div className="text-right w-full md:w-auto flex md:flex-col items-center md:items-end justify-between md:justify-center">
                   <div className="text-[7px] font-black text-slate-300 uppercase tracking-widest italic md:mb-1 order-2 md:order-1">Contribution</div>
                   <div className="text-2xl font-black italic tracking-tighter text-green-500 tabular-nums order-1 md:order-2">+{Math.round(r.total_score).toLocaleString()}</div>
                </div>
              </div>
            ))}
            
            {!loading && filteredRounds.length === 0 && (
              <div className="p-20 text-center opacity-20 italic font-black uppercase text-xl tracking-widest">No matching records found</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
