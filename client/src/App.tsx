import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchLeaderboard, fetchSchedule, fetchDailyRecap, fetchInsights, fetchAltLeaderboard, fetchAltDailyRecap } from './api';
import type { LiveLeaderboardResponse, ScheduledMatch, DailyRecapResponse, InsightsResponse, LeaderboardEntry } from './types';
import { LiveMatchBanner, type HypoScores } from './components/LiveMatchBanner';
import { calculatePoints } from './lib/scoring';
import { COLOR_CORRECT, COLOR_RANK_DOWN, COLOR_EXPERIMENTAL, COLOR_EXPERIMENTAL_BG, COLOR_EXPERIMENTAL_BORDER, COLOR_EXPERIMENTAL_BRIGHT } from './lib/colors';
import { BiggestMovers } from './components/BiggestMovers';
import { DayMovers } from './components/DayMovers';
import { TopScorers } from './components/TopScorers';
import { Leaderboard } from './components/Leaderboard';
import { DailyMovement } from './components/DailyMovement';
import { UpcomingMatches } from './components/UpcomingMatches';
import { FinishedMatches } from './components/FinishedMatches';
import { Insights } from './components/Insights';

const POLL_INTERVAL_IDLE = 5 * 60 * 1000;
const POLL_INTERVAL_LIVE = 60 * 1000;

type Tab = 'live' | 'today' | 'insights';

export function App() {
  const [data, setData] = useState<LiveLeaderboardResponse | null>(null);
  const [upcoming, setUpcoming] = useState<ScheduledMatch[]>([]);
  const [finished, setFinished] = useState<ScheduledMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [flashMap, setFlashMap] = useState<Map<number, 'up' | 'down'>>(new Map());
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const activeTab: Tab = (['live', 'today', 'insights'] as Tab[]).includes(tab as Tab) ? (tab as Tab) : 'live';
  const setActiveTab = (t: Tab) => navigate(`/quinielapopular/${t}`);
  const [hasPendingResults, setHasPendingResults] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyData, setDailyData] = useState<DailyRecapResponse | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const dailyFetched = useRef(false);
  const [insightsData, setInsightsData] = useState<InsightsResponse | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const insightsFetched = useRef(false);
  const prevRanks = useRef<Map<number, number>>(new Map());
  const [hypo, setHypo] = useState<HypoScores>({});
  const hasLive = (data?.liveMatches.length ?? 0) > 0;
  const [altMode, setAltMode] = useState(false);
  const [altData, setAltData] = useState<LiveLeaderboardResponse | null>(null);
  const [altDailyData, setAltDailyData] = useState<DailyRecapResponse | null>(null);
  const [altLoading, setAltLoading] = useState(false);
  const altFetched = useRef(false);
  const altDailyFetched = useRef(false);

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
      if (insightsFetched.current) {
        fetchInsights(bust).then(setInsightsData);
      }
      if (altFetched.current) {
        fetchAltLeaderboard(bust).then(setAltData);
      }
      if (altDailyFetched.current) {
        fetchAltDailyRecap(bust).then(setAltDailyData);
      }
    } catch {
      setError('Failed to load leaderboard. Retrying soon…');
    } finally {
      setLoading(false);
    }
  }, []);

  const adjustHypo = useCallback((key: string, home: number, away: number) => {
    setHypo((prev) => {
      const match = data?.liveMatches.find((m) => `${m.homeTeam}|${m.awayTeam}` === key);
      const next = { ...prev };
      if (match && home === match.homeGoals && away === match.awayGoals) {
        delete next[key];
      } else {
        next[key] = { home, away };
      }
      return next;
    });
  }, [data?.liveMatches]);

  const resetHypo = useCallback(() => setHypo({}), []);

  const toggleAltMode = useCallback(() => {
    setAltMode((prev) => {
      const next = !prev;
      if (next) {
        if (!altFetched.current) {
          altFetched.current = true;
          setAltLoading(true);
          fetchAltLeaderboard().then(setAltData).finally(() => setAltLoading(false));
        }
        if (!altDailyFetched.current && dailyFetched.current) {
          altDailyFetched.current = true;
          fetchAltDailyRecap().then(setAltDailyData);
        }
      }
      return next;
    });
  }, []);

  const hypoEntries = useMemo((): LeaderboardEntry[] => {
    const baseData = altMode ? altData : data;
    if (!baseData) return data?.leaderboard ?? [];
    if (Object.keys(hypo).length === 0) return baseData.leaderboard;
    const rules = baseData.scoringRules;

    const recalculated = baseData.leaderboard.map((entry) => {
      let hypoLivePoints = 0;
      const hypoBreakdown = entry.liveBreakdown.map((bd) => {
        const key = `${bd.homeTeam}|${bd.awayTeam}`;
        const score = hypo[key] ?? { home: bd.liveHome, away: bd.liveAway };
        const isHypothetical = score.home !== bd.liveHome || score.away !== bd.liveAway;
        const pts = calculatePoints({ home: bd.predictedHome, away: bd.predictedAway }, score, bd.stage, rules, altMode);
        hypoLivePoints += pts;
        return { ...bd, liveHome: score.home, liveAway: score.away, points: pts, isHypothetical };
      });
      return { ...entry, livePoints: hypoLivePoints, totalPoints: entry.officialPoints + hypoLivePoints, liveBreakdown: hypoBreakdown };
    });

    const sorted = [...recalculated].sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));
    const rankMap = new Map<number, number>();
    for (let i = 0; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      rankMap.set(sorted[i].id, prev && sorted[i].totalPoints === prev.totalPoints ? rankMap.get(prev.id)! : i + 1);
    }

    return recalculated
      .map((e) => {
        const officialRank = e.rank + e.rankDelta;
        const hypoRank = rankMap.get(e.id)!;
        return { ...e, rank: hypoRank, rankDelta: officialRank - hypoRank };
      })
      .sort((a, b) => a.rank - b.rank);
  }, [data, altData, altMode, hypo]);

  const hypoLiveMatches = useMemo(() => {
    if (!data) return [];
    const needsRecalc = Object.keys(hypo).length > 0 || altMode;
    if (!needsRecalc) return data.liveMatches;

    const perfByKey = new Map<string, { exact: { name: string; predicted: string }[]; correct: { name: string; predicted: string }[]; miss: { name: string; predicted: string }[]; total: number }>();
    for (const m of data.liveMatches) {
      perfByKey.set(`${m.homeTeam}|${m.awayTeam}`, { exact: [], correct: [], miss: [], total: 0 });
    }
    for (const entry of hypoEntries) {
      for (const bd of (entry.liveBreakdown ?? [])) {
        const perf = perfByKey.get(`${bd.homeTeam}|${bd.awayTeam}`);
        if (!perf) continue;
        perf.total++;
        const participant = { name: entry.name, predicted: `${bd.predictedHome}-${bd.predictedAway}` };
        if (bd.points >= 11) perf.exact.push(participant);
        else if (bd.points >= 3) perf.correct.push(participant);
        else perf.miss.push(participant);
      }
    }

    return data.liveMatches.map((m) => {
      const key = `${m.homeTeam}|${m.awayTeam}`;
      if (!hypo[key] && !altMode) return m;
      return { ...m, performance: perfByKey.get(key) };
    });
  }, [data, hypo, hypoEntries, altMode]);

  useEffect(() => {
    const interval = hasLive ? POLL_INTERVAL_LIVE : POLL_INTERVAL_IDLE;
    const id = setInterval(load, interval);
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load, hasLive]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (activeTab === 'today') {
      if (!dailyFetched.current) {
        dailyFetched.current = true;
        setDailyLoading(true);
        fetchDailyRecap().then(setDailyData).finally(() => setDailyLoading(false));
      }
      if (altMode && !altDailyFetched.current) {
        altDailyFetched.current = true;
        fetchAltDailyRecap().then(setAltDailyData);
      }
    }
    if (activeTab === 'insights' && !insightsFetched.current) {
      insightsFetched.current = true;
      setInsightsLoading(true);
      fetchInsights().then(setInsightsData).finally(() => setInsightsLoading(false));
    }
  }, [activeTab, altMode]);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>
            Quiniela Popular FWC2026
          </h1>
        </div>
        <div style={{ textAlign: 'right', fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
          {data && <div>Updated {new Date(data.updatedAt).toLocaleTimeString()}</div>}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              onClick={async () => { setRefreshing(true); await load(true); setRefreshing(false); }}
              disabled={refreshing || loading}
              style={{
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
            <button
              onClick={toggleAltMode}
              disabled={altLoading}
              style={{
                background: altMode ? COLOR_EXPERIMENTAL_BG : 'none',
                border: `1px solid ${altMode ? COLOR_EXPERIMENTAL_BORDER : '#334155'}`,
                borderRadius: 6,
                color: altMode ? COLOR_EXPERIMENTAL : '#64748b',
                fontSize: 12,
                padding: '3px 10px',
                cursor: altLoading ? 'default' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {altLoading ? '🧪 Loading…' : altMode ? '🧪 Tighter rules — tap to exit' : '🧪 Try tighter rules'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '1px solid #1e293b', paddingBottom: 0 }}>
        {([['live', '📡 Live'], ['today', '📅 Today'], ['insights', '📊 Insights']] as const).map(([tab, label]) => (
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
              borderBottom: activeTab === tab ? `2px solid ${COLOR_CORRECT}` : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {altMode && (
        <div style={{ marginBottom: 16, background: COLOR_EXPERIMENTAL_BG, border: `1px solid ${COLOR_EXPERIMENTAL_BORDER}`, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: COLOR_EXPERIMENTAL, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>🧪 Tighter close-score rule (+2 pts)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div><span style={{ color: COLOR_EXPERIMENTAL_BRIGHT }}>Official:</span> within 1 goal on each side — outcome doesn't need to be right</div>
            <div><span style={{ color: COLOR_EXPERIMENTAL_BRIGHT }}>Tighter:</span> outcome must be correct + total goal error ≤ 1</div>
            <div style={{ marginTop: 2, color: COLOR_EXPERIMENTAL_BORDER }}>e.g. predicting 2–0 when actual is 3–1: official +2 pts, tighter +0 pts</div>
          </div>
        </div>
      )}

      {loading && (
        <p style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>Loading…</p>
      )}

      {error && (
        <p style={{ color: COLOR_RANK_DOWN, textAlign: 'center', padding: 20 }}>{error}</p>
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
          <LiveMatchBanner matches={hypoLiveMatches} hypo={hypo} onAdjust={adjustHypo} onReset={resetHypo} />
          {data.liveMatches.length > 0 && (
            <>
              <p style={{ fontSize: 12, color: '#475569', textAlign: 'right', marginBottom: 8 }}>
                {Object.keys(hypo).length > 0 ? 'Simulated standings — not the actual live score' : 'Standings reflect current live scores'}
              </p>
              <BiggestMovers entries={hypoEntries} />
            </>
          )}
          <Leaderboard
            entries={hypoEntries}
            hasLive={data.liveMatches.length > 0}
            flashMap={Object.keys(hypo).length > 0 || altMode ? new Map() : flashMap}
            upcoming={upcoming}
          />
        </>
      )}

      {data && activeTab === 'today' && (
        <>
          <FinishedMatches matches={finished} />
          {(() => {
            const activeDailyData = altMode ? (altDailyData ?? dailyData) : dailyData;
            const activeLoading = dailyLoading || (altMode && !altDailyData && !!dailyData);
            return (
              <>
                {activeDailyData && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                    <TopScorers entries={activeDailyData.leaderboard} />
                    <DayMovers entries={activeDailyData.leaderboard} />
                  </div>
                )}
                <DailyMovement data={activeDailyData} loading={activeLoading} />
              </>
            );
          })()}
        </>
      )}

      {activeTab === 'insights' && (
        <Insights data={insightsData} loading={insightsLoading} />
      )}
    </div>
  );
}
