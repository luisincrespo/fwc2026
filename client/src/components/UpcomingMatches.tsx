import type { ScheduledMatch } from '../types';
import { Matchup } from './Matchup';
import { KickoffTime } from './KickoffTime';
import { PicksBar } from './PicksBar';
import { VenueLabel } from './VenueLabel';

interface Props {
  matches: ScheduledMatch[];
}

export function UpcomingMatches({ matches }: Props) {
  if (matches.length === 0) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
        Upcoming games
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {matches.map((m, i) => {
          return (
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
              {m.venue && <VenueLabel venue={m.venue} />}
              <Matchup
                variant="card"
                homeTeam={m.homeTeam}
                awayTeam={m.awayTeam}
                homeCode={m.homeCode}
                awayCode={m.awayCode}
                center={<KickoffTime utc={m.kickoffUtc} />}
              />
              {m.picks && m.picks.total > 0 && (
                <div style={{ margin: '10px -16px -10px', padding: '10px 16px', borderTop: '1px solid #0f172a' }}>
                  <PicksBar picks={m.picks} homeTeam={m.homeTeam} awayTeam={m.awayTeam} homeCode={m.homeCode} awayCode={m.awayCode} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
