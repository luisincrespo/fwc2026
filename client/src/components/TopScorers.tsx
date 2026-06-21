import type { DailyEntry } from '../types';
import { COLOR_TOP_SCORERS } from '../lib/colors';

interface Props {
  entries: DailyEntry[];
}

export function TopScorers({ entries }: Props) {
  const maxPoints = Math.max(...entries.map((e) => e.pointsToday));
  if (maxPoints <= 0) return null;

  const top = entries.filter((e) => e.pointsToday === maxPoints);

  return (
    <div style={{
      flex: 1,
      minWidth: 200,
      background: '#1e293b',
      borderRadius: 8,
      padding: '10px 14px',
      borderLeft: `3px solid ${COLOR_TOP_SCORERS}`,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: COLOR_TOP_SCORERS, textTransform: 'uppercase', marginBottom: 6 }}>
        Top scorer{top.length > 1 ? 's' : ''} today
      </div>
      {top.map((e) => (
        <div key={e.id} style={{ fontSize: 14, color: '#e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
          <span style={{ fontWeight: 700, color: COLOR_TOP_SCORERS }}>+{e.pointsToday} pts</span>
        </div>
      ))}
    </div>
  );
}
