export function formatKickoff(utc: string): string {
  return new Date(utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function KickoffTime({ utc }: { utc: string }) {
  return (
    <span style={{ color: '#64748b', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
      {formatKickoff(utc)}
    </span>
  );
}
