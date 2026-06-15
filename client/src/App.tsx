import { useEffect, useState, useCallback, useRef } from 'react';
import { fetchLeaderboard, fetchSchedule } from './api';
import type { LiveLeaderboardResponse, ScheduledMatch } from './types';
import { LiveMatchBanner } from './components/LiveMatchBanner';
import { BiggestMovers } from './components/BiggestMovers';
import { Leaderboard } from './components/Leaderboard';
import { UpcomingMatches } from './components/UpcomingMatches';

const POLL_INTERVAL = 5 * 60 * 1000;

export function App() {
  const [data, setData] = useState<LiveLeaderboardResponse | null>(null);
  const [upcoming, setUpcoming] = useState<ScheduledMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [flashMap, setFlashMap] = useState<Map<number, 'up' | 'down'>>(new Map());
  const prevRanks = useRef<Map<number, number>>(new Map());

  const load = useCallback(async () => {
    try {
      const [result, schedule] = await Promise.all([fetchLeaderboard(), fetchSchedule()]);
      setUpcoming(schedule.matches.filter((m) => m.status === 'UPCOMING'));

      // Compute which participants changed rank since last fetch
      const flashing = new Map<number, 'up' | 'down'>();
      if (prevRanks.current.size > 0) {
        for (const entry of result.leaderboard) {
          const prev = prevRanks.current.get(entry.id);
          if (prev !== undefined && prev !== entry.rank) {
            flashing.set(entry.id, entry.rank < prev ? 'up' : 'down');
          }
        }
      }

      prevRanks.current = new Map(result.leaderboard.map((e) => [e.id, e.rank]));
      setData(result);
      setError(null);

      if (flashing.size > 0) {
        setFlashMap(flashing);
        setTimeout(() => setFlashMap(new Map()), 1500);
      }
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
          <UpcomingMatches matches={upcoming} />
          {data.liveMatches.length > 0 && <BiggestMovers entries={data.leaderboard} />}
          <Leaderboard
            entries={data.leaderboard}
            hasLive={data.liveMatches.length > 0}
            flashMap={flashMap}
          />
        </>
      )}
    </div>
  );
}
