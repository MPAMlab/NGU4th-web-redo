import React from 'react';

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

export const DashboardPage = ({ user, achievements }: { user: User, achievements: Achievement[] }) => {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="flex justify-between items-center bg-card p-6 rounded-lg shadow">
        <div>
          <h1 className="text-3xl font-bold">欢迎, {user.username}!</h1>
          <p className="text-muted-foreground">{user.email} | {user.role === 'admin' ? "管理员" : "参赛选手"}</p>
          {user.role === 'admin' && (
            <a href="/admin" className="text-sm text-primary hover:underline block mt-2 font-bold">进入后台管理系统 →</a>
          )}
        </div>
        <a href="/api/auth/logout" className="text-destructive hover:underline">退出登录</a>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">我的成就</h2>
          <div className="grid grid-cols-2 gap-4">
            {achievements.length > 0 ? achievements.map(a => (
              <div key={a.id} className="p-4 bg-accent rounded-md border flex items-center gap-3">
                <span className="text-2xl">{a.icon === 'sparkles' ? '✨' : '🏆'}</span>
                <div>
                  <p className="font-bold text-sm">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">暂无成就</p>}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">快速操作</h2>
          {/* Registration component will be rendered here or as a separate section */}
          <div id="registration-mount"></div>
        </div>
      </section>
    </div>
  );
};
