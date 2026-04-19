import React, { useEffect, useState } from 'react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface User {
  username: string;
  email: string;
  role: string;
}

interface Minigame {
  id: number;
  title: string;
  short_desc: string;
  detailed_desc: string;
  start_date: string;
  start_time: string;
  max_players: number;
  current_players: number;
  fake_card_name: string;
  status: string;
  is_joined: number;
}

export const DashboardPage = ({ user, achievements }: { user: User, achievements: Achievement[] }) => {
  const [minigames, setMinigames] = useState<Minigame[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMinigames = async () => {
    try {
      const res = await fetch('/api/minigames');
      if (res.ok) {
        const data = await res.json();
        setMinigames(data);
      }
    } catch (e) {
      console.error("Failed to fetch minigames");
    }
  };

  useEffect(() => {
    fetchMinigames();
  }, []);

  const handleJoin = async (id: number, joined: boolean) => {
    setLoading(true);
    try {
      const res = await fetch('/api/minigames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: joined ? 'leave' : 'join', minigameId: id })
      });
      if (res.ok) {
        fetchMinigames();
      } else {
        const data = await res.json();
        alert(data.error || "操作失败");
      }
    } catch (e) {
      alert("请求失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-10">
      <header className="flex justify-between items-center bg-card p-8 rounded-3xl shadow-xl border">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter">欢迎回来, {user.username}!</h1>
          <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest mt-1">
            {user.email} | {user.role === 'admin' ? "CORE ADMIN" : "OPERATIVE"}
          </p>
          {user.role === 'admin' && (
            <a href="/admin" className="inline-block mt-4 bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-xs font-black uppercase shadow-lg hover:scale-105 transition-all">
              进入后台管理系统 →
            </a>
          )}
        </div>
        <a href="/api/auth/logout" className="text-destructive font-black uppercase text-xs tracking-widest hover:underline">退出登录 Sign Out</a>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-2">
            <span className="w-2 h-6 bg-primary rounded-full"></span>
            我的成就 Badges
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {achievements.length > 0 ? achievements.map(a => (
              <div key={a.id} className="p-4 bg-accent/50 rounded-2xl border-2 border-white/5 flex items-center gap-4 hover:border-primary/30 transition-all group">
                <span className="text-3xl group-hover:scale-125 transition-transform">
                  {a.icon === 'sparkles' ? '✨' : a.icon === 'award' ? '🏆' : a.icon === 'flag' ? '🚩' : '🎖️'}
                </span>
                <div>
                  <p className="font-black text-xs uppercase">{a.name}</p>
                  <p className="text-[10px] text-muted-foreground font-bold mt-0.5">{a.description}</p>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground italic opacity-50">暂无勋章，参与活动或找管理员发放吧！</p>}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-2">
             <span className="w-2 h-6 bg-purple-600 rounded-full"></span>
             小游戏大厅 Minigames
          </h2>
          <div className="space-y-4">
             {minigames.length > 0 ? minigames.map(g => (
               <div key={g.id} className="bg-card p-5 rounded-2xl border-2 border-white/5 shadow-lg space-y-4 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2">
                     <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${g.status === 'recruiting' ? 'bg-green-600' : 'bg-orange-600'} text-white`}>
                       {g.status === 'recruiting' ? '招募中' : '进行中'}
                     </span>
                  </div>
                  <div>
                    <h3 className="font-black text-lg uppercase tracking-tighter">{g.title}</h3>
                    <p className="text-xs text-muted-foreground font-bold mt-1 italic">{g.short_desc}</p>
                  </div>
                  <div className="flex justify-between items-end">
                     <div className="text-[10px] font-black uppercase text-muted-foreground space-y-1">
                        <p>🕒 {g.start_date} {g.start_time}</p>
                        <p>🎁 奖励: <span className="text-primary italic">{g.fake_card_name}</span></p>
                        <p>👥 进度: <span className={g.current_players >= g.max_players ? 'text-red-500' : 'text-green-500'}>{g.current_players}/{g.max_players}</span></p>
                     </div>
                     <button 
                       disabled={loading || (g.status !== 'recruiting' && !g.is_joined) || (g.current_players >= g.max_players && !g.is_joined)}
                       onClick={() => handleJoin(g.id, g.is_joined === 1)}
                       className={`px-6 py-2 rounded-xl font-black text-xs uppercase shadow-xl transition-all ${
                         g.is_joined 
                           ? 'bg-neutral-800 text-white hover:bg-black' 
                           : 'bg-primary text-primary-foreground hover:scale-105 active:scale-95 disabled:opacity-30 disabled:grayscale'
                       }`}
                     >
                       {g.is_joined ? '退出报名' : (g.current_players >= g.max_players ? '已满员' : '立即加入')}
                     </button>
                  </div>
               </div>
             )) : (
               <div className="text-center py-10 bg-muted/20 rounded-2xl border-2 border-dashed border-white/5">
                  <p className="text-muted-foreground text-xs font-bold uppercase italic tracking-widest">暂无活动预告 Radar Silent</p>
               </div>
             )}
          </div>
        </div>
      </section>
    </div>
  );
};
