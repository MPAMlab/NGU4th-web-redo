import React, { useEffect, useState } from 'react';

interface Achievement {
  id: string;
  name: string;
  description: string;
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

      setAchievements(achData.achievements);
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

  // --- Handlers ---
  const handleAchievementToggle = async (kinde_id: string, achievement_id: string, hasAchievement: boolean) => {
    try {
      await fetch('/api/admin/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetKindeId: kinde_id, achievementId: achievement_id, action: hasAchievement ? 'revoke' : 'grant' })
      });
      fetchData(true);
    } catch (e) { alert("操作失败"); }
  };

  const handleMemberAction = async (targetKindeId: string, action: string, value: any) => {
    try {
      const body: any = { targetKindeId, action };
      if (action === 'set_team') body.team = value;
      if (action === 'set_joker') body.jokerCardId = value;
      await fetch('/api/admin/registration', { method: 'POST', body: JSON.stringify(body) });
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
      await fetch('/api/admin/registration', { method: 'POST', body: JSON.stringify({ action: 'reorder', mapping }) });
      fetchData(true);
    } catch (e) { alert("重排失败"); }
  };

  const handleCardCRUD = async (action: string, payload: any) => {
    try {
      const res = await fetch('/api/admin/cards', { method: 'POST', body: JSON.stringify({ action, ...payload }) });
      if (res.ok) { setEditingCard(null); fetchData(true); }
    } catch (e) { alert("牌库操作失败"); }
  };

  const handleCreateMatch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const redPlayerId = formData.get('red') as string;
    const bluePlayerId = formData.get('blue') as string;
    if (!redPlayerId || !bluePlayerId) return;
    try {
      await fetch('/api/admin/matches', { method: 'POST', body: JSON.stringify({ action: 'create', redPlayerId, bluePlayerId, orderIndex: matches.length }) });
      fetchData(true);
    } catch (e) { alert("部署赛程失败"); }
  };

  const handleSetActiveMatch = async (matchId: string | null) => {
    try {
      await fetch('/api/admin/system', { method: 'POST', body: JSON.stringify({ key: 'active_match_id', value: matchId }) });
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
      const res = await fetch('/api/admin/scoring', { method: 'POST', body: JSON.stringify(payload) });
      if (res.ok) { alert("存档成功"); fetchData(true); }
    } catch (e) { alert("存档失败"); }
  };

  const handleCreateMinigame = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await fetch('/api/admin/minigames', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create', title: formData.get('title'), short_desc: formData.get('short_desc'),
          detailed_desc: formData.get('detailed_desc'), start_date: formData.get('start_date'),
          start_time: formData.get('start_time'), max_players: parseInt(formData.get('max_players') as string),
          fake_card_id: parseInt(formData.get('fake_card_id') as string)
        })
      });
      fetchData(true);
      (e.target as HTMLFormElement).reset();
    } catch (e) { alert("发布失败"); }
  };

  const handleMinigameStatus = async (id: number, action: string, winner_id?: string | null) => {
    try {
      await fetch('/api/admin/minigames', { method: 'POST', body: JSON.stringify({ action, id, winner_id }) });
      fetchData(true);
    } catch (e) { alert("操作失败"); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-background gap-4 uppercase font-black tracking-[0.5em]">
      <div className="w-16 h-16 border-8 border-primary border-t-transparent rounded-full animate-spin"></div>
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

  // Unified class with visible border
  const inputClass = "w-full bg-muted p-4 rounded-xl font-bold border-2 border-neutral-400 focus:border-primary transition-all outline-none text-foreground";
  const selectClass = "w-full bg-muted p-4 rounded-xl font-black border-2 border-neutral-400 focus:border-primary outline-none cursor-pointer text-foreground";

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-4 border-primary pb-6">
        <div><h1 className="text-6xl font-black tracking-tighter italic text-primary uppercase">NGU4th ADMIN</h1><p className="text-muted-foreground font-black text-[10px] mt-1 tracking-widest uppercase">Global Control Unit v9.1</p></div>
        <div className="flex gap-4"><a href="/live" target="_blank" className="bg-green-600 text-white px-6 py-2 rounded-xl font-black hover:bg-green-700 shadow-lg text-sm italic">🖥️ 实时大屏</a><a href="/dashboard" className="bg-secondary text-secondary-foreground px-6 py-2 rounded-full font-bold shadow-md">返回个人页</a></div>
      </div>

      <div className="flex gap-2 bg-muted p-1.5 rounded-2xl w-fit overflow-x-auto shadow-inner border border-white/5">
        {(['members', 'achievements', 'matches', 'minigames', 'live', 'library'] as const).map(tab => (
          <button key={tab} onClick={() => switchTab(tab)} className={`px-8 py-3 rounded-xl font-black transition-all whitespace-nowrap uppercase tracking-tighter text-sm ${activeTab === tab ? 'bg-background shadow-xl text-primary scale-105 border-2 border-primary/20' : 'text-muted-foreground hover:text-foreground'}`}>
            {tab === 'members' ? '选手名单' : tab === 'achievements' ? '勋章发放' : tab === 'matches' ? '赛程排期' : tab === 'minigames' ? '🎮 小游戏' : tab === 'live' ? '🔴 计分台' : '牌库管理'}
          </button>
        ))}
      </div>

      {activeTab === 'members' && (
        <div className="space-y-12 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             <div><h3 className="text-xl font-black italic text-red-600 mb-4">🔴 红队全局永久次方</h3><input type="number" step="0.01" value={systemState.red_exponent || '1.0'} onChange={(e)=>fetch('/api/admin/system',{method:'POST',body:JSON.stringify({key:'red_exponent',value:e.target.value})}).then(()=>fetchData(true))} className={inputClass} /></div>
             <div><h3 className="text-xl font-black italic text-blue-600 mb-4">🔵 蓝队全局永久次方</h3><input type="number" step="0.01" value={systemState.blue_exponent || '1.0'} onChange={(e)=>fetch('/api/admin/system',{method:'POST',body:JSON.stringify({key:'blue_exponent',value:e.target.value})}).then(()=>fetchData(true))} className={inputClass} /></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {['red', 'blue'].map(team => (
              <div key={team} className={`bg-card rounded-[3rem] shadow-2xl border-4 ${team === 'red' ? 'border-red-600/20' : 'border-blue-600/20'} overflow-hidden`}>
                <div className={`p-6 ${team === 'red' ? 'bg-red-600' : 'bg-blue-600'} text-white flex justify-between items-center`}><h3 className="text-2xl font-black italic uppercase">{team === 'red' ? '红队' : '蓝队'} 选手</h3><button onClick={()=>{fetch('/api/admin/cards',{method:'POST',body:JSON.stringify({action:'random_joker'})}).then(()=>fetchData(true))}} className="bg-white/20 p-2 px-4 rounded-full text-[10px] font-black uppercase">🎲 随机分配小丑牌</button></div>
                <div className="p-4 space-y-4">
                  {members.filter(m => m.team === team && m.is_registered === 1).map((m, i) => (
                    <div key={m.kinde_id} className="bg-muted/30 p-5 rounded-3xl border-2 border-transparent hover:border-primary/20 transition-all group">
                      <div className="flex items-center gap-4"><span className="text-3xl font-black italic text-muted-foreground/20 w-10">#{i + 1}</span><div className="flex-1 font-black uppercase">{m.username}<p className="text-[9px] text-muted-foreground font-bold italic lowercase">{m.email}</p></div><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => handleReorder(m.kinde_id, 'up')} className="bg-background p-2 rounded-lg border-2 border-neutral-300">▲</button><button onClick={() => handleReorder(m.kinde_id, 'down')} className="bg-background p-2 rounded-lg border-2 border-neutral-300">▼</button><button onClick={() => handleMemberAction(m.kinde_id, 'set_team', team === 'red' ? 'blue' : 'red')} className="bg-background p-2 px-3 rounded-lg border-2 border-neutral-300 text-[10px] font-black uppercase hover:bg-orange-500 hover:text-white">Switch</button><button onClick={() => handleMemberAction(m.kinde_id, 'remove_registration', null)} className="bg-background p-2 px-3 rounded-lg border-2 border-neutral-300 text-[10px] font-black text-destructive hover:bg-destructive hover:text-white">Kick</button></div></div>
                      <div className="mt-4 space-y-3"><label className="text-[9px] font-black uppercase text-purple-600 tracking-widest">Assigned Joker</label><select value={m.joker_card_id || ''} onChange={(e) => handleMemberAction(m.kinde_id, 'set_joker', e.target.value ? parseInt(e.target.value) : null)} className={selectClass + " p-3 text-xs"}>
                           <option value="">未分配 (NONE)</option>
                           {jokers.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                        </select>
                        {m.joker_description && <div className="bg-white/50 p-4 rounded-2xl text-[10px] font-bold text-muted-foreground italic border-2 border-purple-600/10 leading-tight">效果：{m.joker_description}</div>}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="bg-card rounded-[2.5rem] border-2 border-neutral-200 shadow-2xl overflow-hidden"><div className="bg-muted/50 p-8 border-b flex justify-between items-center"><h3 className="text-xl font-black italic uppercase tracking-widest">全员名单与系统准入管理</h3><span className="text-[10px] font-black bg-primary/20 text-primary px-6 py-2 rounded-full shadow-inner uppercase">Total Users: {members.length}</span></div><div className="overflow-auto max-h-[400px]"><table className="w-full text-left text-sm"><thead className="bg-muted/30 opacity-50 text-[10px] font-black border-b sticky top-0 bg-muted"><tr><th className="px-10 py-6">用户信息</th><th className="px-10 py-6 text-center">状态</th><th className="px-10 py-6 text-right">管理</th></tr></thead><tbody className="divide-y divide-white/5">{members.map(m => (<tr key={m.kinde_id} className="hover:bg-muted/20 transition-all"><td className="px-10 py-6 font-black">{m.username}<p className="text-[10px] text-muted-foreground font-bold">{m.email}</p></td><td className="px-10 py-6 text-center">{m.is_registered ? <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase ${m.team === 'red' ? 'bg-red-600/20 text-red-600' : 'bg-blue-600/20 text-blue-600'}`}>In Field ({m.team})</span> : <span className="opacity-30 text-[10px] font-black italic uppercase">Reserve</span>}</td><td className="px-10 py-6 text-right"><div className="flex justify-end gap-3"><button onClick={() => handleMemberAction(m.kinde_id, 'set_team', 'red')} className="px-5 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black">To Red</button><button onClick={() => handleMemberAction(m.kinde_id, 'set_team', 'blue')} className="px-5 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black">To Blue</button>{m.is_registered === 1 && (<button onClick={() => handleMemberAction(m.kinde_id, 'remove_registration', null)} className="px-5 py-2 bg-neutral-800 text-white rounded-xl text-[10px] font-black">Detach</button>)}</div></td></tr>))}</tbody></table></div></div>
        </div>
      )}

      {activeTab === 'library' && (
         <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-center bg-card p-8 rounded-3xl border-2 border-neutral-200 shadow-xl gap-8 relative overflow-hidden"><div className="flex gap-2 bg-muted p-1 rounded-xl">{(['all', 'joker', 'tarot', 'fake'] as const).map(f => (<button key={f} onClick={()=>setLibraryFilter(f)} className={`px-8 py-2 rounded-lg font-black text-xs uppercase transition-all ${libraryFilter === f ? 'bg-background shadow-xl text-primary scale-105 border-2 border-primary/10' : 'text-muted-foreground'}`}>{f}</button>))}</div><button onClick={()=>setEditingCard({ type: 'joker', is_variable: 0, multiplier: 1.0, exponent_bonus: 0.0 })} className="bg-primary text-primary-foreground px-10 py-4 rounded-2xl font-black uppercase shadow-xl hover:scale-105 transition-all italic tracking-tighter">新增资产资料 +</button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredLibrary.map(card => (<div key={card.id} className="bg-card p-6 rounded-[2.5rem] border-2 border-neutral-200 shadow-xl space-y-4 group relative overflow-hidden hover:border-primary/30 transition-all"><div className="flex justify-between items-start"><span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${card.type === 'joker' ? 'bg-purple-600 text-white' : card.type === 'tarot' ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'}`}>{card.type}</span><div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-all"><button onClick={()=>setEditingCard(card)} className="text-[10px] font-black text-primary hover:scale-110">EDIT</button><button onClick={()=>{if(confirm('Delete Card?')) handleCardCRUD('delete_card', { cardId: card.id })}} className="text-[10px] font-black text-destructive hover:scale-110">DEL</button></div></div><h4 className="font-black text-xl leading-none uppercase">{card.name}</h4><p className="text-xs font-bold text-muted-foreground leading-snug">{card.description}</p><div className="flex gap-2 pt-2">{card.multiplier !== 1 && <span className="bg-purple-100 text-purple-700 text-[8px] font-black px-2 py-0.5 rounded uppercase shadow-sm">x{card.multiplier}</span>}{card.exponent_bonus !== 0 && <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-2 py-0.5 rounded uppercase shadow-sm">^{card.exponent_bonus}</span>}{card.is_variable === 1 && <span className="bg-orange-600 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase shadow-sm">Variable Input</span>}</div></div>))}</div>
            {editingCard && (
               <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-in fade-in duration-300"><div className="bg-card p-12 rounded-[4rem] border-4 border-primary/20 shadow-2xl max-w-lg w-full space-y-8 animate-in zoom-in-95 duration-500"><h3 className="text-4xl font-black italic uppercase tracking-tighter text-primary">{editingCard.id ? 'UPDATE ASSET' : 'DEPLOY ASSET'}</h3><form onSubmit={(e)=>{ e.preventDefault(); const fd = new FormData(e.currentTarget); handleCardCRUD(editingCard.id ? 'update_card' : 'create_card', { cardId: editingCard.id, name: fd.get('name'), type: fd.get('type'), description: fd.get('description'), multiplier: parseFloat(fd.get('multiplier') as string), exponent_bonus: parseFloat(fd.get('exponent_bonus') as string), is_variable: fd.get('is_variable') === 'on' ? 1 : 0 }); }} className="space-y-6"><div className="space-y-1"><label className="text-[10px] font-black uppercase opacity-40">Asset Designation</label><input name="name" defaultValue={editingCard.name} required className={inputClass} /></div><div className="space-y-1"><label className="text-[10px] font-black uppercase opacity-40">Classification</label><select name="type" defaultValue={editingCard.type} className={selectClass}><option value="joker">小丑牌 (Joker)</option><option value="tarot">塔罗牌 (Tarot)</option><option value="fake">假卡 (Fake)</option></select></div><div className="space-y-1"><label className="text-[10px] font-black uppercase opacity-40">Operational Intel</label><textarea name="description" defaultValue={editingCard.description} required className={inputClass + " h-32 text-sm leading-snug"} /></div><div className="grid grid-cols-2 gap-6"><div><label className="text-[10px] font-black uppercase opacity-40">Base Multiplier</label><input name="multiplier" type="number" step="any" defaultValue={editingCard.multiplier || 1.0} className={inputClass} /></div><div><label className="text-[10px] font-black uppercase opacity-40">Exponent Bonus</label><input name="exponent_bonus" type="number" step="any" defaultValue={editingCard.exponent_bonus || 0.0} className={inputClass} /></div></div><label className="flex items-center gap-4 bg-muted p-5 rounded-3xl border-2 border-neutral-400 cursor-pointer hover:bg-muted/80 transition-all"><input name="is_variable" type="checkbox" defaultChecked={editingCard.is_variable === 1} className="w-8 h-8 accent-primary shadow-inner" /><div className="flex flex-col"><span className="font-black uppercase text-sm italic tracking-widest">Variable Multiplier</span><span className="text-[8px] font-bold opacity-40 uppercase mt-0.5 text-foreground">Requires manual input in scoring workbench</span></div></label><div className="flex gap-4 pt-6"><button type="submit" className="flex-1 bg-primary text-primary-foreground py-6 rounded-[2rem] font-black uppercase shadow-2xl hover:scale-102 transition-all">CONFIRM & SAVE</button><button type="button" onClick={()=>setEditingCard(null)} className="flex-1 bg-neutral-800 text-white py-6 rounded-[2rem] font-black uppercase border-b-4 border-black">CANCEL</button></div></form></div></div>
            )}
         </div>
      )}

      {activeTab === 'matches' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in fade-in duration-300">
           <div className="lg:col-span-1 bg-card p-10 rounded-[3rem] border-4 border-primary/10 shadow-2xl space-y-10"><div className="border-l-8 border-primary pl-6 font-black"><div><h3 className="text-3xl italic uppercase tracking-tighter">部署赛程排期</h3><p className="text-[10px] opacity-30 mt-1 uppercase tracking-widest leading-none">Tactical Match Pipeline</p></div></div><form onSubmit={handleCreateMatch} className="space-y-10"><div className="space-y-2"><label className="text-[10px] font-black uppercase text-red-600 tracking-[0.3em]">红队主场进攻 RED NODE</label><select name="red" className={selectClass}><option value="">选择红队选手...</option>{members.filter(m=>m.is_registered===1 && m.team==='red').map(m=><option key={m.kinde_id} value={m.kinde_id}>{m.username}</option>)}</select></div><div className="space-y-2"><label className="text-[10px] font-black uppercase text-blue-600 tracking-[0.3em]">蓝队主场防守 BLUE NODE</label><select name="blue" className={selectClass}><option value="">选择蓝队选手...</option>{members.filter(m=>m.is_registered===1 && m.team==='blue').map(m=><option key={m.kinde_id} value={m.kinde_id}>{m.username}</option>)}</select></div><button type="submit" className="w-full bg-primary text-primary-foreground font-black py-6 rounded-[2.5rem] text-xl shadow-2xl transition-all uppercase italic tracking-tighter border-b-8 border-black/10 active:border-b-0 active:translate-y-2">部署赛程 DEPLOY</button></form></div>
           <div className="lg:col-span-2 bg-card p-10 rounded-[3.5rem] border shadow-2xl space-y-6 relative overflow-hidden group"><div className="absolute -top-10 -right-10 text-[12rem] font-black italic text-black/[0.03] uppercase pointer-events-none tracking-tighter group-hover:text-black/[0.05] transition-all">Tactical</div><h3 className="text-xl font-black mb-8 italic uppercase tracking-[0.4em] opacity-40">Pipeline Overview</h3><div className="space-y-6">{matches.map((m,i)=>{ const isActive=systemState.active_match_id === m.id.toString(); return(<div key={m.id} className={`flex items-center gap-8 p-8 rounded-[3rem] border-2 transition-all relative ${isActive ? 'bg-primary/10 border-primary shadow-[0_30px_100px_rgba(var(--primary),0.2)] scale-105 z-10' : 'bg-muted/10 border-white/10 hover:border-primary/20 shadow-md'}`}><span className="text-6xl font-black italic opacity-10 w-20 text-center tabular-nums italic">#{i+1}</span><div className="flex-1 flex justify-between font-black uppercase text-3xl italic tracking-tighter drop-shadow-xl"><span className="text-red-600">{m.red_player_name}</span><span className="opacity-10 italic scale-50 px-4">VERSUS</span><span className="text-blue-600">{m.blue_player_name}</span></div><div className="flex flex-col gap-3 min-w-[140px]">{isActive ? <button onClick={()=>handleSetActiveMatch(null)} className="bg-destructive text-white px-8 py-3 rounded-2xl font-black text-xs uppercase shadow-xl hover:brightness-125 transition-all">卸载 DEACTIVATE</button> : <button onClick={()=>handleSetActiveMatch(m.id.toString())} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-105 transition-all">设为活动 ENGAGE</button>}<button onClick={async ()=>{ if(confirm('Scrap?')) { await fetch('/api/admin/matches',{method:'POST',body:JSON.stringify({action:'delete',matchId:m.id})}); fetchData(true); } }} className="opacity-20 group-hover:opacity-100 text-muted-foreground hover:text-destructive font-black text-[10px] text-center uppercase tracking-widest transition-all">Scrap Data</button></div></div>); })}</div></div>
        </div>
      )}

      {activeTab === 'live' && (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
           {!activeMatch ? (<div className="bg-card p-32 rounded-[4rem] border-8 border-dashed border-muted text-center space-y-8 animate-pulse"><div className="text-9xl grayscale opacity-10">📡</div><h2 className="text-5xl font-black uppercase italic tracking-tighter opacity-30 text-muted-foreground leading-tight">计分工作台待命 STANDBY<br/><span className="text-2xl mt-4 block">Waiting for tactical engagement link</span></h2></div>) : (
             <div className="space-y-12">
                <div className="bg-card p-10 rounded-[4rem] shadow-[0_50px_100px_rgba(0,0,0,0.6)] border-x-[12px] border-primary flex justify-between items-center relative overflow-hidden transition-all hover:shadow-primary/5 shadow-2xl"><div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-red-600 via-primary to-blue-600 animate-shimmer"></div><div><div className="text-xs font-black uppercase tracking-[0.5em] text-primary mb-3 animate-pulse italic">🔴 实时计分通路 LINK ACTIVE</div><h2 className="text-6xl font-black italic tracking-tighter uppercase leading-none">{activeMatch.red_player_name} <span className="opacity-10 px-6 font-normal">VS</span> {activeMatch.blue_player_name}</h2></div><button onClick={() => handleSetActiveMatch(null)} className="bg-neutral-950 text-white px-16 py-6 rounded-[2.5rem] font-black uppercase hover:bg-black transition-all border-b-[10px] border-neutral-800 active:border-b-0 active:translate-y-2 text-xl italic tracking-widest shadow-2xl">完结对抗 FINISH</button></div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                   {['red', 'blue'].map((team, idx) => {
                      const isRound1 = activeMatch.round_1_status !== 'completed';
                      const currentRoundType = isRound1 ? 'red_pick' : 'blue_pick';
                      const isHome = (team === 'red' && isRound1) || (team === 'blue' && !isRound1);
                      const player = team === 'red' ? redPlayer : bluePlayer;
                      const useJoker = team === 'red' ? applyRedJoker : applyBlueJoker;
                      const setUseJoker = team === 'red' ? setApplyRedJoker : setApplyBlueJoker;
                      const teamFakeCards = team === 'red' ? redTeamFakeCards : blueTeamFakeCards;
                      return (
                        <div key={team} className={`space-y-8 ${(idx === 0 && activeMatch.round_1_status === 'completed') || (idx === 1 && activeMatch.round_2_status === 'completed') ? 'opacity-20 grayscale pointer-events-none scale-95 transition-all' : ''}`}><div className={`p-10 rounded-t-[4rem] ${team === 'red' ? 'bg-red-600 shadow-red-600/30' : 'bg-blue-600 shadow-blue-600/30'} text-white shadow-2xl transition-all relative overflow-hidden`}><div className="absolute inset-0 bg-white/10 opacity-20 animate-pulse"></div><div className="relative z-10 text-center"><h3 className="text-5xl font-black italic tracking-tighter uppercase leading-none">ROUND {isRound1 ? '1' : '2'}</h3><p className="text-lg font-black uppercase opacity-70 mt-3 tracking-[0.3em] italic underline underline-offset-8 decoration-4">{isRound1 ? "红队自选曲 RED'S PICK" : "蓝队自选曲 BLUE'S PICK"}</p></div></div>
                           <form onSubmit={(e)=>handleCommitRound(e, currentRoundType)} className="bg-card p-12 rounded-b-[4rem] border-x-4 border-b-4 border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.3)] space-y-12">
                              <div className="space-y-10"><div className="flex justify-between items-center border-b-4 pb-6" style={{borderColor: team === 'red' ? 'rgba(220,38,38,0.2)' : 'rgba(37,99,235,0.2)'}}><h4 className={`font-black text-4xl uppercase italic ${team === 'red' ? 'text-red-600' : 'text-blue-600'}`}>{player?.username}</h4><span className={`px-6 py-2 rounded-2xl font-black text-xs uppercase shadow-xl border-2 border-white/10 ${isHome ? (team === 'red' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white') : 'bg-neutral-800 text-neutral-500'}`}>{isHome ? '进攻方 HOME' : '防守方 Away'}</span></div>
                                 <div className="space-y-4"><label className="text-xs font-black uppercase opacity-40 tracking-[0.5em] block text-center italic">1. 基础分 Manual Base Score</label><input name={`${team}_base`} type="number" step="any" required placeholder="0.0" className={inputClass + " text-center text-7xl p-10 bg-muted/40 shadow-inner rounded-[2.5rem] border-4 border-neutral-400"} /></div>
                                 <div className={`p-10 rounded-[3rem] border-4 transition-all space-y-6 ${isHome ? 'bg-purple-600/5 border-purple-600/30 shadow-2xl' : 'bg-neutral-100 opacity-40 shadow-inner border-neutral-300'}`}>
                                    <div className="flex justify-between items-start"><div className="flex-1 space-y-1"><label className={`text-xs font-black uppercase tracking-widest ${isHome ? 'text-purple-600 opacity-100' : 'opacity-40'}`}>2. 小丑牌倍率 Joker Multiplier</label><p className="font-black text-2xl uppercase tracking-tighter mt-1">{player?.joker_name || 'UNLINKED'}</p>{player?.joker_description && <div className="bg-white/40 p-5 rounded-2xl text-[11px] font-bold text-muted-foreground italic mt-4 border-2 border-purple-600/10 shadow-inner leading-relaxed">{player.joker_description}</div>}</div>{isHome && player?.joker_card_id && <label className="flex items-center gap-3 cursor-pointer bg-purple-600 text-white px-6 py-3 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all"><input type="checkbox" checked={useJoker} onChange={(e)=>setUseJoker(e.target.checked)} className="w-6 h-6 accent-white shadow-inner" /><span className="text-xs font-black uppercase italic tracking-widest">应用?</span></label>}</div>
                                    <div className="relative">{(isHome && useJoker) ? <div className="relative animate-in zoom-in-95 duration-300"><input name={`${team}_mult`} type="number" step="any" defaultValue={player?.joker_is_variable ? "" : (player?.joker_multiplier || 1.5)} placeholder={player?.joker_is_variable ? "手动录入倍率" : "固定倍率已确认"} readOnly={!player?.joker_is_variable} className={`w-full p-8 rounded-[2rem] font-black text-6xl text-center outline-none transition-all shadow-xl ${player?.joker_is_variable ? 'bg-purple-100 ring-8 ring-purple-600/20 border-purple-600/40 border-4' : 'bg-purple-50 text-purple-950 opacity-90 border-neutral-400 border-4'}`} />{!player?.joker_is_variable && <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-10 font-black italic uppercase text-2xl tracking-[0.2em] pointer-events-none">FIXED</div>}</div> : <div className="relative"><input value="1.0" readOnly className="w-full bg-neutral-200 p-8 rounded-[2rem] font-black text-6xl text-center opacity-30 cursor-not-allowed border-4 border-neutral-400 outline-none shadow-inner" /><div className="absolute inset-0 flex items-center justify-center pointer-events-none font-black text-neutral-400 italic tracking-[0.6em] uppercase text-sm">Locked</div></div>}</div>
                                 </div>
                                 <div className="grid grid-cols-2 gap-8"><div className="space-y-2"><label className="text-[10px] font-black uppercase opacity-40 text-center block tracking-widest">3. 塔罗牌生效 Tarot</label><select name={`${team}_tarot`} className={selectClass + " p-6 text-sm bg-muted/50 border-4 border-neutral-400"}><option value="">无 (None)</option>{tarots.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div><div className="space-y-2"><label className="text-[10px] font-black uppercase opacity-40 text-center block tracking-widest">4. 最终打出牌型 Hand</label><input name={`${team}_hand`} placeholder="例如: 葫芦 (Full House)" className={inputClass + " p-6 text-center text-sm uppercase bg-muted/50 border-4 border-neutral-400"} /></div></div>
                                 <div className="bg-emerald-600/5 p-8 rounded-[3rem] border-4 border-emerald-600/20 space-y-6 shadow-inner"><p className="text-[11px] font-black uppercase text-emerald-600 tracking-[0.6em] text-center italic">5. 队伍假卡加成 Active Tactical Assets</p><div className="grid grid-cols-2 gap-4">{(team === 'red' ? redTeamFakeCards : blueTeamFakeCards).map(f=><label key={f.id} className="flex items-center gap-4 cursor-pointer bg-white/70 p-5 rounded-2xl transition-all border-2 border-neutral-300 hover:border-emerald-600/40 shadow-sm hover:shadow-lg"><input type="checkbox" name={`${team}_fake_cards`} value={f.card_id} className={`w-7 h-7 ${team === 'red' ? 'accent-red-600' : 'accent-blue-600 shadow-inner'}`} /><span className="text-[11px] font-black uppercase italic tracking-tighter truncate leading-none">{f.card_name}</span></label>)}</div>{teamFakeCards.length === 0 && <p className="text-xs font-black opacity-20 italic text-center py-8 uppercase tracking-[0.3em] border-2 border-dashed border-emerald-950/10 rounded-[2.5rem]">No Active Tactical Assets</p>}</div>
                              </div>
                              <button type="submit" className={`w-full ${team === 'red' ? 'bg-red-600 shadow-[0_30px_80px_rgba(220,38,38,0.4)]' : 'bg-blue-600 shadow-[0_30px_80px_rgba(37,99,235,0.4)]'} text-white font-black py-12 rounded-[3.5rem] text-4xl uppercase tracking-[0.4em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all italic border-b-[16px] border-black/30 mt-10 active:border-b-0 active:translate-y-4`}>提交本轮回合存档 COMMIT ROUND</button>
                           </form>
                        </div>
                      )
                   })}
                </div>
             </div>
           )}
        </div>
      )}
      
      {/* Utility Tabs with better borders */}
      {activeTab === 'achievements' && (<div className="bg-card p-12 rounded-[4rem] border-4 border-neutral-200 shadow-2xl overflow-hidden"><h3 className="text-3xl font-black italic mb-10 uppercase border-l-8 border-primary pl-8">勋章发放权限 HUB</h3><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="opacity-30 text-[10px] uppercase font-black border-b-4 border-neutral-200 sticky top-0 bg-card"><th className="pb-8 px-10">选手</th>{achievements.map(a=><th key={a.id} className="text-center pb-8">{a.name}</th>)}</tr></thead><tbody className="divide-y divide-neutral-200">{members.map(m=>(<tr key={m.kinde_id} className="hover:bg-muted/40 transition-all"><td className="py-8 px-10 font-black text-xl">{m.username}<p className="text-[10px] opacity-40 font-bold tracking-widest">{m.email}</p></td>{achievements.map(a=>{const hasIt=userAchievements.some(ua=>ua.kinde_id===m.kinde_id && ua.achievement_id===a.id);return(<td key={a.id} className="text-center px-4"><button onClick={()=>handleAchievementToggle(m.kinde_id, a.id, hasIt)} className={`px-8 py-3 rounded-2xl text-[10px] font-black transition-all border-4 ${hasIt ? 'bg-primary border-primary text-primary-foreground shadow-2xl scale-110' : 'bg-transparent border-neutral-300 text-neutral-400 hover:border-foreground hover:text-foreground'}`}>{hasIt ? 'GRANTED' : 'UNEARNED'}</button></td>)})}</tr>))}</tbody></table></div></div>)}
      {activeTab === 'minigames' && (<div className="grid grid-cols-1 lg:grid-cols-3 gap-12 animate-in fade-in duration-300"><div className="lg:col-span-1 bg-card p-10 rounded-[3.5rem] border-4 border-neutral-200 shadow-2xl space-y-10"><h3 className="text-2xl font-black italic uppercase border-l-8 border-purple-600 pl-8 leading-none">小游戏战略部署</h3><form onSubmit={handleCreateMinigame} className="space-y-8"><input name="title" placeholder="标题 TITLE" required className={inputClass} /><input name="short_desc" placeholder="简介 SHORT DESC" className={inputClass} /><div className="grid grid-cols-2 gap-6"><input name="start_date" type="date" required className={inputClass} /><input name="start_time" type="time" required className={inputClass} /></div><input name="max_players" type="number" defaultValue="10" className={inputClass} /><textarea name="detailed_desc" placeholder="规则 RULES" className={inputClass + " h-44 text-sm leading-relaxed"} /><select name="fake_card_id" required className={selectClass}>{fakeCards.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button type="submit" className="w-full bg-purple-600 text-white font-black py-8 rounded-[2.5rem] shadow-2xl text-2xl uppercase italic border-b-8 border-purple-900 active:border-b-0 active:translate-y-2">发布招募 START</button></form></div><div className="lg:col-span-2 space-y-8">{minigames.map(g=>(<div key={g.id} className="bg-card p-12 rounded-[4rem] border-4 border-neutral-200 shadow-2xl flex flex-col md:flex-row gap-12 relative overflow-hidden transition-all hover:shadow-purple-600/10"><div className="flex-1 space-y-8"><div><span className={`px-6 py-2 rounded-2xl text-xs font-black uppercase ${g.status==='recruiting'?'bg-green-600':'bg-orange-600'} text-white shadow-xl`}>{g.status}</span><h3 className="text-5xl font-black tracking-tighter uppercase mt-6 drop-shadow-lg">{g.title}</h3></div><p className="text-lg font-bold opacity-50 border-l-8 border-purple-600 pl-8 leading-relaxed italic">{g.short_desc}</p><div className="grid grid-cols-2 gap-8 text-sm font-black uppercase opacity-60 italic tracking-widest"><p>🕒 {g.start_date} {g.start_time}</p><p>👥 {g.participant_count} / {g.max_players} DEPLOYED</p><p>🎁 REWARD: {g.fake_card_name}</p>{g.winner_id && <p className="text-green-500 font-bold scale-125 origin-left">🏆 Winner: {g.winner_name}</p>}</div></div><div className="flex flex-col gap-4 justify-center min-w-[300px]">{g.status==='recruiting' && <button onClick={()=>handleMinigameStatus(g.id,'start')} className="bg-orange-600 text-white font-black py-6 rounded-[2.5rem] shadow-2xl hover:scale-105 transition-all text-lg uppercase italic border-b-8 border-orange-900">锁定报名并部署 LOCK & START</button>}{g.status==='active' && <div className="space-y-6 bg-muted/60 p-8 rounded-[3rem] border-4 border-orange-600/10"><label className="text-xs font-black uppercase opacity-60 block text-center tracking-[0.4em]">判定最终胜者 WINNER</label><select className={selectClass + " p-6 text-sm bg-white"} onChange={(e)=>handleMinigameStatus(g.id,'finish',e.target.value)}><option value="">判定胜负结果...</option>{participants.filter(p=>p.minigame_id===g.id).map(p=><option key={p.user_id} value={p.user_id}>{p.username} ({p.team==='red'?'红队':'蓝队'})</option>)}</select></div>}<button onClick={async ()=>{if(confirm('TERMINATE?')) { await fetch('/api/admin/minigames',{method:'POST',body:JSON.stringify({action:'delete',id:g.id})}); fetchData(true); }}} className="text-muted-foreground font-black text-xs hover:text-destructive tracking-widest mt-8 uppercase opacity-30 hover:opacity-100 transition-all text-center">Terminate Project</button></div></div>))}</div></div>)}
    </div>
  );
};
