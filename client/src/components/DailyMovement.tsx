import type { DailyRecapResponse, DailyEntry, DailyBreakdown } from '../types';
import { BaseLeaderboard, type ColumnDef } from './BaseLeaderboard';
import { MatchBreakdownRow } from './MatchBreakdownRow';
import { COLOR_RANK_1, COLOR_RANK_2, COLOR_RANK_3, COLOR_CORRECT_LIVE, COLOR_MISS, COLOR_RANK_DOWN_SOFT } from '../lib/colors';

interface Props {
  data: DailyRecapResponse | null;
  loading: boolean;
}

function BreakdownRow({ pred }: { pred: DailyBreakdown }) {
  return (
    <MatchBreakdownRow
      homeTeam={pred.homeTeam} awayTeam={pred.awayTeam}
      homeCode={pred.homeCode} awayCode={pred.awayCode}
      homeGoals={pred.homeGoals} awayGoals={pred.awayGoals}
      predictedHome={pred.predictedHome} predictedAway={pred.predictedAway}
      points={pred.points}
      scoreLabel="Result"
      colSpan={4}
    />
  );
}

const columns: ColumnDef<DailyEntry>[] = [
  {
    header: '#',
    align: 'left',
    width: 48,
    tdStyle: (e) => ({
      fontWeight: e.rank <= 3 ? 700 : 400,
      color: e.rank === 1 ? COLOR_RANK_1 : e.rank === 2 ? COLOR_RANK_2 : e.rank === 3 ? COLOR_RANK_3 : '#e2e8f0',
    }),
    render: (e) => e.rank,
  },
  {
    header: 'Name',
    align: 'left',
    tdStyle: (e) => ({ fontWeight: e.rank <= 3 ? 600 : 400 }),
    render: (e, isExpanded) => (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {e.name}
        {e.breakdown.length > 0 && (
          <span style={{ color: '#475569', fontSize: 11 }}>{isExpanded ? '▲' : '▼'}</span>
        )}
      </span>
    ),
  },
  {
    header: 'Pts today',
    tdStyle: (e) => ({ color: e.pointsToday > 0 ? COLOR_CORRECT_LIVE : COLOR_MISS, fontWeight: e.pointsToday > 0 ? 700 : 400 }),
    render: (e) => e.pointsToday > 0 ? `+${e.pointsToday}` : '—',
  },
  {
    header: 'Move',
    render: (e) => e.dailyDelta > 0 ? (
      <span style={{ color: COLOR_CORRECT_LIVE, fontWeight: 700 }}>▲{e.dailyDelta}</span>
    ) : e.dailyDelta < 0 ? (
      <span style={{ color: COLOR_RANK_DOWN_SOFT, fontWeight: 700 }}>▼{Math.abs(e.dailyDelta)}</span>
    ) : (
      <span style={{ color: COLOR_MISS }}>—</span>
    ),
  },
  {
    header: 'Total',
    tdStyle: (e) => ({ fontWeight: e.rank <= 3 ? 700 : 400 }),
    render: (e) => e.totalPoints,
  },
];

export function DailyMovement({ data, loading }: Props) {
  if (loading) {
    return <div style={{ color: '#64748b', fontSize: 14, padding: '16px 0' }}>Loading…</div>;
  }

  if (!data) return null;

  if (data.todayMatchCount === 0) {
    return (
      <div style={{
        background: '#1e293b',
        borderRadius: 8,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 14,
      }}>
        <span>⏸</span>
        <span style={{ color: '#94a3b8' }}>No completed matches today yet — check back after the first game.</span>
      </div>
    );
  }

  return (
    <BaseLeaderboard
      entries={data.leaderboard}
      columns={columns}
      isExpandable={(e) => e.breakdown.length > 0}
      renderExpanded={(e) => e.breakdown.map((pred, j) => <BreakdownRow key={j} pred={pred} />)}
    />
  );
}
