import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { InsightsResponse } from '../types';

const PALETTE = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#14b8a6',
  '#a855f7', '#0ea5e9', '#d946ef', '#f43f5e', '#e879f9',
];

function fmtDate(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface Props {
  data: InsightsResponse;
}

export function RankChart({ data }: Props) {
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const { gameDates, participants } = data;

  if (gameDates.length < 2) {
    return (
      <p style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: 24 }}>
        Trajectory available once more game days have been played.
      </p>
    );
  }

  const totalParticipants = participants.length;

  // Top 15 by current rank get a color; rest drawn as faint background lines
  const top15 = [...participants].sort((a, b) => a.currentRank - b.currentRank).slice(0, 15);
  const top15Ids = new Set(top15.map((p) => p.id));
  const colorMap = new Map(top15.map((p, i) => [p.id, PALETTE[i % PALETTE.length]]));

  // Build chart data: one object per game date
  const chartData = gameDates.map((date, i) => {
    const obj: Record<string, string | number> = { date: fmtDate(date) };
    for (const p of participants) obj[`p${p.id}`] = p.ranks[i];
    return obj;
  });

  // Custom tooltip: show top 10 ranked participants at that date
  const CustomTooltip = ({ active, label, payload }: {
    active?: boolean;
    label?: string;
    payload?: { dataKey: string; value: number }[];
  }) => {
    if (!active || !payload || !label) return null;

    const atDate = payload
      .map((pl) => {
        const id = Number(pl.dataKey.slice(1));
        const p = participants.find((x) => x.id === id);
        return p ? { name: p.name, rank: pl.value, id } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a!.rank - b!.rank) as { name: string; rank: number; id: number }[];

    const shown = highlighted !== null
      ? atDate.filter((x) => x.id === highlighted)
      : atDate.slice(0, 10);

    return (
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', fontSize: 12, minWidth: 180 }}>
        <div style={{ color: '#64748b', marginBottom: 6, fontWeight: 600 }}>{label}</div>
        {shown.map((x) => (
          <div key={x.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: colorMap.get(x.id) ?? '#64748b', padding: '2px 0' }}>
            <span>#{x.rank} {x.name}</span>
          </div>
        ))}
        {highlighted === null && atDate.length > 10 && (
          <div style={{ color: '#475569', marginTop: 4 }}>+{atDate.length - 10} more</div>
        )}
      </div>
    );
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="date"
            tick={{ fill: '#475569', fontSize: 11 }}
            axisLine={{ stroke: '#1e293b' }}
            tickLine={false}
          />
          <YAxis
            domain={[totalParticipants, 1]}
            ticks={[1, 10, 20, 40, 60, totalParticipants]}
            tick={{ fill: '#475569', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `#${v}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={1} stroke="#1e293b" strokeDasharray="3 3" />

          {/* Background lines for participants outside top 15 */}
          {participants
            .filter((p) => !top15Ids.has(p.id))
            .map((p) => (
              <Line
                key={p.id}
                dataKey={`p${p.id}`}
                stroke="#1e293b"
                strokeWidth={1}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            ))}

          {/* Highlighted top-15 lines */}
          {top15.map((p) => {
            const color = colorMap.get(p.id)!;
            const isHighlighted = highlighted === p.id;
            const isDimmed = highlighted !== null && !isHighlighted;
            return (
              <Line
                key={p.id}
                dataKey={`p${p.id}`}
                stroke={color}
                strokeWidth={isHighlighted ? 3 : 1.5}
                strokeOpacity={isDimmed ? 0.2 : 1}
                dot={false}
                activeDot={{ r: 3, fill: color, stroke: 'none' }}
                isAnimationActive={false}
                onMouseEnter={() => setHighlighted(p.id)}
                onMouseLeave={() => setHighlighted(null)}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 10, paddingLeft: 8 }}>
        {top15.map((p) => (
          <span
            key={p.id}
            style={{
              fontSize: 11,
              color: highlighted === null || highlighted === p.id ? colorMap.get(p.id) : '#334155',
              cursor: 'default',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={() => setHighlighted(p.id)}
            onMouseLeave={() => setHighlighted(null)}
          >
            #{p.currentRank} {p.name}
          </span>
        ))}
      </div>
    </div>
  );
}
