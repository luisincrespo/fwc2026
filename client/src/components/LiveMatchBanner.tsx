import type { LiveMatch } from '../types';
import { Flag } from './Flag';

interface Props {
  matches: LiveMatch[];
}

function DistributionBar({ dist, homeTeam, awayTeam }: {
  dist: { home: number; draw: number; away: number };
  homeTeam: string;
  awayTeam: string;
}) {
  const total = dist.home + dist.draw + dist.away;
  if (total === 0) return null;
  const pct = (n: number) => Math.round((n / total) * 100);
  const homePct = pct(dist.home);
  const drawPct = pct(dist.draw);
  const awayPct = pct(dist.away);

  return (
    <div style={{ marginTop: 10, fontSize: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#bbf7d0' }}>
        <span>{homeTeam} {homePct}%</span>
        <span>Draw {drawPct}%</span>
        <span>{awayPct}% {awayTeam}</span>
      </div>
      <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', gap: 2 }}>
        <div style={{ flex: homePct, background: '#4ade80' }} />
        <div style={{ flex: drawPct, background: '#94a3b8' }} />
        <div style={{ flex: awayPct, background: '#f87171' }} />
      </div>
    </div>
  );
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
      {matches.map((m, i) => (
        <div
          key={i}
          style={{
            background: 'linear-gradient(90deg, #166534, #15803d)',
            borderRadius: 8,
            padding: '10px 16px',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: 1, color: '#bbf7d0' }}>
              ⚽ LIVE
            </span>
            <span style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Flag code={m.homeCode} /> {m.homeTeam} {m.homeGoals} – {m.awayGoals} {m.awayTeam} <Flag code={m.awayCode} />
            </span>
            <span style={{ fontSize: 12, color: '#86efac', marginLeft: 'auto' }}>
              standings reflect current score
            </span>
          </div>
          <DistributionBar dist={m.distribution} homeTeam={m.homeTeam} awayTeam={m.awayTeam} />
        </div>
      ))}
    </div>
  );
}
