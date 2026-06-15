import type { ReactNode } from 'react';
import { Flag } from './Flag';

interface Props {
  homeTeam: string;
  awayTeam: string;
  homeCode: string;
  awayCode: string;
  center: ReactNode;
}

export function MatchRow({ homeTeam, awayTeam, homeCode, awayCode, center }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
        <span>{homeTeam}</span>
        <Flag code={homeCode} size={20} />
      </div>
      <div style={{ width: 80, flexShrink: 0, textAlign: 'center' }}>
        {center}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Flag code={awayCode} size={20} />
        <span>{awayTeam}</span>
      </div>
    </div>
  );
}
