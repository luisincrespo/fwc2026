import { useState, useEffect } from 'react';
import type { LeaderboardEntry, LivePrediction, ScheduledMatch, UpcomingPrediction } from '../types';
import { fetchParticipantUpcoming } from '../api';
import { BaseLeaderboard, type ColumnDef } from './BaseLeaderboard';
import { MatchBreakdownRow } from './MatchBreakdownRow';
import { RankDelta } from './RankDelta';

interface Props {
  entries: LeaderboardEntry[];
  hasLive: boolean;
  flashMap: Map<number, 'up' | 'down'>;
  upcoming: ScheduledMatch[];
}

function PredictionRow({ pred, colSpan }: { pred: LivePrediction; colSpan: number }) {
  return (
    <MatchBreakdownRow
      homeTeam={pred.homeTeam} awayTeam={pred.awayTeam}
      homeCode={pred.homeCode} awayCode={pred.awayCode}
      homeGoals={pred.liveHome} awayGoals={pred.liveAway}
      predictedHome={pred.predictedHome} predictedAway={pred.predictedAway}
      points={pred.points}
      scoreLabel="Live"
      colSpan={colSpan}
    />
  );
}

function UpcomingPredRow({ pred, colSpan }: { pred: UpcomingPrediction; colSpan: number }) {
  const d = new Date(pred.scheduled_at);
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return (
    <tr style={{ background: '#0a1628' }}>
      <td colSpan={colSpan} style={{ padding: '8px 14px 8px 40px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: '#94a3b8' }}>
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {pred.home_team} vs {pred.away_team}
          </span>
          <span style={{ width: 80, flexShrink: 0 }}>
            Kicks off: <strong style={{ color: '#e2e8f0' }}>{time}</strong>
          </span>
          <span style={{ width: 140, flexShrink: 0 }}>
            Prediction: <strong style={{ color: '#e2e8f0' }}>{pred.predicted_home}–{pred.predicted_away}</strong>
          </span>
          <span style={{ width: 55, flexShrink: 0 }} />
        </div>
      </td>
    </tr>
  );
}

function ExpandedRow({ entry, colSpan, hasUpcoming }: { entry: LeaderboardEntry; colSpan: number; hasUpcoming: boolean }) {
  const [upcomingPreds, setUpcomingPreds] = useState<UpcomingPrediction[] | null>(null);

  useEffect(() => {
    if (!hasUpcoming) { setUpcomingPreds([]); return; }
    fetchParticipantUpcoming(entry.id)
      .then(setUpcomingPreds)
      .catch(() => setUpcomingPreds([]));
  }, [entry.id, hasUpcoming]);

  return (
    <>
      {(entry.liveBreakdown ?? []).map((pred, j) => (
        <PredictionRow key={j} pred={pred} colSpan={colSpan} />
      ))}
      {upcomingPreds === null
        ? (
          <tr style={{ background: '#0a1628' }}>
            <td colSpan={colSpan} style={{ padding: '8px 14px 8px 40px', color: '#475569', fontSize: 12, borderBottom: '1px solid #1e293b' }}>
              Loading…
            </td>
          </tr>
        )
        : upcomingPreds.map((pred) => (
          <UpcomingPredRow key={pred.game_id} pred={pred} colSpan={colSpan} />
        ))
      }
    </>
  );
}

export function Leaderboard({ entries, hasLive, flashMap, upcoming }: Props) {
  const hasUpcoming = upcoming.length > 0;
  const canExpand = hasLive || hasUpcoming;
  const colSpan = hasLive ? 6 : 3;

  const rankCol: ColumnDef<LeaderboardEntry> = {
    header: '#',
    align: 'left',
    width: 48,
    tdStyle: (e) => ({
      fontWeight: e.rank <= 3 ? 700 : 400,
      color: e.rank === 1 ? '#fbbf24' : e.rank === 2 ? '#94a3b8' : e.rank === 3 ? '#cd7f32' : '#e2e8f0',
    }),
    render: (e) => e.rank,
  };

  const nameCol: ColumnDef<LeaderboardEntry> = {
    header: 'Name',
    align: 'left',
    tdStyle: (e) => ({ fontWeight: e.rank <= 3 ? 600 : 400 }),
    render: (e, isExpanded) => (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {e.name}
        {canExpand && <span style={{ color: '#475569', fontSize: 11 }}>{isExpanded ? '▲' : '▼'}</span>}
      </span>
    ),
  };

  const officialCol: ColumnDef<LeaderboardEntry> = {
    header: 'Official',
    tdStyle: () => ({ color: hasLive ? '#94a3b8' : undefined, fontWeight: hasLive ? 400 : 700 }),
    render: (e) => e.officialPoints,
  };

  const liveColumns: ColumnDef<LeaderboardEntry>[] = hasLive ? [
    {
      header: 'Live +',
      headerStyle: { color: '#4ade80' },
      tdStyle: (e) => ({ color: e.livePoints > 0 ? '#4ade80' : '#475569', fontWeight: e.livePoints > 0 ? 700 : 400 }),
      render: (e) => e.livePoints > 0 ? `+${e.livePoints}` : '—',
    },
    {
      header: 'Live Score',
      tdStyle: () => ({ fontWeight: 700 }),
      render: (e) => e.totalPoints,
    },
    {
      header: 'Δ',
      render: (e) => <RankDelta delta={e.rankDelta} />,
    },
  ] : [];

  return (
    <BaseLeaderboard
      entries={entries}
      columns={[rankCol, nameCol, officialCol, ...liveColumns]}
      flashMap={flashMap}
      isExpandable={() => canExpand}
      renderExpanded={(e) => (
        <ExpandedRow entry={e} colSpan={colSpan} hasUpcoming={hasUpcoming} />
      )}
    />
  );
}
