import type { LiveMatch, GoalEvent } from '../types';
import { MatchRow } from './MatchRow';
import { PerformanceBar } from './PerformanceBar';
import { VenueLabel } from './VenueLabel';

interface Props {
  matches: LiveMatch[];
}

function formatSideGoals(goals: GoalEvent[]): string {
  const grouped = new Map<string, string[]>();
  for (const g of goals) {
    const suffix = g.ownGoal ? ' (og)' : g.penaltyKick ? ' (p)' : '';
    if (!grouped.has(g.scorer)) grouped.set(g.scorer, []);
    grouped.get(g.scorer)!.push(`${g.minute}${suffix}`);
  }
  return [...grouped.entries()].map(([name, minutes]) => `${name} ${minutes.map((m) => `⚽ ${m}`).join(' ')}`).join(' · ');
}

function GoalList({ goals }: { goals: GoalEvent[] }) {
  const homeGoals = goals.filter((g) => g.team === 'home');
  const awayGoals = goals.filter((g) => g.team === 'away');

  return (
    <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 12, color: '#86efac' }}>
      <span style={{ flex: 1, textAlign: 'right' }}>
        {formatSideGoals(homeGoals)}
      </span>
      <span style={{ color: '#4ade8066', flexShrink: 0 }}>|</span>
      <span style={{ flex: 1 }}>
        {formatSideGoals(awayGoals)}
      </span>
    </div>
  );
}

export function LiveMatchBanner({ matches }: Props) {

  const label = (
    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
      Live games
    </div>
  );

  if (matches.length === 0) {
    return (
      <div style={{ marginBottom: 20 }}>
        {label}
        <div
          style={{
            background: '#1e293b',
            borderRadius: 8,
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#64748b',
            fontSize: 14,
          }}
        >
          <span>⏸</span>
          <span style={{ color: '#94a3b8' }}>No live matches right now — leaderboard shows official standings.</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 20 }}>
      {label}
      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .live-minute { animation: livePulse 2s ease-in-out infinite; }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {matches.map((m, i) => (
          <div
            key={i}
            style={{
              background: '#1e293b',
              borderRadius: 8,
              padding: '10px 16px',
              borderLeft: '3px solid #22c55e',
              fontSize: 14,
              color: '#cbd5e1',
            }}
          >
            {m.venue && <VenueLabel venue={m.venue} />}
            <div style={{ position: 'relative' }}>
              {m.minute && (
                <span className="live-minute" style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#22c55e' }}>
                  {m.minute}
                </span>
              )}
              <MatchRow
                homeTeam={m.homeTeam}
                awayTeam={m.awayTeam}
                homeCode={m.homeCode}
                awayCode={m.awayCode}
                center={
                  <span style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9', letterSpacing: 2 }}>
                    {m.homeGoals} – {m.awayGoals}
                  </span>
                }
              />
            </div>
            {m.goals.length > 0 && <GoalList goals={m.goals} />}
            {m.performance && m.performance.total > 0 && (
              <div style={{ margin: '10px -16px -10px', padding: '10px 16px', borderTop: '1px solid #0f172a' }}>
                <PerformanceBar performance={m.performance} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
