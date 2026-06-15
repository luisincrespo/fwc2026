import type { LiveMatch } from '../types';
import { Flag } from './Flag';

interface Props {
  matches: LiveMatch[];
}

export function LiveMatchBanner({ matches }: Props) {
  if (matches.length === 0) {
    return (
      <div
        style={{
          background: '#1e293b',
          borderRadius: 8,
          padding: '10px 16px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: '#64748b',
          fontSize: 14,
        }}
      >
        <span>⏸</span>
        <span>No live matches right now — leaderboard shows official standings.</span>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, #166534, #15803d)',
        borderRadius: 8,
        padding: '10px 16px',
        marginBottom: 20,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        alignItems: 'center',
      }}
    >
      <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: 1, color: '#bbf7d0' }}>
        ⚽ LIVE
      </span>
      {matches.map((m, i) => (
        <span key={i} style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Flag code={m.homeCode} /> {m.homeTeam} {m.homeGoals} – {m.awayGoals} {m.awayTeam} <Flag code={m.awayCode} />
        </span>
      ))}
      <span style={{ fontSize: 12, color: '#86efac', marginLeft: 'auto' }}>
        standings reflect current score
      </span>
    </div>
  );
}
