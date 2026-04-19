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

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'achievements' | 'teams' | 'matches'>('achievements');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch everything for the admin panel
      const [achRes, regRes, matchRes] = await Promise.all([
        fetch('/api/admin/achievements'),
        fetch('/api/admin/registration'),
        fetch('/api/admin/matches')
      ]);

      if (!achRes.ok || !regRes.ok || !matchRes.ok) throw new Error('Failed to fetch admin data');

      const [achData, regData, matchData] = await Promise.all([
        achRes.json(),
        regRes.json(),
        matchRes.json()
      ]);

      setAchievements(achData.achievements);
      setUserAchievements(achData.userAchievements);
      setMembers(regData);
      setMatches(matchData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAchievementToggle = async (kinde_id: string, achievement_id: string, hasAchievement: boolean) => {
    const action = hasAchievement ? 'revoke' : 'grant';
    try {
      const res = await fetch('/api/admin/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetKindeId: kinde_id, achievementId: achievement_id, action })
      });
      if (res.ok) {
        if (action === 'grant') {
          setUserAchievements([...userAchievements, { kinde_id, achievement_id }]);
        } else {
          setUserAchievements(userAchievements.filter(ua => !(ua.kinde_id === kinde_id && ua.achievement_id === achievement_id)));
        }
      }
    } catch (e) {
      alert("Action failed");
    }
  };

  const handleTeamChange = async (targetKindeId: string, team: string | null) => {
    const action = team ? 'set_team' : 'remove_registration';
    try {
      const res = await fetch('/api/admin/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetKindeId, action, team })
      });
      if (res.ok) {
        setMembers(members.map(m => m.kinde_id === targetKindeId ? { ...m, is_registered: team ? 1 : 0, team } : m));
      }
    } catch (e) {
      alert("Failed to update team");
    }
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
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      alert("Failed to create match");
    }
  };

  const handleDeleteMatch = async (matchId: number) => {
    try {
      const res = await fetch('/api/admin/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', matchId })
      });
      if (res.ok) {
        setMatches(matches.filter(m => m.id !== matchId));
      }
    } catch (e) {
      alert("Failed to delete match");
    }
  };

  if (loading) return <div className="text-center p-20 font-bold animate-pulse">载入管理员数据...</div>;
  if (error) return <div className="p-6 text-destructive text-center">{error}</div>;

  const registeredMembers = members.filter(m => m.is_registered === 1);
  const redPool = registeredMembers.filter(m => m.team === 'red');
  const bluePool = registeredMembers.filter(m => m.team === 'blue');

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight">后台管理系统</h1>
          <p className="text-muted-foreground font-medium">NGU4th Never Give Up 4th</p>
        </div>
        <a href="/dashboard" className="bg-secondary text-secondary-foreground px-6 py-2 rounded-full font-bold hover:bg-secondary/80 transition-all">
          返回控制台
        </a>
      </div>

      <div className="flex gap-2 bg-muted p-1 rounded-xl w-fit">
        {(['achievements', 'teams', 'matches'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-lg font-bold transition-all ${
              activeTab === tab ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'achievements' ? '勋章成就' : tab === 'teams' ? '报名管理' : '对阵安排'}
          </button>
        ))}
      </div>

      {activeTab === 'achievements' && (
        <div className="overflow-x-auto bg-card rounded-2xl shadow-xl border overflow-hidden">
          <table className="min-w-full text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-5 font-black uppercase tracking-wider text-xs">用户</th>
                {achievements.map(a => (
                  <th key={a.id} className="px-6 py-5 font-black uppercase tracking-wider text-xs text-center" title={a.description}>
                    <div className="flex flex-col items-center">
                      <span className="text-xl mb-1">{a.icon === 'sparkles' ? '✨' : a.icon === 'award' ? '🏆' : a.icon === 'flag' ? '🚩' : '🎖️'}</span>
                      <span>{a.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.map(member => (
                <tr key={member.kinde_id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold">{member.username}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </td>
                  {achievements.map(ach => {
                    const hasAchievement = userAchievements.some(ua => ua.kinde_id === member.kinde_id && ua.achievement_id === ach.id);
                    return (
                      <td key={ach.id} className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleAchievementToggle(member.kinde_id, ach.id, hasAchievement)}
                          className={`w-24 py-1.5 rounded-full text-xs font-black transition-all ${
                            hasAchievement 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                          }`}
                        >
                          {hasAchievement ? '✅ 已拥有' : '❌ 未获得'}
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
          <table className="min-w-full text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-5 font-black uppercase tracking-wider text-xs">用户</th>
                <th className="px-6 py-5 font-black uppercase tracking-wider text-xs text-center">状态</th>
                <th className="px-6 py-5 font-black uppercase tracking-wider text-xs text-center">操作</th>
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
                      <span className={`px-3 py-1 rounded-full text-xs font-black ${member.team === 'red' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {member.team === 'red' ? '🔴 红队' : '🔵 蓝队'}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">未报名</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => handleTeamChange(member.kinde_id, 'red')} className="text-xs font-bold px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">强制红队</button>
                      <button onClick={() => handleTeamChange(member.kinde_id, 'blue')} className="text-xs font-bold px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">强制蓝队</button>
                      <button onClick={() => handleTeamChange(member.kinde_id, null)} className="text-xs font-bold px-3 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80">删除报名</button>
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
              <h3 className="text-lg font-black mb-4">安排新对阵</h3>
              <form onSubmit={handleCreateMatch} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-red-600">红队选手</label>
                  <select name="red" className="w-full bg-muted p-2 rounded-lg font-bold border-none ring-0">
                    <option value="">选择选手...</option>
                    {redPool.map(m => <option key={m.kinde_id} value={m.kinde_id}>{m.username}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-blue-600">蓝队选手</label>
                  <select name="blue" className="w-full bg-muted p-2 rounded-lg font-bold border-none ring-0">
                    <option value="">选择选手...</option>
                    {bluePool.map(m => <option key={m.kinde_id} value={m.kinde_id}>{m.username}</option>)}
                  </select>
                </div>
                <button type="submit" className="w-full bg-primary text-primary-foreground font-black py-3 rounded-xl hover:opacity-90 transition-all">
                  添加至赛程
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-card rounded-2xl shadow-xl border overflow-hidden">
              <div className="bg-muted/50 px-6 py-4 border-b">
                <h3 className="font-black">赛程表</h3>
              </div>
              <div className="p-6">
                {matches.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground italic">暂无赛程安排</div>
                ) : (
                  <div className="space-y-4">
                    {matches.map((match, i) => (
                      <div key={match.id} className="flex items-center gap-4 bg-muted/20 p-4 rounded-xl border group">
                        <span className="font-black text-2xl text-muted-foreground w-8">#{i + 1}</span>
                        <div className="flex-1 grid grid-cols-3 items-center text-center">
                          <div className="bg-red-600 text-white p-2 rounded-lg font-bold">{match.red_player_name}</div>
                          <div className="font-black italic text-xl">VS</div>
                          <div className="bg-blue-600 text-white p-2 rounded-lg font-bold">{match.blue_player_name}</div>
                        </div>
                        <button 
                          onClick={() => handleDeleteMatch(match.id)}
                          className="opacity-0 group-hover:opacity-100 text-destructive hover:scale-110 transition-all"
                        >
                          <span className="text-xs font-black px-3 py-1 border border-destructive rounded-full">删除</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
