import type { MatchPicks } from '../types';

interface Props {
  picks: MatchPicks;
  homeTeam: string;
  awayTeam: string;
}

function pct(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

export function PicksBar({ picks, homeTeam, awayTeam }: Props) {
  const { home, draw, away, total, topScores } = picks;
  const homePct = pct(home, total);
  const drawPct = pct(draw, total);
  const awayPct = pct(away, total);

  return (
    <div style={{ fontSize: 12, color: '#64748b' }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: '#334155', marginBottom: 7 }}>
        Predictions distribution
      </div>
      <div style={{ display: 'flex', height: 4, borderRadius: 4, overflow: 'hidden', gap: 1 }}>
        <div style={{ flex: home, background: '#22c55e', minWidth: home > 0 ? 2 : 0 }} />
        <div style={{ flex: draw, background: '#475569', minWidth: draw > 0 ? 2 : 0 }} />
        <div style={{ flex: away, background: '#3b82f6', minWidth: away > 0 ? 2 : 0 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ color: '#22c55e' }}>{homeTeam} {homePct}%</span>
          <span style={{ color: '#94a3b8' }}>Draw {drawPct}%</span>
          <span style={{ color: '#3b82f6' }}>{awayTeam} {awayPct}%</span>
        </div>
        {topScores.length > 0 && (
          <span style={{ color: '#475569' }}>
            Top predictions: {topScores.slice(0, 2).map(({ score, count }) => `${score} (${count})`).join(' · ')}
          </span>
        )}
      </div>
    </div>
  );
}
