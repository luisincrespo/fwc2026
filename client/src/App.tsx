import { useEffect, useState, useCallback, useRef } from 'react';
import { fetchLeaderboard, fetchSchedule, fetchDailyRecap } from './api';
import type { LiveLeaderboardResponse, ScheduledMatch, DailyRecapResponse } from './types';
import { LiveMatchBanner } from './components/LiveMatchBanner';
import { BiggestMovers } from './components/BiggestMovers';
import { DayMovers } from './components/DayMovers';
import { Leaderboard } from './components/Leaderboard';
import { DailyMovement } from './components/DailyMovement';
import { UpcomingMatches } from './components/UpcomingMatches';
import { FinishedMatches } from './components/FinishedMatches';

const POLL_INTERVAL = 5 * 60 * 1000;

type Tab = 'live' | 'today';

export function App() {
  const [data, setData] = useState<LiveLeaderboardResponse | null>(null);
  const [upcoming, setUpcoming] = useState<ScheduledMatch[]>([]);
  const [finished, setFinished] = useState<ScheduledMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [flashMap, setFlashMap] = useState<Map<number, 'up' | 'down'>>(new Map());
  const [activeTab, setActiveTab] = useState<Tab>('live');
  const [hasPendingResults, setHasPendingResults] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyData, setDailyData] = useState<DailyRecapResponse | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const dailyFetched = useRef(false);
  const prevRanks = useRef<Map<number, number>>(new Map());

  const load = useCallback(async (bust = false) => {
    try {
      const [result, schedule] = await Promise.all([fetchLeaderboard(bust), fetchSchedule(bust)]);
      const liveKeys = new Set(result.liveMatches.map((m) => `${m.homeTeam}|${m.awayTeam}`));
      setUpcoming(schedule.matches.filter((m) => m.status !== 'FINISHED' && !liveKeys.has(`${m.homeTeam}|${m.awayTeam}`)));
      setFinished(schedule.matches.filter((m) => m.status === 'FINISHED'));
      setHasPendingResults(schedule.hasPendingResults);

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

      if (dailyFetched.current) {
        fetchDailyRecap(bust).then(setDailyData);
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
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  useEffect(() => {
    if (activeTab === 'today' && !dailyFetched.current) {
      dailyFetched.current = true;
      setDailyLoading(true);
      fetchDailyRecap().then(setDailyData).finally(() => setDailyLoading(false));
    }
  }, [activeTab]);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>
            Quiniela Popular FWC2026
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
            Live Leaderboard
          </p>
        </div>
        <div style={{ textAlign: 'right', fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
          {data && <div>Updated {new Date(data.updatedAt).toLocaleTimeString()}</div>}
          <button
            onClick={async () => { setRefreshing(true); await load(true); setRefreshing(false); }}
            disabled={refreshing || loading}
            style={{
              marginTop: 4,
              background: 'none',
              border: '1px solid #334155',
              borderRadius: 6,
              color: refreshing ? '#334155' : '#64748b',
              fontSize: 12,
              padding: '3px 10px',
              cursor: refreshing ? 'default' : 'pointer',
            }}
          >
            {refreshing ? '↻ Refreshing…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '1px solid #1e293b', paddingBottom: 0 }}>
        {(['live', 'today'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 18px',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              background: 'none',
              color: activeTab === tab ? '#f1f5f9' : '#475569',
              borderBottom: activeTab === tab ? '2px solid #22c55e' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {tab === 'live' ? '📡 Live' : '📅 Today'}
          </button>
        ))}
      </div>

      {loading && (
        <p style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>Loading…</p>
      )}

      {error && (
        <p style={{ color: '#ef4444', textAlign: 'center', padding: 20 }}>{error}</p>
      )}

      {hasPendingResults && (
        <div style={{
          background: '#1e293b',
          borderRadius: 8,
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 13,
          color: '#94a3b8',
          marginBottom: 16,
        }}>
          <span>⏳</span>
          <span>Official standings may not yet reflect recently finished matches.</span>
        </div>
      )}

      {data && activeTab === 'live' && (
        <>
          <UpcomingMatches matches={upcoming} />
          <LiveMatchBanner matches={data.liveMatches} />
          {data.liveMatches.length > 0 && (
            <>
              <p style={{ fontSize: 12, color: '#475569', textAlign: 'right', marginBottom: 8 }}>
                Standings reflect current live scores
              </p>
              <BiggestMovers entries={data.leaderboard} />
            </>
          )}
          <Leaderboard
            entries={data.leaderboard}
            hasLive={data.liveMatches.length > 0}
            flashMap={flashMap}
          />
        </>
      )}

      {data && activeTab === 'today' && (
        <>
          <FinishedMatches matches={finished} />
          {dailyData && <DayMovers entries={dailyData.leaderboard} />}
          <DailyMovement data={dailyData} loading={dailyLoading} />
        </>
      )}
    </div>
  );
}
