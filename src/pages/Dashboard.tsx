import React, { useEffect, useState } from 'react';
import { 
  Award, Trophy, Zap, LogOut, Settings, LayoutDashboard, Calendar, Users, 
  MapPin, ChevronRight, Star, User, BookOpen, Target, ShieldCheck, Activity, Swords 
} from 'lucide-react';
import { RegistrationPage } from './Registration';

interface Achievement {
  id: number;
  name: string;
  condition: string;
  scene: string;
  earned_at?: string;
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
  const [activeTab, setActiveTab] = useState<'overview' | 'challenges' | 'achievements' | 'registration'>('overview');

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
      {/* Header */}
      <header className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
           <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center shadow-2xl border-4 border-white/10 group">
                 <User size={32} className="group-hover:scale-110 transition-transform" />
              </div>
              <div className="space-y-1">
                 <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
                    {user.username}
                 </h1>
                 <div className="flex flex-wrap gap-2 items-center text-[10px] font-bold text-white/50 uppercase tracking-widest mt-2">
                    <span className="bg-white/10 px-3 py-1 rounded-full text-white/80">{user.email}</span>
                    <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 bg-indigo-500/10">
                       {user.role === 'admin' ? "CORE ADMIN" : "OPERATIVE"}
                    </Badge>
                 </div>
              </div>
           </div>
           
           <div className="flex gap-3">
              {user.role === 'admin' && (
                <a href="/admin" className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-2 italic">
                   <Settings size={14} /> 管理后台 ADMIN
                </a>
              )}
              <a href="/api/auth/logout" className="bg-slate-800 text-white/50 px-6 py-3 rounded-2xl font-black text-[10px] uppercase hover:bg-red-600 hover:text-white transition-all flex items-center gap-2">
                 <LogOut size={14} /> 登出
              </a>
           </div>
        </div>
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
      </header>

      {/* Navigation Tabs */}
      <nav className="flex gap-2 bg-slate-100 p-2 rounded-2xl w-fit border border-slate-200 shadow-inner">
        {[
          { id: 'overview', label: '概览', icon: <Target size={14}/> },
          { id: 'challenges', label: '小游戏', icon: <Zap size={14}/> },
          { id: 'achievements', label: '成就', icon: <Award size={14}/> },
          { id: 'registration', label: '对阵报名', icon: <Activity size={14}/> }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)} 
            className={`px-6 py-2.5 rounded-xl font-black transition-all flex items-center gap-2 uppercase tracking-tighter text-[10px] ${activeTab === tab.id ? 'bg-white shadow-md text-indigo-600 border border-indigo-100' : 'text-slate-500 hover:text-slate-900'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2">
           <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-xl space-y-6">
              <h3 className="font-black italic uppercase text-xs tracking-[0.2em] text-indigo-600 flex items-center gap-2"><Star size={16} fill="currentColor"/> 个人战绩预览</h3>
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100"><p className="text-[8px] font-black uppercase text-slate-400">Total Achievements</p><p className="text-3xl font-black text-slate-900 tabular-nums">{achievements.length}</p></div>
                 <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100"><p className="text-[8px] font-black uppercase text-slate-400">Current Exponent</p><p className="text-3xl font-black text-slate-900 tabular-nums">1.0</p></div>
              </div>
              <div className="p-6 bg-slate-900 rounded-[2rem] text-white flex justify-between items-center relative overflow-hidden">
                 <div className="space-y-1 relative z-10">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Ready to Combat?</p>
                    <p className="text-xl font-black italic tracking-tighter uppercase">加入红蓝对抗赛</p>
                 </div>
                 <button onClick={() => setActiveTab('registration')} className="bg-indigo-500 text-white w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 transition-all relative z-10 shadow-lg shadow-indigo-500/50"><ChevronRight/></button>
                 <div className="absolute right-[-20px] bottom-[-20px] opacity-10 rotate-12 scale-150"><Swords size={100}/></div>
              </div>
           </div>

           <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-xl space-y-6">
              <h3 className="font-black italic uppercase text-xs tracking-[0.2em] text-purple-600 flex items-center gap-2"><Zap size={16} fill="currentColor"/> 近期小游戏</h3>
              <div className="space-y-4">
                 {minigames.slice(0, 2).map(g => (
                   <div key={g.id} className="flex items-center justify-between group">
                      <div className="space-y-1">
                         <p className="font-black text-sm uppercase text-slate-900 group-hover:text-indigo-600 transition-colors">{g.title}</p>
                         <p className="text-[9px] font-bold text-slate-400 uppercase italic">🕒 {g.start_date} {g.start_time}</p>
                      </div>
                      <Badge variant="outline" className={g.status === 'recruiting' ? 'text-green-600 border-green-200 bg-green-50' : ''}>
                         {g.status === 'recruiting' ? 'OPEN' : 'ACTIVE'}
                      </Badge>
                   </div>
                 ))}
                 {minigames.length === 0 && <p className="text-center py-10 text-[10px] font-black uppercase opacity-20 italic">No Activity</p>}
              </div>
              <button onClick={() => setActiveTab('challenges')} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:border-indigo-600 hover:text-indigo-600 transition-all">查看全部挑战 View All</button>
           </div>
        </div>
      )}

      {/* Tab: Challenges */}
      {activeTab === 'challenges' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
           {minigames.length > 0 ? minigames.map(g => (
             <div key={g.id} className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-xl overflow-hidden group hover:border-purple-200 transition-all">
                <div className="p-8 flex flex-col md:flex-row justify-between items-center gap-8">
                   <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                         <Badge variant={g.status === 'recruiting' ? 'default' : 'secondary'} className={g.status === 'recruiting' ? 'bg-green-600' : 'bg-orange-600'}>
                            {g.status === 'recruiting' ? '招募中 Recruiting' : '进行中 In Progress'}
                         </Badge>
                         <h3 className="font-black text-3xl uppercase tracking-tighter text-slate-900">{g.title}</h3>
                      </div>
                      <p className="text-sm font-bold text-slate-400 leading-relaxed italic border-l-4 border-purple-500 pl-4">{g.short_desc}</p>
                   </div>
                   
                   <div className="flex flex-col md:flex-row items-center gap-8">
                      <div className="text-right space-y-1">
                         <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Time & Assets</p>
                         <div className="flex items-center gap-4 text-xs font-black text-slate-900 uppercase">
                            <span className="flex items-center gap-1.5"><Calendar size={14} className="text-indigo-400"/> {g.start_date}</span>
                            <span className="flex items-center gap-1.5"><Star size={14} className="text-purple-400" fill="currentColor"/> {g.fake_card_name}</span>
                         </div>
                      </div>

                      <div className="min-w-[120px] space-y-3">
                         <div className="flex justify-between items-end mb-1">
                            <span className="text-[9px] font-black uppercase text-slate-400">Deployed</span>
                            <span className="text-xs font-black tabular-nums">{g.participant_count}/{g.max_players}</span>
                         </div>
                         <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <div className="h-full bg-indigo-500 transition-all duration-1000" style={{width: `${(g.participant_count/g.max_players)*100}%`}}></div>
                         </div>
                      </div>

                      <button
                         disabled={loading || (g.status !== 'recruiting' && !g.is_joined) || (g.participant_count >= g.max_players && !g.is_joined)}
                         onClick={() => handleJoin(g.id, g.is_joined === 1)}
                         className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-2xl transition-all ${
                           g.is_joined
                             ? 'bg-slate-900 text-white hover:bg-black'
                             : 'bg-indigo-600 text-white hover:scale-105 active:scale-95 disabled:opacity-30 disabled:grayscale'
                         }`}
                       >
                         {g.is_joined ? '取消报名 CANCEL' : (g.participant_count >= g.max_players ? '人数已满 FULL' : '立即报名 REGISTER')}
                      </button>
                   </div>
                </div>
             </div>
           )) : (
             <div className="py-32 text-center space-y-6 opacity-20 italic">
                <Zap size={64} className="mx-auto" />
                <p className="text-xl font-black uppercase tracking-[0.5em]">Radar Silent</p>
             </div>
           )}
        </div>
      )}

      {/* Tab: Achievements */}
      {activeTab === 'achievements' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
           <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4">
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">成就收藏库 Collection</h2>
              <Badge variant="secondary">Total: {achievements.length}</Badge>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {achievements.length > 0 ? achievements.map(a => (
                <div key={a.id} className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-xl flex items-center gap-6 group hover:border-indigo-200 transition-all">
                   <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-[1.2rem] flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg border-2 border-indigo-100/50">
                      <Star size={24} fill="currentColor" />
                   </div>
                   <div className="space-y-1">
                      <p className="font-black text-lg uppercase text-slate-900 leading-none">{a.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase italic tracking-tighter leading-relaxed mt-1">
                         {a.condition || "SECRET REWARD"}
                      </p>
                      {a.earned_at && <p className="text-[8px] font-mono text-indigo-400 opacity-60 uppercase mt-2">Locked in: {new Date(a.earned_at).toLocaleDateString()}</p>}
                   </div>
                </div>
              )) : (
                <div className="col-span-full py-32 text-center opacity-20 italic">
                   <Award size={64} className="mx-auto mb-4" />
                   <p className="font-black uppercase tracking-[0.3em]">No Assets Locked In</p>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Tab: Registration */}
      {activeTab === 'registration' && (
        <div className="animate-in fade-in slide-in-from-right-4">
           <RegistrationPage />
        </div>
      )}
    </div>
  );
};
