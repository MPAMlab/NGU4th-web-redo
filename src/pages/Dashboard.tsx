import React, { useEffect, useState } from 'react';
import { 
  Award, Trophy, Zap, LogOut, Settings, LayoutDashboard, Calendar, Users, 
  MapPin, ChevronRight, Star, User, BookOpen, Target, ShieldCheck, Activity, Swords, HelpCircle
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
  const [activeTab, setActiveTab] = useState<'home' | 'challenges' | 'achievements' | 'profile'>('home');

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
        alert(data.error || "操作失败");
      }
    } catch (e) {
      alert("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-32">
      {/* Dynamic Content Area */}
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-12">
        
        {activeTab === 'home' && (
          <div className="space-y-12 animate-in fade-in duration-500">
             {/* Hero Banner */}
             <section className="relative rounded-[3rem] bg-slate-900 p-10 overflow-hidden text-white shadow-2xl">
                <div className="relative z-10 space-y-6">
                   <div className="flex flex-wrap gap-2">
                      <Badge className="bg-indigo-500 text-white font-black px-4 py-1 rounded-full uppercase tracking-widest text-[10px]">Active Season</Badge>
                      <Badge variant="outline" className="text-white border-white/20 font-black px-4 py-1 rounded-full uppercase tracking-widest text-[10px] flex items-center gap-1"><MapPin size={10} /> 郑州现场</Badge>
                   </div>
                   <div>
                      <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter leading-none uppercase text-white">Never Give Up<br/><span className="text-indigo-400">4th Edition</span></h1>
                      <div className="mt-4 flex items-center gap-2 text-indigo-300 font-black text-[10px] uppercase tracking-[0.2em] bg-white/5 border border-white/10 w-fit px-3 py-1 rounded-full">
                         <Zap size={10} fill="currentColor" /> Official Match Engine
                      </div>
                      <p className="text-slate-400 font-medium max-w-md text-sm mt-6 leading-relaxed italic">
                        欢迎回来, {user.username}! 准备好加入红蓝对抗，向一亿总分发起挑战了吗？在这里，你的音游成绩将转化为强大的扑克手牌。
                      </p>
                   </div>
                   <div className="flex gap-4 pt-2">
                      <button onClick={() => setActiveTab('challenges')} className="bg-white text-slate-900 hover:bg-indigo-500 hover:text-white px-8 py-4 rounded-2xl font-black uppercase italic tracking-tighter transition-all shadow-xl flex items-center gap-2 group">
                         <Zap size={18} className="group-hover:scale-125 transition-transform" /> 进入小游戏
                      </button>
                      {user.role === 'admin' && (
                        <a href="/admin" className="border-2 border-white/10 hover:bg-white/5 text-white px-8 py-4 rounded-2xl font-black uppercase italic tracking-tighter transition-all flex items-center gap-2">
                           <Settings size={18} /> 管理后台
                        </a>
                      )}
                   </div>
                </div>
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl opacity-50 animate-pulse"></div>
                <div className="absolute bottom-[-40px] right-[-20px] opacity-10 rotate-12 scale-150"><Swords size={200} /></div>
             </section>

             {/* Quick Stats Grid */}
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-sm flex flex-col items-center gap-4 group hover:border-indigo-100 transition-all">
                   <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><Trophy /></div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">已获成就</span>
                   <span className="text-2xl font-black text-slate-900">{achievements.length}</span>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-sm flex flex-col items-center gap-4 group hover:border-indigo-100 transition-all">
                   <div className="w-14 h-14 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><Zap /></div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">进行中挑战</span>
                   <span className="text-2xl font-black text-slate-900">{minigames.filter(g=>g.is_joined).length}</span>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-sm flex flex-col items-center gap-4 group hover:border-indigo-100 transition-all">
                   <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><Star /></div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">当前次方</span>
                   <span className="text-2xl font-black text-slate-900">1.00</span>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-sm flex flex-col items-center gap-4 group hover:border-indigo-100 transition-all">
                   <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><Activity /></div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">战术状态</span>
                   <span className="text-2xl font-black text-slate-900">READY</span>
                </div>
             </div>

             {/* Rules Preview Section (From external project) */}
             <section className="bg-indigo-600 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                   <div className="space-y-4">
                      <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-none">核心计分逻辑<br/>Scoring Formula</h3>
                      <p className="text-indigo-100 font-bold max-w-sm text-sm opacity-80 leading-relaxed italic">
                        Score = (牌型 Base × 小丑 Multi) ^ 次方 EXP。<br/>
                        你的每一个成绩都在为队伍的一亿目标贡献力量。
                      </p>
                   </div>
                   <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-[2.5rem] shadow-inner text-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60 mb-2">Tactical Computation</p>
                      <p className="text-5xl font-black tracking-tighter italic">Phase 1</p>
                   </div>
                </div>
                <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none select-none overflow-hidden text-[15rem] font-black italic uppercase -mt-20 -ml-10">LOGIC</div>
             </section>
          </div>
        )}

        {activeTab === 'challenges' && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
             <div className="flex items-center gap-4 px-2">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-100"><Zap size={24} fill="currentColor" /></div>
                <div><h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900">支线小游戏挑战</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Minigame Roster</p></div>
             </div>
             <div className="space-y-4">
                {minigames.length > 0 ? minigames.map(g => (
                   <div key={g.id} className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-xl overflow-hidden group hover:border-purple-200 transition-all">
                      <div className="p-8 flex flex-col md:flex-row justify-between items-center gap-8">
                         <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-3">
                               <Badge variant={g.status === 'recruiting' ? 'default' : 'secondary'} className={g.status === 'recruiting' ? 'bg-green-600 text-white' : 'bg-orange-600 text-white'}>
                                  {g.status === 'recruiting' ? '招募中 OPEN' : '进行中 ACTIVE'}
                               </Badge>
                               <h3 className="font-black text-2xl uppercase tracking-tighter text-slate-900 group-hover:text-indigo-600 transition-colors">{g.title}</h3>
                            </div>
                            <p className="text-sm font-bold text-slate-400 leading-relaxed italic border-l-4 border-purple-500 pl-4">{g.short_desc}</p>
                         </div>
                         <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="text-right space-y-1">
                               <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Reward Node</p>
                               <p className="text-xs font-black text-purple-600 uppercase flex items-center justify-end gap-1.5"><Star size={14} fill="currentColor"/> {g.fake_card_name}</p>
                            </div>
                            <div className="min-w-[120px] space-y-2">
                               <div className="flex justify-between items-end mb-1">
                                  <span className="text-[9px] font-black uppercase text-slate-400">Deployed</span>
                                  <span className="text-xs font-black tabular-nums">{g.participant_count}/{g.max_players}</span>
                               </div>
                               <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-purple-600 transition-all duration-1000" style={{width: `${(g.participant_count/g.max_players)*100}%`}}></div></div>
                            </div>
                            <button
                               disabled={loading || (g.status !== 'recruiting' && !g.is_joined) || (g.participant_count >= g.max_players && !g.is_joined)}
                               onClick={() => handleJoin(g.id, g.is_joined === 1)}
                               className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-2xl transition-all ${g.is_joined ? 'bg-slate-900 text-white hover:bg-black' : 'bg-indigo-600 text-white hover:scale-105 active:scale-95 disabled:opacity-30 disabled:grayscale'}`}
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
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
             <div className="flex items-center gap-4 px-2">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-100"><Award size={24} fill="currentColor" /></div>
                <div><h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900">个人成就勋章馆</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operative Achievement Database</p></div>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {achievements.length > 0 ? achievements.map(a => (
                   <div key={a.id} className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-xl flex items-center gap-6 group hover:border-amber-200 transition-all">
                      <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-[1.2rem] flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg border-2 border-amber-100/50">
                         <Star size={24} fill="currentColor" />
                      </div>
                      <div className="space-y-1">
                         <p className="font-black text-lg uppercase text-slate-900 leading-none">{a.name}</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase italic tracking-tighter leading-relaxed mt-1">{a.condition || "SECRET NODE LINKED"}</p>
                         {a.earned_at && <p className="text-[8px] font-mono text-amber-600 opacity-60 uppercase mt-2 italic">Captured on: {new Date(parseInt(a.earned_at) * 1000).toLocaleDateString()}</p>}
                      </div>
                   </div>
                )) : (
                   <div className="col-span-full py-32 text-center opacity-20 italic">
                      <Award size={64} className="mx-auto mb-4" />
                      <p className="font-black uppercase tracking-[0.3em]">No Authorized Assets Detected</p>
                   </div>
                )}
             </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
             <div className="flex items-center gap-4 px-2">
                <div className="w-12 h-12 bg-slate-200 text-slate-700 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-100"><User size={24} fill="currentColor" /></div>
                <div><h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900">个人身份与报名信息</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Personal Identification Bureau</p></div>
             </div>
             
             <div className="bg-white rounded-[3rem] border-2 border-slate-100 shadow-2xl overflow-hidden">
                <div className="bg-slate-900 p-8 flex justify-between items-center text-white relative">
                   <div className="space-y-1 relative z-10">
                      <p className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.4em]">Personal Data</p>
                      <h3 className="text-4xl font-black italic uppercase tracking-tighter">{user.username}</h3>
                      <p className="text-xs font-bold opacity-40 lowercase">{user.email}</p>
                   </div>
                   <div className="relative z-10 flex gap-2">
                      <Badge variant="outline" className="border-indigo-500/50 text-indigo-400 uppercase">{user.role}</Badge>
                      <a href="/api/auth/logout" className="p-3 bg-red-600/20 text-red-500 border border-red-600/30 rounded-xl hover:bg-red-600 hover:text-white transition-all"><LogOut size={16}/></a>
                   </div>
                   <div className="absolute right-[-30px] top-[-30px] text-[10rem] font-black italic opacity-5 select-none pointer-events-none uppercase">ID</div>
                </div>
                <div className="p-8">
                   <RegistrationPage />
                </div>
             </div>
          </div>
        )}

      </div>

      {/* App-like Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 w-full z-50 px-4 pb-4">
         <div className="max-w-2xl mx-auto bg-slate-900/90 backdrop-blur-xl border border-white/10 p-3 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex justify-between items-center relative overflow-hidden">
            <div className="absolute inset-0 bg-indigo-600/5 opacity-50 animate-pulse"></div>
            {[
              { id: 'home', label: '比赛报名', icon: <BookOpen size={20} /> },
              { id: 'challenges', label: '小游戏', icon: <Zap size={20} /> },
              { id: 'achievements', label: '积分排行', icon: <Trophy size={20} /> },
              { id: 'profile', label: '个人中心', icon: <User size={20} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex flex-col items-center gap-1.5 py-2 px-6 rounded-2xl transition-all duration-500 group ${activeTab === tab.id ? 'text-indigo-400 scale-110' : 'text-slate-400 hover:text-white'}`}
              >
                {activeTab === tab.id && <div className="absolute inset-0 bg-white/5 rounded-2xl animate-in zoom-in-95"></div>}
                <div className={`transition-all duration-500 ${activeTab === tab.id ? 'scale-110 drop-shadow-[0_0_10px_rgba(129,140,248,0.5)]' : 'group-hover:-translate-y-1'}`}>
                  {tab.icon}
                </div>
                <span className={`font-black text-[9px] uppercase tracking-widest transition-all ${activeTab === tab.id ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-1'}`}>{tab.label}</span>
                {activeTab === tab.id && <div className="absolute bottom-0 w-1.5 h-1.5 bg-indigo-500 rounded-full animate-in fade-in slide-in-from-bottom-2"></div>}
              </button>
            ))}
         </div>
      </div>
    </div>
  );
};
