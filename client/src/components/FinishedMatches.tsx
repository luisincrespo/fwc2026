import { useState } from 'react';
import type { ScheduledMatch, GoalEvent } from '../types';
import { MatchRow } from './MatchRow';

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
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (matches.length === 0) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
        Finished games
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {matches.map((m, i) => {
          const isExpanded = expandedIdx === i;
          const hasGoals = m.goals?.length > 0;
          return (
            <div
              key={i}
              onClick={() => hasGoals && setExpandedIdx(isExpanded ? null : i)}
              style={{
                background: '#1e293b',
                borderRadius: 8,
                padding: '10px 16px',
                fontSize: 14,
                color: '#cbd5e1',
                cursor: hasGoals ? 'pointer' : 'default',
              }}
            >
              <div style={{ position: 'relative' }}>
                {hasGoals && (
                  <span style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#475569' }}>
                    {isExpanded ? '▲' : '▼'}
                  </span>
                )}
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
              {isExpanded && <GoalList goals={m.goals} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
