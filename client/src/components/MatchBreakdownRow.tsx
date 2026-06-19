import { Matchup } from './Matchup';

interface Props {
  homeTeam: string;
  awayTeam: string;
  homeCode: string;
  awayCode: string;
  homeGoals: number;
  awayGoals: number;
  predictedHome: number;
  predictedAway: number;
  points: number;
  scoreLabel?: string;
  scoreHighlight?: string;
  colSpan?: number;
}

export function MatchBreakdownRow({
  homeTeam, awayTeam, homeCode, awayCode,
  homeGoals, awayGoals, predictedHome, predictedAway,
  points, scoreLabel = 'Result', scoreHighlight, colSpan = 4,
}: Props) {
  const tierColor = points >= 11 ? '#f59e0b' : points >= 3 ? '#22c55e' : points > 0 ? '#94a3b8' : '#475569';
  const center = (
    <span style={{ color: '#64748b', fontWeight: 500 }}>
      {scoreLabel}: <strong style={{ color: scoreHighlight ?? '#e2e8f0' }}>{homeGoals}–{awayGoals}</strong>
    </span>
  );
  return (
    <tr style={{ background: '#0a1628' }}>
      <td colSpan={colSpan} style={{ padding: '8px 14px 8px 40px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#94a3b8' }}>
          <div style={{ flex: 1 }}>
            <Matchup variant="card" homeTeam={homeTeam} awayTeam={awayTeam} homeCode={homeCode} awayCode={awayCode} center={center} />
          </div>
          <span style={{ width: 140, flexShrink: 0 }}>
            Prediction:{' '}
            <strong style={{ color: tierColor }}>{predictedHome}–{predictedAway}</strong>
          </span>
          <span style={{ width: 55, flexShrink: 0, textAlign: 'right', color: tierColor, fontWeight: 600 }}>
            {points > 0 ? `+${points} pts` : '0 pts'}
          </span>
        </div>
      </td>
    </tr>
  );
}
