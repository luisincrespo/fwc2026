import type { LeaderboardEntry, LivePrediction } from '../types';
import { BaseLeaderboard, cell, type ColumnDef } from './BaseLeaderboard';
import { MatchBreakdownRow } from './MatchBreakdownRow';
import { RankDelta } from './RankDelta';

interface Props {
  entries: LeaderboardEntry[];
  hasLive: boolean;
  flashMap: Map<number, 'up' | 'down'>;
}

function PredictionRow({ pred }: { pred: LivePrediction }) {
  return (
    <MatchBreakdownRow
      homeTeam={pred.homeTeam} awayTeam={pred.awayTeam}
      homeCode={pred.homeCode} awayCode={pred.awayCode}
      homeGoals={pred.liveHome} awayGoals={pred.liveAway}
      predictedHome={pred.predictedHome} predictedAway={pred.predictedAway}
      points={pred.points}
      scoreLabel="Live"
      colSpan={6}
    />
  );
}

export function Leaderboard({ entries, hasLive, flashMap }: Props) {
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
    render: (e, isExpanded) => {
      const canExpand = hasLive && e.liveBreakdown.length > 0;
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {e.name}
          {canExpand && <span style={{ color: '#475569', fontSize: 11 }}>{isExpanded ? '▲' : '▼'}</span>}
        </span>
      );
    },
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
      isExpandable={(e) => hasLive && e.liveBreakdown.length > 0}
      renderExpanded={(e) => e.liveBreakdown.map((pred, j) => <PredictionRow key={j} pred={pred} />)}
    />
  );
}
