interface Props {
  delta: number;
}

export function RankDelta({ delta }: Props) {
  if (delta === 0) {
    return <span style={{ color: '#64748b', fontSize: 13 }}>—</span>;
  }
  const up = delta > 0;
  return (
    <span
      style={{
        color: up ? '#22c55e' : '#ef4444',
        fontWeight: 600,
        fontSize: 13,
        whiteSpace: 'nowrap',
      }}
    >
      {up ? '▲' : '▼'} {Math.abs(delta)}
    </span>
  );
}
