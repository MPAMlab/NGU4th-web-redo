import React, { useEffect, useState } from 'react';

interface RegistrationStatus {
  is_registered: number;
  last_registered_at: string | null;
}

export const RegistrationPage = () => {
  const [status, setStatus] = useState<RegistrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/registration');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      setError("Failed to fetch status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleAction = async (action: 'register' | 'cancel') => {
    setLoading(true);
    try {
      const res = await fetch('/api/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ ...status!, is_registered: data.is_registered, last_registered_at: new Date().toISOString() });
        setError(null);
      } else {
        setError(data.error || "Action failed");
      }
    } catch (e) {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !status) return <div>Loading...</div>;

  return (
    <div className="max-w-md mx-auto p-6 bg-card rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">NGU4th 报名</h2>
      <div className="space-y-4">
        <p><strong>地点：</strong> 郑州某处</p>
        <p><strong>时间：</strong> 2026年5月初</p>
        <p><strong>状态：</strong> {status?.is_registered ? "✅ 已报名" : "❌ 未报名"}</p>
        
        {error && <p className="text-destructive text-sm">{error}</p>}

        <div className="flex gap-4 mt-6">
          {!status?.is_registered ? (
            <button 
              onClick={() => handleAction('register')}
              disabled={loading}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              确定报名
            </button>
          ) : (
            <button 
              onClick={() => handleAction('cancel')}
              disabled={loading}
              className="bg-destructive text-destructive-foreground px-4 py-2 rounded-md hover:bg-destructive/90 disabled:opacity-50"
            >
              取消报名
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2 italic">注意：24小时内只能报名或取消一次。</p>
      </div>
    </div>
  );
};
