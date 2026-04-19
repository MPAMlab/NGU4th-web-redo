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

      if (!achRes.ok || !regRes.ok || !matchRes.ok || !cardRes.ok || !sysRes.ok) throw new Error('Failed to fetch admin data');

      const [achData, regData, matchData, cardData, sysData] = await Promise.all([
        achRes.json(),
        regRes.json(),
        matchRes.json(),
        cardRes.json(),
        sysRes.json()
      ]);

      setAchievements(achData.achievements);
      setUserAchievements(achData.userAchievements);
      setMembers(regData);
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
      const res = await fetch('/api/admin/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetKindeId: kinde_id, achievementId: achievement_id, action })
      });
      if (res.ok) fetchData(true);
    } catch (e) { alert("Action failed"); }
  };

  const handleTeamChange = async (targetKindeId: string, team: string | null) => {
    const action = team ? 'set_team' : 'remove_registration';
    try {
      const res = await fetch('/api/admin/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetKindeId, action, team })
      });
      if (res.ok) fetchData(true);
    } catch (e) { alert("Failed to update team"); }
  };

  const handleCreateMatch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const redPlayerId = formData.get('red') as string;
    const bluePlayerId = formData.get('blue') as string;
    if (!redPlayerId || !bluePlayerId) return;
    try {
      const res = await fetch('/api/admin/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', redPlayerId, bluePlayerId, orderIndex: matches.length })
      });
      if (res.ok) fetchData(true);
    } catch (e) { alert("Failed to create match"); }
  };

  const handleDeleteMatch = async (matchId: number) => {
    try {
      const res = await fetch('/api/admin/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', matchId })
      });
      if (res.ok) fetchData(true);
    } catch (e) { alert("Failed to delete match"); }
  };

  const handleSetActiveMatch = async (matchId: string | null) => {
    try {
      const res = await fetch('/api/admin/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'active_match_id', value: matchId })
      });
      if (res.ok) {
        fetchData(true);
        if (matchId) setActiveTab('live');
      }
    } catch (e) { alert("Failed to set active match"); }
  };

  const handleRecordScore = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const playerId = formData.get('playerId') as string;
    const baseScore = parseFloat(formData.get('baseScore') as string);
    const multiplier = parseFloat(formData.get('multiplier') as string);
    const exponent = parseFloat(formData.get('exponent') as string);
    
    if (!playerId || isNaN(baseScore)) return;

    const player = members.find(m => m.kinde_id === playerId);
    if (!player) return;

    try {
      // We'll create a new endpoint for this to handle both round logging and inventory update
      const res = await fetch('/api/admin/scoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: systemState.active_match_id,
          playerId,
          team: player.team,
          baseScore,
          multiplier: multiplier || 1,
          exponent: exponent || 1
        })
      });
      if (res.ok) {
        alert("Score recorded!");
        fetchData(true);
      }
    } catch (e) { alert("Failed to record score"); }
  };

  const handleAssignCard = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const cardId = formData.get('cardId');
    const target = formData.get('target') as string;
    if (!cardId || !target) return;
    let ownerType = (target === 'red' || target === 'blue') ? 'team' : 'user';
    try {
      const res = await fetch('/api/admin/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign', cardId: parseInt(cardId as string), ownerType, ownerId: target })
      });
      if (res.ok) fetchData(true);
    } catch (e) { alert("Failed to assign card"); }
  };

  if (loading) return <div className="text-center p-20 font-bold animate-pulse text-2xl">NGU4th ENGINE LOADING...</div>;
  if (error) return <div className="p-6 text-destructive text-center font-bold">FATAL ERROR: {error}</div>;

  const registeredMembers = members.filter(m => m.is_registered === 1);
  const redPool = registeredMembers.filter(m => m.team === 'red');
  const bluePool = registeredMembers.filter(m => m.team === 'blue');
  const activeMatch = matches.find(m => m.id.toString() === systemState.active_match_id);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter italic text-primary">NGU4th ADMIN</h1>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Never Give Up 4th Control Unit</p>
        </div>
        <div className="flex gap-4">
          <a href="/live" target="_blank" className="bg-green-600 text-white px-6 py-2 rounded-full font-black hover:bg-green-700 transition-all shadow-lg">
            OPEN SPECTATOR SCREEN
          </a>
          <a href="/dashboard" className="bg-secondary text-secondary-foreground px-6 py-2 rounded-full font-bold hover:bg-secondary/80 transition-all">
            BACK TO DASH
          </a>
        </div>
      </div>

      <div className="flex gap-2 bg-muted p-1 rounded-2xl w-fit overflow-x-auto shadow-inner">
        {(['achievements', 'teams', 'matches', 'cards', 'live'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => switchTab(tab)}
            className={`px-8 py-3 rounded-xl font-black transition-all whitespace-nowrap uppercase tracking-tighter ${
              activeTab === tab ? 'bg-background shadow-lg text-primary scale-105' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'achievements' ? 'Badges' : tab === 'teams' ? 'Roster' : tab === 'matches' ? 'Schedule' : tab === 'cards' ? 'Armory' : '🔴 LIVE CONTROL'}
          </button>
        ))}
      </div>

      {activeTab === 'achievements' && (
        <div className="overflow-x-auto bg-card rounded-2xl shadow-xl border overflow-hidden">
          <table className="min-w-full text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-5 font-black uppercase tracking-wider text-xs">User</th>
                {achievements.map(a => (
                  <th key={a.id} className="px-6 py-5 font-black uppercase tracking-wider text-xs text-center" title={a.description}>
                    <div className="flex flex-col items-center">
                      <span className="text-xl mb-1">{a.icon === 'sparkles' ? '✨' : a.icon === 'award' ? '🏆' : a.icon === 'flag' ? '🚩' : '🎖️'}</span>
                      <span className="text-[10px]">{a.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {members.map(member => (
                <tr key={member.kinde_id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold">{member.username}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{member.email}</p>
                  </td>
                  {achievements.map(ach => {
                    const hasAchievement = userAchievements.some(ua => ua.kinde_id === member.kinde_id && ua.achievement_id === ach.id);
                    return (
                      <td key={ach.id} className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleAchievementToggle(member.kinde_id, ach.id, hasAchievement)}
                          className={`w-24 py-1.5 rounded-full text-[10px] font-black transition-all border-2 ${
                            hasAchievement ? 'bg-primary border-primary text-primary-foreground shadow-md' : 'bg-transparent border-muted text-muted-foreground hover:border-foreground hover:text-foreground'
                          }`}
                        >
                          {hasAchievement ? 'GRANTED' : 'REVOKED'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'teams' && (
        <div className="overflow-x-auto bg-card rounded-2xl shadow-xl border overflow-hidden">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-5 font-black uppercase tracking-wider text-xs">User</th>
                <th className="px-6 py-5 font-black uppercase tracking-wider text-xs text-center">Current Deployment</th>
                <th className="px-6 py-5 font-black uppercase tracking-wider text-xs text-center">Command</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.map(member => (
                <tr key={member.kinde_id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold">{member.username}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {member.is_registered ? (
                      <span className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-tighter ${member.team === 'red' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
                        Team {member.team}
                      </span>
                    ) : (
                      <span className="text-muted-foreground font-bold opacity-30 italic">UNASSIGNED</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => handleTeamChange(member.kinde_id, 'red')} className="text-[10px] font-black px-3 py-1 border-2 border-red-600 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all uppercase">Force Red</button>
                      <button onClick={() => handleTeamChange(member.kinde_id, 'blue')} className="text-[10px] font-black px-3 py-1 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all uppercase">Force Blue</button>
                      <button onClick={() => handleTeamChange(member.kinde_id, null)} className="text-[10px] font-black px-3 py-1 border-2 border-muted text-muted-foreground rounded-lg hover:bg-muted transition-all uppercase">Detach</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'matches' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card p-6 rounded-2xl shadow-xl border">
              <h3 className="text-xl font-black mb-4 tracking-tighter uppercase">Add Encounter</h3>
              <form onSubmit={handleCreateMatch} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-red-600">Red Attacker</label>
                  <select name="red" className="w-full bg-muted p-3 rounded-xl font-bold border-none outline-none focus:ring-2 ring-red-600">
                    <option value="">SELECT...</option>
                    {redPool.map(m => <option key={m.kinde_id} value={m.kinde_id}>{m.username}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-blue-600">Blue Defender</label>
                  <select name="blue" className="w-full bg-muted p-3 rounded-xl font-bold border-none outline-none focus:ring-2 ring-blue-600">
                    <option value="">SELECT...</option>
                    {bluePool.map(m => <option key={m.kinde_id} value={m.kinde_id}>{m.username}</option>)}
                  </select>
                </div>
                <button type="submit" className="w-full bg-primary text-primary-foreground font-black py-4 rounded-2xl hover:opacity-90 transition-all shadow-xl text-lg uppercase tracking-tighter">
                  Deploy to Schedule
                </button>
              </form>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-2xl shadow-xl border overflow-hidden">
              <div className="bg-muted/50 px-6 py-4 border-b">
                <h3 className="font-black uppercase tracking-widest text-xs">Engagement Order</h3>
              </div>
              <div className="p-6 space-y-4">
                {matches.length === 0 ? <div className="text-center py-20 text-muted-foreground italic font-bold">RADAR SILENT - NO MATCHES</div> : (
                  matches.map((match, i) => {
                    const isActive = systemState.active_match_id === match.id.toString();
                    return (
                      <div key={match.id} className={`flex items-center gap-6 p-6 rounded-2xl border-2 transition-all group ${isActive ? 'bg-primary/10 border-primary shadow-[0_0_30px_rgba(var(--primary),0.2)]' : 'bg-muted/20 border-white/5'}`}>
                        <span className="font-black text-4xl italic text-muted-foreground/30 w-12">#{i + 1}</span>
                        <div className="flex-1 grid grid-cols-3 items-center text-center gap-4">
                          <div className="bg-red-600 text-white py-3 rounded-xl font-black shadow-lg uppercase tracking-tighter">{match.red_player_name}</div>
                          <div className="font-black italic text-2xl text-primary animate-pulse">VS</div>
                          <div className="bg-blue-600 text-white py-3 rounded-xl font-black shadow-lg uppercase tracking-tighter">{match.blue_player_name}</div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {!isActive ? (
                            <button onClick={() => handleSetActiveMatch(match.id.toString())} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-black text-[10px] uppercase shadow-md hover:scale-105 transition-all">ENGAGE</button>
                          ) : (
                            <button onClick={() => handleSetActiveMatch(null)} className="bg-destructive text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase shadow-md">CEASE</button>
                          )}
                          <button onClick={() => handleDeleteMatch(match.id)} className="opacity-0 group-hover:opacity-100 text-destructive text-[10px] font-black uppercase hover:underline">SCRAP</button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'cards' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card p-6 rounded-2xl shadow-xl border">
              <h3 className="text-xl font-black mb-4 tracking-tighter uppercase">Resource Distribution</h3>
              <form onSubmit={handleAssignCard} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Classified Intel (Card)</label>
                  <select name="cardId" className="w-full bg-muted p-3 rounded-xl font-bold border-none text-sm outline-none focus:ring-2 ring-primary">
                    <option value="">SELECT...</option>
                    {cardLibrary.map(c => <option key={c.id} value={c.id}>[{c.type}] {c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Target Recipient</label>
                  <select name="target" className="w-full bg-muted p-3 rounded-xl font-bold border-none text-sm outline-none focus:ring-2 ring-primary">
                    <option value="">SELECT...</option>
                    <optgroup label="Collective (Teams)">
                      <option value="red">🔴 RED FORCE</option>
                      <option value="blue">🔵 BLUE FORCE</option>
                    </optgroup>
                    <optgroup label="Operative (Users)">
                      {registeredMembers.map(m => <option key={m.kinde_id} value={m.kinde_id}>{m.username} ({m.team === 'red' ? 'R' : 'B'})</option>)}
                    </optgroup>
                  </select>
                </div>
                <button type="submit" className="w-full bg-primary text-primary-foreground font-black py-4 rounded-2xl hover:opacity-90 transition-all shadow-xl text-lg uppercase">
                  Authorize Transfer
                </button>
              </form>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="bg-card rounded-2xl shadow-xl border overflow-hidden">
              <div className="bg-muted/50 px-6 py-4 border-b flex justify-between items-center">
                <h3 className="font-black uppercase text-xs tracking-widest">Active Assets in Field</h3>
                <span className="text-[10px] font-black bg-primary/20 text-primary px-3 py-1 rounded-full">{inventory.length} TOTAL</span>
              </div>
              <div className="p-6">
                {inventory.length === 0 ? <div className="text-center py-20 text-muted-foreground italic font-bold">NO CARDS DETECTED IN INVENTORY</div> : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {inventory.map(item => (
                      <div key={item.id} className="bg-muted/10 p-5 rounded-2xl border-2 border-white/5 relative group hover:border-primary/30 transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                            item.card_type === '小丑牌' ? 'bg-purple-600 text-white' : 
                            item.card_type === '塔罗牌' ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
                          }`}>
                            {item.card_type}
                          </span>
                          <button onClick={() => fetchData(true)} className="text-[10px] font-black text-muted-foreground uppercase hover:text-destructive">Revoke</button>
                        </div>
                        <p className="font-black text-xl leading-tight mb-2 tracking-tighter uppercase">{item.card_name}</p>
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Held By:</span>
                          <span className="text-xs font-black uppercase text-primary italic">{item.owner_name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'live' && (
        <div className="space-y-8 animate-in fade-in zoom-in duration-300">
          {!activeMatch ? (
             <div className="bg-card p-20 rounded-3xl border-2 border-dashed border-muted text-center space-y-4">
                <div className="text-6xl">📡</div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter">No Active Match Hooked</h2>
                <p className="text-muted-foreground font-bold">Go to the Schedule tab and click 'ENGAGE' on a match to begin live scoring.</p>
                <button onClick={() => setActiveTab('matches')} className="bg-primary text-primary-foreground px-8 py-3 rounded-full font-black uppercase tracking-widest shadow-xl">Goto Schedule</button>
             </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="bg-card p-10 rounded-[3rem] shadow-2xl border-4 border-primary/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-10 py-2 font-black rounded-bl-3xl uppercase text-xs tracking-widest">Live Terminal</div>
                <h3 className="text-3xl font-black italic mb-8 uppercase tracking-tighter text-muted-foreground">Scoring Input</h3>
                
                <form onSubmit={handleRecordScore} className="space-y-8">
                   <div className="space-y-3">
                     <label className="text-xs font-black uppercase tracking-widest">Active Operative</label>
                     <div className="flex gap-4">
                        <label className="flex-1">
                          <input type="radio" name="playerId" value={activeMatch.red_player_id} className="hidden peer" defaultChecked />
                          <div className="bg-muted p-5 rounded-2xl text-center font-black cursor-pointer border-4 border-transparent peer-checked:border-red-600 peer-checked:bg-red-600/10 transition-all uppercase italic">
                            {activeMatch.red_player_name} (RED)
                          </div>
                        </label>
                        <label className="flex-1">
                          <input type="radio" name="playerId" value={activeMatch.blue_player_id} className="hidden peer" />
                          <div className="bg-muted p-5 rounded-2xl text-center font-black cursor-pointer border-4 border-transparent peer-checked:border-blue-600 peer-checked:bg-blue-600/10 transition-all uppercase italic">
                            {activeMatch.blue_player_name} (BLUE)
                          </div>
                        </label>
                     </div>
                   </div>

                   <div className="grid grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Base Poker Score</label>
                        <input name="baseScore" type="number" step="any" placeholder="0.0" className="w-full bg-muted p-5 rounded-2xl font-black text-3xl text-center outline-none focus:ring-4 ring-primary/50" required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Multiplier</label>
                        <input name="multiplier" type="number" step="any" defaultValue="1" className="w-full bg-muted p-5 rounded-2xl font-black text-3xl text-center outline-none focus:ring-4 ring-primary/50" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Exponent</label>
                        <input name="exponent" type="number" step="any" defaultValue="1" className="w-full bg-muted p-5 rounded-2xl font-black text-3xl text-center outline-none focus:ring-4 ring-primary/50" />
                      </div>
                   </div>

                   <button type="submit" className="w-full bg-primary text-primary-foreground font-black py-6 rounded-3xl text-2xl uppercase tracking-tighter hover:scale-[1.02] transition-all shadow-[0_20px_50px_rgba(var(--primary),0.3)]">
                      COMMIT ROUND DATA
                   </button>
                </form>
              </div>

              <div className="space-y-6">
                 <div className="bg-neutral-900 rounded-[3rem] p-10 border border-white/5">
                    <h3 className="text-xl font-black uppercase text-neutral-500 mb-6 italic tracking-tighter">Current Inventory (Hints)</h3>
                    <div className="space-y-4">
                       {inventory.filter(i => i.owner_id === activeMatch.red_player_id || i.owner_id === activeMatch.blue_player_id || i.owner_id === 'red' || i.owner_id === 'blue').map(i => (
                         <div key={i.id} className="bg-white/5 p-4 rounded-2xl flex justify-between items-center">
                            <div>
                               <p className="font-black text-sm uppercase tracking-tighter">{i.card_name}</p>
                               <p className={`text-[9px] font-bold uppercase ${i.owner_id.length > 5 ? 'text-primary' : (i.owner_id === 'red' ? 'text-red-500' : 'text-blue-500')}`}>{i.owner_name}</p>
                            </div>
                            <span className="text-[10px] font-black opacity-30">{i.card_type}</span>
                         </div>
                       ))}
                       {inventory.length === 0 && <p className="text-center py-10 text-neutral-600 font-bold italic uppercase">Armory Empty for this match</p>}
                    </div>
                 </div>

                 <div className="flex gap-4">
                    <button onClick={() => handleSetActiveMatch(null)} className="flex-1 bg-neutral-800 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-neutral-700 transition-all">FINISH ENCOUNTER</button>
                 </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
