import type { ReactNode } from 'react';
import { Flag } from './Flag';

interface BaseProps {
  homeTeam: string;
  awayTeam: string;
  homeCode: string;
  awayCode: string;
}

interface CardProps extends BaseProps {
  variant: 'card';
  center: ReactNode;
  flagSize?: number;
}

interface InlineProps extends BaseProps {
  variant?: 'inline';
  flagSize?: number;
}

type Props = CardProps | InlineProps;

export function Matchup(props: Props) {
  const { homeTeam, awayTeam, homeCode, awayCode } = props;

  if (props.variant === 'card') {
    const size = props.flagSize ?? 20;
    return (
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          <span>{homeTeam}</span>
          <Flag code={homeCode} size={size} />
        </div>
        <div style={{ flex: '0 0 auto', textAlign: 'center', padding: '0 8px' }}>
          {props.center}
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Flag code={awayCode} size={size} />
          <span>{awayTeam}</span>
        </div>
      </div>
    );
  }

  const size = props.flagSize ?? 16;
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
