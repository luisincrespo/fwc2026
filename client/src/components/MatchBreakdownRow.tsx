import { Flag } from './Flag';

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
  const isExact = predictedHome === homeGoals && predictedAway === awayGoals;
  return (
    <tr style={{ background: '#0a1628' }}>
      <td colSpan={colSpan} style={{ padding: '8px 14px 8px 40px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: '#94a3b8' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <Flag code={homeCode} size={16} /> {homeTeam} vs {awayTeam} <Flag code={awayCode} size={16} />
          </span>
          <span style={{ width: 80, flexShrink: 0 }}>
            {scoreLabel}: <strong style={{ color: '#e2e8f0' }}>{homeGoals}–{awayGoals}</strong>
          </span>
          <span style={{ width: 140, flexShrink: 0 }}>
            Prediction:{' '}
            <strong style={{ color: isExact ? '#4ade80' : '#e2e8f0' }}>
              {predictedHome}–{predictedAway}
            </strong>
          </span>
          <span style={{ width: 55, flexShrink: 0, textAlign: 'right', color: points > 0 ? '#4ade80' : '#475569', fontWeight: 600 }}>
            {points > 0 ? `+${points} pts` : '0 pts'}
          </span>
        </div>
      </td>
    </tr>
  );
}
