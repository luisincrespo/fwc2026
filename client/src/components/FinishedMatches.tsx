import type { ScheduledMatch } from '../types';
import { MatchRow } from './MatchRow';

interface Props {
  matches: ScheduledMatch[];
}

export function FinishedMatches({ matches }: Props) {
  if (matches.length === 0) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
        Finished today
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {matches.map((m, i) => (
          <div
            key={i}
            style={{
              background: '#1e293b',
              borderRadius: 8,
              padding: '10px 16px',
              fontSize: 14,
              color: '#cbd5e1',
            }}
          >
            <MatchRow
              homeTeam={m.homeTeam}
              awayTeam={m.awayTeam}
              homeCode={m.homeCode}
              awayCode={m.awayCode}
              center={
                <span style={{ fontWeight: 700, fontSize: 16, color: '#94a3b8', letterSpacing: 2 }}>
                  {m.homeGoals} – {m.awayGoals}
                </span>
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
