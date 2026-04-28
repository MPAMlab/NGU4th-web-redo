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
      <div className="bg-slate-900 text-white p-8 md:p-12 relative overflow-hidden">
        <div className="container mx-auto max-w-5xl relative z-10">
          <div className="flex justify-between items-center mb-8">
            <a href="/" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors font-black uppercase text-[10px] tracking-widest">
              <ChevronLeft size={16} /> 返回主页 BACK
            </a>
            <div className="flex gap-2">
              <span className="bg-indigo-600 px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest italic shadow-lg shadow-indigo-500/20">Archive Hub</span>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none">全量对战档案<br/><span className="text-indigo-400">Match Archives</span></h1>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] italic">NGU-ENGINE 全局数据同步流记录</p>
            </div>
            
            <div className="relative w-full md:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
              <input 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="搜索选手或赛季关键词..." 
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-sm outline-none focus:bg-white/10 focus:border-indigo-500 transition-all font-bold italic"
              />
            </div>
          </div>
        </div>
        
        <div className="absolute -right-20 -bottom-20 opacity-5 rotate-12 pointer-events-none scale-150">
           <History size={400} />
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-5xl px-4 -mt-8 relative z-20">
        <div className="bg-white rounded-[3rem] border-2 border-slate-100 shadow-2xl overflow-hidden">
          <div className="bg-slate-50/80 p-6 flex justify-between items-center border-b-2 border-slate-100 sticky top-0 backdrop-blur-md z-30">
             <div className="flex items-center gap-2">
                <Clock size={16} className="text-indigo-600" />
                <h3 className="font-black italic uppercase text-xs tracking-widest">数据同步历史 DATA SYNC LOG</h3>
             </div>
             <div className="px-4 py-1 bg-white border border-slate-200 rounded-full font-black text-[9px] uppercase text-slate-400 tracking-widest">
                {filteredRounds.length} Entries
             </div>
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-20 text-center animate-pulse space-y-4">
                 <div className="w-12 h-12 bg-slate-100 rounded-2xl mx-auto flex items-center justify-center text-slate-300"><Zap size={24}/></div>
                 <p className="font-black uppercase italic text-xs tracking-widest text-slate-300">正在检索数据档案 Retrieving...</p>
              </div>
            ) : filteredRounds.map((r, i) => (
              <div key={r.id} className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 hover:bg-slate-50 transition-all group">
                <div className="flex items-center gap-6 w-full md:w-auto">
                   <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${r.team === 'red' ? 'bg-red-500 shadow-red-200' : 'bg-blue-500 shadow-blue-200'} shadow-lg group-hover:scale-125 transition-transform`} />
                      <div className="w-0.5 h-8 bg-slate-100 mt-2"></div>
                   </div>
                   <div>
                      <div className="flex items-center gap-2">
                         <span className="font-black text-xl uppercase tracking-tighter text-slate-900 leading-none">{r.username}</span>
                         <span className="bg-slate-100 px-2 py-0.5 rounded text-[8px] font-black uppercase text-slate-400 italic">{r.game_name}</span>
                      </div>
                      <div className="flex gap-3 mt-2">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">{r.poker_hand || 'NO HAND'}</span>
                         {r.tarot_name && <span className="text-[10px] font-black uppercase text-indigo-500 italic">✦ {r.tarot_name}</span>}
                      </div>
                   </div>
                </div>

                <div className="flex-1 w-full md:w-auto overflow-hidden">
                   <div className="bg-white border-2 border-slate-100 rounded-2xl p-4 flex justify-around items-center group-hover:border-indigo-100 transition-all">
                      <div className="text-center">
                         <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Base</p>
                         <p className="font-mono text-xs font-black italic">{Math.floor(r.base_score).toLocaleString()}</p>
                      </div>
                      <div className="w-px h-6 bg-slate-50"></div>
                      <div className="text-center">
                         <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Mult</p>
                         <p className="font-mono text-xs font-black italic text-indigo-500">{r.multiplier.toFixed(2)}x</p>
                      </div>
                      <div className="w-px h-6 bg-slate-50"></div>
                      <div className="text-center">
                         <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Time</p>
                         <p className="font-mono text-[9px] font-bold italic opacity-40">{new Date(r.created_at).toLocaleTimeString()}</p>
                      </div>
                   </div>
                </div>

                <div className="text-right w-full md:w-auto">
                   <div className="text-3xl font-black italic tracking-tighter text-green-500 tabular-nums">+{Math.round(r.total_score).toLocaleString()}</div>
                   <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1 italic">Contribution Points</div>
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
