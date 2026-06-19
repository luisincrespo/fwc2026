import { Flag } from './Flag';

interface Props {
  homeTeam: string;
  awayTeam: string;
  homeCode: string;
  awayCode: string;
  size?: number;
}

export function Matchup({ homeTeam, awayTeam, homeCode, awayCode, size = 16 }: Props) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <Flag code={homeCode} size={size} />
      {homeTeam}
      <span style={{ color: '#475569' }}>vs</span>
      {awayTeam}
      <Flag code={awayCode} size={size} />
    </span>
  );
}
