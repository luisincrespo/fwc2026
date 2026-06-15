import { useState } from 'react';
import type { LiveMatch, GoalEvent } from '../types';
import { MatchRow } from './MatchRow';

interface Props {
  matches: LiveMatch[];
}

function GoalList({ goals, homeTeam, awayTeam }: { goals: GoalEvent[]; homeTeam: string; awayTeam: string }) {
  const homeGoals = goals.filter((g) => g.team === 'home');
  const awayGoals = goals.filter((g) => g.team === 'away');

  function formatGoal(g: GoalEvent) {
    const suffix = g.ownGoal ? ' (og)' : g.penaltyKick ? ' (p)' : '';
    return `⚽ ${g.scorer}${suffix} ${g.minute}`;
  }

  return (
    <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 12, color: '#86efac' }}>
      <span style={{ flex: 1, textAlign: 'right' }}>
        {homeGoals.map(formatGoal).join(' · ')}
      </span>
      <span style={{ color: '#4ade8066', flexShrink: 0 }}>|</span>
      <span style={{ flex: 1 }}>
        {awayGoals.map(formatGoal).join(' · ')}
      </span>
    </div>
  );
}


export function LiveMatchBanner({ matches }: Props) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const label = (
    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
      Live now
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
        {matches.map((m, i) => {
          const isExpanded = expandedIdx === i;
          const hasGoals = m.goals.length > 0;
          return (
            <div
              key={i}
              onClick={() => hasGoals && setExpandedIdx(isExpanded ? null : i)}
              style={{
                background: '#1e293b',
                borderRadius: 8,
                padding: '10px 16px',
                borderLeft: '3px solid #22c55e',
                cursor: hasGoals ? 'pointer' : 'default',
                fontSize: 14,
                color: '#cbd5e1',
              }}
            >
              <div style={{ position: 'relative' }}>
                {m.minute && (
                  <span className="live-minute" style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#22c55e' }}>
                    {m.minute}
                  </span>
                )}
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
                    <span style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9', letterSpacing: 2 }}>
                      {m.homeGoals} – {m.awayGoals}
                    </span>
                  }
                />
              </div>
              {isExpanded && <GoalList goals={m.goals} homeTeam={m.homeTeam} awayTeam={m.awayTeam} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
