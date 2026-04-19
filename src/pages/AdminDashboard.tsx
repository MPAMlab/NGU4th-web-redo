import React, { useEffect, useState } from 'react';
import { 
  Users, Trophy, Swords, Zap, Settings, Info, Save, Trash2, ArrowUp, ArrowDown, 
  RotateCcw, Plus, Edit, X, LayoutDashboard, Database, Activity, Search, Award, ChevronLeft, PlusCircle, Filter
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

const Badge = ({ children, className, variant = 'default' }: { children: React.ReactNode, className?: string, variant?: 'default' | 'outline' | 'secondary' }) => {
  const base = "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm transition-all";
  const variants = {
    default: "bg-indigo-600 text-white",
    outline: "bg-transparent border border-slate-200 text-slate-500",
    secondary: "bg-slate-100 text-slate-900 border border-slate-200"
  };
  return <span className={`${base} ${variants[variant]} ${className}`}>{children}</span>;
};

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'members' | 'achievements' | 'matches' | 'live' | 'library'>('members');
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
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'joker' | 'tarot' | 'fake'>('all');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const switchTab = (tab: any) => { setActiveTab(tab); fetchData(true); };

  const handleAchievementToggle = async (targetKindeId: string, achievementId: number, hasAchievement: boolean) => {
    await fetch('/api/admin/achievements', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetKindeId, achievementId, action: hasAchievement ? 'revoke' : 'grant' }) 
    });
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

  const handleCreateMatch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const redPlayerId = formData.get('red') as string;
    const bluePlayerId = formData.get('blue') as string;
    if (!redPlayerId || !bluePlayerId) return;
    await fetch('/api/admin/matches', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', redPlayerId, bluePlayerId, orderIndex: matches.length }) 
    });
    fetchData(true);
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

  if (loading) return <div className="flex items-center justify-center h-screen bg-background font-black text-indigo-600 animate-pulse tracking-widest uppercase">NGU4th ENGINE LOADING...</div>;

  const activeMatch = matches.find(m => m.id.toString() === systemState.active_match_id);
  const redPlayer = members.find(m => m.kinde_id === activeMatch?.red_player_id);
  const bluePlayer = members.find(m => m.kinde_id === activeMatch?.blue_player_id);
  const redTeamFakeCards = inventory.filter(i => i.owner_id === 'red' && i.card_type === 'fake');
  const blueTeamFakeCards = inventory.filter(i => i.owner_id === 'blue' && i.card_type === 'fake');
  const filteredLibrary = cardLibrary.filter(c => libraryFilter === 'all' || c.type === libraryFilter);
  const targetMember = members.find(m => m.kinde_id === selectedUser);
  const earnedAchs = userAchievements.filter(ua => ua.kinde_id === selectedUser);

  const inputClass = "w-full bg-white p-2.5 rounded-lg font-bold border-2 border-slate-200 focus:border-indigo-600 transition-all outline-none text-sm";
  const selectClass = "w-full bg-white p-2.5 rounded-lg font-black border-2 border-slate-200 focus:border-indigo-600 outline-none cursor-pointer text-sm";

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-center bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg"><LayoutDashboard size={24} /></div>
           <div><h1 className="text-2xl font-black tracking-tighter uppercase italic leading-none">NGU4th Admin</h1><p className="text-[9px] font-bold opacity-40 uppercase tracking-widest mt-1">Command Unit v9.5</p></div>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <a href="/live" target="_blank" className="bg-white text-slate-900 px-6 py-2 rounded-xl font-black text-[10px] uppercase hover:bg-indigo-500 hover:text-white transition-all shadow-lg flex items-center gap-2 italic"><Activity size={14} /> 实时大屏</a>
          <a href="/dashboard" className="bg-slate-800 text-white/80 px-6 py-2 rounded-xl font-black text-[10px] uppercase hover:bg-black hover:text-white transition-all flex items-center gap-2"><RotateCcw size={14} /> 个人中心</a>
        </div>
      </header>

      <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-2xl w-fit overflow-x-auto border border-slate-200 shadow-inner">
        {(['members', 'achievements', 'matches', 'live', 'library'] as const).map(tab => (
          <button key={tab} onClick={() => switchTab(tab)} className={`px-6 py-2.5 rounded-xl font-black transition-all whitespace-nowrap uppercase tracking-tighter text-[10px] ${activeTab === tab ? 'bg-white shadow-md text-indigo-600 border border-indigo-100 scale-105' : 'text-slate-500 hover:text-slate-900'}`}>
            {tab === 'members' ? '选手序列' : tab === 'achievements' ? '成就分发' : tab === 'matches' ? '赛程管道' : tab === 'live' ? '🔴 计分台' : '牌库维护'}
          </button>
        ))}
      </div>

      {activeTab === 'members' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm flex items-center justify-between"><div className="space-y-1"><h4 className="text-[10px] font-black uppercase text-red-600 tracking-widest opacity-60">Red Exponent</h4><p className="text-xl font-black text-slate-900">红队永久次方</p></div><input type="number" step="0.01" value={systemState.red_exponent || '1.0'} onChange={(e)=>fetch('/api/admin/system',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'red_exponent',value:e.target.value})}).then(()=>fetchData(true))} className="w-24 bg-slate-50 p-3 rounded-xl font-black text-xl text-center border-2 border-slate-200" /></div>
             <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm flex items-center justify-between"><div className="space-y-1"><h4 className="text-[10px] font-black uppercase text-blue-600 tracking-widest opacity-60">Blue Exponent</h4><p className="text-xl font-black text-slate-900">蓝队永久次方</p></div><input type="number" step="0.01" value={systemState.blue_exponent || '1.0'} onChange={(e)=>fetch('/api/admin/system',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'blue_exponent',value:e.target.value})}).then(()=>fetchData(true))} className="w-24 bg-slate-50 p-3 rounded-xl font-black text-xl text-center border-2 border-slate-200" /></div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {['red', 'blue'].map(team => (
              <div key={team} className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-xl overflow-hidden">
                <div className={`p-5 ${team === 'red' ? 'bg-red-600' : 'bg-blue-600'} text-white flex justify-between items-center shadow-lg`}><h3 className="font-black italic uppercase tracking-widest text-sm">{team} Deployment</h3><button onClick={()=>{fetch('/api/admin/cards',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'random_joker'})}).then(()=>fetchData(true))}} className="bg-white/20 p-1.5 px-3 rounded-lg text-[9px] font-black uppercase transition-all border border-white/30">🎲 Shuffle Jokers</button></div>
                <div className="p-4 space-y-3">
                  {members.filter(m => m.team === team && m.is_registered === 1).map((m, i) => (
                    <div key={m.kinde_id} className="bg-slate-50 p-4 rounded-2xl border-2 border-transparent hover:border-indigo-100 hover:bg-white transition-all group">
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-black italic text-slate-200 w-8 tabular-nums">#{i + 1}</span>
                        <div className="flex-1 font-black text-sm text-slate-900 uppercase truncate">{m.username}</div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => handleReorder(m.kinde_id, 'up')} className="bg-white p-1.5 rounded-lg border border-slate-200 hover:bg-indigo-600 hover:text-white"><ArrowUp size={12} /></button>
                          <button onClick={() => handleReorder(m.kinde_id, 'down')} className="bg-white p-1.5 rounded-lg border border-slate-200 hover:bg-indigo-600 hover:text-white"><ArrowDown size={12} /></button>
                          <button onClick={() => handleMemberAction(m.kinde_id, 'set_team', team === 'red' ? 'blue' : 'red')} className="bg-white p-1.5 px-3 rounded-lg border border-orange-200 text-orange-600 font-black text-[9px] uppercase hover:bg-orange-500 hover:text-white">Swap</button>
                        </div>
                      </div>
                      <select value={m.joker_card_id || ''} onChange={(e) => handleMemberAction(m.kinde_id, 'set_joker', e.target.value ? parseInt(e.target.value) : null)} className="w-full bg-white mt-3 p-2 rounded-lg text-[10px] font-black border border-slate-200 focus:border-indigo-600 outline-none"><option value="">Assign Joker...</option>{cardLibrary.filter(c=>c.type==='joker').map(j => <option key={j.id} value={j.id}>{j.name}</option>)}</select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-xl overflow-hidden">
             <div className="bg-slate-900 p-6 flex justify-between items-center text-white"><h3 className="font-black italic uppercase text-xs tracking-[0.2em]">Global Roster 全员名单</h3><Badge variant="outline">{members.length} Users</Badge></div>
             <div className="overflow-auto max-h-[400px]"><table className="w-full text-left text-xs"><thead className="bg-slate-50 font-black border-b sticky top-0 bg-white"><tr><th className="px-6 py-4">Operator</th><th className="px-6 py-4 text-center">Status</th><th className="px-6 py-4 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{members.map(m => (<tr key={m.kinde_id} className="hover:bg-slate-50 transition-all group"><td className="px-6 py-4 font-black">{m.username}<p className="opacity-40 text-[9px] font-bold lowercase">{m.email}</p></td><td className="px-6 py-4 text-center">{m.is_registered ? <Badge variant={m.team==='red'?'default':'secondary'} className="bg-opacity-20 text-current border-none">Active ({m.team})</Badge> : <span className="opacity-20 italic">Reserve</span>}</td><td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => handleMemberAction(m.kinde_id, 'set_team', 'red')} className="px-3 py-1.5 bg-red-600 text-white rounded-lg font-black hover:bg-red-700 uppercase">To Red</button><button onClick={() => handleMemberAction(m.kinde_id, 'set_team', 'blue')} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-black hover:bg-blue-700 uppercase">To Blue</button></div></td></tr>))}</tbody></table></div>
          </div>
        </div>
      )}

      {activeTab === 'library' && (
         <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-xl overflow-hidden animate-in fade-in duration-300">
            <div className="p-8 border-b-2 border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
               <div className="space-y-4">
                  <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
                    {(['all', 'joker', 'tarot', 'fake'] as const).map(f => (
                      <button key={f} onClick={()=>setLibraryFilter(f)} className={`px-6 py-2 rounded-lg font-black text-[10px] uppercase transition-all ${libraryFilter === f ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}>{f}</button>
                    ))}
                  </div>
               </div>
               <button onClick={()=>setEditingCard({ type: 'joker', is_variable: 0, multiplier: 1.0, exponent_bonus: 0.0 })} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] shadow-lg hover:scale-105 transition-all italic flex items-center gap-2"><Plus size={14} /> 新增资产部署</button>
            </div>
            <div className="overflow-auto max-h-[700px]">
               <table className="w-full text-left text-xs"><thead className="bg-slate-50 font-black border-b sticky top-0 bg-slate-50 z-10 uppercase tracking-widest"><tr><th className="px-8 py-4">Asset Name 名称</th><th className="px-8 py-4">Category 类型</th><th className="px-8 py-4">Logic 效果</th><th className="px-8 py-4 text-right">Ops 管理</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredLibrary.map(card => (<tr key={card.id} className="hover:bg-slate-50 transition-all group"><td className="px-8 py-5 font-black text-sm uppercase truncate max-w-[200px]">{card.name}</td><td className="px-8 py-5"><Badge variant="outline">{card.type}</Badge></td><td className="px-8 py-5 font-bold text-slate-400 italic line-clamp-1 h-12 leading-relaxed" title={card.description}>{card.description}</td><td className="px-8 py-5 text-right"><div className="flex justify-end gap-2"><button onClick={()=>setEditingCard(card)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit size={16} /></button><button onClick={()=>{if(confirm('SCRAP?')) handleCardCRUD('delete_card', { cardId: card.id })}} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button></div></td></tr>))}</tbody></table>
            </div>
            {editingCard && (
               <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-in fade-in"><div className="bg-white p-10 rounded-[3.5rem] border-4 border-indigo-600 shadow-2xl max-w-lg w-full space-y-8 animate-in zoom-in-95 duration-500"><h3 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">{editingCard.id ? 'Update Intel' : 'Deploy Asset'}</h3><form onSubmit={(e)=>{ e.preventDefault(); const fd = new FormData(e.currentTarget); handleCardCRUD(editingCard.id ? 'update_card' : 'create_card', { cardId: editingCard.id, name: fd.get('name'), type: fd.get('type'), description: fd.get('description'), multiplier: parseFloat(fd.get('multiplier') as string), exponent_bonus: parseFloat(fd.get('exponent_bonus') as string), is_variable: fd.get('is_variable') === 'on' ? 1 : 0 }); }} className="space-y-6"><input name="name" defaultValue={editingCard.name} required placeholder="Asset Name" className={inputClass} /><select name="type" defaultValue={editingCard.type} className={selectClass}><option value="joker">小丑牌 (Joker)</option><option value="tarot">塔罗牌 (Tarot)</option><option value="fake">假卡 (Fake)</option></select><textarea name="description" defaultValue={editingCard.description} required placeholder="Data Intel" className={inputClass + " h-32 text-xs leading-relaxed"} /><div className="grid grid-cols-2 gap-4"><input name="multiplier" type="number" step="0.001" defaultValue={editingCard.multiplier || 1.0} placeholder="Mult" className={inputClass} /><input name="exponent_bonus" type="number" step="0.001" defaultValue={editingCard.exponent_bonus || 0.0} placeholder="Exp" className={inputClass} /></div><label className="flex items-center gap-4 bg-slate-50 p-5 rounded-2xl border-2 border-slate-100 cursor-pointer"><input name="is_variable" type="checkbox" defaultChecked={editingCard.is_variable === 1} className="w-6 h-6 accent-indigo-600" /><div className="flex flex-col"><span className="font-black uppercase text-[10px] tracking-widest text-slate-900">Variable Multiplier Entry</span><span className="text-[8px] opacity-40 uppercase">Allows manual input in scoring stream</span></div></label><div className="flex gap-4 pt-4"><button type="submit" className="flex-1 bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black uppercase shadow-xl hover:scale-105 transition-all">确认并保存资料 CONFIRM</button><button type="button" onClick={()=>setEditingCard(null)} className="flex-1 bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase">CANCEL</button></div></form></div></div>
            )}
         </div>
      )}

      {activeTab === 'achievements' && (
         <div className="space-y-6 animate-in fade-in duration-500">
            {!selectedUser ? (
               <div className="bg-white p-10 rounded-[2.5rem] border-2 border-slate-100 shadow-xl space-y-8"><div className="border-l-4 border-indigo-600 pl-4 font-black">选择受控成员<p className="text-[10px] opacity-30 uppercase tracking-[0.3em]">Operator Selection Hub</p></div><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">{members.map(m=>(<button key={m.kinde_id} onClick={()=>setSelectedUser(m.kinde_id)} className="p-5 bg-slate-50 border border-slate-200 rounded-3xl flex flex-col items-center gap-2 hover:border-indigo-600 hover:shadow-lg transition-all group active:scale-95"><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-300 group-hover:text-indigo-600 transition-colors shadow-sm"><Users size={20}/></div><span className="font-black text-[10px] uppercase truncate w-full text-center">{m.username}</span></button>))}</div></div>
            ) : (
               <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                  <div className="flex items-center justify-between bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl"><div className="flex items-center gap-6"><div className="w-16 h-16 bg-indigo-600 rounded-[1.2rem] flex items-center justify-center shadow-2xl"><Users size={28}/></div><div><h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">{targetMember?.username}</h2><p className="text-[10px] font-bold opacity-30 mt-2 uppercase tracking-widest">{targetMember?.kinde_id}</p></div></div><button onClick={()=>setSelectedUser(null)} className="bg-white/10 hover:bg-white/20 px-8 py-3 rounded-2xl font-black text-[10px] uppercase transition-all flex items-center gap-2"><ChevronLeft size={16}/> Back to List</button></div>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                     <div className="lg:col-span-7 bg-white rounded-[3rem] border-2 border-slate-100 shadow-xl overflow-hidden"><div className="bg-slate-50 p-6 border-b font-black text-[10px] uppercase tracking-widest opacity-40">Authorization Terminal</div><div className="overflow-auto max-h-[600px]"><table className="w-full text-left text-xs"><tbody className="divide-y divide-slate-100">{achievements.map(tpl=>{ const earned=earnedAchs.some(ua=>ua.achievement_id===tpl.id); return(<tr key={tpl.id} className="hover:bg-slate-50 transition-all group"><td className="px-8 py-5"><div className="flex flex-col gap-0.5"><span className="font-black text-sm uppercase">{tpl.name}</span><span className="opacity-40 italic font-bold text-[9px] uppercase tracking-tighter leading-none">{tpl.condition}</span></div></td><td className="px-8 py-5 text-right"><button disabled={earned} onClick={()=>handleAchievementToggle(selectedUser!,tpl.id,false)} className={`px-8 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all shadow-md ${earned?'bg-slate-100 text-slate-300':'bg-indigo-600 text-white hover:scale-105 active:scale-95'}`}>{earned?'Authorized':'Grant'}</button></td></tr>); })}</tbody></table></div></div>
                     <div className="lg:col-span-5 bg-indigo-600 p-10 rounded-[3.5rem] text-white shadow-[0_40px_100px_rgba(79,70,229,0.3)] relative overflow-hidden"><div className="absolute top-[-50px] right-[-50px] opacity-10 rotate-12"><Trophy size={200}/></div><h3 className="text-2xl font-black italic uppercase tracking-tighter mb-8 border-b-2 border-white/10 pb-4">成就资料库 ({earnedAchs.length})</h3><div className="space-y-4">{earnedAchs.map(ua=>{ const tpl=achievements.find(a=>a.id===ua.achievement_id); return(<div key={ua.id} className="bg-white p-4 rounded-2xl flex items-center justify-between group shadow-xl"><div className="flex items-center gap-4"><div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><Award size={20}/></div><div className="font-black text-[10px] text-slate-900 uppercase leading-none">{tpl?.name}</div></div><button onClick={()=>handleAchievementToggle(selectedUser!,ua.achievement_id,true)} className="p-2 text-slate-200 hover:text-red-600 transition-all"><Trash2 size={18}/></button></div>); })}</div></div>
                  </div>
               </div>
            ) }
         </div>
      )}

      {activeTab === 'matches' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
           <div className="lg:col-span-5 bg-white p-10 rounded-[3rem] border-2 border-slate-100 shadow-xl space-y-10"><div className="border-l-4 border-indigo-600 pl-4 font-black">赛程对阵排期<p className="text-[9px] opacity-30 uppercase tracking-[0.3em]">Encounter Deployment</p></div><form onSubmit={handleCreateMatch} className="space-y-8"><select name="red" className={selectClass}><option value="">Red Player...</option>{members.filter(m=>m.is_registered===1 && m.team==='red').map(m=><option key={m.kinde_id} value={m.kinde_id}>{m.username}</option>)}</select><select name="blue" className={selectClass}><option value="">Blue Player...</option>{members.filter(m=>m.is_registered===1 && m.team==='blue').map(m=><option key={m.kinde_id} value={m.kinde_id}>{m.username}</option>)}</select><button type="submit" className="w-full bg-indigo-600 text-white font-black py-6 rounded-[1.5rem] shadow-xl uppercase border-b-8 border-indigo-900 active:border-b-0 active:translate-y-2 transition-all">部署赛程 DEPLOY</button></form></div>
           <div className="lg:col-span-7 bg-white p-8 rounded-[3.5rem] border shadow-xl relative overflow-hidden group"><div className="absolute -top-10 -right-10 text-[10rem] font-black italic text-slate-900/[0.02] uppercase pointer-events-none">Tactical</div><h3 className="text-xl font-black italic uppercase tracking-[0.4em] opacity-40 mb-6">Active Pipeline</h3><div className="space-y-5">{matches.map((m,i)=>{ const isActive=systemState.active_match_id === m.id.toString(); return(<div key={m.id} className={`flex items-center gap-6 p-8 rounded-[2.5rem] border-2 transition-all ${isActive ? 'bg-indigo-600 border-indigo-500 shadow-[0_30px_80px_rgba(79,70,229,0.3)] scale-105 z-10 text-white' : 'bg-slate-50 border-slate-100 hover:border-indigo-200'}`}><span className={`text-4xl font-black italic w-12 transition-all ${isActive ? 'text-white/20' : 'text-slate-200'}`}>#{i+1}</span><div className="flex-1 flex justify-between font-black uppercase text-xl italic tracking-tighter"><span className={isActive ? 'text-white' : 'text-red-600'}>{m.red_player_name}</span><span className="opacity-20 italic scale-50">VS</span><span className={isActive ? 'text-white' : 'text-blue-600'}>{m.blue_player_name}</span></div><div className="flex flex-col gap-2">{isActive ? <button onClick={()=>handleSetActiveMatch(null)} className="bg-white text-indigo-600 px-6 py-2 rounded-xl font-black text-[9px] uppercase shadow-xl transition-all">Deactivate</button> : <button onClick={()=>handleSetActiveMatch(m.id.toString())} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-black text-[9px] uppercase shadow-lg hover:scale-105 transition-all">Engage</button>}<button onClick={async ()=>{ if(confirm('Scrap?')) { await fetch('/api/admin/matches',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',matchId:m.id})}); fetchData(true); } }} className={`text-[8px] font-black uppercase mt-1 transition-all ${isActive ? 'text-white/40' : 'text-slate-300 hover:text-red-600'}`}>Scrap Record</button></div></div>); })}</div></div>
        </div>
      )}

      {activeTab === 'live' && (
        <div className="space-y-12 animate-in fade-in duration-700">
           {!activeMatch ? (<div className="bg-white p-32 rounded-[4rem] border-8 border-dashed border-slate-100 text-center space-y-8 animate-pulse"><div className="text-9xl grayscale opacity-10">📡</div><h2 className="text-4xl font-black uppercase italic tracking-tighter opacity-30 text-slate-900 leading-none tracking-widest">Workbench Awaiting Link</h2></div>) : (
             <div className="space-y-12">
                <div className="bg-slate-900 p-10 rounded-[4rem] shadow-2xl border-x-[16px] border-indigo-600 flex justify-between items-center relative overflow-hidden transition-all"><div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 via-indigo-600 to-blue-600"></div><div><div className="text-[9px] font-black uppercase tracking-[0.4em] text-indigo-500 mb-2 animate-pulse italic">🔴 Data Stream Hooked & Active</div><h2 className="text-5xl font-black italic tracking-tighter uppercase leading-none text-white">{activeMatch.red_player_name} <span className="opacity-10 px-6">VS</span> {activeMatch.blue_player_name}</h2></div><button onClick={() => handleSetActiveMatch(null)} className="bg-white text-slate-950 px-12 py-5 rounded-[2.5rem] font-black uppercase hover:bg-indigo-500 hover:text-white transition-all border-b-[10px] border-slate-300 active:border-b-0 active:translate-y-2 text-sm italic tracking-widest shadow-2xl">完结对抗 FINISH</button></div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                   {['red', 'blue'].map((team, idx) => {
                      const isRound1 = activeMatch.round_1_status !== 'completed';
                      const currentRoundType = isRound1 ? 'red_pick' : 'blue_pick';
                      const isHome = (team === 'red' && isRound1) || (team === 'blue' && !isRound1);
                      const player = team === 'red' ? redPlayer : bluePlayer;
                      const useJoker = team === 'red' ? applyRedJoker : applyBlueJoker;
                      const setUseJoker = team === 'red' ? setApplyRedJoker : setApplyBlueJoker;
                      return (
                        <div key={team} className={`space-y-8 ${(idx === 0 && activeMatch.round_1_status === 'completed') || (idx === 1 && activeMatch.round_2_status === 'completed') ? 'opacity-20 grayscale pointer-events-none scale-95 transition-all' : ''}`}><div className={`p-10 rounded-t-[4rem] ${team === 'red' ? 'bg-red-600' : 'bg-blue-600'} text-white shadow-2xl transition-all relative overflow-hidden text-center space-y-2`}><h3 className="text-4xl font-black italic tracking-tighter uppercase leading-none">ROUND {isRound1 ? '1' : '2'}</h3><p className="text-xs font-black uppercase opacity-70 tracking-[0.4em] italic">{isRound1 ? "红队自选曲 RED'S PICK" : "蓝队自选曲 BLUE'S PICK"}</p></div>
                           <form onSubmit={(e)=>handleCommitRound(e, currentRoundType)} className="bg-white p-12 rounded-b-[4rem] border-x-[6px] border-b-[6px] border-slate-100 shadow-2xl space-y-10">
                              <div className="space-y-10"><div className="flex justify-between items-center border-b-4 pb-6" style={{borderColor: team === 'red' ? 'rgba(220,38,38,0.1)' : 'rgba(37,99,235,0.1)'}}><h4 className={`font-black text-4xl uppercase italic leading-none tracking-tighter ${team === 'red' ? 'text-red-600' : 'text-blue-600'}`}>{player?.username}</h4><Badge className={`px-6 py-2 rounded-2xl font-black text-[9px] uppercase shadow-xl ${isHome ? (team === 'red' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white') : 'bg-slate-900 text-slate-500'}`}>{isHome ? '进攻方 HOME' : '防守方 Away'}</Badge></div>
                                 <div className="space-y-4"><label className="text-[10px] font-black uppercase opacity-40 tracking-[0.4em] block text-center italic">1. 基础分 Manual Base Score</label><input name={`${team}_base`} type="number" step="any" required placeholder="000.0" className={inputClass + " text-center text-7xl p-10 bg-slate-50 border-4 border-slate-300 shadow-inner scale-105 focus:scale-110 focus:border-indigo-600"} /></div>
                                 <div className={`p-10 rounded-[3rem] border-4 transition-all space-y-6 ${isHome ? 'bg-indigo-50/20 border-indigo-200 shadow-2xl shadow-indigo-100/50' : 'bg-slate-50 opacity-40 shadow-inner border-slate-200'}`}>
                                    <div className="flex justify-between items-start"><div className="flex-1 space-y-1"><label className={`text-[10px] font-black uppercase tracking-widest ${isHome ? 'text-indigo-600 opacity-100' : 'opacity-40'}`}>2. 小丑牌倍率 Joker Multiplier</label><p className="font-black text-2xl uppercase tracking-tighter leading-tight text-slate-900">{player?.joker_name || 'NO CARD DETECTED'}</p>{player?.joker_description && <div className="bg-white/80 p-5 rounded-[1.5rem] text-[11px] font-bold text-slate-600 italic mt-4 border-2 border-slate-100 shadow-inner leading-relaxed">{player.joker_description}</div>}</div>{isHome && player?.joker_card_id && <label className="flex items-center gap-3 cursor-pointer bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all border-b-8 border-indigo-900"><input type="checkbox" checked={useJoker} onChange={(e)=>setUseJoker(e.target.checked)} className="w-6 h-6 accent-white" /><span className="text-[9px] font-black uppercase italic tracking-widest leading-none">应用效果?</span></label>}</div>
                                    <div className="relative">{(isHome && useJoker) ? <div className="relative animate-in zoom-in-95 duration-500"><input name={`${team}_mult`} type="number" step="any" defaultValue={player?.joker_is_variable ? "" : (player?.joker_multiplier || 1.5)} placeholder={player?.joker_is_variable ? "手动录入最终倍率..." : "固定倍率已锁定"} readOnly={!player?.joker_is_variable} className={`w-full p-8 rounded-[2.5rem] font-black text-6xl text-center outline-none transition-all shadow-xl ${player?.joker_is_variable ? 'bg-white ring-[16px] ring-indigo-50 border-indigo-500 border-4' : 'bg-slate-50 text-slate-950 opacity-90 border-slate-300 border-4'}`} />{!player?.joker_is_variable && <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-10 font-black italic uppercase text-3xl tracking-[0.2em] pointer-events-none">FIXED</div>}</div> : <div className="relative"><input value="1.0" readOnly className="w-full bg-slate-100 p-8 rounded-[2.5rem] font-black text-6xl text-center opacity-30 cursor-not-allowed border-4 border-slate-200 outline-none shadow-inner" /><div className="absolute inset-0 flex items-center justify-center pointer-events-none font-black text-slate-400 italic tracking-[0.6em] uppercase text-sm">Locked Multiplier</div></div>}</div>
                                 </div>
                                 <div className="grid grid-cols-2 gap-10"><div className="space-y-4"><label className="text-[10px] font-black uppercase opacity-40 text-center block tracking-[0.4em] italic leading-none">3. 塔罗牌生效 Tarot</label><select name={`${team}_tarot`} className={selectClass + " p-6 text-sm bg-slate-50 border-4 border-slate-300 shadow-inner" }><option value="">无 (None)</option>{cardLibrary.filter(c=>c.type==='tarot').map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div><div className="space-y-4"><label className="text-[10px] font-black uppercase opacity-40 text-center block tracking-[0.4em] italic leading-none">4. 牌型结算 Hand</label><input name={`${team}_hand`} placeholder="e.g. Full House / 葫芦" className={inputClass + " p-6 text-center text-sm uppercase bg-slate-50 border-4 border-slate-300 shadow-inner"} /></div></div>
                                 <div className="bg-emerald-600/5 p-8 rounded-[3.5rem] border-[6px] border-emerald-600/10 space-y-8 shadow-inner"><p className="text-[9px] font-black uppercase text-emerald-600 tracking-[0.8em] text-center italic opacity-60">5. 队伍假卡资产 Active Tactical Assets</p><div className="grid grid-cols-2 gap-4">{(team === 'red' ? redTeamFakeCards : blueTeamFakeCards).map(f=><label key={f.id} className="flex items-center gap-4 cursor-pointer bg-white/80 p-4 rounded-[1.2rem] transition-all border-4 border-slate-100 hover:border-emerald-600/30 shadow-sm hover:shadow-2xl hover:scale-[1.03]"><input type="checkbox" name={`${team}_fake_cards`} value={f.card_id} className={`w-6 h-6 ${team === 'red' ? 'accent-red-600' : 'accent-blue-600'}`} /><span className="text-[11px] font-black uppercase italic tracking-tighter truncate leading-none text-slate-800">{f.card_name}</span></label>)}</div>{blueTeamFakeCards.length === 0 && team === 'blue' && <div className="text-center py-10 border-4 border-dashed border-emerald-950/5 rounded-[2.5rem] opacity-20"><p className="text-[9px] font-black uppercase tracking-[0.5em] italic">No Assets Earned</p></div>}{redTeamFakeCards.length === 0 && team === 'red' && <div className="text-center py-10 border-4 border-dashed border-emerald-950/5 rounded-[2.5rem] opacity-20"><p className="text-[9px] font-black uppercase tracking-[0.5em] italic">No Assets Earned</p></div>}</div>
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
    </div>
  );
};
