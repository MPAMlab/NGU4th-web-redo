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

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'members' | 'achievements' | 'matches' | 'live'>('members');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [userAchievements, setUserAchievements] = useState<any[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [cardLibrary, setCardLibrary] = useState<Card[]>([]);
  const [systemState, setSystemState] = useState<any>({});
  
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

      if (!achRes.ok || !regRes.ok || !matchRes.ok || !cardRes.ok || !sysRes.ok) throw new Error('获取数据失败');

      const [achData, regData, matchData, cardData, sysData] = await Promise.all([
        achRes.json(),
        regRes.json(),
        matchRes.json(),
        cardRes.json(),
        sysRes.json()
      ]);

      setAchievements(achData.achievements);
      setUserAchievements(achData.userAchievements);
      setMembers((regData as Member[]).sort((a, b) => a.team_order - b.team_order));
      setMatches(matchData);
      setCardLibrary(cardData.library);
      setSystemState(sysData);
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

      await fetch('/api/admin/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      fetchData(true);
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
    const payload = {
      matchId: systemState.active_match_id,
      roundType,
      redData: {
        baseScore: formData.get('red_base'),
        multiplier: formData.get('red_mult'),
        exponent: 1.0,
        tarotId: formData.get('red_tarot'),
        hand: formData.get('red_hand'),
      },
      blueData: {
        baseScore: formData.get('blue_base'),
        multiplier: formData.get('blue_mult'),
        exponent: 1.0,
        tarotId: formData.get('blue_tarot'),
        hand: formData.get('blue_hand'),
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

  if (loading) return <div className="text-center p-20 font-black animate-pulse text-2xl tracking-widest">NGU4th 后台初始化中...</div>;

  const redPool = members.filter(m => m.is_registered === 1 && m.team === 'red');
  const bluePool = members.filter(m => m.is_registered === 1 && m.team === 'blue');
  const activeMatch = matches.find(m => m.id.toString() === systemState.active_match_id);
  const jokers = cardLibrary.filter(c => c.type === '小丑牌');
  const tarots = cardLibrary.filter(c => c.type === '塔罗牌');

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-4 border-primary pb-6">
        <div>
          <h1 className="text-6xl font-black tracking-tighter italic text-primary leading-none uppercase">NGU4th ADMIN</h1>
          <p className="text-muted-foreground font-black uppercase tracking-[0.2em] text-[10px] mt-1">Global Match Control Unit v6.0</p>
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
        {(['members', 'achievements', 'matches', 'live'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => switchTab(tab)}
            className={`px-10 py-3 rounded-xl font-black transition-all whitespace-nowrap uppercase tracking-tighter text-sm ${
              activeTab === tab ? 'bg-background shadow-xl text-primary scale-105 border-2 border-primary/20' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'members' ? '选手与队伍' : tab === 'achievements' ? '勋章发放' : tab === 'matches' ? '对阵与赛程' : '🔴 计分工作台'}
          </button>
        ))}
      </div>

      {/* Tab: Members & Joker Management */}
      {activeTab === 'members' && (
        <div className="space-y-10">
          {/* Team Exponent Global Config */}
          <div className="bg-card p-8 rounded-[2.5rem] border shadow-xl grid grid-cols-1 md:grid-cols-2 gap-10">
             <div>
                <h3 className="text-xl font-black italic text-red-600 uppercase mb-4 tracking-tight">红队全局永久次方 (假卡)</h3>
                <div className="flex gap-4">
                  <input 
                    type="number" step="0.01" 
                    value={systemState.red_exponent || '1.0'} 
                    onChange={(e)=>handleSetTeamExponent('red', e.target.value)}
                    className="flex-1 bg-muted p-4 rounded-xl font-black text-2xl outline-none focus:ring-4 ring-red-600/20"
                  />
                  <div className="text-xs font-bold text-muted-foreground self-center uppercase">Value affects overall summation</div>
                </div>
             </div>
             <div>
                <h3 className="text-xl font-black italic text-blue-600 uppercase mb-4 tracking-tight">蓝队全局永久次方 (假卡)</h3>
                <div className="flex gap-4">
                  <input 
                    type="number" step="0.01" 
                    value={systemState.blue_exponent || '1.0'} 
                    onChange={(e)=>handleSetTeamExponent('blue', e.target.value)}
                    className="flex-1 bg-muted p-4 rounded-xl font-black text-2xl outline-none focus:ring-4 ring-blue-600/20"
                  />
                  <div className="text-xs font-bold text-muted-foreground self-center uppercase">Exponential growth factor</div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {['red', 'blue'].map(team => (
              <div key={team} className={`bg-card rounded-[2.5rem] shadow-2xl border-4 ${team === 'red' ? 'border-red-600/20' : 'border-blue-600/20'} overflow-hidden`}>
                <div className={`p-6 ${team === 'red' ? 'bg-red-600' : 'bg-blue-600'} text-white flex justify-between items-center`}>
                  <h3 className="text-2xl font-black italic tracking-widest uppercase">{team} FORCE ROSTER</h3>
                  <button onClick={handleRandomJoker} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg text-xs font-black uppercase">🎲 Shuffle Jokers</button>
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
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Assigned Joker (Permanent)</label>
                        <select 
                          value={m.joker_card_id || ''} 
                          onChange={(e) => handleMemberAction(m.kinde_id, 'set_joker', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full bg-background p-3 rounded-xl text-sm font-black border-2 border-white/5 outline-none focus:border-primary/50"
                        >
                          <option value="">NO JOKER ASSIGNED</option>
                          {jokers.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                  {members.filter(m => m.team === team && m.is_registered === 1).length === 0 && (
                    <div className="text-center py-20 text-muted-foreground font-black italic opacity-20 uppercase">Deployment empty</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Achievements */}
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
                     <td className="py-5 px-4">
                        <p className="font-black uppercase tracking-tighter">{m.username}</p>
                        <p className="text-[9px] text-muted-foreground font-bold">{m.email}</p>
                     </td>
                     {achievements.map(a=>{
                        const hasIt = userAchievements.some(ua=>ua.kinde_id===m.kinde_id && ua.achievement_id===a.id);
                        return (
                          <td key={a.id} className="text-center px-2">
                             <button 
                               onClick={()=>handleAchievementToggle(m.kinde_id, a.id, hasIt)}
                               className={`px-5 py-1.5 rounded-full text-[9px] font-black transition-all border-2 ${hasIt ? 'bg-primary border-primary text-primary-foreground shadow-lg scale-110' : 'bg-transparent border-muted text-muted-foreground hover:border-foreground'}`}
                             >
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

      {/* Tab: Matches & Pipeline */}
      {activeTab === 'matches' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
           <div className="lg:col-span-1 bg-card p-8 rounded-[3rem] border-4 border-white/5 shadow-2xl">
              <h3 className="text-xl font-black mb-8 italic uppercase tracking-widest text-primary">Establish Link</h3>
              <form onSubmit={handleCreateMatch} className="space-y-8">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-red-600">Red Node</label>
                   <select name="red" className="w-full bg-muted p-4 rounded-2xl font-black outline-none border-none ring-0 focus:ring-4 ring-red-600/20">
                     <option value="">SELECT PLAYER...</option>
                     {redPool.map(m=><option key={m.kinde_id} value={m.kinde_id}>{m.username}</option>)}
                   </select>
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-blue-600">Blue Node</label>
                   <select name="blue" className="w-full bg-muted p-4 rounded-2xl font-black outline-none border-none ring-0 focus:ring-4 ring-blue-600/20">
                     <option value="">SELECT PLAYER...</option>
                     {bluePool.map(m=><option key={m.kinde_id} value={m.kinde_id}>{m.username}</option>)}
                   </select>
                 </div>
                 <button type="submit" className="w-full bg-primary text-primary-foreground font-black py-5 rounded-[1.5rem] text-xl hover:opacity-90 shadow-2xl transition-all uppercase tracking-tighter">Deploy to Schedule</button>
              </form>
           </div>
           <div className="lg:col-span-2 bg-card p-8 rounded-[3rem] border shadow-xl overflow-hidden">
              <h3 className="text-xl font-black mb-8 italic uppercase tracking-widest opacity-40">Match Pipeline</h3>
              <div className="space-y-4">
                 {matches.map((m,i)=>(
                   <div key={m.id} className={`flex items-center gap-6 p-6 rounded-[2rem] border-2 transition-all group ${systemState.active_match_id === m.id.toString() ? 'bg-primary/10 border-primary shadow-lg shadow-primary/10' : 'bg-muted/10 border-white/5'}`}>
                      <span className="text-5xl font-black italic opacity-10 w-16">#{i+1}</span>
                      <div className="flex-1 flex justify-between font-black uppercase italic tracking-tighter text-lg">
                         <span className="text-red-600">{m.red_player_name}</span>
                         <span className="opacity-10 italic">VS</span>
                         <span className="text-blue-600">{m.blue_player_name}</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {systemState.active_match_id === m.id.toString() ? (
                          <button onClick={()=>handleSetActiveMatch(null)} className="bg-destructive text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg">Deactivate</button>
                        ) : (
                          <button onClick={()=>handleSetActiveMatch(m.id.toString())} className="bg-primary text-primary-foreground px-6 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg hover:scale-105">Engage</button>
                        )}
                        <button onClick={()=>{if(confirm('Delete?')) fetchData(true)}} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive font-black text-[10px] transition-all">SCRAP</button>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* Tab: LIVE CONTROL WORKBENCH */}
      {activeTab === 'live' && (
        <div className="space-y-10 animate-in fade-in duration-500">
           {!activeMatch ? (
             <div className="bg-card p-32 rounded-[4rem] border-8 border-dashed border-muted text-center space-y-8">
                <div className="text-9xl animate-pulse grayscale">📡</div>
                <h2 className="text-5xl font-black uppercase italic tracking-tighter opacity-30">Workbench Idle</h2>
                <p className="text-muted-foreground font-bold text-xl uppercase tracking-widest">Select an active engagement in the Schedule tab</p>
             </div>
           ) : (
             <div className="space-y-12">
                {/* Active Match Banner */}
                <div className="bg-card p-10 rounded-[3.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.4)] border-x-8 border-primary flex justify-between items-center relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 via-primary to-blue-600 animate-shimmer"></div>
                   <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-2 animate-pulse">🔴 Live Data Stream Established</div>
                      <h2 className="text-5xl font-black italic tracking-tighter uppercase leading-none">
                        {activeMatch.red_player_name} <span className="text-muted-foreground/30 px-4">VS</span> {activeMatch.blue_player_name}
                      </h2>
                   </div>
                   <button onClick={() => handleSetActiveMatch(null)} className="bg-neutral-900 text-white px-12 py-5 rounded-3xl font-black uppercase tracking-widest hover:bg-black transition-all border-b-8 border-neutral-700 active:border-b-0 active:translate-y-2">
                     Finish Match
                   </button>
                </div>

                {/* The Two Rounds */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                   {/* Round 1: Red's Pick */}
                   <div className={`space-y-6 ${activeMatch.round_1_status === 'completed' ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                      <div className="bg-red-600 text-white p-8 rounded-t-[3rem] flex justify-between items-end">
                         <div>
                            <h3 className="text-3xl font-black italic tracking-tighter uppercase">Round 1: Red's Pick</h3>
                            <p className="text-[10px] font-black uppercase opacity-60 mt-1 tracking-widest text-white">Only Red's Joker Applies</p>
                         </div>
                         {activeMatch.round_1_status === 'completed' && <span className="bg-white text-red-600 px-6 py-2 rounded-full font-black uppercase tracking-widest shadow-xl">Archived</span>}
                      </div>
                      <form onSubmit={(e)=>handleCommitRound(e, 'red_pick')} className="bg-card p-10 rounded-b-[3rem] border-x-4 border-b-4 border-red-600/10 shadow-2xl space-y-12">
                         {/* Form Content */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* Red Side (Active Mult) */}
                            <div className="space-y-6">
                               <div className="flex justify-between items-center border-b-2 border-red-600/20 pb-3">
                                  <h4 className="font-black text-red-600 text-xl uppercase italic">{activeMatch.red_player_name}</h4>
                                  <span className="text-[9px] font-black bg-red-600 text-white px-2 py-0.5 rounded">HOME</span>
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase opacity-50">基础分 Manual Base</label>
                                  <input name="red_base" type="number" step="any" required className="w-full bg-muted p-5 rounded-2xl font-black text-4xl text-center focus:ring-8 ring-red-600/10 outline-none" />
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase text-purple-600 font-black">Joker 倍率 (Primary)</label>
                                  <input name="red_mult" type="number" step="any" defaultValue="1" className="w-full bg-purple-50 p-5 rounded-2xl font-black text-4xl text-center focus:ring-8 ring-purple-600/10 outline-none text-purple-700" />
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase opacity-50">塔罗牌 Tarot Card</label>
                                  <select name="red_tarot" className="w-full bg-muted p-3 rounded-xl font-bold text-xs uppercase outline-none border-none">
                                     <option value="">NONE</option>
                                     {tarots.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                                  </select>
                               </div>
                               <input name="red_hand" placeholder="POKER HAND (e.g. Full House)" className="w-full bg-muted p-3 rounded-xl font-black text-xs uppercase outline-none border-none" />
                            </div>

                            {/* Blue Side (Locked Mult) */}
                            <div className="space-y-6 opacity-70">
                               <div className="flex justify-between items-center border-b-2 border-blue-600/20 pb-3">
                                  <h4 className="font-black text-blue-600 text-xl uppercase italic">{activeMatch.blue_player_name}</h4>
                                  <span className="text-[9px] font-black bg-neutral-600 text-white px-2 py-0.5 rounded uppercase">Away</span>
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase opacity-50">基础分 Manual Base</label>
                                  <input name="blue_base" type="number" step="any" required className="w-full bg-muted p-5 rounded-2xl font-black text-4xl text-center focus:ring-8 ring-blue-600/10 outline-none" />
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase opacity-30">Joker 倍率 (Locked)</label>
                                  <input name="blue_mult" type="number" value="1.0" readOnly className="w-full bg-neutral-100 p-5 rounded-2xl font-black text-4xl text-center opacity-30 cursor-not-allowed border-none outline-none" />
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase opacity-50">塔罗牌 Tarot Card</label>
                                  <select name="blue_tarot" className="w-full bg-muted p-3 rounded-xl font-bold text-xs uppercase outline-none border-none">
                                     <option value="">NONE</option>
                                     {tarots.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                                  </select>
                               </div>
                               <input name="blue_hand" placeholder="POKER HAND" className="w-full bg-muted p-3 rounded-xl font-black text-xs uppercase outline-none border-none" />
                            </div>
                         </div>
                         <button type="submit" className="w-full bg-red-600 text-white font-black py-8 rounded-[2rem] text-2xl uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(220,38,38,0.3)] hover:scale-[1.02] active:scale-95 transition-all italic">
                            Commit Round 1 Archive
                         </button>
                      </form>
                   </div>

                   {/* Round 2: Blue's Pick */}
                   <div className={`space-y-6 ${activeMatch.round_2_status === 'completed' || activeMatch.round_1_status !== 'completed' ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                      <div className="bg-blue-600 text-white p-8 rounded-t-[3rem] flex justify-between items-end">
                         <div>
                            <h3 className="text-3xl font-black italic tracking-tighter uppercase">Round 2: Blue's Pick</h3>
                            <p className="text-[10px] font-black uppercase opacity-60 mt-1 tracking-widest text-white">Only Blue's Joker Applies</p>
                         </div>
                         {activeMatch.round_2_status === 'completed' && <span className="bg-white text-blue-600 px-6 py-2 rounded-full font-black uppercase tracking-widest shadow-xl">Archived</span>}
                      </div>
                      <form onSubmit={(e)=>handleCommitRound(e, 'blue_pick')} className="bg-card p-10 rounded-b-[3rem] border-x-4 border-b-4 border-blue-600/10 shadow-2xl space-y-12">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* Red Side (Locked Mult) */}
                            <div className="space-y-6 opacity-70">
                               <div className="flex justify-between items-center border-b-2 border-red-600/20 pb-3">
                                  <h4 className="font-black text-red-600 text-xl uppercase italic">{activeMatch.red_player_name}</h4>
                                  <span className="text-[9px] font-black bg-neutral-600 text-white px-2 py-0.5 rounded uppercase">Away</span>
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase opacity-50">基础分 Manual Base</label>
                                  <input name="red_base" type="number" step="any" required className="w-full bg-muted p-5 rounded-2xl font-black text-4xl text-center focus:ring-8 ring-red-600/10 outline-none" />
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase opacity-30">Joker 倍率 (Locked)</label>
                                  <input name="red_mult" type="number" value="1.0" readOnly className="w-full bg-neutral-100 p-5 rounded-2xl font-black text-4xl text-center opacity-30 cursor-not-allowed border-none outline-none" />
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase opacity-50">塔罗牌 Tarot Card</label>
                                  <select name="red_tarot" className="w-full bg-muted p-3 rounded-xl font-bold text-xs uppercase outline-none border-none">
                                     <option value="">NONE</option>{tarots.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                                  </select>
                               </div>
                               <input name="red_hand" placeholder="POKER HAND" className="w-full bg-muted p-3 rounded-xl font-black text-xs uppercase outline-none border-none" />
                            </div>

                            {/* Blue Side (Active Mult) */}
                            <div className="space-y-6">
                               <div className="flex justify-between items-center border-b-2 border-blue-600/20 pb-3">
                                  <h4 className="font-black text-blue-600 text-xl uppercase italic">{activeMatch.blue_player_name}</h4>
                                  <span className="text-[9px] font-black bg-blue-600 text-white px-2 py-0.5 rounded">HOME</span>
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase opacity-50">基础分 Manual Base</label>
                                  <input name="blue_base" type="number" step="any" required className="w-full bg-muted p-5 rounded-2xl font-black text-4xl text-center focus:ring-8 ring-blue-600/10 outline-none" />
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase text-purple-600 font-black">Joker 倍率 (Primary)</label>
                                  <input name="blue_mult" type="number" step="any" defaultValue="1" className="w-full bg-purple-50 p-5 rounded-2xl font-black text-4xl text-center focus:ring-8 ring-purple-600/10 outline-none text-purple-700" />
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase opacity-50">塔罗牌 Tarot Card</label>
                                  <select name="blue_tarot" className="w-full bg-muted p-3 rounded-xl font-bold text-xs uppercase outline-none border-none">
                                     <option value="">NONE</option>{tarots.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                                  </select>
                               </div>
                               <input name="blue_hand" placeholder="POKER HAND" className="w-full bg-muted p-3 rounded-xl font-black text-xs uppercase outline-none border-none" />
                            </div>
                         </div>
                         <button type="submit" className="w-full bg-blue-600 text-white font-black py-8 rounded-[2rem] text-2xl uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(37,99,235,0.3)] hover:scale-[1.02] active:scale-95 transition-all italic">
                            Commit Round 2 Archive
                         </button>
                      </form>
                   </div>
                </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
};
