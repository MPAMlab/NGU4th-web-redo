import React, { useEffect, useState } from 'react';
import { 
  Users, Trophy, Swords, Zap, Settings, Info, Save, Trash2, ArrowUp, ArrowDown, 
  RotateCcw, Plus, Edit, X, LayoutDashboard, Database, Activity, Search, Award, ChevronLeft, PlusCircle, Filter, BookOpen, Star, Eye, EyeOff, Check, Play, Archive, Globe, FileText, QrCode
} from 'lucide-react';
import { UnifiedDateTimePicker } from '@/components/ui/unified-date-time-picker';
import { parse, format } from 'date-fns';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Clock2Icon } from "lucide-react";

interface Achievement {
  id: number;
  name: string;
  condition: string;
  scene: string;
  notes: string;
  trigger_type: string | null;
  trigger_value: string | null;
  is_hidden: number;
}

interface Game {
  id: number;
  name: string;
  status: string;
  created_at: string;
  location: string;
  description: string;
  show_rules: number;
  show_minigames: number;
  show_stamps: number;
  show_achievements: number;
  show_cards: number;
  red_exponent?: number;
  blue_exponent?: number;
}

interface Member {
  kinde_id: string;
  username: string;
  email: string;
  role: string;
  is_registered: number;
  team: string | null;
  team_order: number;
  joker_card_id: number | null;
  joker_name?: string;
  joker_multiplier?: number;
  joker_is_variable?: number;
  joker_description?: string;
}

interface Match {
  id: number;
  red_player_id: string;
  blue_player_id: string;
  red_player_name: string;
  blue_player_name: string;
  order_index: number;
  round_1_status: string;
  round_2_status: string;
}

interface Card {
  id: number;
  name: string;
  type: string;
  multiplier: number;
  exponent_bonus: number;
  is_variable: number;
  description: string;
}

interface InventoryItem {
  id: number;
  card_id: number;
  owner_type: string;
  owner_id: string;
  owner_name: string;
  card_name: string;
  card_type: string;
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

const HAND_TYPES_LIST = [
  '高牌：任意1张牌',
  '对子：2张相同的牌',
  '两对：2张相同的牌+2张相同的牌',
  '三条：3张相同的牌',
  '四条：4张相同的牌',
  '五条：5张相同的牌',
  '葫芦：3张相同的牌+2张相同的牌',
  '同数：大于5张数字相同的牌',
  '顺子：大于等于5张数字连续的牌',
  '控分大师 (私牌和=0)'
];

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'members' | 'achievements' | 'templates' | 'matches' | 'live' | 'library' | 'games' | 'minigames'>('members');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  // ... rest of state
  const [members, setMembers] = useState<Member[]>([]);
  const [userAchievements, setUserAchievements] = useState<any[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [cardLibrary, setCardLibrary] = useState<Card[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [systemState, setSystemState] = useState<any>({});
  const [games, setGames] = useState<Game[]>([]);
  const [minigames, setMinigames] = useState<any[]>([]);
  const [minigameParticipants, setMinigameParticipants] = useState<any[]>([]);
  
  const [applyRedJoker, setApplyRedJoker] = useState(true);
  const [applyBlueJoker, setApplyBlueJoker] = useState(true);
  const [editingCard, setEditingCard] = useState<Partial<Card> | null>(null);
  const [editingTplId, setEditingTplId] = useState<number | null>(null);
  const [editTplForm, setEditTplForm] = useState<Partial<Achievement>>({});
  const [editingMinigame, setEditingMinigame] = useState<any | null>(null);

  const [libraryFilter, setLibraryFilter] = useState<'all' | 'joker' | 'tarot' | 'fake'>('all');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [achRes, regRes, matchRes, cardRes, sysRes, miniRes] = await Promise.all([
        fetch('/api/admin/achievements'),
        fetch('/api/admin/registration'),
        fetch('/api/admin/matches'),
        fetch('/api/admin/cards'),
        fetch('/api/admin/system'),
        fetch('/api/admin/minigames')
      ]);

      // Check for any non-OK responses
      const resources = [
        { name: 'Achievements', res: achRes },
        { name: 'Registration', res: regRes },
        { name: 'Matches', res: matchRes },
        { name: 'Cards', res: cardRes },
        { name: 'System', res: sysRes },
        { name: 'Minigames', res: miniRes }
      ];

      for (const r of resources) {
        if (!r.res.ok) {
           const errData = await r.res.json().catch(() => ({}));
           throw new Error(`[${r.name}] ${errData.error || 'Server Error'} ${errData.message || ''}`);
        }
      }

      const [achData, regData, matchData, cardData, sysData, miniData] = await Promise.all([
        achRes.json(), regRes.json(), matchRes.json(), cardRes.json(), sysRes.json(), miniRes.json()
      ]);

      setAchievements(achData.templates || []);
      setUserAchievements(achData.userAchievements || []);
      
      const library = cardData.library || [];
      const enrichedMembers = (regData as Member[] || []).map(m => {
         const joker = library.find((c: any) => c.id === m.joker_card_id);
         return { ...m, joker_name: joker?.name, joker_description: joker?.description, joker_multiplier: joker?.multiplier, joker_is_variable: joker?.is_variable };
      });
      setMembers(enrichedMembers.sort((a, b) => a.team_order - b.team_order));
      setMatches(matchData || []);
      setCardLibrary(library);
      setInventory(cardData.inventory || []);
      setSystemState(sysData.config || {});
      setGames(sysData.games || []);
      setMinigames(miniData.games || []);
      setMinigameParticipants(miniData.participants || []);
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const switchTab = (tab: any) => { setActiveTab(tab); fetchData(true); };

  const handleMinigameAction = async (action: string, payload: any) => {
    const res = await fetch('/api/admin/minigames', { 
       method: 'POST', 
       headers: { 'Content-Type': 'application/json' }, 
       body: JSON.stringify({ action, ...payload }) 
    });
    if (res.ok) { setEditingMinigame(null); fetchData(true); }
  };

  const handleAchievementAction = async (action: string, payload: any) => {
    await fetch('/api/admin/achievements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }) });
    setEditingTplId(null);
    fetchData(true);
  };

  const handleMemberAction = async (targetKindeId: string, action: string, value: any) => {
    await fetch('/api/admin/registration', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetKindeId, action, team: action === 'set_team' ? value : undefined, jokerCardId: action === 'set_joker' ? value : undefined }) });
    fetchData(true);
  };

  const handleReorder = async (kindeId: string, direction: 'up' | 'down') => {
    const targetMember = members.find(m => m.kinde_id === kindeId);
    const teamMembers = members.filter(m => m.team === targetMember?.team && m.is_registered === 1);
    const index = teamMembers.findIndex(m => m.kinde_id === kindeId);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === teamMembers.length - 1)) return;
    const newOrder = [...teamMembers];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    [newOrder[index], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[index]];
    const mapping = newOrder.map((m, i) => ({ id: m.kinde_id, order: i }));
    await fetch('/api/admin/registration', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reorder', mapping }) });
    fetchData(true);
  };

  const handleCardCRUD = async (action: string, payload: any) => {
    const res = await fetch('/api/admin/cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }) });
    if (res.ok) { setEditingCard(null); fetchData(true); }
  };

  const handleCreateMatch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const redPlayerId = formData.get('red') as string;
    const bluePlayerId = formData.get('blue') as string;
    if (!redPlayerId || !bluePlayerId) return;
    await fetch('/api/admin/matches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', redPlayerId, bluePlayerId, orderIndex: matches.length }) });
    fetchData(true);
  };

  const handleSetActiveMatch = async (matchId: string | null) => {
    await fetch('/api/admin/system', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'active_match_id', value: matchId }) });
    fetchData(true);
  };

  const handleUpdateGameSettings = async (e: React.FormEvent<HTMLFormElement>, gameId: number) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const settings = {
      location: fd.get('location'),
      description: fd.get('description'),
      show_rules: fd.get('show_rules') === 'on' ? 1 : 0,
      show_minigames: fd.get('show_minigames') === 'on' ? 1 : 0,
      show_stamps: fd.get('show_stamps') === 'on' ? 1 : 0,
      show_achievements: fd.get('show_achievements') === 'on' ? 1 : 0,
      show_cards: fd.get('show_cards') === 'on' ? 1 : 0,
      red_exponent: parseFloat(fd.get('red_exponent') as string) || 1.0,
      blue_exponent: parseFloat(fd.get('blue_exponent') as string) || 1.0,
    };
    await fetch('/api/admin/system', { 
       method: 'POST', 
       headers: {'Content-Type':'application/json'}, 
       body: JSON.stringify({ action: 'update_settings', gameId, settings }) 
    });
    alert("全局配置已生效");
    fetchData(true);
  };

  const handleCommitRound = async (e: React.FormEvent<HTMLFormElement>, roundType: 'red_pick' | 'blue_pick') => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      matchId: systemState.active_match_id, roundType,
      redData: {
        baseScore: formData.get('red_base'), multiplier: applyRedJoker ? formData.get('red_mult') : 1.0,
        tarotId: formData.get('red_tarot'), hand: formData.get('red_hand'),
        fakeCards: Array.from(formData.getAll('red_fake_cards')).join(',')
      },
      blueData: {
        baseScore: formData.get('blue_base'), multiplier: applyBlueJoker ? formData.get('blue_mult') : 1.0,
        tarotId: formData.get('blue_tarot'), hand: formData.get('blue_hand'),
        fakeCards: Array.from(formData.getAll('blue_fake_cards')).join(',')
      }
    };
    const res = await fetch('/api/admin/scoring', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) { alert("存档成功"); fetchData(true); }
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-50 font-black text-indigo-600 animate-pulse tracking-widest uppercase text-xs">NGU4th COMMAND ENGINE INITIALIZING...</div>;

  const activeMatch = matches.find(m => m.id.toString() === systemState.active_match_id);
  const activeGame = games.find(g => g.status === 'active');
  const redPlayer = members.find(m => m.kinde_id === activeMatch?.red_player_id);
  const bluePlayer = members.find(m => m.kinde_id === activeMatch?.blue_player_id);
  const redTeamFakeCards = Array.from(new Map(inventory.filter(i => i.owner_id === 'red' && i.card_type === 'fake').map(item => [item.card_id, item])).values());
  const blueTeamFakeCards = Array.from(new Map(inventory.filter(i => i.owner_id === 'blue' && i.card_type === 'fake').map(item => [item.card_id, item])).values());
  const filteredLibrary = cardLibrary.filter(c => libraryFilter === 'all' || c.type === libraryFilter);
  const targetMember = members.find(m => m.kinde_id === selectedUser);
  const earnedAchs = userAchievements.filter(ua => ua.kinde_id === selectedUser);

  const inputClass = "w-full bg-white p-2 rounded-lg font-bold border border-slate-200 focus:border-indigo-600 transition-all outline-none text-xs";
  const selectClass = "w-full bg-white p-2 rounded-lg font-black border border-slate-200 focus:border-indigo-600 outline-none cursor-pointer text-xs";

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4 pb-32">
      <header className="flex justify-between items-center bg-slate-900 p-4 px-6 rounded-2xl text-white shadow-lg">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg"><LayoutDashboard size={20} /></div>
           <div><h1 className="text-xl font-black tracking-tighter uppercase italic leading-none">NGU4th Admin</h1><p className="text-[8px] font-bold opacity-40 uppercase tracking-widest">Global Ops v9.9</p></div>
        </div>
        <div className="flex gap-2">
          <a href="/live" target="_blank" className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-black text-[9px] uppercase transition-all flex items-center gap-2 italic tracking-wider border border-white/5"><Activity size={12} /> Live View</a>
          <a href="/dashboard" className="bg-slate-800 hover:bg-black text-white px-4 py-2 rounded-lg font-black text-[9px] uppercase transition-all flex items-center gap-2 border border-white/5">Dashboard</a>
        </div>
      </header>

      <nav className="flex gap-1 bg-slate-200/50 p-1 rounded-xl w-fit border border-slate-200">
        {(['members', 'achievements', 'templates', 'matches', 'live', 'library', 'minigames', 'games'] as const).map(tab => (
          <button key={tab} onClick={() => switchTab(tab)} className={`px-4 py-1.5 rounded-lg font-black transition-all whitespace-nowrap uppercase tracking-tighter text-[9px] ${activeTab === tab ? 'bg-white shadow-sm text-indigo-600 border border-indigo-100' : 'text-slate-500 hover:text-slate-800'}`}>
            {tab === 'members' ? '选手' : tab === 'achievements' ? '发放' : tab === 'templates' ? '成就库' : tab === 'matches' ? '赛程' : tab === 'live' ? '计分' : tab === 'library' ? '牌库' : tab === 'minigames' ? '小游戏' : '全局管理'}
          </button>
        ))}
      </nav>

      {/* Tab: Minigames Management */}
      {activeTab === 'minigames' && (
         <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
               <div className="flex flex-col"><h3 className="font-black italic uppercase text-[10px] tracking-widest text-slate-400">Minigame Coordinator</h3><p className="text-[11px] font-bold text-slate-800">小游戏发布与胜场结算</p></div>
               <button onClick={()=>setEditingMinigame({ status: 'recruiting', max_players: 8 })} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-black uppercase text-[10px] italic shadow-lg hover:scale-105 transition-all flex items-center gap-2"><Plus size={14}/> 发布新挑战 NEW EVENT</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {minigames.map(g => (
                  <div key={g.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                     <div className={`p-4 ${g.status === 'active' ? 'bg-indigo-600' : g.status === 'finished' ? 'bg-slate-900' : 'bg-slate-100'} text-white transition-colors`}>
                        <div className="flex justify-between items-start mb-2">
                           <Badge variant="outline" className="border-white/20 text-white">{g.status}</Badge>
                           <span className="text-[9px] font-black opacity-40 uppercase">{g.start_date} {g.start_time}</span>
                        </div>
                        <h4 className={`text-lg font-black italic uppercase leading-tight ${g.status === 'recruiting' ? 'text-slate-900' : 'text-white'}`}>{g.title}</h4>
                     </div>
                     <div className="p-4 flex-1 space-y-4">
                        <p className="text-[10px] font-bold text-slate-400 line-clamp-2 italic">{g.short_desc}</p>
                        <div className="flex items-center gap-4 border-y py-3 border-slate-50">
                           <div className="flex-1"><p className="text-[8px] font-black uppercase text-slate-400 mb-1 tracking-widest">Participants</p><p className="font-black text-xs italic">{g.participant_count} / {g.max_players}</p></div>
                           <div className="flex-1"><p className="text-[8px] font-black uppercase text-slate-400 mb-1 tracking-widest">Reward Card</p><p className="font-black text-xs italic text-emerald-600">{g.fake_card_name || 'None'}</p></div>
                        </div>
                        {g.status === 'finished' && (
                           <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 flex items-center gap-3">
                              <Trophy size={16} className="text-indigo-600" />
                              <div className="flex-1"><p className="text-[8px] font-black uppercase text-indigo-400">Winner</p><p className="font-black text-xs uppercase text-indigo-900">{g.winner_name || 'Undisclosed'}</p></div>
                           </div>
                        )}
                     </div>
                     <div className="p-4 bg-slate-50 border-t flex gap-2">
                        {g.status === 'recruiting' && <button onClick={()=>handleMinigameAction('start', { id: g.id })} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-black uppercase text-[9px] italic shadow-md">Start Recruiting</button>}
                        {g.status === 'active' && <button onClick={()=>setEditingMinigame({...g, showFinish: true})} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-black uppercase text-[9px] italic shadow-md">Complete & Reward</button>}
                        <button onClick={()=>setEditingMinigame(g)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit size={14}/></button>
                        <button onClick={()=>{if(confirm('Delete?')) handleMinigameAction('delete', { id: g.id })}} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
                     </div>
                  </div>
               ))}
            </div>

            {editingMinigame && (
               <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
                  <div className="bg-white p-8 rounded-3xl border border-indigo-600 shadow-2xl max-w-lg w-full space-y-6 animate-in zoom-in-95 max-h-[90vh] overflow-auto">
                     <h3 className="font-black italic uppercase text-[10px] tracking-[0.2em] text-slate-400">
                        {editingMinigame.showFinish ? "SELECT CHAMPION & FINALIZE" : (editingMinigame.id ? "MODIFY MINIGAME" : "CREATE NEW CHALLENGE")}
                     </h3>
                     
                     {editingMinigame.showFinish ? (
                        <div className="space-y-6">
                           <div className="space-y-2">
                              <label className="text-[8px] font-black uppercase text-slate-400">Choose Winner from Participants</label>
                              <div className="grid grid-cols-1 gap-2">
                                 {minigameParticipants.filter(p => p.minigame_id === editingMinigame.id).map(p => (
                                    <button key={p.user_id} onClick={()=>handleMinigameAction('finish', { id: editingMinigame.id, winner_id: p.user_id })} className="flex items-center justify-between p-4 bg-slate-50 border-2 border-transparent hover:border-indigo-600 rounded-2xl group transition-all">
                                       <div className="flex flex-col items-start"><span className="font-black text-xs uppercase">{p.username}</span><Badge variant={p.team === 'red' ? 'default' : 'secondary'}>{p.team}</Badge></div>
                                       <Trophy size={16} className="text-slate-200 group-hover:text-indigo-600" />
                                    </button>
                                 ))}
                                 {minigameParticipants.filter(p => p.minigame_id === editingMinigame.id).length === 0 && (
                                    <p className="text-center py-8 text-xs font-bold text-slate-300 italic">No one joined this event.</p>
                                 )}
                                 <button onClick={()=>handleMinigameAction('finish', { id: editingMinigame.id, winner_id: null })} className="w-full py-3 text-[9px] font-black uppercase text-slate-400 border border-dashed rounded-xl mt-4">Close without winner</button>
                              </div>
                           </div>
                           <button onClick={()=>setEditingMinigame(null)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[9px]">Cancel</button>
                        </div>
                     ) : (
                        <form onSubmit={(e)=>{
                           e.preventDefault();
                           const fd = new FormData(e.currentTarget);
                           handleMinigameAction(editingMinigame.id ? 'update' : 'create', {
                              id: editingMinigame.id,
                              title: fd.get('title'),
                              short_desc: fd.get('short_desc'),
                              detailed_desc: fd.get('detailed_desc'),
                              start_date: editingMinigame.start_date,
                              start_time: editingMinigame.start_time,
                              max_players: parseInt(fd.get('max_players') as string),
                              fake_card_id: fd.get('fake_card_id') || null,
                              achievement_id: fd.get('achievement_id') || null
                           });
                        }} className="space-y-4">
                           <div className="space-y-1">
                              <label className="text-[8px] font-black uppercase text-slate-400">挑战名称 & 简介</label>
                              <input name="title" defaultValue={editingMinigame.title} required placeholder="挑战名称 (e.g. 五星)" className={inputClass} />
                              <input name="short_desc" defaultValue={editingMinigame.short_desc} required placeholder="一句话简介" className={inputClass} />
                           </div>
                           <textarea name="detailed_desc" defaultValue={editingMinigame.detailed_desc} placeholder="详细规则说明..." className={inputClass + " h-24 resize-none"} />
                           
                           <UnifiedDateTimePicker 
                              date={editingMinigame.start_date ? parse(editingMinigame.start_date, 'yyyy-MM-dd', new Date()) : undefined}
                              setDate={(d) => setEditingMinigame({ ...editingMinigame, start_date: d ? format(d, 'yyyy-MM-dd') : '' })}
                              time={editingMinigame.start_time || "12:00"}
                              setTime={(t) => setEditingMinigame({ ...editingMinigame, start_time: t })}
                              placeholder="开始时间 / START TIME"
                           />

                           <div className="space-y-1"><label className="text-[8px] font-black uppercase text-slate-400">人数限制</label><input name="max_players" type="number" defaultValue={editingMinigame.max_players || 8} className={inputClass} /></div>
                           <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1"><label className="text-[8px] font-black uppercase text-slate-400">奖励假卡</label>
                                 <select name="fake_card_id" defaultValue={editingMinigame.fake_card_id || ""} className={selectClass}>
                                    <option value="">(None)</option>
                                    {cardLibrary.filter(c => c.type === 'fake').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                 </select>
                              </div>
                              <div className="space-y-1"><label className="text-[8px] font-black uppercase text-slate-400">关联成就</label>
                                 <select name="achievement_id" defaultValue={editingMinigame.achievement_id || ""} className={selectClass}>
                                    <option value="">(None)</option>
                                    {achievements.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                 </select>
                              </div>
                           </div>
                           <div className="flex gap-2 pt-2"><button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black uppercase text-[10px] shadow-lg">Save Event</button><button type="button" onClick={()=>setEditingMinigame(null)} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-black uppercase text-[10px]">Cancel</button></div>
                        </form>
                     )}
                  </div>
               </div>
            )}
         </div>
      )}

      {/* Tab: Games & Global Settings */}
      {activeTab === 'games' && (
        <div className="space-y-4 animate-in fade-in duration-300">
           {activeGame && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl space-y-6">
                 <div className="flex items-center gap-3 border-b pb-4 border-slate-100">
                    <Settings className="text-indigo-600" size={20} />
                    <h3 className="font-black italic uppercase text-xs tracking-widest">Active Game Global Settings - {activeGame.name}</h3>
                 </div>
                 <form onSubmit={(e)=>handleUpdateGameSettings(e, activeGame.id)} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <div className="space-y-1"><label className="text-[8px] font-black uppercase text-slate-400">现场地点 (Location)</label><input name="location" defaultValue={activeGame.location} className={inputClass} /></div>
                       <div className="space-y-1"><label className="text-[8px] font-black uppercase text-slate-400">活动简介 (Description)</label><textarea name="description" defaultValue={activeGame.description} className={inputClass + " h-32 resize-none"} /></div>
                       <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                          <div className="space-y-1"><label className="text-[8px] font-black uppercase text-red-500">红队基础指数 (Red EXP)</label><input name="red_exponent" type="number" step="0.01" defaultValue={(activeGame as any).red_exponent || 1.0} className={inputClass} /></div>
                          <div className="space-y-1"><label className="text-[8px] font-black uppercase text-blue-500">蓝队基础指数 (Blue EXP)</label><input name="blue_exponent" type="number" step="0.01" defaultValue={(activeGame as any).blue_exponent || 1.0} className={inputClass} /></div>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <label className="text-[8px] font-black uppercase text-slate-400">模块可见性 (Visibility)</label>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                             { id: 'show_rules', label: '显示计分规则', icon: <Swords size={14}/> },
                             { id: 'show_minigames', label: '显示小游戏入口', icon: <Zap size={14}/> },
                             { id: 'show_stamps', label: '显示集邮系统', icon: <QrCode size={14}/> },
                             { id: 'show_achievements', label: '显示成就系统', icon: <Award size={14}/> },
                             { id: 'show_cards', label: '显示牌库链接', icon: <BookOpen size={14}/> }
                          ].map(item => (
                             <label key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100">
                                <div className="flex items-center gap-2"><span className="text-slate-400">{item.icon}</span><span className="text-[10px] font-black uppercase">{item.label}</span></div>
                                <input type="checkbox" name={item.id} defaultChecked={(activeGame as any)[item.id] === 1} className="w-4 h-4 accent-indigo-600" />
                             </label>
                          ))}
                       </div>
                       <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-black uppercase text-[10px] shadow-xl hover:bg-black mt-2">更新并应用全局配置 APPLY CONFIG</button>
                    </div>
                 </form>
              </div>
           )}

           <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                 <h3 className="font-black italic uppercase text-[10px] tracking-widest text-slate-400 flex items-center gap-2"><PlusCircle size={12}/> 开启新一轮游戏</h3>
                 <p className="text-[9px] font-bold text-slate-400 leading-tight">警告：开启新一轮将强制存档当前活动，并重置所有选手的报名状态、分队和出场顺序。</p>
                 <form onSubmit={async (e)=>{e.preventDefault(); if(!confirm('确定开启新轮次？所有选手需重新报名，比赛列表将清空。')) return; const name = new FormData(e.currentTarget).get('name'); await fetch('/api/admin/system', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ action: 'create_game', name }) }); fetchData(true); (e.target as any).reset();}} className="space-y-3">
                    <input name="name" required placeholder="游戏名称 (e.g. Phase 2)" className={inputClass} />
                    <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-black uppercase text-[9px] shadow-lg italic">ARCHIVE & CREATE</button>
                 </form>

                 <div className="pt-4 border-t border-slate-100">
                    <h3 className="font-black italic uppercase text-[10px] tracking-widest text-red-500 flex items-center gap-2 mb-3"><RotateCcw size={12}/> 危险区域 DANGER</h3>
                    <button 
                       onClick={async () => {
                          if(confirm('警告：这将删除所有玩家的非基础成就记录（保留引继和报名礼包）。此操作不可逆，确定继续？')) {
                             await fetch('/api/admin/system', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ action: 'reset_all_achievements' }) });
                             fetchData(true);
                             alert('成就数据已清理');
                          }
                       }}
                       className="w-full py-2 border-2 border-red-100 text-red-500 rounded-xl font-black uppercase text-[8px] hover:bg-red-500 hover:text-white transition-all"
                    >
                       重置全服成就 (保留特殊项)
                    </button>
                 </div>
              </div>
              <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                 <div className="bg-slate-50 p-3 border-b font-black text-[9px] uppercase tracking-widest text-slate-400">Game Archive Records</div>
                 <table className="w-full text-left text-xs"><thead className="bg-slate-50 font-black border-b text-slate-400"><tr><th className="p-3">轮次名称</th><th className="p-3 text-center">状态</th><th className="p-3">创建时间</th><th className="p-3 text-right">Ops</th></tr></thead><tbody className="divide-y divide-slate-100">{games.map(g => (<tr key={g.id} className="hover:bg-slate-50"><td className="p-3 font-black uppercase text-indigo-600">{g.name}</td><td className="p-3 text-center"><Badge variant={g.status === 'active' ? 'default' : 'secondary'}>{g.status}</Badge></td><td className="p-3 text-slate-400 font-mono text-[9px]">{new Date(g.created_at).toLocaleString()}</td><td className="p-3 text-right"><button onClick={async ()=>{if(confirm('Archive?')) {await fetch('/api/admin/system', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ action: 'archive_game', gameId: g.id }) }); fetchData(true);}}} className="p-1 text-slate-400 hover:text-indigo-600"><Archive size={14}/></button></td></tr>))}</tbody></table>
              </div>
           </div>
        </div>
      )}

      {/* Tab: Members (Stay list) */}
      {activeTab === 'members' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['red', 'blue'].map(team => (
              <div key={team} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className={`p-3 px-4 ${team === 'red' ? 'bg-red-600' : 'bg-blue-600'} text-white flex justify-between items-center`}><h3 className="font-black italic uppercase tracking-widest text-[10px]">{team} Team Sequence</h3><button onClick={()=>{fetch('/api/admin/cards',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'random_joker'})}).then(()=>fetchData(true))}} className="bg-white/10 hover:bg-white/20 p-1 px-2 rounded font-black text-[8px] uppercase border border-white/20">Shuffle Jokers</button></div>
                <div className="p-2 space-y-1">
                  {members.filter(m => m.team === team && m.is_registered === 1).map((m, i) => (
                    <div key={m.kinde_id} className="bg-slate-50 p-3 rounded-xl border border-transparent hover:border-indigo-100 hover:bg-white transition-all group flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <span className="text-lg font-black italic text-slate-200 tabular-nums">#{i + 1}</span>
                            <div className="flex-1 font-black text-xs text-slate-800 uppercase truncate">{m.username}</div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                              <button onClick={() => handleReorder(m.kinde_id, 'up')} className="bg-white p-1 rounded border border-slate-200 hover:bg-indigo-600 hover:text-white"><ArrowUp size={10} /></button>
                              <button onClick={() => handleReorder(m.kinde_id, 'down')} className="bg-white p-1 rounded border border-slate-200 hover:bg-indigo-600 hover:text-white"><ArrowDown size={10} /></button>
                              <button onClick={() => handleMemberAction(m.kinde_id, 'set_team', team === 'red' ? 'blue' : 'red')} className="bg-white px-2 rounded border border-orange-200 text-orange-600 font-black text-[8px] uppercase hover:bg-orange-500 hover:text-white">Swap</button>
                              <button onClick={() => {if(confirm(`确定取消 ${m.username} 的报名？`)) handleMemberAction(m.kinde_id, 'remove_registration', null)}} className="bg-white p-1 rounded border border-red-200 text-red-400 hover:bg-red-600 hover:text-white"><Trash2 size={10} /></button>
                            </div>
                        </div>
                        
                        {/* Joker Assignment Row */}
                        <div className="flex items-center gap-2 pl-8">
                           <Zap size={10} className={m.joker_card_id ? "text-amber-500" : "text-slate-300"} />
                           <select 
                              value={m.joker_card_id || ""} 
                              onChange={(e) => handleMemberAction(m.kinde_id, 'set_joker', e.target.value === "" ? null : parseInt(e.target.value))}
                              className="bg-transparent border-none text-[9px] font-bold text-slate-500 hover:text-indigo-600 outline-none cursor-pointer p-0"
                           >
                              <option value="">(No Joker Card)</option>
                              {cardLibrary.filter(c => c.type === 'joker').map(j => (
                                 <option key={j.id} value={j.id}>{j.name} (x{j.multiplier}{j.is_variable ? ' var' : ''})</option>
                              ))}
                           </select>
                        </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="bg-slate-50 p-3 px-4 border-b font-black text-[9px] uppercase tracking-widest text-slate-400">Master Roster</div>
             <table className="w-full text-left text-xs"><tbody className="divide-y divide-slate-100">{members.map(m => (<tr key={m.kinde_id} className="hover:bg-slate-50"><td className="p-3 font-black text-[11px]">{m.username}<span className="ml-2 opacity-30 font-bold lowercase text-[9px]">{m.email}</span></td><td className="p-3 text-center">{m.is_registered ? <Badge variant={m.team==='red'?'default':'secondary'}>{m.team}</Badge> : <span className="opacity-20 italic text-[9px]">Reserved</span>}</td><td className="p-3 text-right"><div className="flex justify-end gap-1"><button onClick={() => handleMemberAction(m.kinde_id, 'set_team', 'red')} className="px-2 py-1 bg-red-50 text-red-600 border border-red-100 rounded font-black hover:bg-red-600 hover:text-white text-[8px] uppercase">To Red</button><button onClick={() => handleMemberAction(m.kinde_id, 'set_team', 'blue')} className="px-2 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded font-black hover:bg-blue-600 hover:text-white text-[8px] uppercase">To Blue</button>{m.is_registered === 1 && <button onClick={() => {if(confirm(`确定取消 ${m.username} 的报名？`)) handleMemberAction(m.kinde_id, 'remove_registration', null)}} className="px-2 py-1 bg-slate-100 text-slate-400 border border-slate-200 rounded font-black hover:bg-red-600 hover:text-white text-[8px] uppercase">Remove</button>}</div></td></tr>))}</tbody></table>
          </div>
        </div>
      )}

      {/* Tab: Achievement Templates */}
      {activeTab === 'templates' && (
         <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
               <div className="flex flex-col"><h3 className="font-black italic uppercase text-[10px] tracking-widest text-slate-400">Template Engine</h3><p className="text-[11px] font-bold text-slate-800">成就模板库与触发逻辑定义</p></div>
               <button onClick={()=>handleAchievementAction('create_template', { name: '新成就', condition: '达成条件', scene: '场景', notes: '', trigger_type: null, trigger_value: null, is_hidden: 0 })} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-black uppercase text-[10px] italic shadow-lg hover:scale-105 transition-all flex items-center gap-2"><Plus size={14}/> 新建成就在线定义</button>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <table className="w-full text-left text-xs"><thead className="bg-slate-50 font-black border-b sticky top-0 z-10 text-slate-400 uppercase tracking-widest"><tr><th className="p-4">名称 / 条件</th><th className="p-4">隐藏</th><th className="p-4">自动触发逻辑 (HOOKS)</th><th className="p-4 text-right">Ops</th></tr></thead><tbody className="divide-y divide-slate-100">{achievements.map(tpl => {const isEditing = editingTplId === tpl.id; return (<tr key={tpl.id} className={isEditing ? "bg-indigo-50/50 transition-colors" : "hover:bg-slate-50"}><td className="p-4">{isEditing ? (<div className="space-y-2 w-[240px]"><input value={editTplForm.name} onChange={e=>setEditTplForm({...editTplForm, name: e.target.value})} className={inputClass} placeholder="名称" /><input value={editTplForm.condition || ''} onChange={e=>setEditTplForm({...editTplForm, condition: e.target.value})} className={inputClass + " text-[10px]"} placeholder="条件描述" /></div>) : (<div className="flex flex-col"><span className="font-black text-[11px] uppercase text-indigo-600">{tpl.name}</span><span className="opacity-40 italic font-bold text-[9px] truncate max-w-[240px]">{tpl.condition}</span></div>)}</td><td className="p-4">{isEditing ? (<input type="checkbox" checked={editTplForm.is_hidden === 1} onChange={e=>setEditTplForm({...editTplForm, is_hidden: e.target.checked?1:0})} className="w-4 h-4 accent-indigo-600" />) : (tpl.is_hidden === 1 ? <EyeOff size={14} className="text-amber-500" /> : <Eye size={14} className="opacity-20" />)}</td><td className="p-4">{isEditing ? (<div className="flex gap-2 w-[350px]">
                   <select value={editTplForm.trigger_type || "manual"} onChange={e=>setEditTplForm({...editTplForm, trigger_type: e.target.value === 'manual' ? null : e.target.value, trigger_value: ''})} className={selectClass + " w-1/3"}>
                      <option value="manual">手动授权</option>
                      <option value="registration">完成报名</option>
                      <option value="legacy">NGU3rd引继</option>
                      <option value="team_join">加入队伍</option>
                      <option value="role_eq">身份等于</option>
                      <option value="score_ge">单轮总分 {'>'}= n</option>
                      <option value="base_score_ge">单轮基础分 {'>'}= n</option>
                      <option value="contribution_ge">最终贡献 {'>'}= n</option>
                      <option value="poker_hand_eq">私牌牌型等于</option>
                      <option value="joker_used">使用了小丑牌</option>
                      <option value="tarot_used">使用了塔罗牌</option>
                      <option value="any_fake_card_used">使用了任意假卡</option>
                      <option value="stamp_count">集邮数 {'>'}= n</option>
                      <option value="staff_stamp_count">Staff集邮数 {'>'}= n</option>
                      <option value="special_scannee">和特定人集邮</option>
                      <option value="minigame_win">赢得小游戏</option>
                      <option value="qr_text">文本扫码</option>
                   </select>
                   {editTplForm.trigger_type === 'team_join' ? (
                      <select value={editTplForm.trigger_value || ''} onChange={e=>setEditTplForm({...editTplForm, trigger_value: e.target.value})} className={selectClass + " w-2/3"}>
                         <option value="">选择队伍...</option>
                         <option value="red">红队 RED</option>
                         <option value="blue">蓝队 BLUE</option>
                         <option value="any">任意队伍 ANY</option>
                      </select>
                   ) : editTplForm.trigger_type === 'poker_hand_eq' ? (
                      <select value={editTplForm.trigger_value || ''} onChange={e=>setEditTplForm({...editTplForm, trigger_value: e.target.value})} className={selectClass + " w-2/3"}>
                         <option value="">选择牌型...</option>
                         {HAND_TYPES_LIST.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                   ) : (editTplForm.trigger_type === 'legacy' || editTplForm.trigger_type === 'registration') ? (
                      <div className="w-2/3 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-[8px] font-black text-slate-300 uppercase italic">Auto-Trigger Only</div>
                   ) : editTplForm.trigger_type === 'special_scannee' ? (
                      <select value={editTplForm.trigger_value || ''} onChange={e=>setEditTplForm({...editTplForm, trigger_value: e.target.value})} className={selectClass + " w-2/3"}>
                         <option value="">选择选手/Staff...</option>
                         {members.map(m => <option key={m.kinde_id} value={m.kinde_id}>{m.username} ({m.role})</option>)}
                      </select>
                   ) : editTplForm.trigger_type === 'role_eq' ? (
                      <select value={editTplForm.trigger_value || ''} onChange={e=>setEditTplForm({...editTplForm, trigger_value: e.target.value})} className={selectClass + " w-2/3"}>
                         <option value="user">User</option>
                         <option value="admin">Admin / Staff</option>
                      </select>
                   ) : editTplForm.trigger_type === 'minigame_win' ? (
                      <input value={editTplForm.trigger_value || ''} onChange={e=>setEditTplForm({...editTplForm, trigger_value: e.target.value})} className={inputClass + " w-2/3"} placeholder="小游戏ID (可选)" />
                   ) : editTplForm.trigger_type ? (
                      <input value={editTplForm.trigger_value || ''} onChange={e=>setEditTplForm({...editTplForm, trigger_value: e.target.value})} className={inputClass + " w-2/3"} placeholder="触发值 (n / text)" />
                   ) : null}
                </div>) : (tpl.trigger_type ? <Badge variant="outline">{tpl.trigger_type}: {tpl.trigger_value}</Badge> : <span className="opacity-20 font-black italic tracking-widest text-[9px]">MANUAL</span>)}</td><td className="p-4 text-right">{isEditing ? (<div className="flex justify-end gap-1"><button onClick={()=>handleAchievementAction('update_template', { ...editTplForm, achievementId: tpl.id })} className="p-2 bg-indigo-600 text-white rounded-lg shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"><Check size={14}/></button><button onClick={()=>setEditingTplId(null)} className="p-2 bg-slate-200 text-slate-600 rounded-lg"><X size={14}/></button></div>) : (<div className="flex justify-end gap-1"><button onClick={()=>{ setEditingTplId(tpl.id); setEditTplForm(tpl); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit size={14}/></button><button onClick={()=>{if(confirm('Delete?')) handleAchievementAction('delete_template', { achievementId: tpl.id })}} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button></div>)}</td></tr>);})}</tbody></table>
            </div>
         </div>
      )}

      {/* Tab: Achievements Distribution */}
      {activeTab === 'achievements' && (
         <div className="space-y-4 animate-in fade-in duration-300">
            {!selectedUser ? (
               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                  <div className="font-black text-[10px] uppercase tracking-widest text-slate-400">Select Operative for Authorization</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">{members.map(m=>(<button key={m.kinde_id} onClick={()=>setSelectedUser(m.kinde_id)} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center gap-2 hover:border-indigo-600 hover:bg-white transition-all group active:scale-95"><div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-300 group-hover:text-indigo-600 transition-colors shadow-sm"><Users size={14}/></div><span className="font-black text-[8px] uppercase truncate w-full text-center">{m.username}</span></button>))}</div>
               </div>
            ) : (
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 animate-in slide-in-from-right-2">
                  <div className="lg:col-span-12 flex justify-between items-center bg-slate-900 p-4 px-6 rounded-xl text-white">
                     <div className="flex items-center gap-4"><div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center"><Users size={20}/></div><div><h2 className="text-lg font-black uppercase italic leading-none">{targetMember?.username}</h2><p className="text-[8px] font-bold opacity-30 mt-1 uppercase">{targetMember?.kinde_id}</p></div></div>
                     <button onClick={()=>setSelectedUser(null)} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg font-black text-[9px] uppercase transition-all flex items-center gap-2 italic border border-white/10"><ChevronLeft size={12}/> Back to Hub</button>
                  </div>
                  <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"><div className="bg-slate-50 p-3 border-b font-black text-[9px] uppercase tracking-widest text-slate-400">Grant Permissions</div><div className="overflow-auto max-h-[500px]"><table className="w-full text-left text-xs"><tbody className="divide-y divide-slate-100">{achievements.map(tpl=>{ const earned=userAchievements.some(ua=>ua.kinde_id===selectedUser && ua.achievement_id===tpl.id); return(<tr key={tpl.id} className="hover:bg-slate-50 transition-all group"><td className="p-3"><div className="flex flex-col"><span className="font-black text-[11px] uppercase">{tpl.name}</span><span className="opacity-40 italic font-bold text-[8px] uppercase truncate max-w-[300px]">{tpl.condition}</span></div></td><td className="p-3 text-right"><button disabled={earned} onClick={()=>handleAchievementAction('grant',{targetKindeId:selectedUser,achievementId:tpl.id})} className={`px-4 py-1.5 rounded-lg font-black text-[8px] uppercase transition-all ${earned?'bg-slate-50 text-slate-300':'bg-indigo-600 text-white hover:scale-105 active:scale-95'}`}>{earned?'Ready':'Grant'}</button></td></tr>); })}</tbody></table></div></div>
                  <div className="lg:col-span-5 bg-indigo-600 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden flex flex-col"><div className="absolute top-0 right-0 p-4 opacity-10"><Trophy size={80}/></div><h3 className="font-black italic uppercase text-[10px] tracking-widest mb-4 opacity-60">Earned Assets ({earnedAchs.length})</h3><div className="space-y-1 overflow-auto flex-1 max-h-[500px]">{earnedAchs.map(ua=>{ const tpl=achievements.find(a=>a.id===ua.achievement_id); return(<div key={ua.instance_id} className="bg-white/10 p-3 rounded-xl flex items-center justify-between group border border-white/5"><div className="flex items-center gap-3"><Award size={14} className="text-white/40"/><span className="font-black text-[10px] uppercase">{tpl?.name}</span></div><button onClick={()=>handleAchievementAction('revoke',{instanceId:ua.instance_id})} className="p-1 text-white/20 hover:text-red-400 transition-all"><Trash2 size={14}/></button></div>); })}</div></div>
               </div>
            ) }
         </div>
      )}

      {/* Tab: Card Library */}
      {activeTab === 'library' && (
         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
            <div className="p-4 px-6 border-b flex justify-between items-center bg-slate-50">
               <div className="flex gap-1 bg-slate-200/50 p-1 rounded-lg">{(['all', 'joker', 'tarot', 'fake'] as const).map(f => (<button key={f} onClick={()=>setLibraryFilter(f)} className={`px-3 py-1 rounded-md font-black text-[8px] uppercase transition-all ${libraryFilter === f ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}>{f}</button>))}</div>
               <button onClick={()=>setEditingCard({ type: 'joker', is_variable: 0, multiplier: 1.0, exponent_bonus: 0.0 })} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-black uppercase text-[9px] shadow hover:scale-105 transition-all flex items-center gap-2 italic"><Plus size={12} /> New Asset</button>
            </div>
            <div className="overflow-auto max-h-[600px]"><table className="w-full text-left text-xs"><thead className="bg-slate-50 font-black border-b sticky top-0 z-10 uppercase tracking-widest text-slate-400"><tr><th className="p-3 px-6">Name</th><th className="p-3">Type</th><th className="p-3">Effect Logic</th><th className="p-3 px-6 text-right">Ops</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredLibrary.map(card => (<tr key={card.id} className="hover:bg-slate-50"><td className="p-3 px-6 font-black uppercase truncate max-w-[150px]">{card.name}</td><td className="p-3"><Badge variant="outline">{card.type}</Badge></td><td className="p-3 text-slate-400 font-bold italic truncate max-w-[300px]">{card.description}</td><td className="p-3 px-6 text-right"><div className="flex justify-end gap-1"><button onClick={()=>setEditingCard(card)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded"><Edit size={14} /></button><button onClick={()=>{if(confirm('Delete?')) handleCardCRUD('delete_card', { cardId: card.id })}} className="p-1.5 text-slate-400 hover:text-red-600 rounded"><Trash2 size={14} /></button></div></td></tr>))}</tbody></table></div>
            {editingCard && (
               <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-6 z-50"><div className="bg-white p-8 rounded-3xl border border-indigo-600 shadow-2xl max-w-sm w-full space-y-6 animate-in zoom-in-95"><h3 className="font-black italic uppercase text-[10px] tracking-[0.2em] text-slate-400">Modify Data Node</h3><form onSubmit={(e)=>{ e.preventDefault(); const fd = new FormData(e.currentTarget); handleCardCRUD(editingCard.id ? 'update_card' : 'create_card', { cardId: editingCard.id, name: fd.get('name'), type: fd.get('type'), description: fd.get('description'), multiplier: parseFloat(fd.get('multiplier') as string), exponent_bonus: parseFloat(fd.get('exponent_bonus') as string), is_variable: fd.get('is_variable') === 'on' ? 1 : 0 }); }} className="space-y-4"><input name="name" defaultValue={editingCard.name} required placeholder="Asset Name" className={inputClass} /><select name="type" defaultValue={editingCard.type} className={selectClass}><option value="joker">Joker</option><option value="tarot">Tarot</option><option value="fake">Fake</option></select><textarea name="description" defaultValue={editingCard.description} required placeholder="Intel" className={inputClass + " h-20 resize-none"} /><div className="grid grid-cols-2 gap-2"><input name="multiplier" type="number" step="0.001" defaultValue={editingCard.multiplier} className={inputClass} /><input name="exponent_bonus" type="number" step="0.001" defaultValue={editingCard.exponent_bonus} className={inputClass} /></div><label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer"><input name="is_variable" type="checkbox" defaultChecked={editingCard.is_variable === 1} className="accent-indigo-600" /><span className="font-black uppercase text-[8px] tracking-widest text-slate-400">Dynamic Multiplier</span></label><div className="flex gap-2 pt-2"><button type="submit" className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-black uppercase text-[9px]">Confirm</button><button type="button" onClick={()=>setEditingCard(null)} className="flex-1 bg-slate-900 text-white py-2.5 rounded-xl font-black uppercase text-[9px]">Cancel</button></div></form></div></div>
            )}
         </div>
      )}

      {/* Tab: Matches */}
      {activeTab === 'matches' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
           <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-6"><h3 className="font-black italic uppercase text-[10px] tracking-widest text-slate-400">Deploy Link</h3><form onSubmit={handleCreateMatch} className="space-y-3"><select name="red" className={selectClass}><option value="">Red Player...</option>{members.filter(m=>m.is_registered===1 && m.team==='red').map(m=><option key={m.kinde_id} value={m.kinde_id}>{m.username}</option>)}</select><select name="blue" className={selectClass}><option value="">Blue Player...</option>{members.filter(m=>m.is_registered===1 && m.team==='blue').map(m=><option key={m.kinde_id} value={m.kinde_id}>{m.username}</option>)}</select><button type="submit" className="w-full bg-indigo-600 text-white font-black py-2.5 rounded-xl shadow-lg uppercase text-[9px] border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 transition-all">Establish Match</button></form></div>
           <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"><div className="p-3 space-y-2">{matches.map((m,i)=>{ const isActive=systemState.active_match_id === m.id.toString(); return(<div key={m.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${isActive ? 'bg-indigo-600 border-indigo-500 shadow-lg text-white' : 'bg-slate-50 border-slate-100 hover:border-indigo-100'}`}><span className={`text-2xl font-black italic tabular-nums w-10 ${isActive ? 'text-white/20' : 'text-slate-200'}`}>#{i+1}</span><div className="flex-1 flex justify-between font-black uppercase text-xs italic tracking-tighter"><span className={isActive ? 'text-white' : 'text-red-600'}>{m.red_player_name}</span><span className="opacity-10 scale-50">VS</span><span className={isActive ? 'text-white' : 'text-blue-600'}>{m.blue_player_name}</span></div><div className="flex flex-col gap-1">{isActive ? <button onClick={()=>handleSetActiveMatch(null)} className="bg-white text-indigo-600 px-3 py-1 rounded font-black text-[8px] uppercase">Stop</button> : <button onClick={()=>handleSetActiveMatch(m.id.toString())} className="bg-blue-600 text-white px-3 py-1 rounded font-black text-[8px] uppercase">Engage</button>}<button onClick={async ()=>{ if(confirm('Scrap?')) { await fetch('/api/admin/matches',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',matchId:m.id})}); fetchData(true); } }} className={`text-[7px] font-black uppercase text-center ${isActive ? 'text-white/40' : 'text-slate-300'}`}>Scrap</button></div></div>); })}</div></div>
        </div>
      )}

      {/* Tab: Scoring */}
      {activeTab === 'live' && (
        <div className="space-y-4 animate-in fade-in duration-700">
           {!activeMatch ? (<div className="bg-white p-20 rounded-3xl border-4 border-dashed border-slate-100 text-center space-y-4 animate-pulse"><div className="text-4xl opacity-10">📡</div><h2 className="text-xl font-black uppercase italic tracking-widest opacity-20">Awaiting Active Match Link</h2></div>) : (
             <div className="space-y-6">
                <div className="bg-slate-900 p-6 rounded-2xl shadow-xl flex justify-between items-center border-x-4 border-indigo-600"><div className="space-y-1"><div className="text-[8px] font-black uppercase tracking-[0.4em] text-indigo-500 italic">🔴 DATA STREAM ACTIVE</div><h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none text-white">{activeMatch.red_player_name} <span className="opacity-10 text-xs">VS</span> {activeMatch.blue_player_name}</h2></div><button onClick={() => handleSetActiveMatch(null)} className="bg-white text-slate-950 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] italic border-b-4 border-slate-300 active:border-b-0 active:translate-y-1 transition-all">FINISH</button></div>

                <form key={activeMatch.round_1_status} onSubmit={(e)=>{
                   const isRound1 = activeMatch.round_1_status !== 'completed';
                   handleCommitRound(e, isRound1 ? 'red_pick' : 'blue_pick');
                }} className="space-y-6">
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {['red', 'blue'].map((team, idx) => {
                         const isRound1 = activeMatch.round_1_status !== 'completed';
                         const isHome = (team === 'red' && isRound1) || (team === 'blue' && !isRound1);
                         const player = team === 'red' ? redPlayer : bluePlayer;
                         const useJoker = team === 'red' ? applyRedJoker : applyBlueJoker;
                         const setUseJoker = team === 'red' ? setApplyRedJoker : setApplyBlueJoker;
                         const teamFakeCards = team === 'red' ? redTeamFakeCards : blueTeamFakeCards;

                         return (
                           <div key={team} className={`space-y-3 ${activeMatch.round_2_status === 'completed' ? 'opacity-20 grayscale pointer-events-none scale-95 transition-all' : ''}`}>
                              <div className={`p-4 rounded-t-2xl ${team === 'red' ? 'bg-red-600' : 'bg-blue-600'} text-white text-center`}><h3 className="text-lg font-black italic uppercase leading-none">{team.toUpperCase()} TEAM</h3><p className="text-[8px] font-black uppercase opacity-70 tracking-widest">{isHome ? "ACTIVE PICK" : "RESPONSE"}</p></div>
                              <div className="bg-white p-6 rounded-b-2xl border-x border-b border-slate-200 shadow-sm space-y-6">
                                 <div className="space-y-6"><div className="flex justify-between items-center border-b pb-4"><h4 className={`font-black text-xl uppercase italic leading-none tracking-tighter ${team === 'red' ? 'text-red-600' : 'text-blue-600'}`}>{player?.username}</h4><Badge className={`px-4 py-1 rounded-lg font-black text-[8px] uppercase ${isHome ? (team === 'red' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white') : 'bg-slate-900 text-slate-500'}`}>{isHome ? 'HOME' : 'AWAY'}</Badge></div>
                                    <div className="space-y-2"><label className="text-[8px] font-black uppercase opacity-40 tracking-widest block text-center italic">1. Base Score</label><input name={`${team}_base`} type="number" step="any" required placeholder="0.0" className="w-full text-center text-5xl font-black p-4 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-indigo-600" /></div>
                                    <div className={`p-4 rounded-xl border transition-all space-y-4 ${isHome ? 'bg-indigo-50/20 border-indigo-100' : 'bg-slate-50 border-slate-200'}`}>
                                       <div className="flex justify-between items-start">
                                          <div className="flex-1">
                                             <label className={`text-[8px] font-black uppercase tracking-widest ${isHome ? 'text-indigo-600 opacity-100' : 'opacity-40'}`}>
                                                2. Joker: {player?.joker_name || 'NONE'}
                                             </label>
                                          </div>
                                          {player?.joker_card_id && (
                                             <label className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border-b-2 transition-all ${isHome ? 'bg-indigo-600 text-white border-indigo-900 active:border-b-0 active:translate-y-0.5' : 'bg-white border-slate-200'}`}>
                                                <input 
                                                   type="checkbox" 
                                                   checked={useJoker} 
                                                   onChange={(e) => setUseJoker(e.target.checked)} 
                                                   className="w-4 h-4" 
                                                />
                                                <span className="text-[8px] font-black uppercase italic">APPLY</span>
                                             </label>
                                          )}
                                       </div>
                                       <div className="relative">
                                         <input 
                                            key={`${team}-${useJoker}-${player?.joker_card_id}-${player?.joker_multiplier}`}
                                            name={`${team}_mult`} 
                                            type="number" 
                                            step="any" 
                                            defaultValue={useJoker 
                                               ? (player?.joker_is_variable ? "" : (player?.joker_multiplier || 1.5)) 
                                               : "1.0"
                                            }
                                            placeholder={useJoker && player?.joker_is_variable ? "录入最终倍率..." : ""} 
                                            readOnly={!useJoker || !player?.joker_is_variable} 
                                            className={`w-full p-4 rounded-xl font-black text-4xl text-center outline-none transition-all ${
                                               (useJoker && player?.joker_is_variable) 
                                                  ? 'bg-white border-indigo-500 border-2 shadow-inner opacity-100' 
                                                  : (useJoker ? 'bg-slate-100 text-slate-400 opacity-100' : 'bg-slate-100 text-slate-400 opacity-30')
                                            }`} 
                                         />
                                       </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[7px] font-black uppercase opacity-40 block tracking-widest italic">3. Tarot</label><select name={`${team}_tarot`} className={selectClass}><option value="">None</option>{cardLibrary.filter(c=>c.type==='tarot').map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div><div className="space-y-1"><label className="text-[7px] font-black uppercase opacity-40 block tracking-widest italic">4. Hand</label><select name={`${team}_hand`} className={selectClass}><option value="">Select Hand...</option>{HAND_TYPES_LIST.map(h => <option key={h} value={h}>{h}</option>)}</select></div></div>
                                    <div className="bg-emerald-600/5 p-4 rounded-xl border-4 border-emerald-600/5 space-y-4 shadow-inner"><p className="text-[7px] font-black uppercase text-emerald-600 tracking-widest text-center italic opacity-60">5. Team Fake Cards</p><div className="grid grid-cols-2 gap-2">{teamFakeCards.map(f=><label key={f.id} className="flex items-center gap-2 cursor-pointer bg-white/80 p-2 rounded-lg border border-slate-100 shadow-sm"><input type="checkbox" name={`${team}_fake_cards`} value={f.card_id} className="w-4 h-4 accent-emerald-600" /><span className="text-[9px] font-black uppercase italic truncate leading-none">{f.card_name}</span></label>)}</div></div>
                                 </div>
                              </div>
                           </div>
                         )
                      })}
                   </div>

                   <button 
                      type="submit" 
                      disabled={activeMatch.round_2_status === 'completed'}
                      className="w-full bg-slate-900 border-slate-700 text-white font-black py-8 rounded-3xl text-4xl uppercase tracking-[0.2em] shadow-2xl hover:bg-black hover:scale-[1.01] active:scale-[0.99] transition-all italic border-b-8 border-x-4 disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed"
                   >
                      {activeMatch.round_2_status === 'completed' 
                         ? 'Match Completed' 
                         : `COMMIT ROUND ${activeMatch.round_1_status !== 'completed' ? '1' : '2'}`
                      }
                   </button>
                </form>
             </div>           )}
        </div>
      )}
    </div>
  );
};
