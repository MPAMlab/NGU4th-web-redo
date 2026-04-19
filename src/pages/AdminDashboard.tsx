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
  const [activeTab, setActiveTab] = useState<'members' | 'achievements' | 'matches' | 'live' | 'minigames'>('members');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [userAchievements, setUserAchievements] = useState<any[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [cardLibrary, setCardLibrary] = useState<Card[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [systemState, setSystemState] = useState<any>({});
  const [minigames, setMinigames] = useState<Minigame[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  
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

      if (!achRes.ok || !regRes.ok || !matchRes.ok || !cardRes.ok || !sysRes.ok || !miniRes.ok) throw new Error('获取数据失败');

      const [achData, regData, matchData, cardData, sysData, miniData] = await Promise.all([
        achRes.json(),
        regRes.json(),
        matchRes.json(),
        cardRes.json(),
        sysRes.json(),
        miniRes.json()
      ]);

      setAchievements(achData.achievements);
      setUserAchievements(achData.userAchievements);
      setMembers((regData as Member[]).sort((a, b) => a.team_order - b.team_order));
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

  useEffect(() => {
    fetchData();
  }, []);

  const switchTab = (tab: any) => {
    setActiveTab(tab);
    fetchData(true); 
  };

  // --- Actions ---
  const handleAchievementToggle = async (kinde_id: string, achievement_id: string, hasAchievement: boolean) => {
    const action = hasAchievement ? 'revoke' : 'grant';
    try {
      await fetch('/api/admin/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetKindeId: kinde_id, achievementId: achievement_id, action })
      });
      fetchData(true);
    } catch (e) { alert("操作失败"); }
  };

  const handleMemberAction = async (targetKindeId: string, action: string, value: any) => {
    try {
      const body: any = { targetKindeId, action };
      if (action === 'set_team') body.team = value;
      if (action === 'set_joker') body.jokerCardId = value;

      const res = await fetch('/api/admin/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) fetchData(true);
    } catch (e) { alert("更新失败"); }
  };

  const handleReorder = async (kindeId: string, direction: 'up' | 'down') => {
    const targetMember = members.find(m => m.kinde_id === kindeId);
    const teamMembers = members.filter(m => m.team === targetMember?.team && m.is_registered === 1);
    const index = teamMembers.findIndex(m => m.kinde_id === kindeId);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === teamMembers.length - 1) return;

    const newOrder = [...teamMembers];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    [newOrder[index], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[index]];

    const mapping = newOrder.map((m, i) => ({ id: m.kinde_id, order: i }));
    
    try {
      await fetch('/api/admin/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reorder', mapping })
      });
      fetchData(true);
    } catch (e) { alert("排序失败"); }
  };

  const handleRandomJoker = async () => {
    if (!confirm("确定要为所有选手重新随机分发小丑牌吗？")) return;
    try {
      await fetch('/api/admin/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'random_joker' })
      });
      fetchData(true);
    } catch (e) { alert("随机分配失败"); }
  };

  const handleSetTeamExponent = async (team: 'red' | 'blue', val: string) => {
    try {
      await fetch('/api/admin/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: `${team}_exponent`, value: val })
      });
      fetchData(true);
    } catch (e) { alert("更新系数失败"); }
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
    } catch (e) { alert("创建失败"); }
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
    } catch (e) { alert("挂载失败"); }
  };

  const handleCommitRound = async (e: React.FormEvent<HTMLFormElement>, roundType: 'red_pick' | 'blue_pick') => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Get checked fake cards
    const redFakeCards = Array.from(formData.getAll('red_fake_cards')).join(',');
    const blueFakeCards = Array.from(formData.getAll('blue_fake_cards')).join(',');

    const payload = {
      matchId: systemState.active_match_id,
      roundType,
      redData: {
        baseScore: formData.get('red_base'),
        multiplier: formData.get('red_mult'),
        exponent: 1.0,
        tarotId: formData.get('red_tarot'),
        hand: formData.get('red_hand'),
        fakeCards: redFakeCards
      },
      blueData: {
        baseScore: formData.get('blue_base'),
        multiplier: formData.get('blue_mult'),
        exponent: 1.0,
        tarotId: formData.get('blue_tarot'),
        hand: formData.get('blue_hand'),
        fakeCards: blueFakeCards
      }
    };

    try {
      const res = await fetch('/api/admin/scoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("本轮数据已存档！");
        fetchData(true);
      }
    } catch (e) { alert("存档失败"); }
  };

  const handleCreateMinigame = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      action: 'create',
      title: formData.get('title'),
      short_desc: formData.get('short_desc'),
      detailed_desc: formData.get('detailed_desc'),
      start_date: formData.get('start_date'),
      start_time: formData.get('start_time'),
      max_players: parseInt(formData.get('max_players') as string),
      fake_card_id: parseInt(formData.get('fake_card_id') as string)
    };
    try {
      await fetch('/api/admin/minigames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      fetchData(true);
      (e.target as HTMLFormElement).reset();
    } catch (e) { alert("创建失败"); }
  };

  const handleMinigameStatus = async (id: number, action: 'start' | 'finish', winner_id?: string | null) => {
    try {
      await fetch('/api/admin/minigames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id, winner_id })
      });
      fetchData(true);
    } catch (e) { alert("操作失败"); }
  };

  if (loading) return <div className="text-center p-20 font-black animate-pulse text-2xl tracking-widest uppercase">Initializing Core...</div>;

  const redPool = members.filter(m => m.is_registered === 1 && m.team === 'red');
  const bluePool = members.filter(m => m.is_registered === 1 && m.team === 'blue');
  const activeMatch = matches.find(m => m.id.toString() === systemState.active_match_id);
  const jokers = cardLibrary.filter(c => c.type === '小丑牌');
  const tarots = cardLibrary.filter(c => c.type === '塔罗牌');
  const fakeCards = cardLibrary.filter(c => c.type === '假卡');

  const redTeamFakeCards = inventory.filter(i => i.owner_id === 'red' && i.card_type === '假卡');
  const blueTeamFakeCards = inventory.filter(i => i.owner_id === 'blue' && i.card_type === '假卡');

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-4 border-primary pb-6">
        <div>
          <h1 className="text-6xl font-black tracking-tighter italic text-primary leading-none uppercase">NGU4th ADMIN</h1>
          <p className="text-muted-foreground font-black uppercase tracking-[0.2em] text-[10px] mt-1">Global Match Control Unit v6.2</p>
        </div>
        <div className="flex gap-4">
          <a href="/live" target="_blank" className="bg-green-600 text-white px-6 py-2 rounded-xl font-black hover:bg-green-700 transition-all shadow-lg text-sm">
            打开直播大屏 SPECTATOR
          </a>
          <a href="/dashboard" className="bg-secondary text-secondary-foreground px-6 py-2 rounded-full font-bold hover:bg-secondary/80 transition-all shadow-md">
            返回个人主页
          </a>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-2 bg-muted p-1.5 rounded-2xl w-fit overflow-x-auto shadow-inner border border-white/5">
        {(['members', 'achievements', 'matches', 'minigames', 'live'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => switchTab(tab)}
            className={`px-10 py-3 rounded-xl font-black transition-all whitespace-nowrap uppercase tracking-tighter text-sm ${
              activeTab === tab ? 'bg-background shadow-xl text-primary scale-105 border-2 border-primary/20' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'members' ? '选手与队伍' : tab === 'achievements' ? '勋章发放' : tab === 'matches' ? '对阵赛程' : tab === 'minigames' ? '🎮 小游戏' : '🔴 计分台'}
          </button>
        ))}
      </div>

      {/* Tab: Members & Joker Management */}
      {activeTab === 'members' && (
        <div className="space-y-10">
          <div className="bg-card p-8 rounded-[2.5rem] border shadow-xl grid grid-cols-1 md:grid-cols-2 gap-10">
             <div>
                <h3 className="text-xl font-black italic text-red-600 uppercase mb-4 tracking-tight">红队全局永久次方 (假卡)</h3>
                <input 
                  type="number" step="0.01" 
                  value={systemState.red_exponent || '1.0'} 
                  onChange={(e)=>handleSetTeamExponent('red', e.target.value)}
                  className="w-full bg-muted p-4 rounded-xl font-black text-2xl outline-none focus:ring-4 ring-red-600/20"
                />
             </div>
             <div>
                <h3 className="text-xl font-black italic text-blue-600 uppercase mb-4 tracking-tight">蓝队全局永久次方 (假卡)</h3>
                <input 
                  type="number" step="0.01" 
                  value={systemState.blue_exponent || '1.0'} 
                  onChange={(e)=>handleSetTeamExponent('blue', e.target.value)}
                  className="w-full bg-muted p-4 rounded-xl font-black text-2xl outline-none focus:ring-4 ring-blue-600/20"
                />
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {['red', 'blue'].map(team => (
              <div key={team} className={`bg-card rounded-[2.5rem] shadow-2xl border-4 ${team === 'red' ? 'border-red-600/20' : 'border-blue-600/20'} overflow-hidden`}>
                <div className={`p-6 ${team === 'red' ? 'bg-red-600' : 'bg-blue-600'} text-white flex justify-between items-center`}>
                  <h3 className="text-2xl font-black italic tracking-widest uppercase">{team} FORCE ROSTER</h3>
                  <button onClick={handleRandomJoker} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg text-xs font-black uppercase">🎲 Random Jokers</button>
                </div>
                <div className="p-4 space-y-4">
                  {members.filter(m => m.team === team && m.is_registered === 1).map((m, i) => (
                    <div key={m.kinde_id} className="bg-muted/30 p-5 rounded-3xl border-2 border-transparent hover:border-primary/20 transition-all space-y-4 group">
                      <div className="flex items-center gap-4">
                        <span className="text-3xl font-black italic text-muted-foreground/20 w-10">#{i + 1}</span>
                        <div className="flex-1">
                          <p className="font-black text-xl leading-none uppercase tracking-tighter">{m.username}</p>
                          <p className="text-[9px] text-muted-foreground mt-1 font-bold">{m.email}</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => handleReorder(m.kinde_id, 'up')} className="bg-background p-2 rounded-lg border shadow-sm hover:bg-primary hover:text-white">▲</button>
                          <button onClick={() => handleReorder(m.kinde_id, 'down')} className="bg-background p-2 rounded-lg border shadow-sm hover:bg-primary hover:text-white">▼</button>
                          <button onClick={() => handleMemberAction(m.kinde_id, 'set_team', team === 'red' ? 'blue' : 'red')} className="bg-background p-2 rounded-lg border shadow-sm text-[10px] font-black uppercase">Switch</button>
                          <button onClick={() => handleMemberAction(m.kinde_id, 'remove_registration', null)} className="bg-background p-2 rounded-lg border shadow-sm text-[10px] font-black text-destructive">Kick</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Assigned Joker</label>
                        <select 
                          value={m.joker_card_id || ''} 
                          onChange={(e) => handleMemberAction(m.kinde_id, 'set_joker', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full bg-background p-3 rounded-xl text-sm font-black outline-none border-2 border-white/5 focus:border-primary/50"
                        >
                          <option value="">NO JOKER</option>
                          {jokers.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card rounded-[2.5rem] shadow-2xl border border-white/5 overflow-hidden">
            <div className="bg-muted/50 p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-black italic uppercase tracking-widest">全员名单与准入管理 (Global Roster)</h3>
              <span className="text-[10px] font-black bg-primary/20 text-primary px-4 py-1 rounded-full">TOTAL: {members.length}</span>
            </div>
            <div className="overflow-auto max-h-[400px]">
               <table className="w-full text-left text-sm">
                 <thead className="bg-muted/30 opacity-50 text-[10px] font-black uppercase tracking-widest border-b sticky top-0 bg-muted z-10">
                   <tr><th className="px-6 py-4">User</th><th className="px-6 py-4 text-center">Status</th><th className="px-6 py-4 text-right">Quick Deployment</th></tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                   {members.map(m => (
                     <tr key={m.kinde_id} className="hover:bg-muted/20 transition-all">
                       <td className="px-6 py-4">
                          <p className="font-bold">{m.username}</p>
                          <p className="text-[10px] text-muted-foreground">{m.email}</p>
                       </td>
                       <td className="px-6 py-4 text-center">
                          {m.is_registered ? (
                            <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase ${m.team === 'red' ? 'bg-red-600/20 text-red-600' : 'bg-blue-600/20 text-blue-600'}`}>In Field ({m.team})</span>
                          ) : (
                            <span className="text-muted-foreground opacity-30 text-[10px] font-bold italic uppercase tracking-widest">Reserve</span>
                          )}
                       </td>
                       <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                             <button onClick={() => handleMemberAction(m.kinde_id, 'set_team', 'red')} className="px-3 py-1 bg-red-600 text-white rounded-lg text-[10px] font-black hover:bg-red-700 uppercase transition-all">To Red</button>
                             <button onClick={() => handleMemberAction(m.kinde_id, 'set_team', 'blue')} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-black hover:bg-blue-700 uppercase transition-all">To Blue</button>
                             {m.is_registered === 1 && (
                               <button onClick={() => handleMemberAction(m.kinde_id, 'remove_registration', null)} className="px-3 py-1 bg-neutral-800 text-white rounded-lg text-[10px] font-black hover:bg-black uppercase transition-all">Detach</button>
                             )}
                          </div>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Minigames */}
      {activeTab === 'minigames' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
           <div className="lg:col-span-1 bg-card p-8 rounded-[3rem] border-4 border-purple-600/10 shadow-2xl space-y-8">
              <h3 className="text-xl font-black italic uppercase tracking-widest text-purple-600">发布新游戏</h3>
              <form onSubmit={handleCreateMinigame} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase opacity-50">标题</label>
                    <input name="title" required className="w-full bg-muted p-4 rounded-xl font-bold" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase opacity-50">一句话简介</label>
                    <input name="short_desc" className="w-full bg-muted p-4 rounded-xl font-bold text-sm" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase opacity-50">日期</label>
                       <input name="start_date" type="date" required className="w-full bg-muted p-4 rounded-xl font-bold" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase opacity-50">时间</label>
                       <input name="start_time" type="time" required className="w-full bg-muted p-4 rounded-xl font-bold" />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase opacity-50">最大人数</label>
                    <input name="max_players" type="number" defaultValue="10" className="w-full bg-muted p-4 rounded-xl font-bold" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase opacity-50">详细描述</label>
                    <textarea name="detailed_desc" className="w-full bg-muted p-4 rounded-xl font-bold text-xs h-32" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase opacity-50">奖励假卡</label>
                    <select name="fake_card_id" required className="w-full bg-muted p-4 rounded-xl font-bold outline-none border-none">
                       <option value="">请选择奖励卡牌...</option>
                       {fakeCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                 </div>
                 <button type="submit" className="w-full bg-purple-600 text-white font-black py-5 rounded-[1.5rem] text-xl shadow-xl uppercase">发布活动</button>
              </form>
           </div>
           <div className="lg:col-span-2 space-y-6">
              {minigames.map(g => (
                <div key={g.id} className="bg-card p-8 rounded-[3rem] border shadow-xl flex flex-col md:flex-row gap-8 relative overflow-hidden group">
                   <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3">
                        <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${g.status === 'recruiting' ? 'bg-green-600' : g.status === 'active' ? 'bg-orange-600' : 'bg-neutral-600'} text-white`}>
                           {g.status}
                        </span>
                        <h3 className="text-2xl font-black uppercase tracking-tighter italic">{g.title}</h3>
                      </div>
                      <p className="text-sm font-bold text-muted-foreground italic border-l-4 border-purple-600 pl-4">{g.short_desc}</p>
                      <div className="grid grid-cols-2 gap-4 text-[10px] font-black uppercase opacity-50">
                         <p>🕒 {g.start_date} {g.start_time}</p>
                         <p>👥 {g.participant_count} / {g.max_players} JOINED</p>
                         <p>🎁 REWARD: {g.fake_card_name}</p>
                         {g.winner_id && <p className="text-primary">🏆 WINNER: {g.winner_name}</p>}
                      </div>
                   </div>
                   <div className="flex flex-col gap-2 justify-center min-w-[200px]">
                      {g.status === 'recruiting' && (
                        <button onClick={() => handleMinigameStatus(g.id, 'start')} className="w-full bg-orange-600 text-white font-black py-3 rounded-xl shadow-lg">START GAME</button>
                      )}
                      {g.status === 'active' && (
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase opacity-50">Select Winner</label>
                           <select 
                             className="w-full bg-muted p-3 rounded-xl font-bold text-xs"
                             onChange={(e) => handleMinigameStatus(g.id, 'finish', e.target.value)}
                           >
                              <option value="">No Winner (Draw)</option>
                              {participants.filter(p => p.minigame_id === g.id).map(p => (
                                <option key={p.user_id} value={p.user_id}>{p.username} ({p.team})</option>
                              ))}
                           </select>
                           <p className="text-[8px] font-bold text-muted-foreground">Selecting a winner will automatically grant the reward to their team.</p>
                        </div>
                      )}
                      <button onClick={async () => { if(confirm('Delete?')) { await fetch('/api/admin/minigames',{method:'POST',body:JSON.stringify({action:'delete',id:g.id})}); fetchData(true); } }} className="text-muted-foreground font-black text-[10px] hover:text-destructive transition-all">TERMINATE</button>
                   </div>
                </div>
              ))}
              {minigames.length === 0 && <div className="text-center py-20 bg-muted/20 rounded-[3rem] border-4 border-dashed border-white/5 italic opacity-20 font-black">NO MINIGAME DATA</div>}
           </div>
        </div>
      )}

      {/* Tab: LIVE CONTROL */}
      {activeTab === 'live' && (
        <div className="space-y-12">
           {!activeMatch ? (
             <div className="bg-card p-32 rounded-[4rem] border-8 border-dashed border-muted text-center space-y-8 animate-pulse">
                <div className="text-9xl grayscale">📡</div>
                <h2 className="text-5xl font-black uppercase italic tracking-tighter opacity-30">Awaiting Engagement</h2>
             </div>
           ) : (
             <div className="space-y-12">
                <div className="bg-card p-10 rounded-[3.5rem] shadow-2xl border-x-8 border-primary flex justify-between items-center relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 via-primary to-blue-600"></div>
                   <div>
                      <h2 className="text-5xl font-black italic tracking-tighter uppercase leading-none">{activeMatch.red_player_name} <span className="opacity-10 px-4">VS</span> {activeMatch.blue_player_name}</h2>
                   </div>
                   <button onClick={() => handleSetActiveMatch(null)} className="bg-neutral-900 text-white px-12 py-5 rounded-3xl font-black hover:bg-black transition-all">FINISH MATCH</button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                   {['red', 'blue'].map((team, idx) => {
                      const isRound1 = activeMatch.round_1_status !== 'completed';
                      const currentRoundType = isRound1 ? 'red_pick' : 'blue_pick';
                      const isArchived = isRound1 ? false : (team === 'red' ? false : activeMatch.round_2_status === 'completed');
                      // Actually just use indices for Round 1 / Round 2
                      const isHome = (team === 'red' && isRound1) || (team === 'blue' && !isRound1);
                      const teamFakeCards = team === 'red' ? redTeamFakeCards : blueTeamFakeCards;

                      return (
                        <div key={team} className={`space-y-6 ${(idx === 0 && activeMatch.round_1_status === 'completed') || (idx === 1 && activeMatch.round_2_status === 'completed') ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                           <div className={`p-8 rounded-t-[3rem] ${team === 'red' ? 'bg-red-600' : 'bg-blue-600'} text-white`}>
                              <h3 className="text-3xl font-black italic tracking-tighter uppercase">
                                 ROUND {isRound1 ? '1' : '2'}: {isRound1 ? "RED'S PICK" : "BLUE'S PICK"}
                              </h3>
                              <p className="text-[10px] font-black uppercase opacity-60 mt-1">{isHome ? "Joker Multiplier applies" : "Away - Fixed 1.0x"}</p>
                           </div>
                           <form onSubmit={(e)=>handleCommitRound(e, currentRoundType)} className="bg-card p-10 rounded-b-[3rem] border-x-4 border-b-4 border-white/5 shadow-2xl space-y-8">
                              {/* Scoring Logic here */}
                              <div className="grid grid-cols-2 gap-10">
                                 {/* Red Input in this round */}
                                 <div className="space-y-6">
                                    <h4 className="font-black text-red-600 border-b-2 border-red-600/10 pb-2 uppercase italic">{activeMatch.red_player_name}</h4>
                                    <div className="space-y-2">
                                       <label className="text-[10px] font-black uppercase opacity-50">基础分</label>
                                       <input name="red_base" type="number" step="any" required className="w-full bg-muted p-4 rounded-xl font-black text-2xl text-center" />
                                    </div>
                                    <div className="space-y-2">
                                       <label className="text-[10px] font-black uppercase opacity-50">Joker 倍率</label>
                                       {isRound1 ? (
                                          <input name="red_mult" type="number" step="any" defaultValue="1" className="w-full bg-purple-50 p-4 rounded-xl font-black text-2xl text-center text-purple-700 ring-4 ring-purple-600/20" />
                                       ) : (
                                          <input name="red_mult" type="number" value="1.0" readOnly className="w-full bg-neutral-100 p-4 rounded-xl font-black text-2xl text-center opacity-30" />
                                       )}
                                    </div>
                                    <div className="space-y-2">
                                       <label className="text-[10px] font-black uppercase opacity-50">塔罗牌</label>
                                       <select name="red_tarot" className="w-full bg-muted p-3 rounded-xl font-bold text-xs uppercase"><option value="">NONE</option>{tarots.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
                                    </div>
                                    <input name="red_hand" placeholder="POKER HAND" className="w-full bg-muted p-3 rounded-xl font-black text-xs uppercase" />
                                    {/* Fake Cards Checklist for Red */}
                                    <div className="bg-muted/30 p-4 rounded-2xl space-y-2 border border-white/5">
                                       <p className="text-[8px] font-black uppercase opacity-50 mb-2">Team Fake Cards (Red)</p>
                                       {redTeamFakeCards.map(f => (
                                         <label key={f.id} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded transition-all">
                                            <input type="checkbox" name="red_fake_cards" value={f.card_id} className="w-3 h-3 accent-primary" />
                                            <span className="text-[10px] font-black uppercase italic tracking-tighter">{f.card_name}</span>
                                         </label>
                                       ))}
                                       {redTeamFakeCards.length === 0 && <p className="text-[8px] font-bold opacity-20 italic">No assets earned</p>}
                                    </div>
                                 </div>
                                 {/* Blue Input in this round */}
                                 <div className="space-y-6">
                                    <h4 className="font-black text-blue-600 border-b-2 border-blue-600/10 pb-2 uppercase italic">{activeMatch.blue_player_name}</h4>
                                    <div className="space-y-2">
                                       <label className="text-[10px] font-black uppercase opacity-50">基础分</label>
                                       <input name="blue_base" type="number" step="any" required className="w-full bg-muted p-4 rounded-xl font-black text-2xl text-center" />
                                    </div>
                                    <div className="space-y-2">
                                       <label className="text-[10px] font-black uppercase opacity-50">Joker 倍率</label>
                                       {!isRound1 ? (
                                          <input name="blue_mult" type="number" step="any" defaultValue="1" className="w-full bg-purple-50 p-4 rounded-xl font-black text-2xl text-center text-purple-700 ring-4 ring-purple-600/20" />
                                       ) : (
                                          <input name="blue_mult" type="number" value="1.0" readOnly className="w-full bg-neutral-100 p-4 rounded-xl font-black text-2xl text-center opacity-30" />
                                       )}
                                    </div>
                                    <div className="space-y-2">
                                       <label className="text-[10px] font-black uppercase opacity-50">塔罗牌</label>
                                       <select name="blue_tarot" className="w-full bg-muted p-3 rounded-xl font-bold text-xs uppercase"><option value="">NONE</option>{tarots.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
                                    </div>
                                    <input name="blue_hand" placeholder="POKER HAND" className="w-full bg-muted p-3 rounded-xl font-black text-xs uppercase" />
                                    {/* Fake Cards Checklist for Blue */}
                                    <div className="bg-muted/30 p-4 rounded-2xl space-y-2 border border-white/5">
                                       <p className="text-[8px] font-black uppercase opacity-50 mb-2">Team Fake Cards (Blue)</p>
                                       {blueTeamFakeCards.map(f => (
                                         <label key={f.id} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded transition-all">
                                            <input type="checkbox" name="blue_fake_cards" value={f.card_id} className="w-3 h-3 accent-blue-600" />
                                            <span className="text-[10px] font-black uppercase italic tracking-tighter">{f.card_name}</span>
                                         </label>
                                       ))}
                                       {blueTeamFakeCards.length === 0 && <p className="text-[8px] font-bold opacity-20 italic">No assets earned</p>}
                                    </div>
                                 </div>
                              </div>
                              <button type="submit" className={`w-full ${isRound1 ? 'bg-red-600' : 'bg-blue-600'} text-white font-black py-6 rounded-2xl text-xl shadow-xl uppercase italic`}>
                                 Commit Round {isRound1 ? '1' : '2'} Archive
                              </button>
                           </form>
                        </div>
                      )
                   })}
                </div>
             </div>
           )}
        </div>
      )}
      
      {/* Tab: Achievements (Re-adding the Authority table from v6.1) */}
      {activeTab === 'achievements' && (
         <div className="bg-card p-10 rounded-[3rem] border shadow-xl overflow-hidden">
           <h3 className="text-2xl font-black italic mb-8 uppercase tracking-tighter">Achievement Authority</h3>
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead>
                 <tr className="opacity-30 text-[10px] uppercase font-black tracking-[0.2em]">
                   <th className="pb-6 px-4">Operator</th>
                   {achievements.map(a=><th key={a.id} className="text-center pb-6">{a.name}</th>)}
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                 {members.map(m=>(
                   <tr key={m.kinde_id} className="group hover:bg-muted/40 transition-all">
                     <td className="py-5 px-4"><p className="font-black uppercase tracking-tighter">{m.username}</p><p className="text-[9px] text-muted-foreground font-bold">{m.email}</p></td>
                     {achievements.map(a=>{
                        const hasIt = userAchievements.some(ua=>ua.kinde_id===m.kinde_id && ua.achievement_id===a.id);
                        return (
                          <td key={a.id} className="text-center px-2">
                             <button onClick={()=>handleAchievementToggle(m.kinde_id, a.id, hasIt)} className={`px-5 py-1.5 rounded-full text-[9px] font-black transition-all border-2 ${hasIt ? 'bg-primary border-primary text-primary-foreground shadow-lg' : 'bg-transparent border-muted text-muted-foreground hover:border-foreground'}`}>
                               {hasIt ? 'AUTHORIZED' : 'UNEARNED'}
                             </button>
                          </td>
                        )
                     })}
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         </div>
      )}
    </div>
  );
};
