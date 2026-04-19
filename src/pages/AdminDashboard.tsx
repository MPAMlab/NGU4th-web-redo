import React, { useEffect, useState } from 'react';
import { 
  Users, Trophy, Swords, Zap, Settings, Info, Save, Trash2, ArrowUp, ArrowDown, 
  RotateCcw, Plus, Edit, X, LayoutDashboard, Database, Activity, Search, Award, ChevronLeft, PlusCircle, Filter, BookOpen, Star
} from 'lucide-react';

interface Achievement {
  id: number;
  name: string;
  condition: string;
  scene: string;
  notes: string;
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

const Badge = ({ children, className, variant = 'default' }: { children: React.ReactNode, className?: string, variant?: 'default' | 'outline' | 'secondary' }) => {
  const base = "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm transition-all";
  const variants = {
    default: "bg-indigo-600 text-white",
    outline: "bg-transparent border border-indigo-200 text-indigo-600",
    secondary: "bg-slate-100 text-slate-900 border border-slate-200"
  };
  return <span className={`${base} ${variants[variant]} ${className}`}>{children}</span>;
};

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'members' | 'achievements' | 'templates' | 'matches' | 'live' | 'library'>('members');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [userAchievements, setUserAchievements] = useState<any[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [cardLibrary, setCardLibrary] = useState<Card[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [systemState, setSystemState] = useState<any>({});
  
  const [applyRedJoker, setApplyRedJoker] = useState(true);
  const [applyBlueJoker, setApplyBlueJoker] = useState(true);
  const [editingCard, setEditingCard] = useState<Partial<Card> | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Partial<Achievement> | null>(null);
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'joker' | 'tarot' | 'fake'>('all');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [achRes, regRes, matchRes, cardRes, sysRes] = await Promise.all([
        fetch('/api/admin/achievements'),
        fetch('/api/admin/registration'),
        fetch('/api/admin/matches'),
        fetch('/api/admin/cards'),
        fetch('/api/admin/system')
      ]);
      const [achData, regData, matchData, cardData, sysData] = await Promise.all([
        achRes.json(), regRes.json(), matchRes.json(), cardRes.json(), sysRes.json()
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
    } catch (err: any) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const switchTab = (tab: any) => { setActiveTab(tab); fetchData(true); };

  const handleAchievementAction = async (action: string, payload: any) => {
    await fetch('/api/admin/achievements', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }) 
    });
    setEditingTemplate(null);
    fetchData(true);
  };

  const handleMemberAction = async (targetKindeId: string, action: string, value: any) => {
    const body: any = { targetKindeId, action };
    if (action === 'set_team') body.team = value;
    if (action === 'set_joker') body.jokerCardId = value;
    await fetch('/api/admin/registration', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
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

  const handleSetActiveMatch = async (matchId: string | null) => {
    await fetch('/api/admin/system', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'active_match_id', value: matchId }) 
    });
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
  const redPlayer = members.find(m => m.kinde_id === activeMatch?.red_player_id);
  const bluePlayer = members.find(m => m.kinde_id === activeMatch?.blue_player_id);
  const redTeamFakeCards = inventory.filter(i => i.owner_id === 'red' && i.card_type === 'fake');
  const blueTeamFakeCards = inventory.filter(i => i.owner_id === 'blue' && i.card_type === 'fake');
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
           <div><h1 className="text-xl font-black tracking-tighter uppercase italic leading-none">NGU4th Admin</h1><p className="text-[8px] font-bold opacity-40 uppercase tracking-widest">Global Ops v9.6</p></div>
        </div>
        <div className="flex gap-2">
          <a href="/live" target="_blank" className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-black text-[9px] uppercase transition-all flex items-center gap-2 italic tracking-wider border border-white/5"><Activity size={12} /> Live View</a>
          <a href="/dashboard" className="bg-slate-800 hover:bg-black text-white px-4 py-2 rounded-lg font-black text-[9px] uppercase transition-all flex items-center gap-2 border border-white/5">Dashboard</a>
        </div>
      </header>

      <nav className="flex gap-1 bg-slate-200/50 p-1 rounded-xl w-fit border border-slate-200">
        {(['members', 'achievements', 'templates', 'matches', 'live', 'library'] as const).map(tab => (
          <button key={tab} onClick={() => switchTab(tab)} className={`px-4 py-1.5 rounded-lg font-black transition-all whitespace-nowrap uppercase tracking-tighter text-[9px] ${activeTab === tab ? 'bg-white shadow-sm text-indigo-600 border border-indigo-100' : 'text-slate-500 hover:text-slate-800'}`}>
            {tab === 'members' ? '选手' : tab === 'achievements' ? '发放' : tab === 'templates' ? '成就库' : tab === 'matches' ? '赛程' : tab === 'live' ? '计分' : '牌库'}
          </button>
        ))}
      </nav>

      {/* Tab: Members */}
      {activeTab === 'members' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['red', 'blue'].map(team => (
              <div key={team} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className={`p-3 px-4 ${team === 'red' ? 'bg-red-600' : 'bg-blue-600'} text-white flex justify-between items-center`}><h3 className="font-black italic uppercase tracking-widest text-[10px]">{team} Team Sequence</h3><button onClick={()=>{fetch('/api/admin/cards',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'random_joker'})}).then(()=>fetchData(true))}} className="bg-white/10 hover:bg-white/20 p-1 px-2 rounded font-black text-[8px] uppercase border border-white/20">Shuffle Jokers</button></div>
                <div className="p-2 space-y-1">
                  {members.filter(m => m.team === team && m.is_registered === 1).map((m, i) => (
                    <div key={m.kinde_id} className="bg-slate-50 p-3 rounded-xl border border-transparent hover:border-indigo-100 hover:bg-white transition-all group flex items-center gap-3">
                        <span className="text-lg font-black italic text-slate-200 tabular-nums">#{i + 1}</span>
                        <div className="flex-1 font-black text-xs text-slate-800 uppercase truncate">{m.username}</div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                          <button onClick={() => handleReorder(m.kinde_id, 'up')} className="bg-white p-1 rounded border border-slate-200 hover:bg-indigo-600 hover:text-white"><ArrowUp size={10} /></button>
                          <button onClick={() => handleReorder(m.kinde_id, 'down')} className="bg-white p-1 rounded border border-slate-200 hover:bg-indigo-600 hover:text-white"><ArrowDown size={10} /></button>
                          <button onClick={() => handleMemberAction(m.kinde_id, 'set_team', team === 'red' ? 'blue' : 'red')} className="bg-white px-2 rounded border border-orange-200 text-orange-600 font-black text-[8px] uppercase hover:bg-orange-500 hover:text-white">Swap</button>
                        </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="bg-slate-50 p-3 px-4 border-b font-black text-[9px] uppercase tracking-widest text-slate-400">Master Roster</div>
             <table className="w-full text-left text-xs"><tbody className="divide-y divide-slate-100">{members.map(m => (<tr key={m.kinde_id} className="hover:bg-slate-50"><td className="p-3 font-black text-[11px]">{m.username}<span className="ml-2 opacity-30 font-bold lowercase text-[9px]">{m.email}</span></td><td className="p-3 text-center">{m.is_registered ? <Badge variant={m.team==='red'?'default':'secondary'}>{m.team}</Badge> : <span className="opacity-20 italic text-[9px]">Reserved</span>}</td><td className="p-3 text-right"><div className="flex justify-end gap-1"><button onClick={() => handleMemberAction(m.kinde_id, 'set_team', 'red')} className="px-2 py-1 bg-red-50 text-red-600 border border-red-100 rounded font-black hover:bg-red-600 hover:text-white text-[8px] uppercase">To Red</button><button onClick={() => handleMemberAction(m.kinde_id, 'set_team', 'blue')} className="px-2 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded font-black hover:bg-blue-600 hover:text-white text-[8px] uppercase">To Blue</button></div></td></tr>))}</tbody></table>
          </div>
        </div>
      )}

      {/* Tab: Achievement Templates (NEW CRUD) */}
      {activeTab === 'templates' && (
         <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
            <div className="lg:col-span-1 space-y-4">
               <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-black italic uppercase text-[10px] tracking-widest text-slate-400 flex items-center gap-2"><Plus size={12}/> {editingTemplate?.id ? '编辑成就' : '新建成就'}</h3>
                  <form onSubmit={(e)=>{ e.preventDefault(); const fd = new FormData(e.currentTarget); handleAchievementAction(editingTemplate?.id ? 'update_template' : 'create_template', { achievementId: editingTemplate?.id, name: fd.get('name'), condition: fd.get('condition'), scene: fd.get('scene'), notes: fd.get('notes') }); }} className="space-y-3">
                     <input name="name" defaultValue={editingTemplate?.name} required placeholder="成就名称" className={inputClass} />
                     <input name="condition" defaultValue={editingTemplate?.condition} placeholder="达成条件" className={inputClass} />
                     <input name="scene" defaultValue={editingTemplate?.scene} placeholder="获得场景" className={inputClass} />
                     <textarea name="notes" defaultValue={editingTemplate?.notes} placeholder="备注" className={inputClass + " h-20 resize-none"} />
                     <div className="flex gap-2">
                        <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-black uppercase text-[9px]">保存模板</button>
                        {editingTemplate && <button type="button" onClick={()=>setEditingTemplate(null)} className="px-3 bg-slate-100 rounded-lg text-[9px] font-black uppercase">取消</button>}
                     </div>
                  </form>
               </div>
            </div>
            <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="bg-slate-50 p-3 px-4 border-b font-black text-[9px] uppercase tracking-widest text-slate-400 flex justify-between items-center"><span>Achievement Library Achievement Definitions</span><Badge variant="outline">{achievements.length} Templates</Badge></div>
               <div className="overflow-auto max-h-[600px]"><table className="w-full text-left text-xs"><thead className="bg-slate-50 font-black border-b sticky top-0 bg-slate-50 z-10"><tr><th className="p-3">成就名称</th><th className="p-3">达成条件</th><th className="p-3">场景</th><th className="p-3 text-right">Ops</th></tr></thead><tbody className="divide-y divide-slate-100">{achievements.map(tpl => (<tr key={tpl.id} className="hover:bg-slate-50"><td className="p-3 font-black uppercase text-indigo-600">{tpl.name}</td><td className="p-3 text-slate-500 italic">{tpl.condition}</td><td className="p-3"><Badge variant="secondary" className="bg-opacity-50">{tpl.scene}</Badge></td><td className="p-3 text-right"><div className="flex justify-end gap-1"><button onClick={()=>setEditingTemplate(tpl)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><Edit size={14}/></button><button onClick={()=>{if(confirm('Delete?')) handleAchievementAction('delete_template', { achievementId: tpl.id })}} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={14}/></button></div></td></tr>))}</tbody></table></div>
            </div>
         </div>
      )}

      {/* Tab: Achievements Distribution */}
      {activeTab === 'achievements' && (
         <div className="space-y-4 animate-in fade-in duration-300">
            {!selectedUser ? (
               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                  <div className="font-black text-[10px] uppercase tracking-widest text-slate-400">Select Operative for Authorization</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">{members.map(m=>(<button key={m.kinde_id} onClick={()=>setSelectedUser(m.kinde_id)} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center gap-2 hover:border-indigo-600 hover:bg-white transition-all group"><div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-300 group-hover:text-indigo-600 transition-colors shadow-sm"><Users size={14}/></div><span className="font-black text-[8px] uppercase truncate w-full text-center">{m.username}</span></button>))}</div>
               </div>
            ) : (
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 animate-in slide-in-from-right-2">
                  <div className="lg:col-span-12 flex justify-between items-center bg-slate-900 p-4 px-6 rounded-xl text-white">
                     <div className="flex items-center gap-4"><div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center"><Users size={20}/></div><div><h2 className="text-lg font-black uppercase italic leading-none">{targetMember?.username}</h2><p className="text-[8px] font-bold opacity-30 mt-1 uppercase">{targetMember?.kinde_id}</p></div></div>
                     <button onClick={()=>setSelectedUser(null)} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg font-black text-[9px] uppercase transition-all flex items-center gap-2 italic border border-white/10"><ChevronLeft size={12}/> Back to Hub</button>
                  </div>
                  <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"><div className="bg-slate-50 p-3 border-b font-black text-[9px] uppercase tracking-widest text-slate-400">Grant Permissions</div><div className="overflow-auto max-h-[500px]"><table className="w-full text-left text-xs"><tbody className="divide-y divide-slate-100">{achievements.map(tpl=>{ const earned=earnedAchs.some(ua=>ua.achievement_id===tpl.id); return(<tr key={tpl.id} className="hover:bg-slate-50 transition-all group"><td className="p-3"><div className="flex flex-col"><span className="font-black text-[11px] uppercase">{tpl.name}</span><span className="opacity-40 italic font-bold text-[8px] uppercase truncate max-w-[300px]">{tpl.condition}</span></div></td><td className="p-3 text-right"><button disabled={earned} onClick={()=>handleAchievementAction('grant',{targetKindeId:selectedUser,achievementId:tpl.id})} className={`px-4 py-1.5 rounded-lg font-black text-[8px] uppercase transition-all ${earned?'bg-slate-50 text-slate-300':'bg-indigo-600 text-white hover:scale-105 active:scale-95'}`}>{earned?'Ready':'Grant'}</button></td></tr>); })}</tbody></table></div></div>
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
           <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"><div className="bg-slate-50 p-3 px-4 border-b font-black text-[9px] uppercase tracking-widest text-slate-400">Active Pipeline</div><div className="p-3 space-y-2">{matches.map((m,i)=>{ const isActive=systemState.active_match_id === m.id.toString(); return(<div key={m.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${isActive ? 'bg-indigo-600 border-indigo-500 shadow-lg text-white' : 'bg-slate-50 border-slate-100 hover:border-indigo-100'}`}><span className={`text-2xl font-black italic tabular-nums w-10 ${isActive ? 'text-white/20' : 'text-slate-200'}`}>#{i+1}</span><div className="flex-1 flex justify-between font-black uppercase text-xs italic tracking-tighter"><span className={isActive ? 'text-white' : 'text-red-600'}>{m.red_player_name}</span><span className="opacity-10 scale-50">VS</span><span className={isActive ? 'text-white' : 'text-blue-600'}>{m.blue_player_name}</span></div><div className="flex flex-col gap-1">{isActive ? <button onClick={()=>handleSetActiveMatch(null)} className="bg-white text-indigo-600 px-3 py-1 rounded font-black text-[8px] uppercase">Stop</button> : <button onClick={()=>handleSetActiveMatch(m.id.toString())} className="bg-blue-600 text-white px-3 py-1 rounded font-black text-[8px] uppercase">Engage</button>}<button onClick={async ()=>{ if(confirm('Scrap?')) { await fetch('/api/admin/matches',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',matchId:m.id})}); fetchData(true); } }} className={`text-[7px] font-black uppercase text-center ${isActive ? 'text-white/40' : 'text-slate-300'}`}>Scrap</button></div></div>); })}</div></div>
        </div>
      )}

      {/* Tab: Scoring */}
      {activeTab === 'live' && (
        <div className="space-y-4 animate-in fade-in duration-700">
           {!activeMatch ? (<div className="bg-white p-20 rounded-3xl border-4 border-dashed border-slate-100 text-center space-y-4 animate-pulse"><div className="text-4xl opacity-10">📡</div><h2 className="text-xl font-black uppercase italic tracking-widest opacity-20">Awaiting Active Match Link</h2></div>) : (
             <div className="space-y-6">
                <div className="bg-slate-900 p-6 rounded-2xl shadow-xl flex justify-between items-center border-x-4 border-indigo-600"><div className="space-y-1"><div className="text-[8px] font-black uppercase tracking-[0.4em] text-indigo-500 italic">🔴 DATA STREAM ACTIVE</div><h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none text-white">{activeMatch.red_player_name} <span className="opacity-10 text-xs">VS</span> {activeMatch.blue_player_name}</h2></div><button onClick={() => handleSetActiveMatch(null)} className="bg-white text-slate-950 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] italic border-b-4 border-slate-300 active:border-b-0 active:translate-y-1 transition-all">FINISH</button></div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                   {['red', 'blue'].map((team, idx) => {
                      const isRound1 = activeMatch.round_1_status !== 'completed';
                      const currentRoundType = isRound1 ? 'red_pick' : 'blue_pick';
                      const isHome = (team === 'red' && isRound1) || (team === 'blue' && !isRound1);
                      const player = team === 'red' ? redPlayer : bluePlayer;
                      const useJoker = team === 'red' ? applyRedJoker : applyBlueJoker;
                      const setUseJoker = team === 'red' ? setApplyRedJoker : setApplyBlueJoker;
                      return (
                        <div key={team} className={`space-y-3 ${(idx === 0 && activeMatch.round_1_status === 'completed') || (idx === 1 && activeMatch.round_2_status === 'completed') ? 'opacity-20 grayscale pointer-events-none scale-95 transition-all' : ''}`}><div className={`p-4 rounded-t-2xl ${team === 'red' ? 'bg-red-600' : 'bg-blue-600'} text-white text-center`}><h3 className="text-lg font-black italic uppercase leading-none">ROUND {isRound1 ? '1' : '2'}</h3><p className="text-[8px] font-black uppercase opacity-70 tracking-widest">{isRound1 ? "RED'S PICK" : "BLUE'S PICK"}</p></div>
                           <form onSubmit={(e)=>handleCommitRound(e, currentRoundType)} className="bg-white p-6 rounded-b-2xl border-x border-b border-slate-200 shadow-sm space-y-6">
                              <div className="space-y-6"><div className="flex justify-between items-center border-b pb-4"><h4 className={`font-black text-xl uppercase italic leading-none tracking-tighter ${team === 'red' ? 'text-red-600' : 'text-blue-600'}`}>{player?.username}</h4><Badge className={`px-4 py-1 rounded-lg font-black text-[8px] uppercase ${isHome ? (team === 'red' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white') : 'bg-slate-900 text-slate-500'}`}>{isHome ? 'HOME' : 'AWAY'}</Badge></div>
                                 <div className="space-y-2"><label className="text-[8px] font-black uppercase opacity-40 tracking-widest block text-center italic">1. Base Score</label><input name={`${team}_base`} type="number" step="any" required placeholder="0.0" className="w-full text-center text-5xl font-black p-4 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-indigo-600" /></div>
                                 <div className={`p-4 rounded-xl border transition-all space-y-4 ${isHome ? 'bg-indigo-50/20 border-indigo-100' : 'bg-slate-50 opacity-40 border-slate-200'}`}>
                                    <div className="flex justify-between items-start"><div className="flex-1"><label className={`text-[8px] font-black uppercase tracking-widest ${isHome ? 'text-indigo-600 opacity-100' : 'opacity-40'}`}>2. Joker: {player?.joker_name || 'NONE'}</label></div>{isHome && player?.joker_card_id && <label className="flex items-center gap-2 cursor-pointer bg-indigo-600 text-white px-3 py-1.5 rounded-lg border-b-2 border-indigo-900 active:border-b-0 active:translate-y-0.5"><input type="checkbox" checked={useJoker} onChange={(e)=>setUseJoker(e.target.checked)} className="w-4 h-4" /><span className="text-[8px] font-black uppercase italic">APPLY</span></label>}</div>
                                    <div className="relative">{(isHome && useJoker) ? <div className="relative"><input name={`${team}_mult`} type="number" step="any" defaultValue={player?.joker_is_variable ? "" : (player?.joker_multiplier || 1.5)} placeholder={player?.joker_is_variable ? "录入最终倍率..." : ""} readOnly={!player?.joker_is_variable} className={`w-full p-4 rounded-xl font-black text-4xl text-center outline-none ${player?.joker_is_variable ? 'bg-white border-indigo-500 border-2 shadow-inner' : 'bg-slate-100 text-slate-400'}`} /></div> : <input value="1.0" readOnly className="w-full bg-slate-100 p-4 rounded-xl font-black text-4xl text-center opacity-30 border border-slate-200 outline-none" />}</div>
                                 </div>
                                 <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[7px] font-black uppercase opacity-40 block tracking-widest italic">3. Tarot</label><select name={`${team}_tarot`} className={selectClass}><option value="">None</option>{cardLibrary.filter(c=>c.type==='tarot').map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div><div className="space-y-1"><label className="text-[7px] font-black uppercase opacity-40 block tracking-widest italic">4. Hand</label><input name={`${team}_hand`} placeholder="e.g. Flush" className={inputClass} /></div></div>
                                 <div className="bg-emerald-600/5 p-4 rounded-xl border-4 border-emerald-600/5 space-y-4 shadow-inner"><p className="text-[7px] font-black uppercase text-emerald-600 tracking-widest text-center italic opacity-60">5. Team Fake Cards</p><div className="grid grid-cols-2 gap-2">{(team === 'red' ? redTeamFakeCards : blueTeamFakeCards).map(f=><label key={f.id} className="flex items-center gap-2 cursor-pointer bg-white/80 p-2 rounded-lg border border-slate-100 shadow-sm"><input type="checkbox" name={`${team}_fake_cards`} value={f.card_id} className="w-4 h-4 accent-emerald-600" /><span className="text-[9px] font-black uppercase italic truncate leading-none">{f.card_name}</span></label>)}</div></div>
                              </div>
                              <button type="submit" className={`w-full ${team === 'red' ? 'bg-red-600 border-red-800' : 'bg-blue-600 border-blue-800'} text-white font-black py-6 rounded-2xl text-3xl uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all italic border-b-8 mt-4`}>COMMIT</button>
                           </form>
                        </div>
                      )
                   })}
                </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
};
