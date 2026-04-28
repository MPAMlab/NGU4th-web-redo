import React, { useEffect, useState } from 'react';

interface RegistrationStatus {
  is_registered: number;
  last_registered_at: string | null;
  team: string | null;
}

interface PublicPlayer {
  username: string;
  team: string;
}

interface RegistrationData {
  currentUser: RegistrationStatus | null;
  publicRoster: PublicPlayer[];
  registrationOpen?: boolean;
}

export const RegistrationPage = () => {
  const [data, setData] = useState<RegistrationData>({ currentUser: null, publicRoster: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/registration');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      setError("获取报名状态失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (action: 'register' | 'cancel', team?: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, team })
      });
      if (res.ok) {
        await fetchData(); // 刷新所有数据
        setError(null);
      } else {
        const err = await res.json();
        setError(err.error || "操作失败");
      }
    } catch (e) {
      setError("请求发送失败");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data.currentUser) return <div className="text-center p-10 font-bold">载入报名详情中...</div>;

  const redTeam = data.publicRoster.filter(p => p.team === 'red');
  const blueTeam = data.publicRoster.filter(p => p.team === 'blue');

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-10">
      <div className="bg-card rounded-lg shadow-lg p-6 border">
        <h2 className="text-3xl font-black mb-6 tracking-tight">NGU4th 比赛报名</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-widest text-muted-foreground font-bold">比赛信息</p>
            <p><strong>地点：</strong> 郑州某处</p>
            <p><strong>时间：</strong> 2026年5月初</p>
            {!data.registrationOpen && (
              <p className="text-destructive font-bold text-sm bg-destructive/10 inline-block px-2 py-1 rounded">⚠️ 报名暂未开放或已结束</p>
            )}
          </div>
          <div className="space-y-2 text-right md:text-left">
            <p className="text-sm uppercase tracking-widest text-muted-foreground font-bold">我的状态</p>
            <p className="text-lg">
              {data.currentUser?.is_registered ? (
                <span className="text-primary font-bold">✅ 已报名 ({data.currentUser.team === 'red' ? '🔴 红队' : '🔵 蓝队'})</span>
              ) : (
                <span className="text-muted-foreground">❌ 未报名</span>
              )}
            </p>
          </div>
        </div>
        
        {error && <p className="bg-destructive/10 text-destructive p-3 rounded-md text-sm mb-6">{error}</p>}

        <div className="flex flex-col sm:flex-row gap-4">
          {!data.currentUser?.is_registered ? (
            <>
              <button 
                onClick={() => handleAction('register', 'red')}
                disabled={loading || !data.registrationOpen}
                className="flex-1 bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 transition-all shadow-lg hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                加入红队
              </button>
              <button 
                onClick={() => handleAction('register', 'blue')}
                disabled={loading || !data.registrationOpen}
                className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                加入蓝队
              </button>
            </>
          ) : (
            <button 
              onClick={() => handleAction('cancel')}
              disabled={loading || !data.registrationOpen}
              className="w-full bg-secondary text-secondary-foreground font-bold py-4 rounded-xl hover:bg-secondary/80 transition-all disabled:opacity-50"
            >
              取消报名
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-red-50 dark:bg-red-950/20 rounded-2xl p-6 border border-red-200 dark:border-red-900/50">
          <h3 className="text-xl font-black text-red-600 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></span>
            红队名单 ({redTeam.length})
          </h3>
          <ul className="space-y-2">
            {redTeam.map((p, i) => (
              <li key={i} className="bg-card p-3 rounded-lg shadow-sm border text-sm font-medium">
                {p.username}
              </li>
            ))}
            {redTeam.length === 0 && <li className="text-muted-foreground text-sm italic">虚位以待...</li>}
          </ul>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-900/50">
          <h3 className="text-xl font-black text-blue-600 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></span>
            蓝队名单 ({blueTeam.length})
          </h3>
          <ul className="space-y-2">
            {blueTeam.map((p, i) => (
              <li key={i} className="bg-card p-3 rounded-lg shadow-sm border text-sm font-medium">
                {p.username}
              </li>
            ))}
            {blueTeam.length === 0 && <li className="text-muted-foreground text-sm italic">虚位以待...</li>}
          </ul>
        </div>
      </div>
    </div>
  );
};
