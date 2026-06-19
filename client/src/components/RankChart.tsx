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
  '#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa',
];

function fmtDate(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function RankChart({ data }: { data: InsightsResponse }) {
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  // Extra non-top-15 players explicitly pinned by the user
  const [pinnedIds, setPinnedIds] = useState<Set<number>>(new Set());
  // Top-15 players explicitly unpinned by the user
  const [unpinnedTop15Ids, setUnpinnedTop15Ids] = useState<Set<number>>(new Set());

  const { gameDates, participants } = data;

  if (gameDates.length < 2) {
    return (
      <p style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: 24 }}>
        Trajectory available once more game days have been played.
      </p>
    );
  }

  const totalParticipants = participants.length;
  const query = search.trim().toLowerCase();

  const top15 = [...participants].sort((a, b) => a.currentRank - b.currentRank).slice(0, 15);
  const top15Ids = new Set(top15.map((p) => p.id));

  const activeTop15 = top15.filter((p) => !unpinnedTop15Ids.has(p.id));
  const extraActive = participants.filter(
    (p) => !top15Ids.has(p.id) && (pinnedIds.has(p.id) || (query.length >= 1 && p.name.toLowerCase().includes(query))),
  );
  const activeAll = [...activeTop15, ...extraActive];
  const activeIds = new Set(activeAll.map((p) => p.id));

  const colorMap = new Map<number, string>();
  top15.forEach((p, i) => colorMap.set(p.id, PALETTE[i]));
  extraActive.forEach((p, i) => colorMap.set(p.id, PALETTE[15 + (i % 5)]));

  const toggleSelect = (id: number) => {
    if (top15Ids.has(id)) {
      setUnpinnedTop15Ids((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    } else {
      setPinnedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    }
  };

  const chartData = gameDates.map((date, i) => {
    const obj: Record<string, string | number> = { date: fmtDate(date) };
    for (const p of participants) obj[`p${p.id}`] = -p.ranks[i];
    return obj;
  });

  const filteredList = (
    query.length >= 1 ? participants.filter((p) => p.name.toLowerCase().includes(query)) : participants
  ).sort((a, b) => a.currentRank - b.currentRank);

  const CustomTooltip = ({ active, label, payload }: {
    active?: boolean; label?: string; payload?: { dataKey: string; value: number }[];
  }) => {
    if (!active || !payload || !label) return null;
    const atDate = payload
      .map((pl) => {
        const id = Number(pl.dataKey.slice(1));
        const p = participants.find((x) => x.id === id);
        return p ? { name: p.name, rank: -pl.value, id } : null;
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
          <div key={x.id} style={{ color: colorMap.get(x.id) ?? '#64748b', padding: '2px 0' }}>
            #{x.rank} {x.name}
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
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} tickLine={false} />
          <YAxis
            domain={[-totalParticipants, -1]}
            ticks={[-1, -10, -20, -40, -60, -totalParticipants]}
            tick={{ fill: '#475569', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `#${Math.abs(v)}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={-1} stroke="#1e293b" strokeDasharray="3 3" />

          {participants.filter((p) => !activeIds.has(p.id)).map((p) => (
            <Line key={p.id} dataKey={`p${p.id}`} stroke="#1e293b" strokeWidth={1} dot={false} activeDot={false} isAnimationActive={false} />
          ))}

          {[...top15, ...extraActive].map((p) => {
            const color = colorMap.get(p.id)!;
            const isHighlighted = highlighted === p.id;
            const isDimmed = highlighted !== null && !isHighlighted;
            return (
              <Line
                key={p.id}
                dataKey={`p${p.id}`}
                stroke={color}
                strokeWidth={isHighlighted ? 3 : 1.5}
                strokeOpacity={isDimmed ? 0.15 : 1}
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

      {/* Search */}
      <div style={{ marginTop: 12, paddingLeft: 8 }}>
        <input
          type="text"
          placeholder="Search players…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: 6,
            color: '#e2e8f0',
            fontSize: 12,
            padding: '6px 10px',
            outline: 'none',
            marginBottom: 8,
          }}
        />

        {/* Scrollable player chip list */}
        <div style={{ maxHeight: 110, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 4, alignContent: 'flex-start' }}>
          {filteredList.map((p) => {
            const color = colorMap.get(p.id);
            const isActive = activeIds.has(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggleSelect(p.id)}
                onMouseEnter={() => setHighlighted(p.id)}
                onMouseLeave={() => setHighlighted(null)}
                style={{
                  background: isActive ? '#1e293b' : 'none',
                  border: `1px solid ${isActive ? (color ?? '#475569') : '#1e293b'}`,
                  borderRadius: 20,
                  color: isActive ? (color ?? '#94a3b8') : '#64748b',
                  fontSize: 11,
                  padding: '2px 8px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  opacity: highlighted !== null && highlighted !== p.id ? 0.4 : 1,
                }}
              >
                #{p.currentRank} {p.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
