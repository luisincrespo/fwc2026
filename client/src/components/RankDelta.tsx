import { COLOR_RANK_UP, COLOR_RANK_DOWN, COLOR_RANK_NEUTRAL } from '../lib/colors';

interface Props {
  delta: number;
}

export function RankDelta({ delta }: Props) {
  if (delta === 0) {
    return <span style={{ color: COLOR_RANK_NEUTRAL, fontSize: 13 }}>—</span>;
  }
  const up = delta > 0;
  return (
    <span
      style={{
        color: up ? COLOR_RANK_UP : COLOR_RANK_DOWN,
        fontWeight: 600,
        fontSize: 13,
        whiteSpace: 'nowrap',
      }}
    >
      {up ? '▲' : '▼'} {Math.abs(delta)}
    </span>
  );
}
