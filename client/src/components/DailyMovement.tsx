import type { DailyRecapResponse, DailyEntry } from '../types';
import { BaseLeaderboard, type ColumnDef } from './BaseLeaderboard';

interface Props {
  data: DailyRecapResponse | null;
  loading: boolean;
}

const columns: ColumnDef<DailyEntry>[] = [
  {
    header: '#',
    align: 'left',
    width: 48,
    tdStyle: (e) => ({
      fontWeight: e.rank <= 3 ? 700 : 400,
      color: e.rank === 1 ? '#fbbf24' : e.rank === 2 ? '#94a3b8' : e.rank === 3 ? '#cd7f32' : '#e2e8f0',
    }),
    render: (e) => e.rank,
  },
  {
    header: 'Name',
    align: 'left',
    tdStyle: (e) => ({ fontWeight: e.rank <= 3 ? 600 : 400 }),
    render: (e) => e.name,
  },
  {
    header: 'Pts today',
    tdStyle: (e) => ({ color: e.pointsToday > 0 ? '#4ade80' : '#475569', fontWeight: e.pointsToday > 0 ? 700 : 400 }),
    render: (e) => e.pointsToday > 0 ? `+${e.pointsToday}` : '—',
  },
  {
    header: 'Move',
    render: (e) => e.dailyDelta > 0 ? (
      <span style={{ color: '#4ade80', fontWeight: 700 }}>▲{e.dailyDelta}</span>
    ) : e.dailyDelta < 0 ? (
      <span style={{ color: '#f87171', fontWeight: 700 }}>▼{Math.abs(e.dailyDelta)}</span>
    ) : (
      <span style={{ color: '#475569' }}>—</span>
    ),
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

  return <BaseLeaderboard entries={data.leaderboard} columns={columns} />;
}
