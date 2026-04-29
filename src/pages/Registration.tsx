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
    <div className="max-w-4xl mx-auto p-2 md:p-6 space-y-6 md:space-y-10">
      <div className="bg-white rounded-2xl md:rounded-3xl shadow-lg p-5 md:p-8 border border-slate-100">
        <div className="flex items-center gap-4 mb-4 md:mb-6">
          <img src="/logo.webp" alt="Logo" className="w-12 h-12 md:w-16 md:h-16 object-contain" />
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 italic uppercase">比赛报名 HUB</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-6 md:mb-8">
          <div className="space-y-1 md:space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Event Information</p>
            <p className="text-sm"><strong>地点：</strong> 郑州现场</p>
            <p className="text-sm"><strong>时间：</strong> 2026年5月初</p>
            {!data.registrationOpen && (
              <p className="text-rose-600 font-bold text-[10px] bg-rose-50 inline-block px-3 py-1 rounded-full mt-2">⚠️ 报名暂未开放</p>
            )}
          </div>
          <div className="space-y-1 md:space-y-2 text-left">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">My Status</p>
            <p className="text-base md:text-lg">
              {data.currentUser?.is_registered ? (
                <span className="text-indigo-600 font-black italic">✅ 已报名 ({data.currentUser.team === 'red' ? '🔴 红队' : '🔵 蓝队'})</span>
              ) : (
                <span className="text-slate-400 font-bold italic">❌ 未报名</span>
              )}
            </p>
          </div>
        </div>
        
        {error && <p className="bg-rose-50 text-rose-600 p-3 rounded-xl text-[10px] font-bold mb-6 border border-rose-100">{error}</p>}

        <div className="flex flex-col sm:flex-row gap-3">
          {!data.currentUser?.is_registered ? (
            <>
              <button 
                onClick={() => handleAction('register', 'red')}
                disabled={loading || !data.registrationOpen}
                className="flex-1 bg-red-600 text-white font-black py-4 rounded-xl hover:bg-red-700 transition-all shadow-lg hover:scale-[1.02] active:scale-95 disabled:opacity-50 text-xs italic uppercase"
              >
                加入红队 JOIN RED
              </button>
              <button 
                onClick={() => handleAction('register', 'blue')}
                disabled={loading || !data.registrationOpen}
                className="flex-1 bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:scale-[1.02] active:scale-95 disabled:opacity-50 text-xs italic uppercase"
              >
                加入蓝队 JOIN BLUE
              </button>
            </>
          ) : (
            <button 
              onClick={() => handleAction('cancel')}
              disabled={loading || !data.registrationOpen}
              className="w-full bg-slate-100 text-slate-500 font-black py-4 rounded-xl hover:bg-slate-200 transition-all disabled:opacity-50 text-xs italic uppercase"
            >
              取消报名 CANCEL
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        <div className="bg-red-50/50 rounded-2xl md:rounded-3xl p-5 md:p-6 border border-red-100">
          <h3 className="text-sm md:text-xl font-black text-red-600 mb-4 flex items-center gap-2 uppercase italic tracking-tighter">
            <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
            红队名单 RED TEAM ({redTeam.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {redTeam.map((p, i) => (
              <span key={i} className="bg-white px-4 py-2 rounded-full shadow-sm border border-red-50 text-[10px] md:text-xs font-black text-red-900 uppercase">
                {p.username}
              </span>
            ))}
            {redTeam.length === 0 && <span className="text-slate-400 text-xs italic">虚位以待...</span>}
          </div>
        </div>

        <div className="bg-blue-50/50 rounded-2xl md:rounded-3xl p-5 md:p-6 border border-blue-100">
          <h3 className="text-sm md:text-xl font-black text-blue-600 mb-4 flex items-center gap-2 uppercase italic tracking-tighter">
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
            蓝队名单 BLUE TEAM ({blueTeam.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {blueTeam.map((p, i) => (
              <span key={i} className="bg-white px-4 py-2 rounded-full shadow-sm border border-blue-50 text-[10px] md:text-xs font-black text-blue-900 uppercase">
                {p.username}
              </span>
            ))}
            {blueTeam.length === 0 && <span className="text-slate-400 text-xs italic">虚位以待...</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
