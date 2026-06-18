import type { ScheduledMatch, GoalEvent } from '../types';
import { MatchRow } from './MatchRow';
import { PerformanceBar } from './PerformanceBar';
import { VenueLabel } from './VenueLabel';

interface Props {
  matches: ScheduledMatch[];
}

function formatSideGoals(goals: GoalEvent[]): string {
  const grouped = new Map<string, string[]>();
  for (const g of goals) {
    const suffix = g.ownGoal ? ' (og)' : g.penaltyKick ? ' (p)' : '';
    const key = `${g.scorer}${suffix}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(g.minute);
  }
  return [...grouped.entries()].map(([name, minutes]) => `${name} ${minutes.map((m) => `⚽ ${m}`).join(' ')}`).join(' · ');
}

function GoalList({ goals }: { goals: GoalEvent[] }) {
  const homeGoals = goals.filter((g) => g.team === 'home');
  const awayGoals = goals.filter((g) => g.team === 'away');

  return (
    <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 12, color: '#64748b' }}>
      <span style={{ flex: 1, textAlign: 'right' }}>
        {formatSideGoals(homeGoals)}
      </span>
      <span style={{ color: '#334155', flexShrink: 0 }}>|</span>
      <span style={{ flex: 1 }}>
        {formatSideGoals(awayGoals)}
      </span>
    </div>
  );
}

export function FinishedMatches({ matches }: Props) {
  if (matches.length === 0) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
        Finished games
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
            {m.venue && <VenueLabel venue={m.venue} />}
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
            {m.goals?.length > 0 && <GoalList goals={m.goals} />}
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
