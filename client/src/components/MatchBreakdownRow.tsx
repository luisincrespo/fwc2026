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
  colSpan?: number;
}

export function MatchBreakdownRow({
  homeTeam, awayTeam, homeCode, awayCode,
  homeGoals, awayGoals, predictedHome, predictedAway,
  points, scoreLabel = 'Result', colSpan = 4,
}: Props) {
  const tierColor = points >= 11 ? '#f59e0b' : points >= 3 ? '#22c55e' : points > 0 ? '#94a3b8' : '#475569';
  return (
    <tr style={{ background: '#0a1628' }}>
      <td colSpan={colSpan} style={{ padding: '8px 14px 8px 40px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: '#94a3b8' }}>
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <Matchup homeTeam={homeTeam} awayTeam={awayTeam} homeCode={homeCode} awayCode={awayCode} />
          </span>
          <span style={{ width: 80, flexShrink: 0 }}>
            {scoreLabel}: <strong style={{ color: '#e2e8f0' }}>{homeGoals}–{awayGoals}</strong>
          </span>
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
