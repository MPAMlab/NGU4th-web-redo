import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { RegistrationPage } from './pages/Registration'
import { DashboardPage } from './pages/Dashboard'
import { AdminDashboard } from './pages/AdminDashboard'
import { LiveView } from './pages/LiveView'

function App() {
  const [auth, setAuth] = useState<{ user: any, achievements: any[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        setAuth(data.user ? data : null)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p className="font-black text-xl tracking-widest animate-pulse">载入中...</p>
    </div>
  )

  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground py-10">
        <Routes>
          <Route path="/" element={
            auth ? <Navigate to="/dashboard" /> : (
              <div className="text-center space-y-8 py-20">
                <div className="space-y-2">
                  <h1 className="text-8xl font-black tracking-tighter italic">NGU4th</h1>
                  <p className="text-2xl text-muted-foreground font-bold uppercase tracking-[0.3em]">Never Give Up</p>
                </div>
                <div className="max-w-md mx-auto bg-card p-8 rounded-3xl border shadow-xl space-y-6">
                  <p className="text-lg font-medium">欢迎来到第四届 NGU 比赛管理系统</p>
                  <a 
                    href="/api/auth/login" 
                    className="block w-full bg-primary text-primary-foreground py-4 rounded-2xl font-black text-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20"
                  >
                    进入系统 LOGIN
                  </a>
                </div>
              </div>
            )
          } />
          <Route path="/dashboard" element={
            auth ? (
              <div className="space-y-10">
                <DashboardPage user={auth.user} achievements={auth.achievements} />
                <div className="max-w-4xl mx-auto px-6">
                   <RegistrationPage />
                </div>
              </div>
            ) : <Navigate to="/" />
          } />
          <Route path="/admin" element={
            auth && auth.user.role === 'admin' ? (
              <AdminDashboard />
            ) : <Navigate to="/dashboard" />
          } />
          <Route path="/live" element={<LiveView />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
