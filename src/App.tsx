import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { RegistrationPage } from './pages/Registration'
import { DashboardPage } from './pages/Dashboard'
import { AdminDashboard } from './pages/AdminDashboard'

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

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>

  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground py-10">
        <Routes>
          <Route path="/" element={
            auth ? <Navigate to="/dashboard" /> : (
              <div className="text-center space-y-6">
                <h1 className="text-6xl font-black tracking-tighter">NGU4th</h1>
                <p className="text-xl text-muted-foreground">Never Give Up 4th 比赛管理系统</p>
                <a 
                  href="/api/auth/login" 
                  className="inline-block bg-primary text-primary-foreground px-8 py-3 rounded-full font-bold text-lg hover:opacity-90 transition-opacity"
                >
                  进入系统
                </a>
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
        </Routes>
      </div>
    </Router>
  )
}

export default App
