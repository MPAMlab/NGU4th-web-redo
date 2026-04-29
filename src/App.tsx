import { useEffect, useState, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { RegistrationPage } from './pages/Registration'
import { DashboardPage } from './pages/Dashboard'
import { AdminDashboard } from './pages/AdminDashboard'
import { LiveView } from './pages/LiveView'
import { MatchHistory } from './pages/MatchHistory'
import { NotFound } from './pages/NotFound'
import { Trophy, Swords, Zap, LogIn, MapPin, Star, BookOpen, Info, Hash, Activity, Users, History, LayoutDashboard } from 'lucide-react'
import { AchievementToast, Achievement } from './components/AchievementToast'

const Badge = ({ children, className, variant = 'default' }: any) => {
  const base = "px-4 py-1 rounded-full font-black uppercase tracking-widest text-[10px] shadow-sm";
  const variants: any = {
    default: "bg-indigo-500 text-white",
    outline: "bg-transparent border border-white/20 text-white",
    secondary: "bg-white/10 text-indigo-300 border border-white/10"
  };
  return <span className={`${base} ${variants[variant]} ${className}`}>{children}</span>;
};

const HAND_TYPES = [
  { name: '同数 (X of a Kind)', desc: '大于5张点数相同的数字牌', examples: ['10x6', '5x7'], color: 'bg-red-600' },
  { name: '五条 (Five of a Kind)', desc: '5张点数相同的数字牌', examples: ['9x5', '2x5'], color: 'bg-orange-600' },
  { name: '四条', desc: '4张点数相同的数字牌', examples: ['8x4', '1x4'], color: 'bg-amber-600' },
  { name: '葫芦 (Full House)', desc: '三张相同点数 + 一对相同点数', examples: ['7x3 + 3x2'], color: 'bg-lime-600' },
  { name: '顺子 (Straight)', desc: '大于等于5张点数连续的数字牌', examples: ['1,2,3,4,5', '3,4,5,6,7,8'], color: 'bg-green-600' },
  { name: '控分大师 (Score Master)', desc: '结算时两张私牌的点数之和等于 0', examples: ['-5 + 5'], color: 'bg-emerald-600' },
  { name: '三条/两对/对子', desc: '基础扑克组合', examples: ['8x3', '2x2+4x2', '9x2'], color: 'bg-teal-600' },
  { name: '高牌', desc: '单张最高点数的数字牌', examples: ['10', '7'], color: 'bg-slate-400' },
];

function App() {
  const [auth, setAuth] = useState<{ user: any, achievements: Achievement[] } | null>(null)
  const [activeGame, setActiveGame] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([])
  const prevAchievementIds = useRef<Set<number>>(new Set())

  const fetchStatus = async (isInitial = false) => {
    try {
      const [authRes, sysRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/system')
      ]);
      
      if (authRes.ok) {
        const authData = await authRes.json();
        if (authData.user) {
          if (!isInitial) {
             const fresh = authData.achievements.filter((a: Achievement) => !prevAchievementIds.current.has(a.id));
             if (fresh.length > 0) setNewAchievements(prev => [...prev, ...fresh]);
          }
          authData.achievements.forEach((a: Achievement) => prevAchievementIds.current.add(a.id));
          setAuth(authData);
        } else {
          setAuth(null);
        }
      }

      if (sysRes.ok) {
        const sysData = await sysRes.json();
        setActiveGame(sysData.activeGame);
      }
    } catch (e) {
      console.error("Polling error", e);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus(true);
    const interval = setInterval(() => fetchStatus(), 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-950 gap-4 uppercase font-black">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[10px] text-white tracking-[0.5em] animate-pulse">NGU4th Syncing</p>
    </div>
  )

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100 font-sans">
        {newAchievements.map(a => (
          <AchievementToast 
            key={a.id} 
            achievement={a} 
            onClose={() => setNewAchievements(prev => prev.filter(x => x.id !== a.id))} 
          />
        ))}

        <Routes>
          <Route path="/" element={
              <div className="container mx-auto px-4 py-12 max-w-4xl space-y-16 pb-32 animate-in fade-in duration-1000">
                {/* Hero Banner */}
                <section className="relative rounded-[3.5rem] bg-slate-900 p-12 overflow-hidden text-white shadow-[0_50px_100px_rgba(15,23,42,0.5)]">
                   <div className="relative z-10 space-y-8">
                      <div className="flex flex-wrap gap-3">
                         <Badge>Active Season 2026</Badge>
                         <Badge variant="outline" className="flex items-center gap-2"><MapPin size={12}/> {activeGame?.location || '郑州现场'}</Badge>
                      </div>
                      <div className="space-y-2">
                        <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter leading-none uppercase">Never Give Up<br/><span className="text-indigo-500">4th Edition</span></h1>
                        <div className="flex items-center gap-3 text-indigo-400 font-black text-xs uppercase tracking-[0.4em] bg-white/5 border border-white/10 w-fit px-5 py-2 rounded-full mt-4">
                           <Zap size={14} fill="currentColor" /> {activeGame?.name || 'Official Match Engine'}
                        </div>
                      </div>
                      <p className="text-slate-400 font-bold max-w-lg text-lg leading-relaxed italic">
                        {activeGame?.description || '第四届 NeverGiveUp 联合对抗赛。在这里，音游成绩将转化为强大的扑克手牌，与你的队友并肩作战，向一亿总分发起挑战。'}
                      </p>
                      <div className="flex flex-wrap gap-6 pt-4">
                         {auth ? (
                            <a 
                              href="/dashboard" 
                              className="bg-indigo-500 text-white hover:bg-white hover:text-slate-950 px-10 py-5 rounded-[2rem] font-black text-xl uppercase italic tracking-tighter transition-all shadow-2xl hover:scale-105 active:scale-95 flex items-center gap-3 group"
                            >
                              <LayoutDashboard size={24} className="group-hover:translate-x-1 transition-transform" />
                              进入控制台 DASHBOARD
                            </a>
                         ) : (
                            <a 
                              href="/api/auth/login" 
                              className="bg-white text-slate-950 hover:bg-indigo-500 hover:text-white px-10 py-5 rounded-[2rem] font-black text-xl uppercase italic tracking-tighter transition-all shadow-2xl hover:scale-105 active:scale-95 flex items-center gap-3 group"
                            >
                              <LogIn size={24} className="group-hover:translate-x-1 transition-transform" />
                              进入系统 LOGIN
                            </a>
                         )}
                         <a 
                           href="/live" 
                           className="border-2 border-white/20 hover:bg-white/10 text-white px-10 py-5 rounded-[2rem] font-black text-xl uppercase italic tracking-tighter transition-all flex items-center gap-3"
                         >
                           <Activity size={24} /> 实时大屏
                         </a>
                         <a 
                           href="/history" 
                           className="bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white px-10 py-5 rounded-[2rem] font-black text-xl uppercase italic tracking-tighter transition-all flex items-center gap-3 border border-indigo-500/30"
                         >
                           <History size={24} /> 档案库 ARCHIVES
                         </a>
                      </div>
                   </div>
                   <div className="absolute top-0 right-0 -mr-32 -mt-32 w-[30rem] h-[30rem] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"></div>
                   <div className="absolute bottom-[-50px] right-[-20px] opacity-10 rotate-12 pointer-events-none scale-150"><Swords size={300} /></div>
                </section>

                {/* Rules Section (Respect show_rules) */}
                {activeGame?.show_rules === 1 && (
                  <section className="space-y-10">
                     <div className="flex items-center gap-4 px-4">
                        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-lg"><Star size={24} fill="currentColor" /></div>
                        <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900">核心计分法则 SCORING RULES</h2>
                     </div>

                     <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        <div className="lg:col-span-4 space-y-8">
                           <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden border-b-[12px] border-indigo-600">
                              <div className="space-y-4 mb-8">
                                 <h3 className="font-black text-[10px] uppercase text-indigo-400 tracking-[0.3em] opacity-60">Tactical Formula</h3>
                                 <p className="text-3xl font-black tracking-tighter italic leading-tight">Total = (ΣBase ^ EXP) * ΠMult</p>
                              </div>
                              <div className="space-y-6 text-sm font-bold text-slate-400">
                                 <div className="space-y-1 border-l-4 border-indigo-500 pl-6">
                                    <p className="text-white uppercase flex items-center gap-2 tracking-widest"><Hash size={16} /> 累积基础分</p>
                                    <p className="text-xs opacity-60">本赛季该队获得的所有基础分之和</p>
                                 </div>
                                 <div className="space-y-1 border-l-4 border-indigo-500 pl-6">
                                    <p className="text-white uppercase flex items-center gap-2 tracking-widest"><Zap size={16} fill="currentColor" /> 连乘倍率</p>
                                    <p className="text-xs opacity-60">小丑牌、塔罗牌和假卡提供的翻倍奖励</p>
                                 </div>
                                 <div className="space-y-1 border-l-4 border-indigo-500 pl-6">
                                    <p className="text-white uppercase flex items-center gap-2 tracking-widest"><Star size={16} className="text-amber-500" /> 指数加成 EXP</p>
                                    <p className="text-xs opacity-60">卡牌提供的指数奖励，将跨回合永久累积</p>
                                 </div>
                              </div>
                           </div>

                           <div className="bg-amber-50 border-4 border-amber-100 p-8 rounded-[3rem] space-y-4 shadow-xl">
                              <h4 className="font-black text-amber-600 uppercase tracking-widest flex items-center gap-2 italic">
                                 <Info size={18} /> 重要提示
                              </h4>
                              <p className="text-sm font-bold text-amber-900/70 leading-relaxed italic">
                                 所有分值在提交后将永久存档。Phase 2 的解锁需要全场红蓝两队贡献值的积达到 100,000,000 点。
                              </p>
                           </div>
                        </div>

                        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                           {HAND_TYPES.map((h) => (
                             <div key={h.name} className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 hover:border-indigo-200 transition-all group hover:shadow-xl">
                                <div className="flex items-center gap-4 mb-4">
                                   <div className={`w-3 h-10 rounded-full ${h.color} shadow-lg shadow-current/20`}></div>
                                   <h4 className="font-black text-lg text-slate-900 uppercase tracking-tighter">{h.name}</h4>
                                </div>
                                <p className="text-[11px] font-bold text-slate-400 mb-6 uppercase leading-tight tracking-wide">{h.desc}</p>
                                <div className="flex flex-wrap gap-2 mt-auto">
                                   {h.examples.map((ex, i) => (
                                     <span key={i} className="text-[10px] font-black px-4 py-2 bg-slate-50 text-slate-500 rounded-xl border-2 border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all italic">
                                       例: {ex}
                                     </span>
                                   ))}
                                </div>
                             </div>
                           ))}
                        </div>
                     </div>
                  </section>
                )}
              </div>
          } />
          <Route path="/dashboard" element={
            auth ? (
              <DashboardPage user={auth.user} achievements={auth.achievements} activeGame={activeGame} />
            ) : <Navigate to="/" />
          } />
          <Route path="/admin" element={
            auth && auth.user.role === 'admin' ? (
              <AdminDashboard />
            ) : <Navigate to="/dashboard" />
          } />
          <Route path="/live" element={<LiveView />} />
          <Route path="/history" element={<MatchHistory />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
