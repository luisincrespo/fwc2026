import { useState, useEffect, useMemo } from 'react';
import { COLOR_RANK_1, COLOR_RANK_2, COLOR_RANK_3, COLOR_CORRECT_LIVE, COLOR_SIMULATION, COLOR_MISS } from '../lib/colors';
import type { LeaderboardEntry, LivePrediction, ScheduledMatch, UpcomingPrediction } from '../types';
import { fetchParticipantUpcoming } from '../api';
import { BaseLeaderboard, type ColumnDef } from './BaseLeaderboard';
import { MatchBreakdownRow } from './MatchBreakdownRow';
import { Matchup } from './Matchup';
import { KickoffTime } from './KickoffTime';
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
      scoreLabel={pred.isHypothetical ? 'Sim' : 'Live'}
      scoreHighlight={pred.isHypothetical ? COLOR_SIMULATION : undefined}
      colSpan={colSpan}
    />
  );
}

function UpcomingPredRow({ pred, match, colSpan }: { pred: UpcomingPrediction; match: ScheduledMatch | undefined; colSpan: number }) {
  return (
    <tr style={{ background: '#0a1628' }}>
      <td colSpan={colSpan} style={{ padding: '8px 14px 8px 40px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#94a3b8' }}>
          <div style={{ flex: 1 }}>
            <Matchup
              variant="card"
              homeTeam={pred.home_team} awayTeam={pred.away_team}
              homeCode={match?.homeCode ?? ''} awayCode={match?.awayCode ?? ''}
              center={<KickoffTime utc={pred.scheduled_at} />}
            />
          </div>
          <span style={{ width: 140, flexShrink: 0 }}>
            Prediction: <strong style={{ color: '#e2e8f0' }}>{pred.predicted_home}–{pred.predicted_away}</strong>
          </span>
          <span style={{ width: 55, flexShrink: 0 }} />
        </div>
      </td>
    </tr>
  );
}

function ExpandedRow({ entry, colSpan, upcoming }: { entry: LeaderboardEntry; colSpan: number; upcoming: ScheduledMatch[] }) {
  const [upcomingPreds, setUpcomingPreds] = useState<UpcomingPrediction[] | null>(null);

  const matchByTeams = useMemo(
    () => new Map(upcoming.map((m) => [`${m.homeTeam}|${m.awayTeam}`, m])),
    [upcoming],
  );

  useEffect(() => {
    if (upcoming.length === 0) { setUpcomingPreds([]); return; }
    fetchParticipantUpcoming(entry.id)
      .then((preds) => setUpcomingPreds(preds.filter((p) => matchByTeams.has(`${p.home_team}|${p.away_team}`))))
      .catch(() => setUpcomingPreds([]));
  }, [entry.id, matchByTeams]);

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
          <UpcomingPredRow key={pred.game_id} pred={pred} match={matchByTeams.get(`${pred.home_team}|${pred.away_team}`)} colSpan={colSpan} />
        ))
      }
    </>
  );
}

export function Leaderboard({ entries, hasLive, flashMap, upcoming }: Props) {
  const canExpand = hasLive || upcoming.length > 0;
  const colSpan = hasLive ? 6 : 3;

  const rankCol: ColumnDef<LeaderboardEntry> = {
    header: '#',
    align: 'left',
    width: 48,
    tdStyle: (e) => ({
      fontWeight: e.rank <= 3 ? 700 : 400,
      color: e.rank === 1 ? COLOR_RANK_1 : e.rank === 2 ? COLOR_RANK_2 : e.rank === 3 ? COLOR_RANK_3 : '#e2e8f0',
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
      headerStyle: { color: COLOR_CORRECT_LIVE },
      tdStyle: (e) => ({ color: e.livePoints > 0 ? COLOR_CORRECT_LIVE : COLOR_MISS, fontWeight: e.livePoints > 0 ? 700 : 400 }),
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
        <ExpandedRow entry={e} colSpan={colSpan} upcoming={upcoming} />
      )}
    />
  );
}
