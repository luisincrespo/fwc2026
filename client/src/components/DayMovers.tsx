import type { DailyEntry } from '../types';

interface Props {
  entries: DailyEntry[];
}

function Card({ label, color, entries }: { label: string; color: string; entries: DailyEntry[] }) {
  return (
    <div style={{
      flex: 1,
      minWidth: 200,
      background: '#1e293b',
      borderRadius: 8,
      padding: '10px 14px',
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color, textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </div>
      {entries.map((e) => (
        <div key={e.id} style={{ fontSize: 14, color: '#e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: '#475569' }}>#{e.preTodayRank} → #{e.rank}</span>
            <span style={{ fontWeight: 700, color, minWidth: '3ch', textAlign: 'right' }}>
              {e.dailyDelta > 0 ? '▲' : '▼'}{Math.abs(e.dailyDelta)}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function DayMovers({ entries }: Props) {
  const maxDelta = Math.max(...entries.map((e) => e.dailyDelta));
  const minDelta = Math.min(...entries.map((e) => e.dailyDelta));

  if (maxDelta <= 0 && minDelta >= 0) return null;

  const climbers = maxDelta > 0 ? entries.filter((e) => e.dailyDelta === maxDelta) : [];
  const droppers = minDelta < 0 ? entries.filter((e) => e.dailyDelta === minDelta) : [];

  return (
    <>
      {climbers.length > 0 && (
        <Card label={`▲ Biggest riser${climbers.length > 1 ? 's' : ''} today`} color="#4ade80" entries={climbers} />
      )}
      {droppers.length > 0 && (
        <Card label={`▼ Biggest drop${droppers.length > 1 ? 's' : ''} today`} color="#f87171" entries={droppers} />
      )}
    </>
  );
}
