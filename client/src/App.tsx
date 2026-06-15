import { useEffect, useState, useCallback } from 'react';
import { fetchLeaderboard } from './api';
import type { LiveLeaderboardResponse } from './types';
import { LiveMatchBanner } from './components/LiveMatchBanner';
import { Leaderboard } from './components/Leaderboard';

const POLL_INTERVAL = 5 * 60 * 1000;

export function App() {
  const [data, setData] = useState<LiveLeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const result = await fetchLeaderboard();
      setData(result);
      setError(null);
    } catch {
      setError('Failed to load leaderboard. Retrying soon…');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>
            Quiniela Popular
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
            Live Leaderboard — World Cup 2026
          </p>
        </div>
        {data && (
          <div style={{ textAlign: 'right', fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
            <div>Updated {new Date(data.updatedAt).toLocaleTimeString()}</div>
            <div>Refreshes every 5 min</div>
          </div>
        )}
      </div>

      {loading && (
        <p style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>Loading…</p>
      )}

      {error && (
        <p style={{ color: '#ef4444', textAlign: 'center', padding: 20 }}>{error}</p>
      )}

      {data && (
        <>
          <LiveMatchBanner matches={data.liveMatches} />
          <Leaderboard entries={data.leaderboard} hasLive={data.liveMatches.length > 0} />
        </>
      )}
    </div>
  );
}
