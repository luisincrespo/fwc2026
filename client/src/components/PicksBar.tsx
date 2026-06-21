import type { MatchPicks } from '../types';
import { teamColor } from '../teamColors';
import { COLOR_CORRECT } from '../lib/colors';

interface Props {
  picks: MatchPicks;
  homeTeam: string;
  awayTeam: string;
  homeCode?: string;
  awayCode?: string;
}

function pct(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

export function PicksBar({ picks, homeTeam, awayTeam, homeCode, awayCode }: Props) {
  const { home, draw, away, total, topScores } = picks;
  const homePct = pct(home, total);
  const drawPct = pct(draw, total);
  const awayPct = pct(away, total);

  const homeClr = homeCode ? teamColor(homeCode, 'home') : COLOR_CORRECT;
  const awayClr = awayCode ? teamColor(awayCode, 'away') : '#3b82f6';

  return (
    <div style={{ fontSize: 12, color: '#64748b' }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: '#64748b', marginBottom: 7 }}>
        Predictions distribution
      </div>
      <div style={{ display: 'flex', height: 4, borderRadius: 4, overflow: 'hidden', gap: 1 }}>
        <div style={{ flex: home, background: homeClr, minWidth: home > 0 ? 2 : 0 }} />
        <div style={{ flex: draw, background: '#475569', minWidth: draw > 0 ? 2 : 0 }} />
        <div style={{ flex: away, background: awayClr, minWidth: away > 0 ? 2 : 0 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ color: homeClr }}>{homeTeam} {home} ({homePct}%)</span>
          <span style={{ color: '#94a3b8' }}>Draw {draw} ({drawPct}%)</span>
          <span style={{ color: awayClr }}>{awayTeam} {away} ({awayPct}%)</span>
        </div>
        {topScores.length > 0 && (
          <span style={{ color: '#64748b' }}>
            Top predictions: {topScores.slice(0, 2).map(({ score, count }) => `${score} (${count})`).join(' · ')}
          </span>
        )}
      </div>
    </div>
  );
}
