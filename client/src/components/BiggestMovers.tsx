import type { LeaderboardEntry } from '../types';
import { COLOR_CORRECT_LIVE, COLOR_RANK_DOWN_SOFT } from '../lib/colors';

interface Props {
  entries: LeaderboardEntry[];
}

function Card({ label, color, entries }: { label: string; color: string; entries: LeaderboardEntry[] }) {
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
            <span style={{ fontSize: 12, color: '#475569' }}>#{e.rank + e.rankDelta} → #{e.rank}</span>
            <span style={{ fontWeight: 700, color, minWidth: '3ch', textAlign: 'right' }}>{e.rankDelta > 0 ? '▲' : '▼'}{Math.abs(e.rankDelta)}</span>
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
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
      {climbers.length > 0 && (
        <Card label={`▲ Biggest riser${climbers.length > 1 ? 's' : ''}`} color={COLOR_CORRECT_LIVE} entries={climbers} />
      )}
      {droppers.length > 0 && (
        <Card label={`▼ Biggest drop${droppers.length > 1 ? 's' : ''}`} color={COLOR_RANK_DOWN_SOFT} entries={droppers} />
      )}
    </div>
  );
}
