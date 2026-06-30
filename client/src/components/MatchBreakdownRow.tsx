import { Matchup } from './Matchup';
import { COLOR_EXACT, COLOR_CORRECT, COLOR_MARGIN, COLOR_MISS } from '../lib/colors';

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
  predictedPenalties?: 'home' | 'away';
  predictedHomeTeam?: string;
  predictedAwayTeam?: string;
  predictedHomeCode?: string;
  predictedAwayCode?: string;
}

export function MatchBreakdownRow({
  homeTeam, awayTeam, homeCode, awayCode,
  homeGoals, awayGoals, predictedHome, predictedAway,
  points, scoreLabel = 'Result', scoreHighlight, colSpan = 4,
  predictedPenalties,
  predictedHomeTeam, predictedAwayTeam, predictedHomeCode, predictedAwayCode,
}: Props) {
  const tierColor = points >= 11 ? COLOR_EXACT : points >= 3 ? COLOR_CORRECT : points > 0 ? COLOR_MARGIN : COLOR_MISS;

  const teamsMatch = !predictedHomeTeam || (predictedHomeTeam === homeTeam && predictedAwayTeam === awayTeam);

  // Pen winner is relative to the predicted side (home/away)
  const isDraw = predictedHome === predictedAway;
  const penWinnerCode = predictedPenalties === 'home'
    ? (predictedHomeCode ?? homeCode)
    : predictedPenalties === 'away'
      ? (predictedAwayCode ?? awayCode)
      : null;
  const penWinnerTeam = predictedPenalties === 'home'
    ? (predictedHomeTeam ?? homeTeam)
    : predictedPenalties === 'away'
      ? (predictedAwayTeam ?? awayTeam)
      : null;

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
            {!teamsMatch && (
              <div style={{ marginTop: 4, paddingLeft: 2, opacity: 0.65 }}>
                <Matchup
                  variant="card"
                  homeTeam={predictedHomeTeam!} awayTeam={predictedAwayTeam!}
                  homeCode={predictedHomeCode ?? ''} awayCode={predictedAwayCode ?? ''}
                  center={<span style={{ color: '#475569', fontWeight: 500, fontSize: 11 }}>Predicted</span>}
                />
              </div>
            )}
          </div>
          <span style={{ width: 140, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span>
              Prediction:{' '}
              <strong style={{ color: tierColor }}>{predictedHome}–{predictedAway}</strong>
            </span>
            {isDraw && penWinnerCode && penWinnerTeam && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' }}>
                Pen:
                <img src={`https://flagcdn.com/20x15/${penWinnerCode}.png`} alt="" style={{ width: 14, height: 11, borderRadius: 1 }} />
                {penWinnerTeam}
              </span>
            )}
          </span>
          <span style={{ width: 55, flexShrink: 0, textAlign: 'right', color: tierColor, fontWeight: 600 }}>
            {points > 0 ? `+${points} pts` : '0 pts'}
          </span>
        </div>
      </td>
    </tr>
  );
}
