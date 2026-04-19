import React, { useEffect, useState } from 'react';
import { 
  Users, Trophy, Swords, Zap, Settings, Info, Save, Trash2, ArrowUp, ArrowDown, 
  RotateCcw, Plus, Edit, X, LayoutDashboard, Database, Activity, Search, Award, ChevronLeft, PlusCircle
} from 'lucide-react';

interface Achievement {
  id: number;
  name: string;
  condition: string;
  scene: string;
  notes: string;
  icon: string;
}

interface Member {
  kinde_id: string;
  username: string;
  email: string;
  is_registered: number;
  team: string | null;
  team_order: number;
  joker_card_id: number | null;
  joker_name?: string;
  joker_description?: string;
  joker_multiplier?: number;
  joker_is_variable?: number;
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

interface Minigame {
  id: number;
  title: string;
  short_desc: string;
  detailed_desc: string;
  start_date: string;
  start_time: string;
  max_players: number;
  participant_count: number;
  fake_card_id: number;
  fake_card_name: string;
  status: string;
  winner_id: string | null;
  winner_name: string | null;
}

const Badge = ({ children, className, variant = 'default' }: { children: React.ReactNode, className?: string, variant?: 'default' | 'outline' | 'secondary' }) => {
  const base = "px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm transition-all";
  const variants = {
    default: "bg-indigo-600 text-white",
    outline: "bg-transparent border-2 border-slate-200 text-slate-500",
    secondary: "bg-slate-100 text-slate-900 border-2 border-slate-200"
  };
  return <span className={`${base} ${variants[variant]} ${className}`}>{children}</span>;
};

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'members' | 'achievements' | 'matches' | 'live' | 'minigames' | 'library'>('members');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [userAchievements, setUserAchievements] = useState<any[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [cardLibrary, setCardLibrary] = useState<Card[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [systemState, setSystemState] = useState<any>({});
  const [minigames, setMinigames] = useState<Minigame[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  
  const [applyRedJoker, setApplyRedJoker] = useState(true);
  const [applyBlueJoker, setApplyBlueJoker] = useState(true);
  const [editingCard, setEditingCard] = useState<Partial<Card> | null>(null);
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'joker' | 'tarot' | 'fake'>('all');

  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      if (!achRes.ok || !regRes.ok || !matchRes.ok || !cardRes.ok || !sysRes.ok || !miniRes.ok) throw new Error('数据同步失败');

      const [achData, regData, matchData, cardData, sysData, miniData] = await Promise.all([
        achRes.json(), regRes.json(), matchRes.json(), cardRes.json(), sysRes.json(), miniRes.json()
      ]);

      setAchievements(achData.templates);
      setUserAchievements(achData.userAchievements);
      const enrichedMembers = (regData as Member[]).map(m => {
         const joker = (cardData.library as Card[]).find(c => c.id === m.joker_card_id);
         return { ...m, joker_name: joker?.name, joker_description: joker?.description, joker_multiplier: joker?.multiplier, joker_is_variable: joker?.is_variable };
      });
      setMembers(enrichedMembers.sort((a, b) => a.team_order - b.team_order));
      setMatches(matchData);
      setCardLibrary(cardData.library);
      setInventory(cardData.inventory);
      setSystemState(sysData);
      setMinigames(miniData.games);
      setParticipants(miniData.participants);
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const switchTab = (tab: any) => { setActiveTab(tab); fetchData(true); };

  // --- Core Handlers ---
  const handleAchievementToggle = async (targetKindeId: string, achievementId: number, hasAchievement: boolean) => {
    try {
      await fetch('/api/admin/achievements', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetKindeId, achievementId, action: hasAchievement ? 'revoke' : 'grant' }) 
      });
      fetchData(true);
    } catch (e) { alert("操作失败"); }
  };

  const handleMemberAction = async (targetKindeId: string, action: string, value: any) => {
    try {
      const body: any = { targetKindeId, action };
      if (action === 'set_team') body.team = value;
      if (action === 'set_joker') body.jokerCardId = value;
      await fetch('/api/admin/registration', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      fetchData(true);
    } catch (e) { alert("选手管理失败"); }
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
    try {
      await fetch('/api/admin/registration', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reorder', mapping }) });
      fetchData(true);
    } catch (e) { alert("重排失败"); }
  };

  const handleCardCRUD = async (action: string, payload: any) => {
    try {
      const res = await fetch('/api/admin/cards', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }) 
      });
      if (res.ok) { setEditingCard(null); fetchData(true); }
    } catch (e) { alert("牌库维护失败"); }
  };

  const handleCreateMatch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const redPlayerId = formData.get('red') as string;
    const bluePlayerId = formData.get('blue') as string;
    if (!redPlayerId || !bluePlayerId) return;
    try {
      await fetch('/api/admin/matches', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', redPlayerId, bluePlayerId, orderIndex: matches.length }) 
      });
      fetchData(true);
    } catch (e) { alert("部署赛程失败"); }
  };

  const handleSetActiveMatch = async (matchId: string | null) => {
    try {
      await fetch('/api/admin/system', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'active_match_id', value: matchId }) 
      });
      fetchData(true);
      if (matchId) setActiveTab('live');
    } catch (e) { alert("操作失败"); }
  };

  const handleCommitRound = async (e: React.FormEvent<HTMLFormElement>, roundType: 'red_pick' | 'blue_pick') => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      matchId: systemState.active_match_id, roundType,
      redData: {
        baseScore: formData.get('red_base'), multiplier: applyRedJoker ? formData.get('red_mult') : 1.0,
        exponent: 1.0, tarotId: formData.get('red_tarot'), hand: formData.get('red_hand'),
        fakeCards: Array.from(formData.getAll('red_fake_cards')).join(',')
      },
      blueData: {
        baseScore: formData.get('blue_base'), multiplier: applyBlueJoker ? formData.get('blue_mult') : 1.0,
        exponent: 1.0, tarotId: formData.get('blue_tarot'), hand: formData.get('blue_hand'),
        fakeCards: Array.from(formData.getAll('blue_fake_cards')).join(',')
      }
    };
    try {
      const res = await fetch('/api/admin/scoring', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload) 
      });
      if (res.ok) { alert("存档成功！"); fetchData(true); }
    } catch (e) { alert("记录分数失败"); }
  };

  const handleCreateMinigame = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await fetch('/api/admin/minigames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create', title: formData.get('title'), short_desc: formData.get('short_desc'),
          detailed_desc: formData.get('detailed_desc'), start_date: formData.get('start_date'),
          start_time: formData.get('start_time'), max_players: parseInt(formData.get('max_players') as string),
          fake_card_id: parseInt(formData.get('fake_card_id') as string)
        })
      });
      fetchData(true);
      (e.target as HTMLFormElement).reset();
    } catch (e) { alert("发布活动失败"); }
  };

  const handleMinigameStatus = async (id: number, action: string, winner_id?: string | null) => {
    try {
      await fetch('/api/admin/minigames', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id, winner_id }) 
      });
      fetchData(true);
    } catch (e) { alert("变更状态失败"); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-background gap-4 uppercase font-black tracking-[0.5em]">
      <div className="w-16 h-16 border-8 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      NGU4th Syncing...
    </div>
  );

  const activeMatch = matches.find(m => m.id.toString() === systemState.active_match_id);
  const jokers = cardLibrary.filter(c => c.type === 'joker');
  const tarots = cardLibrary.filter(c => c.type === 'tarot');
  const fakeCards = cardLibrary.filter(c => c.type === 'fake');
  const redPlayer = members.find(m => m.kinde_id === activeMatch?.red_player_id);
  const bluePlayer = members.find(m => m.kinde_id === activeMatch?.blue_player_id);
  const redTeamFakeCards = inventory.filter(i => i.owner_id === 'red' && i.card_type === 'fake');
  const blueTeamFakeCards = inventory.filter(i => i.owner_id === 'blue' && i.card_type === 'fake');
  const filteredLibrary = cardLibrary.filter(c => libraryFilter === 'all' || c.type === libraryFilter);
  const targetMember = members.find(m => m.kinde_id === selectedUser);
  const earnedAchs = userAchievements.filter(ua => ua.kinde_id === selectedUser);

  const inputClass = "w-full bg-white p-4 rounded-2xl font-bold border-2 border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-slate-900 shadow-sm";
  const selectClass = "w-full bg-white p-4 rounded-2xl font-black border-2 border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-none cursor-pointer text-slate-900 shadow-sm";

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-4 border-indigo-600 pb-8">
        <div className="flex items-center gap-4">
           <div className="w-16 h-16 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-indigo-200">
              <LayoutDashboard size={32} />
           </div>
           <div><h1 className="text-5xl font-black tracking-tighter italic text-slate-900 uppercase leading-none">NGU4th ADMIN</h1><p className="text-muted-foreground font-black text-[10px] mt-2 tracking-[0.3em] uppercase opacity-60">Global Control Unit v9.4</p></div>
        </div>
        <div className="flex gap-4"><a href="/live" target="_blank" className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-indigo-700 transition-all text-sm italic shadow-lg flex items-center gap-2"><Activity size={16} /> 直播大屏</a><a href="/dashboard" className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold hover:bg-black flex items-center gap-2 shadow-lg"><RotateCcw size={16} /> 个人中心</a></div>
      </div>

      <div className="flex gap-2 bg-slate-100 p-2 rounded-[1.5rem] w-fit overflow-x-auto shadow-inner border border-slate-200/50">
        {(['members', 'achievements', 'matches', 'minigames', 'live', 'library'] as const).map(tab => (
          <button key={tab} onClick={() => switchTab(tab)} className={`px-8 py-3 rounded-xl font-black transition-all whitespace-nowrap uppercase tracking-tighter text-xs ${activeTab === tab ? 'bg-white shadow-md text-indigo-600 scale-105 border-2 border-indigo-100' : 'text-slate-500 hover:text-slate-900'}`}>
            {tab === 'members' ? '选手名单' : tab === 'achievements' ? '勋章发放' : tab === 'matches' ? '赛程排期' : tab === 'minigames' ? '小游戏' : tab === 'live' ? '🔴 计分台' : '牌库管理'}
          </button>
        ))}
      </div>

      {activeTab === 'members' && (
        <div className="space-y-12 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             <div className="bg-red-50/30 p-8 rounded-[2.5rem] border-2 border-red-100 shadow-sm space-y-4"><h3 className="text-xl font-black italic text-red-600 uppercase flex items-center gap-2"><Zap size={20} fill="currentColor" /> 红队全局永久次方</h3><input type="number" step="0.01" value={systemState.red_exponent || '1.0'} onChange={(e)=>fetch('/api/admin/system',{method:'POST',headers: { 'Content-Type': 'application/json' },body:JSON.stringify({key:'red_exponent',value:e.target.value})}).then(()=>fetchData(true))} className={inputClass} /></div>
             <div className="bg-blue-50/30 p-8 rounded-[2.5rem] border-2 border-blue-100 shadow-sm space-y-4"><h3 className="text-xl font-black italic text-blue-600 uppercase flex items-center gap-2"><Zap size={20} fill="currentColor" /> 蓝队全局永久次方</h3><input type="number" step="0.01" value={systemState.blue_exponent || '1.0'} onChange={(e)=>fetch('/api/admin/system',{method:'POST',headers: { 'Content-Type': 'application/json' },body:JSON.stringify({key:'blue_exponent',value:e.target.value})}).then(()=>fetchData(true))} className={inputClass} /></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {['red', 'blue'].map(team => (
              <div key={team} className={`bg-card rounded-[3rem] shadow-2xl border-4 ${team === 'red' ? 'border-red-600/20 shadow-red-100/50' : 'border-blue-600/20 shadow-blue-100/50'} overflow-hidden`}>
                <div className={`p-8 ${team === 'red' ? 'bg-red-600' : 'bg-blue-600'} text-white flex justify-between items-center`}><h3 className="text-3xl font-black italic uppercase tracking-widest">{team === 'red' ? '红队' : '蓝队'} 选手</h3><button onClick={()=>{fetch('/api/admin/cards',{method:'POST',headers: { 'Content-Type': 'application/json' },body:JSON.stringify({action:'random_joker'})}).then(()=>fetchData(true))}} className="bg-white/20 hover:bg-white/30 p-3 px-6 rounded-2xl text-xs font-black uppercase border border-white/30">🎲 随机分配小丑牌</button></div>
                <div className="p-8 space-y-6">
                  {members.filter(m => m.team === team && m.is_registered === 1).map((m, i) => (
                    <div key={m.kinde_id} className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-200 transition-all group hover:bg-white hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100">
                      <div className="flex items-center gap-6"><span className="text-4xl font-black italic text-slate-300 w-12 tabular-nums">#{i + 1}</span><div className="flex-1 font-black uppercase text-xl leading-none">{m.username}<p className="text-[10px] text-slate-400 font-bold italic mt-1.5">{m.email}</p></div><div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => handleReorder(m.kinde_id, 'up')} className="bg-white p-2.5 rounded-xl border-2 border-slate-200 hover:bg-indigo-600 hover:text-white shadow-sm transition-all"><ArrowUp size={16} /></button><button onClick={() => handleReorder(m.kinde_id, 'down')} className="bg-white p-2.5 rounded-xl border-2 border-slate-200 hover:bg-indigo-600 hover:text-white shadow-sm transition-all"><ArrowDown size={16} /></button><button onClick={() => handleMemberAction(m.kinde_id, 'set_team', team === 'red' ? 'blue' : 'red')} className="bg-white p-2.5 px-4 rounded-xl border-2 border-orange-200 text-orange-600 font-black text-[10px] hover:bg-orange-500 hover:text-white shadow-sm uppercase">Switch</button><button onClick={() => handleMemberAction(m.kinde_id, 'remove_registration', null)} className="bg-white p-2.5 px-4 rounded-xl border-2 border-red-200 text-red-600 font-black text-[10px] hover:bg-red-600 hover:text-white shadow-sm uppercase">Kick</button></div></div>
                      <div className="mt-6 space-y-3"><label className="text-[10px] font-black uppercase text-indigo-600 tracking-widest flex items-center gap-2"><Swords size={12} /> Assigned Joker Card</label><select value={m.joker_card_id || ''} onChange={(e) => handleMemberAction(m.kinde_id, 'set_joker', e.target.value ? parseInt(e.target.value) : null)} className={selectClass + " p-3.5 text-sm"}><option value="">NO JOKER</option>{jokers.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}</select>{m.joker_description && <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-inner group-hover:border-indigo-100 transition-all text-[11px] font-bold text-slate-500 italic leading-relaxed">{m.joker_description}</div>}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-[3rem] border-2 border-slate-200 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700"><div className="bg-slate-900 p-10 border-b flex justify-between items-center text-white"><h3 className="text-3xl font-black italic uppercase tracking-tighter">系统全员名单 Global Roster</h3><span className="text-5xl font-black tabular-nums tracking-tighter text-indigo-500">{members.length}</span></div><div className="overflow-auto max-h-[600px]"><table className="w-full text-left"><thead className="bg-slate-50 text-[10px] font-black border-b-2 border-slate-200 sticky top-0 bg-white z-10 uppercase tracking-widest"><tr><th className="px-10 py-6">Operative 选手</th><th className="px-10 py-6 text-center">Status 状态</th><th className="px-10 py-6 text-right">Quick Task</th></tr></thead><tbody className="divide-y divide-slate-100 bg-white">{members.map(m => (<tr key={m.kinde_id} className="hover:bg-indigo-50/30 transition-all group"><td className="px-10 py-8 font-black text-xl text-slate-900 leading-tight">{m.username}<p className="text-[10px] text-slate-400 font-bold lowercase mt-1">{m.email}</p></td><td className="px-10 py-8 text-center">{m.is_registered ? <Badge className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase shadow-sm ${m.team === 'red' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>Active in {m.team}</Badge> : <span className="opacity-20 text-[10px] font-black italic uppercase text-slate-400">Reserve Force</span>}</td><td className="px-10 py-8 text-right"><div className="flex justify-end gap-3"><button onClick={() => handleMemberAction(m.kinde_id, 'set_team', 'red')} className="px-6 py-3 bg-red-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-red-100">To Red</button><button onClick={() => handleMemberAction(m.kinde_id, 'set_team', 'blue')} className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-blue-100">To Blue</button>{m.is_registered === 1 && (<button onClick={() => handleMemberAction(m.kinde_id, 'remove_registration', null)} className="px-4 py-3 bg-slate-100 text-slate-400 rounded-2xl text-xs font-black hover:bg-slate-900 hover:text-white transition-all"><Trash2 size={18} /></button>)}</div></td></tr>))}</tbody></table></div></div>
        </div>
      )}

      {/* Tab: Card Library CRUD */}
      {activeTab === 'library' && (
         <div className="space-y-10 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-10 rounded-[3.5rem] border-2 border-slate-200 shadow-2xl gap-10 relative overflow-hidden"><div className="space-y-4"><div className="border-l-4 border-indigo-600 pl-4"><h3 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">牌库资产维护 HUB</h3><p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Asset Matrix</p></div><div className="flex gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">{(['all', 'joker', 'tarot', 'fake'] as const).map(f => (<button key={f} onClick={()=>setLibraryFilter(f)} className={`px-8 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${libraryFilter === f ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}>{f}</button>))}</div></div><button onClick={()=>setEditingCard({ type: 'joker', is_variable: 0, multiplier: 1.0, exponent_bonus: 0.0 })} className="bg-indigo-600 text-white px-12 py-5 rounded-[2rem] font-black uppercase shadow-2xl shadow-indigo-100 hover:scale-105 flex items-center gap-3 italic tracking-tighter"><Plus size={24} /> 新增资产资料</button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{filteredLibrary.map(card => (<div key={card.id} className="bg-card p-8 rounded-[3rem] border-2 border-slate-200 shadow-xl space-y-6 group relative overflow-hidden transition-all hover:border-indigo-600 hover:shadow-indigo-100 hover:-translate-y-1"><div className="flex justify-between items-start"><Badge className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-sm ${card.type === 'joker' ? 'bg-purple-600 text-white' : card.type === 'tarot' ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'}`}>{card.type}</Badge><div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all"><button onClick={()=>setEditingCard(card)} className="bg-white p-2 rounded-lg border-2 border-slate-100 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all"><Edit size={14} /></button><button onClick={()=>{if(confirm('SCRAP?')) handleCardCRUD('delete_card', { cardId: card.id })}} className="bg-white p-2 rounded-lg border-2 border-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-all"><Trash2 size={14} /></button></div></div><h4 className="font-black text-3xl tracking-tighter uppercase text-slate-900 leading-tight">{card.name}</h4><p className="text-sm font-bold text-slate-500 italic leading-relaxed line-clamp-3 h-[4.5rem]">{card.description}</p><div className="flex gap-2 pt-2">{card.multiplier !== 1 && <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-4 py-1 rounded-xl border border-indigo-100 shadow-sm uppercase tracking-tighter">x{card.multiplier}</span>} {card.exponent_bonus !== 0 && <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-4 py-1 rounded-xl border border-emerald-100 shadow-sm uppercase tracking-tighter">^{card.exponent_bonus}</span>} {card.is_variable === 1 && <span className="bg-orange-50 text-orange-600 text-[10px] font-black px-4 py-1 rounded-xl border border-orange-100 shadow-sm uppercase tracking-widest italic">Variable</span>}</div></div>))}</div>
            {editingCard && (
               <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 z-50 animate-in fade-in duration-300"><div className="bg-white p-12 rounded-[4.5rem] border-4 border-indigo-600 shadow-[0_50px_100px_rgba(0,0,0,0.5)] max-w-xl w-full space-y-10 animate-in zoom-in-95 duration-500 relative overflow-hidden"><div className="absolute top-0 right-0 p-8"><button onClick={()=>setEditingCard(null)} className="text-slate-300 hover:text-slate-900 transition-all"><X size={32} /></button></div><div className="border-l-8 border-indigo-600 pl-6"><h3 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">{editingCard.id ? 'UPDATE ASSET' : 'DEPLOY ASSET'}</h3></div><form onSubmit={(e)=>{ e.preventDefault(); const fd = new FormData(e.currentTarget); handleCardCRUD(editingCard.id ? 'update_card' : 'create_card', { cardId: editingCard.id, name: fd.get('name'), type: fd.get('type'), description: fd.get('description'), multiplier: parseFloat(fd.get('multiplier') as string), exponent_bonus: parseFloat(fd.get('exponent_bonus') as string), is_variable: fd.get('is_variable') === 'on' ? 1 : 0 }); }} className="space-y-8"><input name="name" defaultValue={editingCard.name} required placeholder="Asset Name" className={inputClass} /><select name="type" defaultValue={editingCard.type} className={selectClass}><option value="joker">小丑牌 (Joker)</option><option value="tarot">塔罗牌 (Tarot)</option><option value="fake">假卡 (Fake Card)</option></select><textarea name="description" defaultValue={editingCard.description} required placeholder="Operational Intel" className={inputClass + " h-32 text-sm leading-relaxed resize-none"} /><div className="grid grid-cols-2 gap-8"><input name="multiplier" type="number" step="any" defaultValue={editingCard.multiplier || 1.0} placeholder="Mult" className={inputClass} /><input name="exponent_bonus" type="number" step="any" defaultValue={editingCard.exponent_bonus || 0.0} placeholder="Exp" className={inputClass} /></div><label className="flex items-center gap-5 bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-200 cursor-pointer hover:bg-slate-100 transition-all"><input name="is_variable" type="checkbox" defaultChecked={editingCard.is_variable === 1} className="w-8 h-8 accent-indigo-600" /><div className="flex flex-col"><span className="font-black uppercase text-sm italic tracking-widest text-slate-900">Toggle Dynamic Entry</span><span className="text-[9px] font-bold opacity-40 uppercase tracking-tighter">Requires manual input during live scoring stream</span></div></label><div className="flex gap-6 pt-6"><button type="submit" className="flex-1 bg-indigo-600 text-white py-6 rounded-[2rem] font-black uppercase shadow-2xl hover:scale-[1.02] active:scale-95 transition-all text-xl italic tracking-tighter">确认存档 CONFIRM</button><button type="button" onClick={()=>setEditingCard(null)} className="flex-1 bg-slate-900 text-white py-6 rounded-[2.5rem] font-black uppercase border-b-8 border-slate-800 active:border-b-0 active:translate-y-2">CANCEL</button></div></form></div></div>
            )}
         </div>
      )}

      {/* Tab: Matches */}
      {activeTab === 'matches' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in duration-300">
           <div className="lg:col-span-5 bg-white p-12 rounded-[3.5rem] border-4 border-indigo-600/10 shadow-2xl space-y-12 relative overflow-hidden"><div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div><div className="space-y-2"><h3 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">部署战术对阵</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] opacity-60">Schedule Establishment</p></div><form onSubmit={handleCreateMatch} className="space-y-10"><div className="space-y-4"><label className="text-[10px] font-black uppercase text-red-600 tracking-[0.5em] flex items-center gap-2"><Zap size={12} fill="currentColor" /> 红队进攻 RED NODE</label><select name="red" className={selectClass}><option value="">选择选手...</option>{members.filter(m=>m.is_registered===1 && m.team==='red').map(m=><option key={m.kinde_id} value={m.kinde_id}>{m.username}</option>)}</select></div><div className="space-y-4"><label className="text-[10px] font-black uppercase text-blue-600 tracking-[0.5em] flex items-center gap-2"><Zap size={12} fill="currentColor" /> 蓝队防守 BLUE NODE</label><select name="blue" className={selectClass}><option value="">选择选手...</option>{members.filter(m=>m.is_registered===1 && m.team==='blue').map(m=><option key={m.kinde_id} value={m.kinde_id}>{m.username}</option>)}</select></div><button type="submit" className="w-full bg-indigo-600 text-white font-black py-8 rounded-[2.5rem] text-2xl shadow-xl hover:scale-102 active:scale-95 transition-all uppercase italic tracking-widest border-b-[12px] border-indigo-800">确认部署 DEPLOY</button></form></div>
           <div className="lg:col-span-7 bg-white p-12 rounded-[4rem] border-2 border-slate-200 shadow-2xl space-y-8 relative overflow-hidden group transition-all"><div className="absolute -top-10 -right-10 text-[14rem] font-black italic text-slate-900/[0.02] uppercase pointer-events-none tracking-tighter group-hover:text-slate-900/[0.05] transition-all">Pipeline</div><div className="flex items-center justify-between border-b-2 border-slate-100 pb-6 mb-4"><h3 className="text-xl font-black italic uppercase tracking-[0.5em] opacity-40 flex items-center gap-3">Pipeline Overview</h3><span className="text-[10px] font-black bg-slate-900 text-white px-4 py-1.5 rounded-xl">{matches.length} ENCOUNTERS</span></div><div className="space-y-8 overflow-y-auto max-h-[700px] pr-2 custom-scrollbar">{matches.map((m,i)=>{ const isActive=systemState.active_match_id === m.id.toString(); return(<div key={m.id} className={`flex items-center gap-8 p-10 rounded-[3.5rem] border-4 transition-all relative ${isActive ? 'bg-indigo-600 border-indigo-500 shadow-[0_40px_100px_rgba(79,70,229,0.4)] scale-105 z-10' : 'bg-white border-slate-100 hover:border-indigo-200 shadow-md'}`}><span className={`text-7xl font-black italic w-24 text-center tabular-nums transition-all ${isActive ? 'text-white/10 opacity-100' : 'text-slate-900/10'}`}>#{i+1}</span><div className="flex-1 flex justify-between font-black uppercase text-3xl italic tracking-tighter gap-4"><span className={`${isActive ? 'text-white' : 'text-red-600'}`}>{m.red_player_name}</span><span className={`opacity-20 italic scale-50 transition-all ${isActive ? 'text-white' : 'text-slate-300'}`}>VS</span><span className={`${isActive ? 'text-white' : 'text-blue-600'}`}>{m.blue_player_name}</span></div><div className="flex flex-col gap-3 min-w-[160px]">{isActive ? (<button onClick={()=>handleSetActiveMatch(null)} className="bg-white text-indigo-600 px-8 py-4 rounded-[1.5rem] font-black text-xs uppercase shadow-2xl hover:scale-105 transition-all">停止活动 DEACTIVATE</button>) : (<button onClick={()=>handleSetActiveMatch(m.id.toString())} className="bg-blue-600 text-white px-8 py-4 rounded-[1.5rem] font-black text-xs uppercase shadow-xl hover:scale-105 transition-all">设为活动 ENGAGE</button>)}<button onClick={async ()=>{ if(confirm('Scrap?')) { await fetch('/api/admin/matches',{method:'POST',headers: { 'Content-Type': 'application/json' },body:JSON.stringify({action:'delete',matchId:m.id})}); fetchData(true); } }} className={`text-[10px] font-black uppercase text-center mt-2 ${isActive ? 'text-white/50' : 'text-slate-300'}`}>Scrap Record</button></div></div>); })}</div></div>
        </div>
      )}

      {/* Tab: LIVE CONTROL */}
      {activeTab === 'live' && (
        <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
           {!activeMatch ? (<div className="bg-white p-40 rounded-[5rem] border-8 border-dashed border-slate-100 text-center space-y-8 animate-pulse"><div className="text-[10rem] grayscale opacity-10">📡</div><h2 className="text-5xl font-black uppercase italic tracking-tighter opacity-30 text-slate-900">STANDBY AWAITING DATA</h2></div>) : (
             <div className="space-y-16">
                <div className="bg-slate-900 p-12 rounded-[5rem] shadow-2xl border-x-[16px] border-indigo-600 flex justify-between items-center relative overflow-hidden transition-all"><div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-r from-red-600 via-indigo-600 to-blue-600 animate-shimmer opacity-80"></div><div className="space-y-1"><div className="flex items-center gap-3 text-indigo-400 font-black italic uppercase text-sm tracking-[0.5em] animate-pulse"><div className="w-2 h-2 bg-indigo-500 rounded-full"></div> DATA STREAM ACTIVE</div><h2 className="text-7xl font-black italic tracking-tighter uppercase leading-none text-white">{activeMatch.red_player_name} <span className="text-slate-800 px-8 font-normal scale-75">VS</span> {activeMatch.blue_player_name}</h2></div><button onClick={() => handleSetActiveMatch(null)} className="bg-white text-slate-950 px-16 py-8 rounded-[3rem] font-black uppercase hover:scale-105 active:scale-95 transition-all border-b-[12px] border-slate-300 text-2xl italic tracking-widest shadow-2xl shadow-white/5">完结对抗 FINISH</button></div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                   {['red', 'blue'].map((team, idx) => {
                      const isRound1 = activeMatch.round_1_status !== 'completed';
                      const currentRoundType = isRound1 ? 'red_pick' : 'blue_pick';
                      const isHome = (team === 'red' && isRound1) || (team === 'blue' && !isRound1);
                      const player = team === 'red' ? redPlayer : bluePlayer;
                      const useJoker = team === 'red' ? applyRedJoker : applyBlueJoker;
                      const setUseJoker = team === 'red' ? setApplyRedJoker : setApplyBlueJoker;
                      const teamFakeCards = team === 'red' ? redTeamFakeCards : blueTeamFakeCards;
                      return (
                        <div key={team} className={`space-y-10 ${(idx === 0 && activeMatch.round_1_status === 'completed') || (idx === 1 && activeMatch.round_2_status === 'completed') ? 'opacity-10 grayscale pointer-events-none scale-90 transition-all blur-[2px]' : 'scale-100'}`}><div className={`p-12 rounded-t-[5rem] ${team === 'red' ? 'bg-red-600 shadow-[0_40px_100px_rgba(220,38,38,0.4)]' : 'bg-blue-600 shadow-[0_40px_100px_rgba(37,99,235,0.4)]'} text-white shadow-2xl transition-all relative overflow-hidden shadow-2xl`}><div className="absolute inset-0 bg-white/10 opacity-20 animate-pulse"></div><div className="relative z-10 text-center space-y-2"><h3 className="text-6xl font-black italic tracking-tighter uppercase leading-none">ROUND {isRound1 ? '1' : '2'}</h3><p className="text-xl font-black uppercase opacity-80 tracking-[0.4em] italic underline decoration-white/20 underline-offset-[12px] decoration-4">{isRound1 ? "红队自选曲 RED'S PICK" : "蓝队自选曲 BLUE'S PICK"}</p></div></div>
                           <form onSubmit={(e)=>handleCommitRound(e, currentRoundType)} className="bg-white p-12 rounded-b-[5rem] border-x-[6px] border-b-[6px] border-slate-100 shadow-[0_60px_150px_rgba(0,0,0,0.2)] space-y-12">
                              <div className="space-y-12"><div className="flex justify-between items-center border-b-8 pb-8" style={{borderColor: team === 'red' ? 'rgba(220,38,38,0.1)' : 'rgba(37,99,235,0.1)'}}><h4 className={`font-black text-5xl uppercase italic tracking-tighter leading-none ${team === 'red' ? 'text-red-600' : 'text-blue-600'}`}>{player?.username}</h4><Badge className={`px-8 py-3 rounded-[1.5rem] font-black text-sm uppercase shadow-2xl border-4 border-white/20 ${isHome ? (team === 'red' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white') : 'bg-slate-900 text-slate-500'}`}>{isHome ? '主场进攻 HOME' : '客场防守 Away'}</Badge></div>
                                 <div className="space-y-6"><label className="text-sm font-black uppercase opacity-40 tracking-[0.5em] block text-center italic">1. 基础分 Manual Base Score</label><input name={`${team}_base`} type="number" step="any" required placeholder="000.0" className={inputClass + " text-center text-8xl p-12 bg-slate-50 rounded-[3.5rem] border-4 border-slate-300 shadow-inner scale-105 focus:scale-110"} /></div>
                                 <div className={`p-12 rounded-[4rem] border-4 transition-all space-y-8 ${isHome ? 'bg-indigo-50/20 border-indigo-200 shadow-2xl shadow-indigo-100/50' : 'bg-slate-50 opacity-40 shadow-inner border-slate-200'}`}>
                                    <div className="flex justify-between items-start"><div className="flex-1 space-y-2"><label className={`text-xs font-black uppercase tracking-[0.3em] ${isHome ? 'text-indigo-600 opacity-100' : 'opacity-40'}`}>2. 小丑牌倍率 Joker Multiplier</label><p className="font-black text-3xl uppercase tracking-tighter leading-tight text-slate-900">{player?.joker_name || 'NO INTEL LINKED'}</p>{player?.joker_description && <div className="bg-white/80 p-6 rounded-[2rem] text-[13px] font-bold text-slate-600 italic mt-6 border-4 border-slate-100 shadow-inner leading-relaxed relative overflow-hidden"><div className="absolute top-0 left-0 w-1 h-full bg-indigo-600 opacity-20"></div>{player.joker_description}</div>}</div>{isHome && player?.joker_card_id && <label className="flex items-center gap-4 cursor-pointer bg-indigo-600 text-white px-8 py-4 rounded-[2rem] shadow-[0_20px_50px_rgba(79,70,229,0.4)] hover:scale-105 active:scale-95 transition-all border-b-8 border-indigo-900"><input type="checkbox" checked={useJoker} onChange={(e)=>setUseJoker(e.target.checked)} className="w-8 h-8 accent-white shadow-inner" /><span className="text-xs font-black uppercase italic tracking-widest">应用效果 APPLICATION?</span></label>}</div>
                                    <div className="relative">{(isHome && useJoker) ? <div className="relative animate-in zoom-in-95 duration-500"><input name={`${team}_mult`} type="number" step="any" defaultValue={player?.joker_is_variable ? "" : (player?.joker_multiplier || 1.5)} placeholder={player?.joker_is_variable ? "手动录入最终倍率..." : "固定倍率已锁定"} readOnly={!player?.joker_is_variable} className={`w-full p-10 rounded-[3rem] font-black text-7xl text-center outline-none transition-all shadow-2xl ${player?.joker_is_variable ? 'bg-white ring-[16px] ring-indigo-50 border-indigo-500 border-4' : 'bg-slate-50 text-slate-950 opacity-90 border-slate-300 border-4'}`} />{!player?.joker_is_variable && <div className="absolute right-12 top-1/2 -translate-y-1/2 opacity-10 font-black italic uppercase text-4xl tracking-[0.3em] pointer-events-none select-none">LOCKED</div>}</div> : <div className="relative"><input value="1.0" readOnly className="w-full bg-slate-100 p-10 rounded-[3rem] font-black text-7xl text-center opacity-30 cursor-not-allowed border-4 border-slate-200 outline-none shadow-inner" /><div className="absolute inset-0 flex items-center justify-center pointer-events-none font-black text-slate-400 italic tracking-[0.8em] uppercase text-lg">Inert</div></div>}</div>
                                 </div>
                                 <div className="grid grid-cols-2 gap-10"><div className="space-y-4"><label className="text-[10px] font-black uppercase opacity-40 text-center block tracking-[0.4em] italic">3. 塔罗牌生效 Tarot Execution</label><select name={`${team}_tarot`} className={selectClass + " p-8 text-sm bg-slate-50 border-4 border-slate-300 shadow-inner" }><option value="">无 (None)</option>{tarots.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div><div className="space-y-4"><label className="text-[10px] font-black uppercase opacity-40 text-center block tracking-[0.4em] italic">4. 牌型结算 Hand Designation</label><input name={`${team}_hand`} placeholder="e.g. Full House / 葫芦" className={inputClass + " p-8 text-center text-sm uppercase bg-slate-50 border-4 border-slate-300 shadow-inner"} /></div></div>
                                 <div className="bg-emerald-600/5 p-10 rounded-[4rem] border-[6px] border-emerald-600/10 space-y-8 shadow-inner"><p className="text-xs font-black uppercase text-emerald-600 tracking-[0.8em] text-center italic opacity-60">5. 队伍假卡加成 Active Tactical Assets</p><div className="grid grid-cols-2 gap-4">{(team === 'red' ? redTeamFakeCards : blueTeamFakeCards).map(f=><label key={f.id} className="flex items-center gap-4 cursor-pointer bg-white/80 p-5 rounded-[1.5rem] transition-all border-4 border-slate-100 hover:border-emerald-600/40 shadow-sm hover:shadow-2xl hover:scale-[1.03]"><input type="checkbox" name={`${team}_fake_cards`} value={f.card_id} className={`w-8 h-8 ${team === 'red' ? 'accent-red-600' : 'accent-blue-600 shadow-inner'}`} /><span className="text-[13px] font-black uppercase italic tracking-tighter truncate leading-none text-slate-800">{f.card_name}</span></label>)}</div>{teamFakeCards.length === 0 && <div className="text-center py-12 border-4 border-dashed border-emerald-950/5 rounded-[3rem] opacity-20"><p className="text-xs font-black uppercase tracking-[0.5em] italic">Radar Silent - No Assets Earned</p></div>}</div>
                              </div>
                              <button type="submit" className={`w-full ${team === 'red' ? 'bg-red-600 shadow-[0_40px_120px_rgba(220,38,38,0.5)]' : 'bg-blue-600 shadow-[0_40px_120px_rgba(37,99,235,0.5)]'} text-white font-black py-16 rounded-[4.5rem] text-5xl uppercase tracking-[0.4em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all italic border-b-[24px] border-black/30 mt-12 active:border-b-0 active:translate-y-8`}>保存存档 COMMIT</button>
                           </form>
                        </div>
                      )
                   })}
                </div>
             </div>
           )}
        </div>
      )}

      {/* Tab: Achievements */}
      {activeTab === 'achievements' && (
         <div className="bg-white p-16 rounded-[5rem] border-4 border-slate-200 shadow-[0_80px_150px_rgba(0,0,0,0.2)] overflow-hidden animate-in fade-in duration-700">
           <div className="flex items-center justify-between border-b-8 border-slate-100 pb-10 mb-10">
              <h3 className="text-4xl font-black italic uppercase border-l-[16px] border-indigo-600 pl-10 text-slate-900 leading-none">勋章发放权限 HUB</h3>
              <button 
                onClick={() => setSelectedUser(null)} 
                className={`px-8 py-3 rounded-2xl font-black text-xs uppercase transition-all ${!selectedUser ? 'opacity-0' : 'bg-slate-900 text-white hover:bg-black'}`}
              >
                CLOSE SELECTION
              </button>
           </div>
           
           {!selectedUser ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {members.map(m => (
                  <button 
                    key={m.kinde_id} 
                    onClick={() => setSelectedUser(m.kinde_id)}
                    className="p-10 bg-slate-50 border-4 border-slate-100 rounded-[3rem] flex flex-col items-center gap-4 hover:border-indigo-600 hover:shadow-2xl hover:shadow-indigo-100 transition-all group relative overflow-hidden"
                  >
                     <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Award size={80} /></div>
                     <div className="w-20 h-20 bg-white border-4 border-slate-200 rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 transition-transform shadow-xl"><Users size={32} /></div>
                     <span className="font-black text-xl uppercase tracking-tighter text-slate-900">{m.username}</span>
                     <Badge variant="outline" className="mt-1">Select Access</Badge>
                  </button>
                ))}
             </div>
           ) : (
             <div className="animate-in slide-in-from-right-10 duration-500 space-y-12">
                <div className="flex items-center gap-8 bg-indigo-50/50 p-10 rounded-[3.5rem] border-4 border-indigo-100 shadow-inner">
                   <div className="w-24 h-24 bg-indigo-600 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-200"><Users size={48} /></div>
                   <div>
                      <h2 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900">Operator: {targetMember?.username}</h2>
                      <div className="flex items-center gap-4 mt-2 font-mono text-sm font-bold text-indigo-400 opacity-60"><Search size={16} /> {targetMember?.kinde_id}</div>
                   </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                   <div className="lg:col-span-7 bg-white rounded-[4rem] border-4 border-slate-200 shadow-2xl overflow-hidden">
                      <div className="bg-slate-900 p-10 text-white flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <PlusCircle size={32} className="text-indigo-400" />
                            <h3 className="text-2xl font-black italic uppercase tracking-[0.2em] leading-none">Authorization Hub</h3>
                         </div>
                         <Badge>Ready to Commit</Badge>
                      </div>
                      <div className="overflow-auto max-h-[600px] border-t-8 border-slate-800">
                         <table className="w-full text-left">
                            <tbody className="divide-y-4 divide-slate-100">
                               {achievements.map(tpl => {
                                  const earned = earnedAchs.find(ua => ua.achievement_id === tpl.id);
                                  return (
                                    <tr key={tpl.id} className="hover:bg-indigo-50/40 transition-all group">
                                       <td className="px-10 py-10 w-24"><div className="w-16 h-16 bg-slate-50 border-4 border-slate-100 rounded-3xl flex items-center justify-center text-slate-300 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all group-hover:shadow-lg"><Award size={32} /></div></td>
                                       <td className="px-4 py-10">
                                          <div className="flex flex-col gap-1">
                                             <span className="font-black text-2xl text-slate-900 uppercase leading-none tracking-tight">{tpl.name}</span>
                                             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">{tpl.condition}</span>
                                          </div>
                                       </td>
                                       <td className="px-10 py-10 text-right">
                                          <button 
                                            disabled={!!earned}
                                            onClick={() => handleAchievementToggle(selectedUser!, tpl.id, false)}
                                            className={`px-12 py-5 rounded-[2rem] font-black text-xs uppercase shadow-2xl transition-all ${earned ? 'bg-slate-50 text-slate-300 border-4 border-slate-100 shadow-none' : 'bg-indigo-600 text-white hover:scale-105 active:scale-95 hover:shadow-indigo-200 border-b-8 border-indigo-900'}`}
                                          >
                                             {earned ? 'Authorized' : 'Grant Badge'}
                                          </button>
                                       </td>
                                    </tr>
                                  );
                               })}
                            </tbody>
                         </table>
                      </div>
                   </div>

                   <div className="lg:col-span-5 space-y-10">
                      <div className="bg-indigo-600 p-12 rounded-[5rem] text-white shadow-[0_40px_120px_rgba(79,70,229,0.5)] relative overflow-hidden group">
                         <div className="absolute top-[-40px] right-[-40px] opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-1000"><Trophy size={300} /></div>
                         <h3 className="text-4xl font-black italic uppercase tracking-tighter mb-12 border-b-4 border-white/10 pb-6">Operative Intel ({earnedAchs.length})</h3>
                         <div className="space-y-6">
                            {earnedAchs.length === 0 ? (
                               <div className="py-24 text-center border-4 border-dashed border-white/10 rounded-[3.5rem] opacity-30 font-black italic uppercase tracking-[0.5em]">No Data Links Found</div>
                            ) : (
                               earnedAchs.map(ua => {
                                  const tpl = achievements.find(a => a.id === ua.achievement_id);
                                  return (
                                    <div key={ua.instance_id} className="bg-white p-6 rounded-[2.5rem] flex items-center justify-between group shadow-[0_20px_50px_rgba(0,0,0,0.2)] transition-all hover:-translate-x-2">
                                       <div className="flex items-center gap-6">
                                          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-lg"><Award size={28} /></div>
                                          <div>
                                             <p className="font-black text-lg text-slate-900 uppercase leading-none">{tpl?.name}</p>
                                             <p className="text-[10px] text-slate-400 mt-2 font-mono uppercase tracking-widest">{new Date(ua.earned_at).toLocaleString()}</p>
                                          </div>
                                       </div>
                                       <button onClick={() => handleAchievementToggle(selectedUser!, ua.achievement_id, true)} className="p-4 text-slate-200 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all hover:shadow-inner"><Trash2 size={24} /></button>
                                    </div>
                                  );
                               })
                            )}
                         </div>
                      </div>
                   </div>
                </div>
             </div>
           )}
         </div>
      )}

      {/* Tab: Minigames (Restored logic) */}
      {activeTab === 'minigames' && (<div className="grid grid-cols-1 lg:grid-cols-12 gap-16 animate-in fade-in duration-300"><div className="lg:col-span-5 bg-white p-16 rounded-[4.5rem] border-4 border-slate-200 shadow-2xl space-y-12 relative overflow-hidden"><div className="absolute top-0 left-0 w-4 h-full bg-purple-600"></div><h3 className="text-4xl font-black italic uppercase border-l-[12px] border-purple-600 pl-8 leading-none">小游戏战略部署</h3><form onSubmit={handleCreateMinigame} className="space-y-10"><input name="title" placeholder="标题 TITLE" required className={inputClass} /><input name="short_desc" placeholder="简介 SHORT DESC" className={inputClass} /><div className="grid grid-cols-2 gap-8"><input name="start_date" type="date" required className={inputClass} /><input name="start_time" type="time" required className={inputClass} /></div><input name="max_players" type="number" defaultValue="10" className={inputClass} /><textarea name="detailed_desc" placeholder="规则设计 RULES & INTEL" className={inputClass + " h-52 text-sm leading-relaxed"} /><div className="space-y-4"><label className="text-[10px] font-black uppercase opacity-40 tracking-[0.3em] px-4">Tactical Asset Reward 奖励假卡</label><select name="fake_card_id" required className={selectClass}>{fakeCards.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><button type="submit" className="w-full bg-purple-600 text-white font-black py-10 rounded-[3rem] shadow-[0_30px_80px_rgba(147,51,234,0.4)] text-3xl uppercase italic border-b-[16px] border-purple-900 active:border-b-0 active:translate-y-4">正式发布活动 START</button></form></div><div className="lg:col-span-7 space-y-10">{minigames.map(g=>(<div key={g.id} className="bg-white p-12 rounded-[5rem] border-4 border-slate-200 shadow-2xl flex flex-col md:flex-row gap-12 relative overflow-hidden transition-all hover:shadow-purple-600/20"><div className="flex-1 space-y-8"><div><span className={`px-8 py-2 rounded-2xl text-xs font-black uppercase shadow-xl ${g.status==='recruiting'?'bg-green-600':'bg-orange-600'} text-white`}>{g.status}</span><h3 className="text-6xl font-black tracking-tighter uppercase mt-8 drop-shadow-2xl text-slate-900 leading-none">{g.title}</h3></div><p className="text-xl font-bold opacity-50 border-l-[12px] border-purple-600 pl-10 leading-relaxed italic">{g.short_desc}</p><div className="grid grid-cols-2 gap-10 text-xs font-black uppercase opacity-60 italic tracking-[0.3em]"><p>🕒 {g.start_date} {g.start_time}</p><p>👥 {g.participant_count} / {g.max_players} DEPLOYED</p><p>🎁 REWARD: {g.fake_card_name}</p>{g.winner_id && <p className="text-green-600 font-bold scale-150 origin-left drop-shadow-sm">🏆 Winner: {g.winner_name}</p>}</div></div><div className="flex flex-col gap-6 justify-center min-w-[340px]">{g.status==='recruiting' && <button onClick={()=>handleMinigameStatus(g.id,'start')} className="bg-orange-600 text-white font-black py-8 rounded-[3rem] shadow-[0_25px_70px_rgba(249,115,22,0.4)] hover:scale-105 transition-all text-xl uppercase italic border-b-[16px] border-orange-900">锁定报名 LOCK & START</button>}{g.status==='active' && <div className="space-y-6 bg-slate-900 p-10 rounded-[4rem] border-4 border-orange-600/30 shadow-2xl shadow-orange-600/20"><label className="text-[11px] font-black uppercase opacity-60 block text-center tracking-[0.5em] text-orange-400 animate-pulse">判定最终胜者 WINNER</label><select className={selectClass + " p-6 text-sm bg-white border-8 border-slate-800 shadow-inner"} onChange={(e)=>handleMinigameStatus(g.id,'finish',e.target.value)}><option value="">判定胜负结果...</option>{participants.filter(p=>p.minigame_id===g.id).map(p=><option key={p.user_id} value={p.user_id}>{p.username} ({p.team==='red'?'红队':'蓝队'})</option>)}</select></div>}<button onClick={async ()=>{if(confirm('TERMINATE?')) { await fetch('/api/admin/minigames',{method:'POST',headers: { 'Content-Type': 'application/json' },body:JSON.stringify({action:'delete',id:g.id})}); fetchData(true); }}} className="text-slate-300 font-black text-xs hover:text-red-600 tracking-[0.5em] mt-8 uppercase transition-all text-center underline decoration-slate-200">Terminate Project</button></div></div>))}</div></div>)}
    </div>
  );
};
