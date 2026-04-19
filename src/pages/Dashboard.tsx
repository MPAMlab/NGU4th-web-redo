import React, { useEffect, useState } from 'react';
import { Award, Trophy, Zap, LogOut, Settings, LayoutDashboard, Calendar, Users, MapPin, ChevronRight, Star } from 'lucide-react';

interface Achievement {
  id: number;
  name: string;
  condition: string;
  scene: string;
}

interface User {
  username: string;
  email: string;
  role: string;
  kinde_id: string;
}

interface Minigame {
  id: number;
  title: string;
  short_desc: string;
  start_date: string;
  start_time: string;
  max_players: number;
  participant_count: number;
  fake_card_name: string;
  status: string;
  is_joined: number;
}

const Badge = ({ children, className, variant = 'default' }: { children: React.ReactNode, className?: string, variant?: 'default' | 'outline' | 'secondary' }) => {
  const base = "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm transition-all";
  const variants = {
    default: "bg-indigo-600 text-white",
    outline: "bg-transparent border border-indigo-200 text-indigo-600",
    secondary: "bg-slate-100 text-slate-900 border border-slate-200"
  };
  return <span className={`${base} ${variants[variant]} ${className}`}>{children}</span>;
};

export const DashboardPage = ({ user, achievements }: { user: User, achievements: Achievement[] }) => {
  const [minigames, setMinigames] = useState<Minigame[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMinigames = async () => {
    try {
      const res = await fetch('/api/minigames');
      if (res.ok) {
        const data = await res.json();
        setMinigames(data);
      }
    } catch (e) {
      console.error("Failed to fetch minigames");
    }
  };

  useEffect(() => {
    fetchMinigames();
  }, []);

  const handleJoin = async (id: number, joined: boolean) => {
    setLoading(true);
    try {
      const res = await fetch('/api/minigames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: joined ? 'leave' : 'join', minigameId: id })
      });
      if (res.ok) {
        fetchMinigames();
      } else {
        const data = await res.json();
        alert(data.error || "报名失败");
      }
    } catch (e) {
      alert("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8 pb-32 animate-in fade-in duration-700">
      {/* Header / Profile Info */}
      <header className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
           <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center shadow-2xl border-4 border-white/10 group">
                 <Users size={32} className="group-hover:scale-110 transition-transform" />
              </div>
              <div className="space-y-1">
                 <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
                    {user.username}
                 </h1>
                 <div className="flex flex-wrap gap-2 items-center text-[10px] font-bold text-white/50 uppercase tracking-widest mt-2">
                    <span className="bg-white/10 px-3 py-1 rounded-full text-white/80">{user.email}</span>
                    <span className="bg-indigo-500/20 px-3 py-1 rounded-full text-indigo-400 border border-indigo-500/30">
                       {user.role === 'admin' ? "CORE ADMIN" : "OPERATIVE"}
                    </span>
                 </div>
              </div>
           </div>
           
           <div className="flex gap-3">
              {user.role === 'admin' && (
                <a href="/admin" className="bg-white text-slate-950 px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-indigo-500 hover:text-white transition-all flex items-center gap-2 italic">
                   <Settings size={14} /> 管理后台 ADMIN
                </a>
              )}
              <a href="/api/auth/logout" className="bg-slate-800 text-white/50 px-6 py-3 rounded-2xl font-black text-[10px] uppercase hover:bg-red-600 hover:text-white transition-all flex items-center gap-2">
                 <LogOut size={14} /> 登出 SIGN OUT
              </a>
           </div>
        </div>
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* Left Side: Achievements */}
         <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center justify-between px-2">
               <h2 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2 text-slate-900">
                  <Award size={20} className="text-indigo-600" /> 已达成成就
               </h2>
               <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">({achievements.length})</span>
            </div>
            
            <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-xl p-4 space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
               {achievements.length > 0 ? achievements.map(a => (
                 <div key={a.id} className="p-4 bg-slate-50 rounded-2xl border-2 border-transparent hover:border-indigo-100 hover:bg-white transition-all group flex items-start gap-4">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                       <Star size={18} fill="currentColor" />
                    </div>
                    <div className="space-y-1">
                       <p className="font-black text-xs uppercase text-slate-900 leading-tight">{a.name}</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic leading-relaxed">
                          {a.condition || "特殊奖励"}
                       </p>
                    </div>
                 </div>
               )) : (
                 <div className="py-20 text-center space-y-4 opacity-20 italic">
                    <Award size={48} className="mx-auto" />
                    <p className="text-[10px] font-black uppercase tracking-widest leading-none">No Achievements Earned</p>
                 </div>
               )}
            </div>
         </div>

         {/* Right Side: Minigames */}
         <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between px-2">
               <h2 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2 text-slate-900">
                  <Zap size={20} className="text-purple-600" fill="currentColor" /> 支线小游戏挑战
               </h2>
               <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">MINIGAMES</span>
            </div>

            <div className="space-y-4">
               {minigames.length > 0 ? minigames.map(g => (
                 <div key={g.id} className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-xl overflow-hidden group transition-all hover:border-purple-200">
                    <div className="p-6 space-y-5">
                       <div className="flex justify-between items-start">
                          <div className="space-y-1">
                             <h3 className="font-black text-2xl uppercase tracking-tighter text-slate-900">{g.title}</h3>
                             <p className="text-[11px] font-bold text-slate-400 italic">{g.short_desc}</p>
                          </div>
                          <Badge variant={g.status === 'recruiting' ? 'default' : 'secondary'} className={g.status === 'recruiting' ? 'bg-green-600' : 'bg-orange-600'}>
                             {g.status === 'recruiting' ? '招募中 OPEN' : '进行中 ACTIVE'}
                          </Badge>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1 group-hover:bg-purple-50 group-hover:border-purple-100 transition-colors">
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Time & Reward</p>
                             <p className="text-[10px] font-black text-slate-900 flex items-center gap-2"><Calendar size={12}/> {g.start_date} {g.start_time}</p>
                             <p className="text-[10px] font-black text-purple-600 flex items-center gap-2"><Star size={12} fill="currentColor"/> {g.fake_card_name}</p>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1 group-hover:bg-purple-50 group-hover:border-purple-100 transition-colors text-right">
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Deployment</p>
                             <p className="text-xl font-black text-slate-900 tabular-nums">
                                <span className={g.participant_count >= g.max_players ? 'text-red-600' : 'text-green-600'}>
                                   {g.participant_count}
                                </span>
                                <span className="text-slate-300 mx-1">/</span>
                                {g.max_players}
                             </p>
                          </div>
                       </div>

                       <button
                         disabled={loading || (g.status !== 'recruiting' && !g.is_joined) || (g.participant_count >= g.max_players && !g.is_joined)}
                         onClick={() => handleJoin(g.id, g.is_joined === 1)}
                         className={`w-full py-4 rounded-2xl font-black text-xs uppercase shadow-xl transition-all flex items-center justify-center gap-2 ${
                           g.is_joined
                             ? 'bg-slate-900 text-white hover:bg-black'
                             : 'bg-indigo-600 text-white hover:scale-105 active:scale-95 disabled:opacity-30 disabled:grayscale'
                         }`}
                       >
                         {g.is_joined ? (
                           <>取消报名 CANCEL ENTRY</>
                         ) : (
                           <>
                              {g.participant_count >= g.max_players ? '人数已满 FULL' : '立即报名 REGISTER'}
                              <ChevronRight size={14} />
                           </>
                         )}
                       </button>
                    </div>
                 </div>
               )) : (
                 <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                    <Zap size={32} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 text-[10px] font-black uppercase italic tracking-widest">Radar Silent - No Active Challenges</p>
                 </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};
