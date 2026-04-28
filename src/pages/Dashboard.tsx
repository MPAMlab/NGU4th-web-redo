import React, { useEffect, useState, useRef } from 'react';
import { 
  Award, Trophy, Zap, LogOut, Settings, LayoutDashboard, Calendar, Users, 
  MapPin, ChevronRight, Star, User, BookOpen, Target, ShieldCheck, Activity, Swords, HelpCircle, QrCode, Scan, Camera, X
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
  username: string;
  role: string;
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

export const DashboardPage = ({ user, achievements, activeGame }: { user: User, achievements: Achievement[], activeGame: GameSettings | null }) => {
  const [minigames, setMinigames] = useState<Minigame[]>([]);
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [inventory, setInventory] = useState<Card[]>([]);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'challenges' | 'achievements' | 'stamps' | 'inventory' | 'profile'>('home');
  const [inventorySubTab, setInventorySubTab] = useState<'team' | 'gallery'>('team');
  const [manualScanId, setManualScanId] = useState('');

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
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "无效的 ID 或已采集");
      }
    } finally { setLoading(false); }
  };

  const availableTabs = [
    { id: 'home', label: '对阵报名', icon: <BookOpen size={20} />, visible: true },
    { id: 'challenges', label: '小游戏', icon: <Zap size={20} />, visible: user.role === 'admin' || activeGame?.show_minigames === 1 },
    { id: 'stamps', label: '集邮', icon: <QrCode size={20} />, visible: user.role === 'admin' || activeGame?.show_stamps === 1 },
    { id: 'inventory', label: '卡牌库', icon: <Swords size={20} />, visible: user.role === 'admin' || activeGame?.show_cards === 1 },
    { id: 'achievements', label: '积分排行', icon: <Trophy size={20} />, visible: user.role === 'admin' || activeGame?.show_achievements === 1 },
    { id: 'profile', label: '个人中心', icon: <User size={20} />, visible: true }
  ].filter(t => t.visible);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-32">
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-12">
        
        {activeTab === 'home' && (
          <div className="space-y-12 animate-in fade-in duration-500">
             <section className="relative rounded-[3rem] bg-slate-900 p-10 overflow-hidden text-white shadow-2xl">
                <div className="relative z-10 space-y-6">
                   <div className="flex flex-wrap gap-2">
                      <Badge className="bg-indigo-500 text-white font-black px-4 py-1 rounded-full uppercase tracking-widest text-[10px]">Active Season</Badge>
                      <Badge variant="outline" className="text-white border-white/20 font-black px-4 py-1 rounded-full uppercase tracking-widest text-[10px] flex items-center gap-1"><MapPin size={10} /> {activeGame?.location || '郑州现场'}</Badge>
                   </div>
                   <div>
                      <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter leading-none uppercase text-white">Never Give Up<br/><span className="text-indigo-400">4th Edition</span></h1>
                      <div className="mt-4 flex items-center gap-2 text-indigo-300 font-black text-[10px] uppercase tracking-[0.2em] bg-white/5 border border-white/10 w-fit px-3 py-1 rounded-full">
                         <Zap size={10} fill="currentColor" /> {activeGame?.name || 'Official Match Engine'}
                      </div>
                      <p className="text-slate-400 font-medium max-w-md text-sm mt-6 leading-relaxed italic">{activeGame?.description || `欢迎回来, ${user.username}! 准备好加入红蓝对抗了吗？`}</p>
                   </div>
                   <div className="flex gap-4 pt-2">
                      {activeGame?.show_stamps === 1 && (
                         <button onClick={() => setActiveTab('stamps')} className="bg-white text-slate-900 hover:bg-indigo-500 hover:text-white px-8 py-4 rounded-2xl font-black uppercase italic tracking-tighter transition-all shadow-xl flex items-center gap-2 group">
                            <QrCode size={18} className="group-hover:rotate-12 transition-transform" /> 立即集邮
                         </button>
                      )}
                      {user.role === 'admin' && (<a href="/admin" className="border-2 border-white/10 hover:bg-white/5 text-white px-8 py-4 rounded-2xl font-black uppercase italic tracking-tighter transition-all flex items-center gap-2"><Settings size={18} /> 管理后台</a>)}
                   </div>
                </div>
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl opacity-50 animate-pulse"></div>
                <div className="absolute bottom-[-40px] right-[-20px] opacity-10 rotate-12 scale-150"><Swords size={200} /></div>
             </section>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-sm flex flex-col items-center gap-4 group hover:border-indigo-100 transition-all"><div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner"><BookOpen /></div><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">集邮进度</span><span className="text-2xl font-black text-slate-900 tabular-nums">{stamps.length}</span></div>
                <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-sm flex flex-col items-center gap-4 group hover:border-indigo-100 transition-all"><div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner"><Trophy /></div><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">解锁成就</span><span className="text-2xl font-black text-slate-900 tabular-nums">{achievements.length}</span></div>
                <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-sm flex flex-col items-center gap-4 group hover:border-indigo-100 transition-all"><div className="w-14 h-14 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner"><Zap /></div><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">活跃挑战</span><span className="text-2xl font-black text-slate-900 tabular-nums">{minigames.filter(g=>g.is_joined).length}</span></div>
                <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-sm flex flex-col items-center gap-4 group hover:border-indigo-100 transition-all"><div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner"><Activity /></div><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">系统状态</span><span className="text-2xl font-black text-slate-900">SYNCED</span></div>
             </div>
          </div>
        )}

        {activeTab === 'challenges' && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
             <div className="flex items-center gap-4 px-2">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-100">
                   <Zap size={24} fill="currentColor" />
                </div>
                <div>
                   <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900">支线挑战 HUB</h2>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Minigame Roster</p>
                </div>
             </div>
             <div className="grid grid-cols-1 gap-4">
                {minigames.filter(m => m.status !== 'finished').map(g => (
                   <div key={g.id} className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-xl overflow-hidden group hover:border-purple-200 transition-all p-8 flex flex-col md:flex-row justify-between items-center gap-8">
                      <div className="space-y-3 flex-1">
                         <div className="flex items-center gap-3">
                            <Badge variant={g.status === 'recruiting' ? 'default' : 'outline'} className={g.status === 'recruiting' ? 'bg-green-600 text-white border-transparent' : 'text-orange-500 border-orange-200'}>
                               {g.status === 'recruiting' ? '招募中 RECRUITING' : '进行中 ACTIVE'}
                            </Badge>
                            <h3 className="font-black text-2xl uppercase tracking-tighter text-slate-900">{g.title}</h3>
                         </div>
                         <p className="text-sm font-bold text-slate-400 leading-relaxed italic border-l-4 border-purple-500 pl-4">{g.short_desc}</p>
                         <div className="flex gap-6 mt-4">
                            <div className="flex flex-col"><span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">剩余席位</span><span className="text-lg font-black italic tabular-nums">{g.participant_count} / {g.max_players}</span></div>
                            <div className="flex flex-col"><span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">优胜奖励</span><span className="text-lg font-black italic text-purple-600 uppercase">{g.fake_card_name || '???'}</span></div>
                         </div>
                      </div>
                      <button 
                         disabled={loading || (g.status !== 'recruiting' && !g.is_joined) || (g.participant_count >= g.max_players && !g.is_joined)} 
                         onClick={() => handleJoin(g.id, g.is_joined === 1)} 
                         className={`px-10 py-5 rounded-[1.5rem] font-black text-xs uppercase shadow-2xl transition-all active:scale-95 ${
                            g.is_joined 
                               ? 'bg-slate-900 text-white border-b-4 border-slate-700' 
                               : 'bg-indigo-600 text-white border-b-4 border-indigo-800 hover:bg-indigo-500'
                         } disabled:opacity-30 disabled:grayscale`}
                      >
                         {loading ? 'SYNCING...' : g.is_joined ? '取消报名 LEAVE' : g.participant_count >= g.max_players ? '名额已满 FULL' : '立即报名 JOIN'}
                      </button>
                   </div>
                ))}
                {minigames.filter(m => m.status !== 'finished').length === 0 && (
                   <div className="bg-slate-100/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 py-20 text-center space-y-4">
                      <HelpCircle size={48} className="mx-auto text-slate-300" />
                      <p className="font-black text-slate-400 uppercase italic tracking-widest">目前没有进行中的挑战</p>
                   </div>
                )}
             </div>
          </div>
        )}

        {activeTab === 'stamps' && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
             <div className="flex items-center gap-4 px-2"><div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-lg"><BookOpen size={24} fill="currentColor" /></div><div><h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900">集邮进度追踪</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stamp Collection Hub</p></div></div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-100 shadow-xl flex flex-col items-center gap-6 text-center">
                   <div className="bg-slate-50 p-6 rounded-[2rem] border-4 border-slate-100 shadow-inner group">
                      <div className="w-48 h-48 bg-white p-4 border-4 border-slate-900 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-500 shadow-2xl">
                         <QRCodeSVG value={user.kinde_id} size={160} level="H" />
                      </div>
                   </div>
                   <div className="space-y-2"><p className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.3em]">My Collection Identity</p><h4 className="text-2xl font-black italic uppercase tracking-tighter">{user.username}</h4><p className="text-[10px] font-mono text-slate-300 font-bold uppercase">{user.kinde_id}</p></div>
                   <p className="text-[10px] font-bold text-slate-400 leading-relaxed max-w-[200px]">让 Staff 或其他选手扫描此代码来增加他们的集邮进度。</p>
                </div>
                <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl space-y-6 relative overflow-hidden">
                   <div className="relative z-10 space-y-4">
                      <div className="flex items-center gap-3"><Scan size={20} className="text-indigo-400" /><h3 className="text-xl font-black italic uppercase tracking-widest">扫码录入终端</h3></div>
                      <QRScannerComp onScan={(id) => handleCollectStamp(id)} />
                      <div className="pt-4 flex items-center gap-4 opacity-40"><div className="h-[1px] flex-1 bg-white/20"></div><span className="text-[8px] font-black uppercase tracking-widest text-white">Manual Input</span><div className="h-[1px] flex-1 bg-white/20"></div></div>
                      <div className="flex gap-2"><input value={manualScanId} onChange={(e)=>setManualScanId(e.target.value)} placeholder="KIND_ID..." className="flex-1 bg-white/5 border border-white/10 p-3 rounded-xl text-xs outline-none" /><button onClick={()=>handleCollectStamp(manualScanId)} className="bg-indigo-600 px-4 rounded-xl font-black text-[10px]">GO</button></div>
                   </div>
                   <div className="absolute right-[-40px] bottom-[-40px] opacity-10 rotate-12 pointer-events-none scale-150"><Camera size={200}/></div>
                </div>
             </div>
             <div className="bg-white rounded-[3rem] border-2 border-slate-100 shadow-2xl overflow-hidden">
                <div className="bg-slate-50 p-6 flex justify-between items-center border-b-2 border-slate-100"><h3 className="font-black italic uppercase text-xs tracking-widest flex items-center gap-2"><ShieldCheck size={16} className="text-indigo-600"/> 已采集名录 Collection Log</h3><Badge variant="outline">{stamps.length} ENTRIES</Badge></div>
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">{stamps.map((s, i) => (<div key={i} className="p-6 border-b border-slate-50 flex items-center justify-between hover:bg-slate-50 transition-all group"><div className="flex items-center gap-4"><div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${s.role === 'admin' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}><User size={24}/></div><div><p className="font-black text-sm uppercase text-slate-900">{s.username}</p><p className="text-[9px] font-bold text-slate-400 uppercase italic">{s.role === 'admin' ? 'Official Staff' : 'Registered Player'}</p></div></div><div className="text-right"><p className="text-[10px] font-black text-indigo-400 opacity-60 italic">{new Date(s.created_at).toLocaleDateString()}</p><p className="text-[8px] font-bold text-slate-300 uppercase">Authenticated</p></div></div>))}</div>
             </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4 px-2">
                   <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-lg"><Swords size={24} fill="currentColor" /></div>
                   <div>
                      <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900">战术卡牌库</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Team Assets & Gallery</p>
                   </div>
                </div>
                <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1">
                   <button onClick={() => setInventorySubTab('team')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${inventorySubTab === 'team' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>我的队伍 My Team</button>
                   <button onClick={() => setInventorySubTab('gallery')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${inventorySubTab === 'gallery' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>卡牌图鉴 Gallery</button>
                </div>
             </div>

             {inventorySubTab === 'team' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                   {inventory.map((card, i) => (
                      <div key={i} className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-xl hover:border-indigo-200 transition-all group relative overflow-hidden">
                         <div className={`absolute top-0 right-0 px-6 py-1 rounded-bl-2xl font-black text-[9px] uppercase tracking-widest ${card.type === 'joker' ? 'bg-amber-100 text-amber-600' : 'bg-purple-100 text-purple-600'}`}>{card.type}</div>
                         <h4 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 mb-2">{card.name}</h4>
                         <p className="text-xs font-bold text-slate-400 italic leading-relaxed mb-6">{card.description}</p>
                         <div className="flex gap-4 border-t-2 border-slate-50 pt-4 mt-auto">
                            {card.multiplier && <div className="text-indigo-600 font-black italic text-xl">x{card.multiplier}</div>}
                            {card.exponent_bonus && <div className="text-purple-600 font-black italic text-xl">+{card.exponent_bonus} EXP</div>}
                         </div>
                      </div>
                   ))}
                   {inventory.length === 0 && (
                      <div className="col-span-full py-20 text-center opacity-20 italic font-black uppercase text-2xl tracking-widest">暂无可用卡牌 No Assets Found</div>
                   )}
                </div>
             ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                   {allCards.map((card, i) => (
                      <div key={i} className="bg-white p-6 rounded-3xl border-2 border-slate-100 hover:shadow-lg transition-all flex flex-col">
                         <div className="flex justify-between items-start mb-4">
                            <Badge variant="secondary">{card.type}</Badge>
                            {inventory.find(ic => ic.id === card.id) && <Badge className="bg-green-100 text-green-600 border-none">OWNED</Badge>}
                         </div>
                         <h5 className="font-black text-slate-900 uppercase mb-2">{card.name}</h5>
                         <p className="text-[10px] font-bold text-slate-400 italic leading-snug mb-4">{card.description}</p>
                         <div className="mt-auto flex gap-3 text-[10px] font-black italic">
                            {card.multiplier && <span className="text-indigo-600">x{card.multiplier}</span>}
                            {card.exponent_bonus && <span className="text-purple-600">+{card.exponent_bonus} EXP</span>}
                         </div>
                      </div>
                   ))}
                </div>
             )}
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="space-y-12 animate-in slide-in-from-right-4 duration-500">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4 px-2">
                   <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shadow-lg"><Trophy size={24} fill="currentColor" /></div>
                   <div>
                      <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900">成就与荣誉榜</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Locked Assets & Rankings</p>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-6">
                   <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 px-2"><Star size={14} className="text-amber-500" /> 我的成就 COLLECTION</h3>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {achievements.map(a => (
                         <div key={a.id} className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-xl flex items-center gap-6 group hover:border-amber-200 transition-all">
                            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg border-2 border-amber-100/50">
                               <Star size={24} fill="currentColor" />
                            </div>
                            <div className="space-y-1">
                               <p className="font-black text-lg uppercase text-slate-900 leading-none">{a.name}</p>
                               <p className="text-[9px] font-bold text-slate-400 uppercase italic leading-relaxed mt-1">{a.condition}</p>
                            </div>
                         </div>
                      ))}
                   </div>
                </div>

                <div className="space-y-6">
                   <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 px-2"><Activity size={14} className="text-indigo-500" /> 贡献排行 RANKING</h3>
                   <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-xl overflow-hidden">
                      <div className="max-h-[500px] overflow-y-auto">
                         {rankings.map((r, i) => (
                            <div key={i} className="p-6 border-b border-slate-50 flex items-center justify-between hover:bg-slate-50 transition-all">
                               <div className="flex items-center gap-4">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${i < 3 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>{i + 1}</div>
                                  <div>
                                     <p className="font-black text-sm uppercase text-slate-900">{r.username}</p>
                                     <Badge variant="outline" className={`mt-1 ${r.team === 'red' ? 'text-red-500 border-red-100' : 'text-blue-500 border-blue-100'}`}>{r.team}</Badge>
                                  </div>
                                </div>
                                <div className="text-right">
                                   <p className="text-xl font-black text-slate-900">{r.achievement_count}</p>
                                   <p className="text-[8px] font-bold text-slate-400 uppercase">Achievements</p>
                                </div>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
             <div className="flex items-center gap-4 px-2"><div className="w-12 h-12 bg-slate-200 text-slate-700 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-100"><User size={24} fill="currentColor" /></div><div><h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900">个人身份与报名信息</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identification Bureau</p></div></div>
             <div className="bg-white rounded-[3rem] border-2 border-slate-100 shadow-2xl overflow-hidden"><div className="bg-slate-900 p-8 flex justify-between items-center text-white relative"><div className="space-y-1 relative z-10"><p className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.4em]">Personal Data</p><h3 className="text-4xl font-black italic uppercase tracking-tighter">{user.username}</h3><p className="text-xs font-bold opacity-40 lowercase">{user.email}</p></div><div className="relative z-10 flex gap-2"><Badge variant="outline" className="border-indigo-500/50 text-indigo-400 uppercase">{user.role}</Badge><a href="/api/auth/logout" className="p-3 bg-red-600/20 text-red-500 border border-red-600/30 rounded-xl hover:bg-red-600 hover:text-white transition-all"><LogOut size={16}/></a></div></div><div className="p-8"><RegistrationPage /></div></div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 w-full z-50 px-4 pb-4">
         <div className="max-w-2xl mx-auto bg-slate-900/90 backdrop-blur-xl border border-white/10 p-3 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex justify-between items-center relative overflow-hidden">
            <div className="absolute inset-0 bg-indigo-600/5 opacity-50 animate-pulse"></div>
            {availableTabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`relative flex flex-col items-center gap-1.5 py-2 px-6 rounded-2xl transition-all duration-500 group ${activeTab === tab.id ? 'text-indigo-400 scale-110' : 'text-slate-400 hover:text-white'}`}>
                {activeTab === tab.id && <div className="absolute inset-0 bg-white/5 rounded-2xl animate-in zoom-in-95"></div>}
                <div className={`transition-all duration-500 ${activeTab === tab.id ? 'scale-110 drop-shadow-[0_0_10px_rgba(129,140,248,0.5)]' : 'group-hover:-translate-y-1'}`}>{tab.icon}</div>
                <span className={`font-black text-[9px] uppercase tracking-widest transition-all ${activeTab === tab.id ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-1'}`}>{tab.label}</span>
                {activeTab === tab.id && <div className="absolute bottom-0 w-1.5 h-1.5 bg-indigo-500 rounded-full animate-in fade-in slide-in-from-bottom-2"></div>}
              </button>
            ))}
         </div>
      </div>
    </div>
  );
};
