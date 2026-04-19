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
}

interface UserAchievement {
  kinde_id: string;
  achievement_id: string;
}

interface Match {
  id: number;
  red_player_id: string;
  blue_player_id: string;
  red_player_name: string;
  blue_player_name: string;
  order_index: number;
  status: string;
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
  assigned_at: string;
}

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'achievements' | 'teams' | 'matches' | 'cards' | 'live'>('achievements');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [cardLibrary, setCardLibrary] = useState<Card[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
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
      // Sort members by team_order
      setMembers((regData as Member[]).sort((a, b) => a.team_order - b.team_order));
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

  const handleTeamChange = async (targetKindeId: string, team: string | null) => {
    const action = team ? 'set_team' : 'remove_registration';
    try {
      await fetch('/api/admin/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetKindeId, action, team })
      });
      fetchData(true);
    } catch (e) { alert("更新失败"); }
  };

  const handleReorder = async (kindeId: string, direction: 'up' | 'down') => {
    const teamMembers = members.filter(m => {
       const target = members.find(x => x.kinde_id === kindeId);
       return m.team === target?.team;
    });
    const index = teamMembers.findIndex(m => m.kinde_id === kindeId);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === teamMembers.length - 1) return;

    const newOrder = [...teamMembers];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    [newOrder[index], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[index]];

    // Create mapping of KindeID to new order index
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
    if (!confirm("确定要为所有已报名选手随机分配小丑牌吗？这会覆盖现有的分配。")) return;
    try {
      await fetch('/api/admin/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'random_joker' })
      });
      alert("随机分配完成！");
      fetchData(true);
    } catch (e) { alert("随机分配失败"); }
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

  const handleDeleteMatch = async (matchId: number) => {
    if (!confirm("确定要删除这场对阵吗？")) return;
    try {
      await fetch('/api/admin/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', matchId })
      });
      fetchData(true);
    } catch (e) { alert("删除失败"); }
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
    } catch (e) { alert("设置失败"); }
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
        exponent: formData.get('red_exp') || 1,
        tarot: formData.get('red_tarot'),
        hand: formData.get('red_hand'),
      },
      blueData: {
        baseScore: formData.get('blue_base'),
        multiplier: formData.get('blue_mult'),
        exponent: formData.get('blue_exp') || 1,
        tarot: formData.get('blue_tarot'),
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

  const handleAssignCard = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const cardId = formData.get('cardId');
    const target = formData.get('target') as string;
    if (!cardId || !target) return;
    let ownerType = (target === 'red' || target === 'blue') ? 'team' : 'user';
    try {
      await fetch('/api/admin/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign', cardId: parseInt(cardId as string), ownerType, ownerId: target })
      });
      fetchData(true);
    } catch (e) { alert("发放失败"); }
  };

  if (loading) return <div className="text-center p-20 font-black animate-pulse text-2xl tracking-widest uppercase">Initializing Core...</div>;

  const redPool = members.filter(m => m.is_registered === 1 && m.team === 'red');
  const bluePool = members.filter(m => m.is_registered === 1 && m.team === 'blue');
  const activeMatch = matches.find(m => m.id.toString() === systemState.active_match_id);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-4 border-primary pb-6">
        <div>
          <h1 className="text-6xl font-black tracking-tighter italic text-primary leading-none">NGU4th ADMIN</h1>
          <p className="text-muted-foreground font-black uppercase tracking-[0.2em] text-[10px] mt-1">Global Match Control Unit v5.0</p>
        </div>
        <div className="flex gap-4">
          <button onClick={handleRandomJoker} className="bg-purple-600 text-white px-6 py-2 rounded-xl font-black hover:bg-purple-700 transition-all shadow-lg text-sm italic">
            🎲 一键随机分配小丑牌
          </button>
          <a href="/live" target="_blank" className="bg-green-600 text-white px-6 py-2 rounded-xl font-black hover:bg-green-700 transition-all shadow-lg text-sm">
            打开直播大屏
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-muted p-1.5 rounded-2xl w-fit overflow-x-auto shadow-inner">
        {(['achievements', 'teams', 'matches', 'cards', 'live'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => switchTab(tab)}
            className={`px-8 py-3 rounded-xl font-black transition-all whitespace-nowrap uppercase tracking-tighter text-sm ${
              activeTab === tab ? 'bg-background shadow-xl text-primary scale-105 border-2 border-primary/20' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'achievements' ? '勋章发放' : tab === 'teams' ? '出场排序' : tab === 'matches' ? '赛程对阵' : tab === 'cards' ? '卡牌仓库' : '🔴 计分工作台'}
          </button>
        ))}
      </div>

      {/* Roster / Ordering Tab */}
      {activeTab === 'teams' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {['red', 'blue'].map(team => (
            <div key={team} className={`bg-card rounded-[2rem] shadow-2xl border-4 ${team === 'red' ? 'border-red-600/20' : 'border-blue-600/20'} overflow-hidden`}>
              <div className={`p-6 ${team === 'red' ? 'bg-red-600' : 'bg-blue-600'} text-white flex justify-between items-center`}>
                <h3 className="text-2xl font-black italic tracking-widest uppercase">{team} Team Roster</h3>
                <span className="font-black opacity-50">#{team.toUpperCase()}</span>
              </div>
              <div className="p-4 space-y-3">
                {members.filter(m => m.team === team && m.is_registered === 1).map((m, i) => (
                  <div key={m.kinde_id} className="flex items-center gap-4 bg-muted/30 p-4 rounded-2xl border-2 border-transparent hover:border-primary/30 transition-all group">
                    <span className="text-2xl font-black italic text-muted-foreground/30 w-8">#{i + 1}</span>
                    <div className="flex-1">
                      <p className="font-black text-lg leading-none">{m.username}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">{m.email}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleReorder(m.kinde_id, 'up')} className="bg-background p-2 rounded-lg hover:bg-primary hover:text-white border shadow-sm">▲</button>
                      <button onClick={() => handleReorder(m.kinde_id, 'down')} className="bg-background p-2 rounded-lg hover:bg-primary hover:text-white border shadow-sm">▼</button>
                      <button onClick={() => handleTeamChange(m.kinde_id, null)} className="bg-background p-2 rounded-lg hover:bg-destructive hover:text-white border shadow-sm text-xs font-bold text-destructive">移除</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live Scoring Workbench */}
      {activeTab === 'live' && (
        <div className="space-y-10">
          {!activeMatch ? (
             <div className="bg-card p-20 rounded-[3rem] border-4 border-dashed border-muted text-center space-y-6">
                <div className="text-8xl">📡</div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter">计分引擎待机中</h2>
                <p className="text-muted-foreground font-bold text-xl">请前往“赛程对阵”标签页，点击“设为活动”来挂载一场 1v1 对抗。</p>
             </div>
          ) : (
            <div className="space-y-10">
               {/* Round Selection & Info */}
               <div className="bg-card p-8 rounded-[3rem] shadow-2xl border-4 border-primary/20 flex justify-between items-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-primary animate-pulse"></div>
                  <div>
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase mb-1">
                      Active Encounter: {activeMatch.red_player_name} vs {activeMatch.blue_player_name}
                    </h2>
                    <div className="flex gap-4">
                       <span className={`px-4 py-1 rounded-full text-xs font-black uppercase ${activeMatch.round_1_status === 'completed' ? 'bg-green-600 text-white' : 'bg-yellow-500 text-black animate-pulse'}`}>
                         Round 1: {activeMatch.round_1_status === 'completed' ? 'Archived' : 'Ready for RED\'S PICK'}
                       </span>
                       <span className={`px-4 py-1 rounded-full text-xs font-black uppercase ${activeMatch.round_2_status === 'completed' ? 'bg-green-600 text-white' : (activeMatch.round_1_status === 'completed' ? 'bg-yellow-500 text-black animate-pulse' : 'bg-muted text-muted-foreground opacity-50')}`}>
                         Round 2: {activeMatch.round_2_status === 'completed' ? 'Archived' : (activeMatch.round_1_status === 'completed' ? 'Ready for BLUE\'S PICK' : 'Locked')}
                       </span>
                    </div>
                  </div>
                  <button onClick={() => handleSetActiveMatch(null)} className="bg-neutral-800 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-neutral-900 transition-all border-b-4 border-black">
                    完结本场对抗 FINISH
                  </button>
               </div>

               {/* Scoring Forms */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  {/* Round 1 Form */}
                  <div className={`space-y-6 ${activeMatch.round_1_status === 'completed' ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                    <div className="bg-red-600 text-white p-6 rounded-t-[2.5rem] font-black italic text-2xl flex justify-between">
                      <span>ROUND 1: RED'S PICK</span>
                      {activeMatch.round_1_status === 'completed' && <span className="bg-white text-red-600 px-4 py-1 rounded-full text-xs not-italic uppercase tracking-widest">Saved</span>}
                    </div>
                    <form onSubmit={(e) => handleCommitRound(e, 'red_pick')} className="bg-card p-8 rounded-b-[2.5rem] border-x-4 border-b-4 border-red-600/20 shadow-2xl space-y-8">
                       <div className="grid grid-cols-2 gap-8">
                          {/* Red Side */}
                          <div className="space-y-6">
                            <h4 className="font-black text-red-600 border-b-2 border-red-600/10 pb-2">RED: {activeMatch.red_player_name}</h4>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase tracking-widest opacity-50">基础分数 Manual Base</label>
                               <input name="red_base" type="number" step="any" required className="w-full bg-muted p-4 rounded-xl font-black text-2xl focus:ring-4 ring-red-600/30 outline-none" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase tracking-widest opacity-50 text-purple-600">Joker 倍率 (Primary)</label>
                               <input name="red_mult" type="number" step="any" defaultValue="1" className="w-full bg-purple-50 p-4 rounded-xl font-black text-2xl focus:ring-4 ring-purple-600/30 outline-none text-purple-700" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                               <input name="red_tarot" placeholder="塔罗牌 Tarot" className="bg-muted p-2 rounded-lg text-xs font-bold" />
                               <input name="red_hand" placeholder="牌组 Hand" className="bg-muted p-2 rounded-lg text-xs font-bold" />
                            </div>
                          </div>
                          {/* Blue Side */}
                          <div className="space-y-6 opacity-80">
                            <h4 className="font-black text-blue-600 border-b-2 border-blue-600/10 pb-2">BLUE: {activeMatch.blue_player_name}</h4>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase tracking-widest opacity-50">基础分数 Manual Base</label>
                               <input name="blue_base" type="number" step="any" required className="w-full bg-muted p-4 rounded-xl font-black text-2xl focus:ring-4 ring-blue-600/30 outline-none" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Joker 倍率 (Locked)</label>
                               <input name="blue_mult" type="number" value="1.0" readOnly className="w-full bg-neutral-100 p-4 rounded-xl font-black text-2xl border-none outline-none opacity-50 cursor-not-allowed" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                               <input name="blue_tarot" placeholder="塔罗牌 Tarot" className="bg-muted p-2 rounded-lg text-xs font-bold" />
                               <input name="blue_hand" placeholder="牌组 Hand" className="bg-muted p-2 rounded-lg text-xs font-bold" />
                            </div>
                          </div>
                       </div>
                       <button type="submit" className="w-full bg-red-600 text-white font-black py-6 rounded-3xl text-2xl uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-red-600/20 italic">
                         Commit Round 1 (Save to Archive)
                       </button>
                    </form>
                  </div>

                  {/* Round 2 Form */}
                  <div className={`space-y-6 ${activeMatch.round_2_status === 'completed' || activeMatch.round_1_status !== 'completed' ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                    <div className="bg-blue-600 text-white p-6 rounded-t-[2.5rem] font-black italic text-2xl flex justify-between">
                      <span>ROUND 2: BLUE'S PICK</span>
                      {activeMatch.round_2_status === 'completed' && <span className="bg-white text-blue-600 px-4 py-1 rounded-full text-xs not-italic uppercase tracking-widest">Saved</span>}
                    </div>
                    <form onSubmit={(e) => handleCommitRound(e, 'blue_pick')} className="bg-card p-8 rounded-b-[2.5rem] border-x-4 border-b-4 border-blue-600/20 shadow-2xl space-y-8">
                       <div className="grid grid-cols-2 gap-8">
                          {/* Red Side (Locked Mult) */}
                          <div className="space-y-6 opacity-80">
                            <h4 className="font-black text-red-600 border-b-2 border-red-600/10 pb-2">RED: {activeMatch.red_player_name}</h4>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase tracking-widest opacity-50">基础分数 Manual Base</label>
                               <input name="red_base" type="number" step="any" required className="w-full bg-muted p-4 rounded-xl font-black text-2xl focus:ring-4 ring-red-600/30 outline-none" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Joker 倍率 (Locked)</label>
                               <input name="red_mult" type="number" value="1.0" readOnly className="w-full bg-neutral-100 p-4 rounded-xl font-black text-2xl border-none outline-none opacity-50 cursor-not-allowed" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                               <input name="red_tarot" placeholder="塔罗牌 Tarot" className="bg-muted p-2 rounded-lg text-xs font-bold" />
                               <input name="red_hand" placeholder="牌组 Hand" className="bg-muted p-2 rounded-lg text-xs font-bold" />
                            </div>
                          </div>
                          {/* Blue Side (Active Mult) */}
                          <div className="space-y-6">
                            <h4 className="font-black text-blue-600 border-b-2 border-blue-600/10 pb-2">BLUE: {activeMatch.blue_player_name}</h4>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase tracking-widest opacity-50">基础分数 Manual Base</label>
                               <input name="blue_base" type="number" step="any" required className="w-full bg-muted p-4 rounded-xl font-black text-2xl focus:ring-4 ring-blue-600/30 outline-none" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase tracking-widest opacity-50 text-purple-600">Joker 倍率 (Primary)</label>
                               <input name="blue_mult" type="number" step="any" defaultValue="1" className="w-full bg-purple-50 p-4 rounded-xl font-black text-2xl focus:ring-4 ring-purple-600/30 outline-none text-purple-700" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                               <input name="blue_tarot" placeholder="塔罗牌 Tarot" className="bg-muted p-2 rounded-lg text-xs font-bold" />
                               <input name="blue_hand" placeholder="牌组 Hand" className="bg-muted p-2 rounded-lg text-xs font-bold" />
                            </div>
                          </div>
                       </div>
                       <button type="submit" className="w-full bg-blue-600 text-white font-black py-6 rounded-3xl text-2xl uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-600/20 italic">
                         Commit Round 2 (Save to Archive)
                       </button>
                    </form>
                  </div>
               </div>
            </div>
          )}
        </div>
      )}

      {/* Legacy/Utility Tabs (Badges, Matches, Armory) are omitted for brevity in thought, but included in implementation if needed or kept as they were */}
      {/* (Adding simplified versions of them below to ensure full file rewrite success) */}
      {activeTab === 'achievements' && (
         <div className="bg-card p-10 rounded-[3rem] border shadow-xl">
           <h3 className="text-2xl font-black italic mb-6">BADGE DISTRIBUTION HUB</h3>
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead><tr className="opacity-50 text-[10px] uppercase font-black tracking-widest"><th className="pb-4">User</th>{achievements.map(a=><th key={a.id} className="text-center">{a.name}</th>)}</tr></thead>
               <tbody className="divide-y divide-white/5">{members.map(m=><tr key={m.kinde_id} className="group hover:bg-muted/50 transition-all"><td className="py-4 font-bold">{m.username}</td>{achievements.map(a=><td key={a.id} className="text-center"><button onClick={()=>handleAchievementToggle(m.kinde_id, a.id, userAchievements.some(ua=>ua.kinde_id===m.kinde_id && ua.achievement_id===a.id))} className={`px-4 py-1 rounded-full text-[10px] font-black border-2 ${userAchievements.some(ua=>ua.kinde_id===m.kinde_id && ua.achievement_id===a.id) ? 'bg-primary border-primary text-primary-foreground' : 'bg-transparent border-muted text-muted-foreground'}`}>{userAchievements.some(ua=>ua.kinde_id===m.kinde_id && ua.achievement_id===a.id) ? 'YES' : 'NO'}</button></td>)}</tr>)}</tbody>
             </table>
           </div>
         </div>
      )}

      {activeTab === 'matches' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-1 bg-card p-8 rounded-[3rem] border shadow-xl">
              <h3 className="text-xl font-black mb-6 italic uppercase">Create Encounter</h3>
              <form onSubmit={handleCreateMatch} className="space-y-6">
                 <div>
                   <label className="text-[10px] font-black uppercase opacity-50">Red Team Attacker</label>
                   <select name="red" className="w-full bg-muted p-4 rounded-2xl font-black mt-2 outline-none border-none ring-0 focus:ring-4 ring-red-600/30">
                     <option value="">SELECT...</option>{redPool.map(m=><option key={m.kinde_id} value={m.kinde_id}>{m.username}</option>)}
                   </select>
                 </div>
                 <div>
                   <label className="text-[10px] font-black uppercase opacity-50">Blue Team Defender</label>
                   <select name="blue" className="w-full bg-muted p-4 rounded-2xl font-black mt-2 outline-none border-none ring-0 focus:ring-4 ring-blue-600/30">
                     <option value="">SELECT...</option>{bluePool.map(m=><option key={m.kinde_id} value={m.kinde_id}>{m.username}</option>)}
                   </select>
                 </div>
                 <button type="submit" className="w-full bg-primary text-primary-foreground font-black py-4 rounded-2xl text-lg hover:opacity-90 shadow-xl shadow-primary/20">DEPLOY MATCH</button>
              </form>
           </div>
           <div className="lg:col-span-2 bg-card p-8 rounded-[3rem] border shadow-xl">
              <h3 className="text-xl font-black mb-6 italic uppercase">Match Pipeline</h3>
              <div className="space-y-4">
                 {matches.map((m,i)=>(
                   <div key={m.id} className={`flex items-center gap-6 p-6 rounded-3xl border-2 transition-all ${systemState.active_match_id === m.id.toString() ? 'bg-primary/5 border-primary' : 'bg-muted/10 border-white/5'}`}>
                      <span className="text-4xl font-black italic opacity-20 w-12">#{i+1}</span>
                      <div className="flex-1 flex justify-between font-black uppercase italic tracking-tighter">
                         <span className="text-red-600">{m.red_player_name}</span>
                         <span className="opacity-20 italic">VS</span>
                         <span className="text-blue-600">{m.blue_player_name}</span>
                      </div>
                      <div className="flex gap-2">
                        {systemState.active_match_id === m.id.toString() ? (
                          <button onClick={()=>handleSetActiveMatch(null)} className="bg-destructive text-white px-4 py-2 rounded-xl font-black text-[10px]">CEASE</button>
                        ) : (
                          <button onClick={()=>handleSetActiveMatch(m.id.toString())} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-black text-[10px]">ENGAGE</button>
                        )}
                        <button onClick={()=>handleDeleteMatch(m.id)} className="text-muted-foreground hover:text-destructive font-black text-[10px]">SCRAP</button>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {activeTab === 'cards' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-1 bg-card p-8 rounded-[3rem] border shadow-xl">
              <h3 className="text-xl font-black mb-6 italic uppercase">Armory Management</h3>
              <form onSubmit={handleAssignCard} className="space-y-6">
                 <select name="cardId" className="w-full bg-muted p-4 rounded-2xl font-black outline-none border-none ring-0"><option value="">SELECT CARD...</option>{cardLibrary.map(c=><option key={c.id} value={c.id}>[{c.type}] {c.name}</option>)}</select>
                 <select name="target" className="w-full bg-muted p-4 rounded-2xl font-black outline-none border-none ring-0"><option value="">SELECT TARGET...</option><optgroup label="Teams"><option value="red">RED TEAM</option><option value="blue">BLUE TEAM</option></optgroup><optgroup label="Individuals">{members.filter(m=>m.is_registered===1).map(m=><option key={m.kinde_id} value={m.kinde_id}>{m.username}</option>)}</optgroup></select>
                 <button type="submit" className="w-full bg-primary text-primary-foreground font-black py-4 rounded-2xl text-lg hover:opacity-90">AUTHORIZE TRANSFER</button>
              </form>
           </div>
           <div className="lg:col-span-2 bg-card p-8 rounded-[3rem] border shadow-xl overflow-hidden">
              <h3 className="text-xl font-black mb-6 italic uppercase tracking-widest">Active Assets</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
                 {inventory.map(item=>(
                   <div key={item.id} className="bg-muted/10 p-5 rounded-2xl border-2 border-white/5">
                     <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-primary/20 text-primary uppercase">{item.card_type}</span>
                     <p className="font-black text-xl leading-none mt-2 uppercase tracking-tighter">{item.card_name}</p>
                     <p className="text-[10px] font-bold text-muted-foreground mt-3 pt-3 border-t border-white/5 uppercase">Held by {item.owner_name}</p>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
