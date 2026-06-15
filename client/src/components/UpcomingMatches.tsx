import type { ScheduledMatch } from '../types';
import { Flag } from './Flag';

interface Props {
  matches: ScheduledMatch[];
}

export function UpcomingMatches({ matches }: Props) {
  if (matches.length === 0) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
        Upcoming today
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {matches.map((m, i) => {
          const kickoff = new Date(m.kickoffUtc);
          const timeStr = kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return (
            <div
              key={i}
              style={{
                background: '#1e293b',
                borderRadius: 8,
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 14,
                color: '#cbd5e1',
              }}
            >
              <Flag code={m.homeCode} size={20} />
              <span>{m.homeTeam}</span>
              <span style={{ color: '#334155', margin: '0 4px' }}>vs</span>
              <span>{m.awayTeam}</span>
              <Flag code={m.awayCode} size={20} />
              <span style={{ marginLeft: 'auto', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                {timeStr}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
