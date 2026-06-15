import type { LeaderboardEntry } from '../types';

interface Props {
  entries: LeaderboardEntry[];
}

function Card({ label, color, entries }: { label: string; color: string; entries: LeaderboardEntry[] }) {
  return (
    <div style={{
      flex: 1,
      background: '#1e293b',
      borderRadius: 8,
      padding: '10px 14px',
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color, textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </div>
      {entries.map((e) => (
        <div key={e.id} style={{ fontSize: 14, color: '#e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{e.name}</span>
          <span style={{ fontWeight: 700, color }}>
            {e.rankDelta > 0 ? '▲' : '▼'} {Math.abs(e.rankDelta)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function BiggestMovers({ entries }: Props) {
  const maxDelta = Math.max(...entries.map((e) => e.rankDelta));
  const minDelta = Math.min(...entries.map((e) => e.rankDelta));

  if (maxDelta <= 0 && minDelta >= 0) return null;

  const climbers = maxDelta > 0 ? entries.filter((e) => e.rankDelta === maxDelta) : [];
  const droppers = minDelta < 0 ? entries.filter((e) => e.rankDelta === minDelta) : [];

  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
      {climbers.length > 0 && (
        <Card label={`▲ Biggest riser${climbers.length > 1 ? 's' : ''}`} color="#4ade80" entries={climbers} />
      )}
      {droppers.length > 0 && (
        <Card label={`▼ Biggest drop${droppers.length > 1 ? 's' : ''}`} color="#f87171" entries={droppers} />
      )}
    </div>
  );
}
