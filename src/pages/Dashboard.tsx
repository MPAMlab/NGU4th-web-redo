import React, { useEffect, useState, useRef } from 'react';
import { 
  Award, Trophy, Zap, LogOut, Settings, LayoutDashboard, Calendar, Users, 
  MapPin, ChevronRight, Star, User, BookOpen, Target, ShieldCheck, Activity, Swords, HelpCircle, QrCode, Scan, Camera, X, Upload
} from 'lucide-react';
import { RegistrationPage } from './Registration';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';

export interface Achievement {
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
  avatar_url?: string;
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

interface Stamp {
  created_at: string;
  username?: string;
  role?: string;
  avatar_url?: string;
  team?: string | null;
  scannee_id: string;
}

interface GameSettings {
  id: number;
  name: string;
  location: string;
  description: string;
  show_rules: number;
  show_minigames: number;
  show_stamps: number;
  show_achievements: number;
  show_cards: number;
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

// QR Scanner Component
const QRScannerComp = ({ onScan }: { onScan: (id: string) => void }) => {
  const [active, setActive] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (active) {
      scannerRef.current = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
      scannerRef.current.render((decodedText) => {
        onScan(decodedText);
        setActive(false);
      }, (err) => {});
    } else if (scannerRef.current) {
      scannerRef.current.clear();
    }
    return () => { if (scannerRef.current) scannerRef.current.clear(); };
  }, [active]);

  return (
    <div className="space-y-4">
      {active ? (
        <div className="relative">
          <div id="reader" className="overflow-hidden rounded-2xl border-4 border-indigo-500 shadow-2xl bg-black"></div>
          <button onClick={() => setActive(false)} className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full"><X size={20}/></button>
        </div>
      ) : (
        <button onClick={() => setActive(true)} className="w-full bg-indigo-600 hover:bg-indigo-500 py-5 rounded-[1.5rem] font-black uppercase shadow-xl transition-all flex items-center justify-center gap-3 italic text-white">
           <Camera size={20}/> 开启摄像头扫码 START CAMERA
        </button>
      )}
    </div>
  );
};

interface Card {
  id: number;
  name: string;
  type: string;
  description: string;
  multiplier?: number;
  exponent_bonus?: number;
  status?: string;
}

interface RankingEntry {
  username: string;
  team: string;
  achievement_count: number;
}

export const DashboardPage = ({ user: initialUser, achievements, activeGame, config }: { user: User, achievements: Achievement[], activeGame: GameSettings | null, config?: any }) => {
  const [user, setUser] = useState(initialUser);
  const [minigames, setMinigames] = useState<Minigame[]>([]);
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [inventory, setInventory] = useState<Card[]>([]);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showMyQR, setShowMyQR] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'challenges' | 'achievements' | 'stamps' | 'inventory' | 'profile'>('home');
  const [inventorySubTab, setInventorySubTab] = useState<'team' | 'gallery'>('team');
  const [manualScanId, setManualScanId] = useState('');

  const stampsOpen = config?.stamps_open !== 'false';

  const fetchData = async () => {
    try {
      const [miniRes, stampRes, invRes, cardRes, rankRes] = await Promise.all([
        fetch('/api/minigames'),
        fetch('/api/stamps'),
        fetch('/api/inventory'),
        fetch('/api/cards'),
        fetch('/api/rankings')
      ]);
      if (miniRes.ok) setMinigames(await miniRes.json());
      if (stampRes.ok) setStamps(await stampRes.json());
      if (invRes.ok) setInventory(await invRes.json());
      if (cardRes.ok) setAllCards(await cardRes.json());
      if (rankRes.ok) setRankings(await rankRes.json());
    } catch (e) {
      console.error("Failed to fetch dashboard data");
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleJoin = async (id: number, joined: boolean) => {
    setLoading(true);
    try {
      const res = await fetch('/api/minigames', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: joined ? 'leave' : 'join', minigameId: id }) });
      if (res.ok) fetchData();
    } finally { setLoading(false); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/auth/avatar', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const result = await res.json();
        setUser(prev => ({ ...prev, avatar_url: result.avatarUrl }));
      } else {
        const err = await res.json();
        alert(err.error || "上传失败");
      }
    } catch (err) {
      alert("网络错误");
    } finally {
      setUploading(false);
    }
  };

  const handleCollectStamp = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/stamps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'collect', scanneeId: id })
      });
      if (res.ok) {
        alert("集邮成功！");
        setShowScanner(false);
        fetchData();
      } else {
        const err = await res.text();
        alert(err || "无效的 ID 或已采集");
      }
    } finally { setLoading(false); }
  };

  const availableTabs = [
    { id: 'home', label: '对阵报名', icon: <BookOpen size={20} />, visible: true },
    { id: 'challenges', label: '小游戏', icon: <Zap size={20} />, visible: user.role === 'admin' || activeGame?.show_minigames === 1 },
    { id: 'stamps', label: '集邮', icon: <QrCode size={20} />, visible: user.role === 'admin' || activeGame?.show_stamps === 1 },
    { id: 'inventory', label: '卡牌库', icon: <Swords size={20} />, visible: user.role === 'admin' || activeGame?.show_cards === 1 },
    { id: 'achievements', label: '成就中心', icon: <Trophy size={20} />, visible: user.role === 'admin' || activeGame?.show_achievements === 1 },
    { id: 'profile', label: '个人中心', icon: <User size={20} />, visible: true }
    ].filter(t => t.visible);

    return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-32">
      <div className="container mx-auto px-3 py-4 md:px-4 md:py-8 max-w-4xl space-y-8 md:space-y-12">

        {activeTab === 'home' && (
          <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
             <section className="relative rounded-2xl md:rounded-3xl bg-slate-900 p-6 md:p-8 overflow-hidden text-white shadow-xl">
                <div className="relative z-10 space-y-4">
                   <div className="flex flex-wrap gap-2">
                      <Badge className="bg-indigo-500 text-white font-black px-3 py-0.5 rounded-full uppercase tracking-widest text-[8px] md:text-[9px]">Active Season</Badge>
                      <Badge variant="outline" className="text-white border-white/20 font-black px-3 py-0.5 rounded-full uppercase tracking-widest text-[8px] md:text-[9px] flex items-center gap-1"><MapPin size={8} /> {activeGame?.location || '郑州现场'}</Badge>
                   </div>
                   <div>
                      <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter leading-tight uppercase text-white">Never Give Up<br/><span className="text-indigo-400">4th Edition</span></h1>
                      <div className="mt-2 flex items-center gap-2 text-indigo-300 font-black text-[8px] md:text-[9px] uppercase tracking-[0.2em] bg-white/5 border border-white/10 w-fit px-3 py-1 rounded-full">
                         <Zap size={10} fill="currentColor" /> {activeGame?.name || 'Official Match Engine'}
                      </div>
                      <p className="text-slate-400 font-medium max-w-md text-xs md:text-sm mt-3 leading-relaxed italic opacity-80">{activeGame?.description || `欢迎回来, ${user.username}! 准备好加入红蓝对抗了吗？`}</p>
                   </div>
                   <div className="flex gap-2 md:gap-3 pt-1">
                      {activeGame?.show_stamps === 1 && (
                         <button onClick={() => setActiveTab('stamps')} className="bg-white text-slate-900 hover:bg-indigo-500 hover:text-white px-5 py-2.5 md:px-6 md:py-3 rounded-xl md:rounded-2xl font-black uppercase italic tracking-tighter transition-all shadow-lg flex items-center gap-2 group text-xs">
                            <QrCode size={14} className="group-hover:rotate-12 transition-transform" /> 立即集邮
                         </button>
                      )}
                      {user.role === 'admin' && (<a href="/admin" className="border-2 border-white/10 hover:bg-white/5 text-white px-5 py-2.5 md:px-6 md:py-3 rounded-xl md:rounded-2xl font-black uppercase italic tracking-tighter transition-all flex items-center gap-2 text-xs"><Settings size={14} /> 管理后台</a>)}
                   </div>
                </div>
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-48 h-48 md:w-64 md:h-64 bg-indigo-600/20 rounded-full blur-3xl opacity-50 animate-pulse"></div>
                <div className="absolute bottom-[-20px] right-[-10px] opacity-10 rotate-12 scale-110 md:scale-125 pointer-events-none"><Swords size={150} /></div>
             </section>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center gap-3 group hover:border-indigo-100 transition-all"><div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner"><BookOpen size={20}/></div><span className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">集邮进度</span><span className="text-xl font-black text-slate-900 tabular-nums">{stamps.length}</span></div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center gap-3 group hover:border-indigo-100 transition-all"><div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner"><Trophy size={20}/></div><span className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">解锁成就</span><span className="text-xl font-black text-slate-900 tabular-nums">{achievements.length}</span></div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center gap-3 group hover:border-indigo-100 transition-all"><div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner"><Zap size={20}/></div><span className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">活跃挑战</span><span className="text-xl font-black text-slate-900 tabular-nums">{minigames.filter(g=>g.is_joined).length}</span></div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center gap-3 group hover:border-indigo-100 transition-all"><div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner"><Activity size={20}/></div><span className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">系统状态</span><span className="text-xl font-black text-slate-900">SYNCED</span></div>
             </div>

             <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
                <div className="bg-slate-900 p-5 flex items-center gap-4 text-white">
                   <Users size={18} className="text-indigo-400" />
                   <h3 className="font-black italic uppercase text-[10px] tracking-widest">战队对阵报名 REGISTRATION HUB</h3>
                </div>
                <div className="p-6"><RegistrationPage /></div>
             </div>
          </div>
        )}

        {activeTab === 'challenges' && (
          <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right-4 duration-500">
             <div className="flex items-center gap-3 px-1 md:px-2">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 text-purple-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-purple-100">
                   <Zap size={20} fill="currentColor" />
                </div>
                <div>
                   <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase text-slate-900">支线挑战 HUB</h2>
                   <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Minigame Roster</p>
                </div>
             </div>
             <div className="grid grid-cols-1 gap-3 md:gap-4">
                {minigames.filter(m => m.status !== 'finished').map(g => (
                   <div key={g.id} className="bg-white rounded-2xl md:rounded-[2.5rem] border-2 border-slate-100 shadow-lg md:shadow-xl overflow-hidden group hover:border-purple-200 transition-all p-5 md:p-8 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-8">
                      <div className="space-y-2 md:space-y-3 flex-1 w-full">
                         <div className="flex items-center gap-3">
                            <Badge variant={g.status === 'recruiting' ? 'default' : 'outline'} className={g.status === 'recruiting' ? 'bg-green-600 text-white border-transparent' : 'text-orange-500 border-orange-200'}>
                               {g.status === 'recruiting' ? '招募中' : '进行中'}
                            </Badge>
                            <h3 className="font-black text-xl md:text-2xl uppercase tracking-tighter text-slate-900">{g.title}</h3>
                         </div>
                         <p className="text-xs md:text-sm font-bold text-slate-400 leading-relaxed italic border-l-4 border-purple-500 pl-3 md:pl-4">{g.short_desc}</p>
                         <div className="flex gap-4 md:gap-6 mt-2 md:mt-4">
                            <div className="flex flex-col"><span className="text-[7px] md:text-[8px] font-black uppercase text-slate-400 tracking-widest">已报名人数</span><span className="text-base md:text-lg font-black italic tabular-nums">{g.participant_count} / {g.max_players}</span></div>
                            <div className="flex flex-col"><span className="text-[7px] md:text-[8px] font-black uppercase text-slate-400 tracking-widest">优胜奖励</span><span className="text-base md:text-lg font-black italic text-purple-600 uppercase">{g.fake_card_name || '???'}</span></div>
                         </div>
                      </div>
                      <button 
                         disabled={loading || (g.status !== 'recruiting' && !g.is_joined) || (g.participant_count >= g.max_players && !g.is_joined)} 
                         onClick={() => handleJoin(g.id, g.is_joined === 1)} 
                         className={`w-full md:w-auto px-8 py-3.5 md:px-10 md:py-5 rounded-xl md:rounded-[1.5rem] font-black text-xs uppercase shadow-xl transition-all active:scale-95 ${
                            g.is_joined 
                               ? 'bg-slate-900 text-white border-b-2 md:border-b-4 border-slate-700' 
                               : 'bg-indigo-600 text-white border-b-2 md:border-b-4 border-indigo-800 hover:bg-indigo-500'
                         } disabled:opacity-30 disabled:grayscale`}
                      >
                         {loading ? 'SYNCING...' : g.is_joined ? '取消报名' : g.participant_count >= g.max_players ? '名额已满' : '立即报名 JOIN'}
                      </button>
                   </div>
                ))}
                {minigames.filter(m => m.status !== 'finished').length === 0 && (
                   <div className="bg-slate-100/50 rounded-2xl md:rounded-[2.5rem] border-2 border-dashed border-slate-200 py-12 md:py-20 text-center space-y-4">
                      <HelpCircle size={40} className="mx-auto text-slate-300" />
                      <p className="font-black text-slate-400 uppercase italic tracking-widest text-xs md:text-base">目前没有进行中的挑战</p>
                   </div>
                )}
             </div>
          </div>
        )}

        {activeTab === 'stamps' && (
          <div className="space-y-8 md:space-y-12 animate-in slide-in-from-right-4 duration-500">
             <div className="flex items-center gap-3 md:gap-4 px-1 md:px-2">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-100 text-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg"><QrCode size={20} fill="currentColor" className="w-5 h-5 md:w-6 md:h-6" /></div>
                <div>
                   <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase text-slate-900">集邮中心 STAMP HUB</h2>
                   <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Connect & Collect</p>
                </div>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <button 
                  onClick={() => stampsOpen ? setShowMyQR(true) : alert("集邮录入已暂时关闭")} 
                  className={`p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border-2 shadow-lg transition-all flex items-center justify-between group ${
                    stampsOpen ? 'bg-white border-slate-100 hover:border-indigo-500 hover:scale-[1.02] text-slate-900' : 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed text-slate-400'
                  }`}
                >
                   <div className="text-left">
                      <p className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest mb-1 ${stampsOpen ? 'text-indigo-500' : 'text-slate-400'}`}>My Identity</p>
                      <h4 className="text-lg md:text-xl font-black italic uppercase">展示二维码</h4>
                   </div>
                   <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-all shadow-inner ${
                     stampsOpen ? 'bg-indigo-50 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white' : 'bg-slate-200 text-slate-400'
                   }`}><QrCode size={24} className="w-6 h-6 md:w-7 md:h-7" /></div>
                </button>
                <button 
                  onClick={() => stampsOpen ? setShowScanner(true) : alert("集邮录入已暂时关闭")} 
                  className={`p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] shadow-lg transition-all flex items-center justify-between group ${
                    stampsOpen ? 'bg-slate-900 hover:bg-indigo-600 hover:scale-[1.02] text-white' : 'bg-slate-800 opacity-50 cursor-not-allowed text-slate-500'
                  }`}
                >
                   <div className="text-left">
                      <p className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest mb-1 ${stampsOpen ? 'text-indigo-400' : 'text-slate-600'}`}>Scan Action</p>
                      <h4 className="text-lg md:text-xl font-black italic uppercase">立即扫码</h4>
                   </div>
                   <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-all shadow-inner ${
                     stampsOpen ? 'bg-white/10 text-white group-hover:bg-white group-hover:text-indigo-600' : 'bg-slate-700 text-slate-600'
                   }`}><Scan size={24} className="w-6 h-6 md:w-7 md:h-7" /></div>
                </button>
             </div>
             
             {!stampsOpen && (
               <div className="bg-amber-50 border-2 border-amber-100 p-4 rounded-2xl flex items-center gap-3 text-amber-700 animate-in fade-in duration-500">
                  <Info size={18} />
                  <p className="text-[10px] font-black uppercase italic tracking-widest">集邮录入功能已由管理员关闭，当前仅供查看进度。</p>
               </div>
             )}

             <div className="space-y-4 md:space-y-6">
                <div className="flex items-center justify-between px-2">
                   <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 italic"><Activity size={12} className="text-indigo-500" /> 已收集 ({stamps.length})</h3>
                   <Badge variant="outline" className="border-slate-200 text-slate-400 font-bold">{stamps.length} ENTRIES</Badge>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
                   {stamps.map((s, i) => {
                      const roleColor = !s.username ? 'bg-slate-100 text-slate-400 border-slate-200' : (s.role === 'admin' ? 'bg-amber-100 text-amber-600 border-amber-200' : (s.team === 'red' ? 'bg-red-50 text-red-600 border-red-100' : (s.team === 'blue' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-100 text-slate-500 border-slate-200')));
                      return (
                         <div key={i} className="bg-white p-3 md:p-4 rounded-full border border-slate-100 shadow-sm flex items-center gap-3 md:gap-4 group hover:border-indigo-200 transition-all pr-5 md:pr-6">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden bg-slate-100 border-2 border-white shadow-inner flex-shrink-0 group-hover:scale-110 transition-transform">
                               {s.avatar_url ? <img src={s.avatar_url} alt={s.username} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><User size={20} /></div>}
                            </div>
                            <div className="min-w-0 flex-1">
                               <p className="font-black text-xs md:text-sm uppercase text-slate-900 truncate">{s.username || 'System'}</p>
                               <div className={`mt-0.5 inline-block px-1.5 py-0.5 rounded-full text-[7px] font-black border ${roleColor} uppercase italic tracking-tighter`}>{s.team || 'Player'}</div>
                            </div>
                            <ShieldCheck size={14} className="text-indigo-600 opacity-20 group-hover:opacity-100 transition-opacity" />
                         </div>
                      );
                   })}
                   {stamps.length === 0 && (
                      <div className="col-span-full py-16 md:py-20 bg-white rounded-2xl md:rounded-[3rem] border-2 border-dashed border-slate-100 text-center space-y-4">
                         <QrCode size={40} className="mx-auto text-slate-200" />
                         <p className="font-black text-slate-400 uppercase italic tracking-widest text-xs md:text-base">还没有采集到任何邮戳</p>
                      </div>
                   )}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'inventory' && (
           <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-100 text-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg"><Swords size={20} fill="currentColor" className="w-5 h-5 md:w-6 md:h-6" /></div>
                    <div><h2 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase text-slate-900">战术卡牌库</h2><p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inventory Gallery</p></div>
                 </div>
                 <div className="bg-slate-100 p-1 rounded-xl flex gap-1 w-full md:w-auto">
                    <button onClick={() => setInventorySubTab('team')} className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${inventorySubTab === 'team' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>我的队伍</button>
                    <button onClick={() => setInventorySubTab('gallery')} className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${inventorySubTab === 'gallery' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>卡牌图鉴</button>
                 </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                 {(inventorySubTab === 'team' ? inventory : allCards).map((card, i) => (
                    <div key={i} className="bg-white p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-lg hover:border-indigo-200 transition-all relative overflow-hidden flex flex-col">
                       <div className={`absolute top-0 right-0 px-4 py-1 rounded-bl-xl font-black text-[7px] md:text-[8px] uppercase tracking-widest ${card.type === 'joker' ? 'bg-amber-100 text-amber-600' : 'bg-purple-100 text-purple-600'}`}>{card.type}</div>
                       <h4 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-slate-900 mb-2">{card.name}</h4>
                       <p className="text-[10px] md:text-xs font-bold text-slate-400 italic leading-relaxed mb-4 flex-1">{card.description}</p>
                       <div className="flex gap-4 border-t border-slate-50 pt-3 md:pt-4">
                          {card.multiplier && <div className="text-indigo-600 font-black italic text-lg md:text-xl">x{card.multiplier}</div>}
                          {card.exponent_bonus && <div className="text-purple-600 font-black italic text-lg md:text-xl">+{card.exponent_bonus} EXP</div>}
                       </div>
                    </div>
                 ))}
                 {(inventorySubTab === 'team' ? inventory : allCards).length === 0 && (
                    <div className="col-span-full py-16 text-center opacity-20 italic font-black uppercase text-xl md:text-2xl tracking-widest">暂无卡牌数据</div>
                 )}
              </div>
           </div>
        )}

        {activeTab === 'achievements' && (
          <div className="space-y-8 md:space-y-12 animate-in slide-in-from-right-4 duration-500">
             <div className="flex items-center gap-3 md:gap-4 px-1 md:px-2">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-100 text-amber-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg"><Trophy size={20} fill="currentColor" className="w-5 h-5 md:w-6 md:h-6" /></div>
                <div>
                   <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase text-slate-900">成就中心 HUB</h2>
                   <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Medals & Collection</p>
                </div>
             </div>

             <div className="space-y-4 md:space-y-6">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 px-1 md:px-2"><Star size={12} className="text-amber-500" /> 我的收藏 ({achievements.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                   {achievements.map(a => (
                      <div key={a.id} className="bg-white p-5 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-lg flex items-center gap-4 md:gap-6 group hover:border-amber-200 transition-all">
                         <div className="w-12 h-12 md:w-14 md:h-14 bg-amber-50 text-amber-600 rounded-lg md:rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-md border border-amber-100/50">
                            <Star size={20} fill="currentColor" className="w-5 h-5 md:w-6 md:h-6" />
                         </div>
                         <div className="space-y-0.5 md:space-y-1">
                            <p className="font-black text-base md:text-lg uppercase text-slate-900 leading-none">{a.name}</p>
                            <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase italic leading-relaxed mt-1">{a.condition}</p>
                         </div>
                      </div>
                   ))}
                   {achievements.length === 0 && (
                      <div className="col-span-full py-16 text-center opacity-20 italic font-black uppercase text-xl md:text-2xl tracking-widest">暂无获得成就</div>
                   )}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right-4 duration-500">
             <div className="flex items-center gap-3 px-1 md:px-2"><div className="w-10 h-10 md:w-12 md:h-12 bg-slate-200 text-slate-700 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg"><User size={20} fill="currentColor" className="w-5 h-5 md:w-6 md:h-6" /></div><div><h2 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase text-slate-900">个人身份 ID</h2><p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identification Bureau</p></div></div>
             <div className="bg-white rounded-2xl md:rounded-[3rem] border border-slate-100 shadow-xl md:shadow-2xl overflow-hidden">
                <div className="bg-slate-900 p-6 md:p-8 flex justify-between items-center text-white relative">
                   <div className="absolute inset-0 opacity-10 pointer-events-none">
                      <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-indigo-500 rounded-full blur-3xl -mr-24 -mt-24 md:-mr-32 md:-mt-32"></div>
                   </div>
                   <div className="flex items-center gap-4 md:gap-6 relative z-10">
                      <div className="relative group cursor-pointer" onClick={() => document.getElementById('avatar-input')?.click()}>
                         <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[2rem] bg-slate-800 border-2 md:border-4 border-white/10 overflow-hidden shadow-xl transition-all group-hover:scale-105 group-hover:border-indigo-500/50">
                            {user.avatar_url ? (
                               <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                               <div className="w-full h-full flex items-center justify-center text-slate-500"><User size={30} className="w-[30px] h-[30px] md:w-10 md:h-10" /></div>
                            )}
                            <div className={`absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${uploading ? 'opacity-100' : ''}`}>
                               {uploading ? (
                                  <div className="w-4 h-4 md:w-6 md:h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                               ) : (
                                  <>
                                     <Upload size={16} className="text-white mb-1 w-4 h-4 md:w-5 md:h-5" />
                                     <span className="text-[7px] md:text-[8px] font-black uppercase">Update</span>
                                  </>
                                )}
                            </div>
                         </div>
                         <input id="avatar-input" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                      </div>
                      <div className="space-y-0.5 md:space-y-1 min-w-0">
                         <p className="text-[8px] md:text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] md:tracking-[0.4em]">Personal Data</p>
                         <h3 className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter truncate">{user.username}</h3>
                         <p className="text-[10px] md:text-xs font-bold opacity-40 lowercase truncate">{user.email}</p>
                      </div>
                   </div>
                   <div className="relative z-10 flex flex-col items-end gap-2">
                      <Badge variant="outline" className="border-indigo-500/50 text-indigo-400 uppercase scale-90 md:scale-100">{user.role}</Badge>
                      <a href="/api/auth/logout" className="p-2 md:p-3 bg-red-600/20 text-red-500 border border-red-600/30 rounded-lg md:rounded-xl hover:bg-red-600 hover:text-white transition-all"><LogOut size={14} className="w-[14px] h-[14px] md:w-4 md:h-4" /></a>
                   </div>
                </div>
                <div className="p-6 md:p-8">
                   <div className="bg-slate-50 rounded-xl md:rounded-2xl p-4 md:p-6 border-2 border-dashed border-slate-200 text-center space-y-2">
                      <p className="text-xs md:text-sm font-black text-slate-400 uppercase italic">报名信息已移至对阵报名页</p>
                      <button onClick={() => setActiveTab('home')} className="text-indigo-600 font-bold text-[10px] md:text-xs hover:underline uppercase">前往查看 HUB</button>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* Modals */}
        {showMyQR && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowMyQR(false)}></div>
              <div className="bg-white rounded-3xl md:rounded-[3rem] p-6 md:p-10 shadow-2xl relative z-10 max-w-sm w-full text-center space-y-6 md:space-y-8 animate-in zoom-in-95 duration-300">
                <button onClick={() => setShowMyQR(false)} className="absolute top-4 right-4 md:top-6 md:right-6 p-2 text-slate-400 hover:text-slate-900 transition-colors"><X size={20} className="w-5 h-5 md:w-6 md:h-6" /></button>
                <div className="space-y-1 md:space-y-2">
                    <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter">我的身份码</h3>
                    <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Show this to other players</p>
                </div>
                <div className="bg-slate-50 p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border-2 md:border-4 border-slate-100 shadow-inner flex justify-center">
                    <div className="bg-white p-3 md:p-4 border-2 md:border-4 border-slate-900 rounded-xl md:rounded-2xl shadow-xl">
                      <QRCodeSVG value={user.kinde_id} size={180} level="H" className="md:w-[200px] md:h-[200px]" />
                    </div>
                </div>
                <div className="space-y-0.5 md:space-y-1">
                    <p className="text-lg md:text-xl font-black italic uppercase">{user.username}</p>
                    <p className="text-[8px] md:text-[10px] font-mono font-bold text-slate-300 uppercase truncate px-4">{user.kinde_id}</p>
                </div>
              </div>
          </div>
        )}

        {showScanner && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowScanner(false)}></div>
              <div className="bg-slate-900 rounded-3xl md:rounded-[3rem] p-6 md:p-10 shadow-2xl relative z-10 max-w-lg w-full text-center space-y-6 md:space-y-8 animate-in zoom-in-95 duration-300 border border-white/10">
                <button onClick={() => setShowScanner(false)} className="absolute top-4 right-4 md:top-6 md:right-6 p-2 text-white/40 hover:text-white transition-colors"><X size={20} className="w-5 h-5 md:w-6 md:h-6" /></button>
                <div className="space-y-1 md:space-y-2">
                    <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-white">扫描终端</h3>
                    <p className="text-[8px] md:text-[10px] font-bold text-indigo-400 uppercase tracking-widest italic">Aim at the QR code</p>
                </div>
                <div className="overflow-hidden rounded-2xl md:rounded-[2.5rem] border-2 md:border-4 border-indigo-500/50 shadow-2xl">
                    <QRScannerComp onScan={(id) => handleCollectStamp(id)} />
                </div>
                <div className="pt-2 flex items-center gap-3 opacity-20"><div className="h-[1px] flex-1 bg-white/20"></div><span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-white">Manual Input</span><div className="h-[1px] flex-1 bg-white/20"></div></div>
                <div className="flex gap-2">
                    <input value={manualScanId} onChange={(e)=>setManualScanId(e.target.value)} placeholder="KIND_ID..." className="flex-1 bg-white/5 border border-white/10 p-3 md:p-4 rounded-xl md:rounded-2xl text-[10px] md:text-xs outline-none text-white font-bold" />
                    <button onClick={()=>handleCollectStamp(manualScanId)} className="bg-indigo-600 text-white px-6 md:px-8 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase hover:bg-indigo-500 transition-all">GO</button>
                </div>
              </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 w-full z-50 px-3 pb-3">
         <div className="max-w-xl mx-auto bg-slate-900/95 backdrop-blur-xl border border-white/10 p-1.5 md:p-2.5 rounded-2xl md:rounded-[2.5rem] shadow-[0_15px_40px_rgba(0,0,0,0.5)] flex justify-between items-center relative overflow-hidden">
            <div className="absolute inset-0 bg-indigo-600/5 opacity-50 animate-pulse pointer-events-none"></div>
            {availableTabs.map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`relative flex flex-col items-center gap-1 py-2 rounded-xl md:rounded-2xl transition-all duration-300 group flex-1 ${activeTab === tab.id ? 'text-indigo-400 scale-105 md:scale-110' : 'text-slate-400 hover:text-white'}`}>
                {activeTab === tab.id && <div className="absolute inset-0 bg-white/5 rounded-xl md:rounded-2xl animate-in zoom-in-95"></div>}
                <div className={`transition-all duration-300 ${activeTab === tab.id ? 'scale-110 drop-shadow-[0_0_8px_rgba(129,140,248,0.4)]' : 'group-hover:-translate-y-0.5'}`}>
                   {React.cloneElement(tab.icon as React.ReactElement, { size: 18 })}
                </div>
                <span className={`font-black text-[7px] md:text-[9px] uppercase tracking-tighter md:tracking-widest transition-all ${activeTab === tab.id ? 'opacity-100 translate-y-0' : 'opacity-40'}`}>{tab.label}</span>
                {activeTab === tab.id && <div className="absolute bottom-0 w-1 h-1 bg-indigo-500 rounded-full animate-in fade-in slide-in-from-bottom-2"></div>}
              </button>
            ))}
         </div>
      </div>
    </div>
  );
};
