import { useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { InsightsResponse } from '../types';

const PALETTE = [
  '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4',
];

function fmtDate(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const MAX_SELECTED = 5;

export function PointsPerDayChart({ data }: { data: InsightsResponse }) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');

  const { gameDates, participants } = data;
  const query = search.trim().toLowerCase();
  const filteredList = (query ? participants.filter((p) => p.name.toLowerCase().includes(query)) : participants)
    .sort((a, b) => a.currentRank - b.currentRank);

  const selected = participants.filter((p) => selectedIds.has(p.id));
  const colorMap = new Map<number, string>();
  // Assign colors in selection order so they stay stable
  selected.forEach((p, i) => colorMap.set(p.id, PALETTE[i % PALETTE.length]));

  const showAll = selectedIds.size === 0;

  const chartData = gameDates.map((date, i) => {
    const fieldAvg = Math.round(
      participants.reduce((s, p) => s + (p.pointsPerDay[i] ?? 0), 0) / participants.length * 10,
    ) / 10;
    const obj: Record<string, string | number> = { date: fmtDate(date), fieldAvg };
    if (showAll) {
      obj['avg'] = fieldAvg;
    } else {
      for (const p of selected) obj[`p${p.id}`] = p.pointsPerDay[i] ?? 0;
    }
    return obj;
  });

  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_SELECTED) next.add(id);
      return next;
    });
  };

  const CustomTooltip = ({ active, label, payload }: {
    active?: boolean; label?: string; payload?: { dataKey: string; value: number; name?: string }[];
  }) => {
    if (!active || !label || !payload?.length) return null;
    const rows = payload.filter((pl) => pl.dataKey !== 'fieldAvg');
    const fieldAvgEntry = payload.find((pl) => pl.dataKey === 'fieldAvg');
    return (
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', fontSize: 12, minWidth: 160 }}>
        <div style={{ color: '#64748b', marginBottom: 6, fontWeight: 600 }}>{label}</div>
        {showAll
          ? <div style={{ color: '#e2e8f0' }}>Avg: {rows[0]?.value ?? 0} pts</div>
          : rows.map((pl) => {
              const id = Number(pl.dataKey.slice(1));
              const p = participants.find((x) => x.id === id);
              return p ? (
                <div key={id} style={{ color: colorMap.get(id) ?? '#94a3b8', padding: '1px 0' }}>
                  {p.name}: {pl.value} pts
                </div>
              ) : null;
            })
        }
        {!showAll && fieldAvgEntry && (
          <div style={{ color: '#475569', marginTop: 4, borderTop: '1px solid #1e293b', paddingTop: 4 }}>
            Field avg: {fieldAvgEntry.value} pts
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          {showAll
            ? <Bar dataKey="avg" fill="#334155" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            : <>
                {selected.map((p) => (
                  <Bar key={p.id} dataKey={`p${p.id}`} fill={colorMap.get(p.id)!} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                ))}
                <Line dataKey="fieldAvg" stroke="#475569" strokeWidth={1.5} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
              </>
          }
        </ComposedChart>
      </ResponsiveContainer>

      <div style={{ marginTop: 12, paddingLeft: 8 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <input
            type="text"
            placeholder="Search players…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1, background: '#0f172a', border: '1px solid #334155', borderRadius: 6,
              color: '#e2e8f0', fontSize: 12, padding: '6px 10px', outline: 'none',
            }}
          />
          {selectedIds.size > 0 && (
            <button
              onClick={() => setSelectedIds(new Set())}
              style={{ background: 'none', border: '1px solid #334155', borderRadius: 6, color: '#64748b', fontSize: 12, padding: '6px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              All players
            </button>
          )}
        </div>
        <div style={{ maxHeight: 110, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 4, alignContent: 'flex-start' }}>
          {filteredList.map((p) => {
            const isSelected = selectedIds.has(p.id);
            const color = colorMap.get(p.id);
            const isDisabled = !isSelected && selectedIds.size >= MAX_SELECTED;
            return (
              <button
                key={p.id}
                onClick={() => !isDisabled && toggle(p.id)}
                style={{
                  background: isSelected ? '#1e293b' : 'none',
                  border: `1px solid ${isSelected ? (color ?? '#475569') : '#1e293b'}`,
                  borderRadius: 20,
                  color: isSelected ? (color ?? '#94a3b8') : '#64748b',
                  fontSize: 11,
                  padding: '3px 10px',
                  cursor: isDisabled ? 'default' : 'pointer',
                  opacity: isDisabled ? 0.3 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                #{p.currentRank} {p.name}
              </button>
            );
          })}
        </div>
        {selectedIds.size > 0 && (
          <div style={{ color: '#334155', fontSize: 11, marginTop: 6 }}>
            {selectedIds.size}/{MAX_SELECTED} players selected
          </div>
        )}
      </div>
    </div>
  );
}
