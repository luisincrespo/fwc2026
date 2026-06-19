import { useState } from 'react';
import type { InsightsResponse, ParticipantInsight } from '../types';

type AccuracySort = 'exact' | 'accuracy' | 'draws';

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 1,
  color: '#475569',
  textTransform: 'uppercase',
  marginBottom: 8,
};

const CARD: React.CSSProperties = {
  background: '#1e293b',
  borderRadius: 8,
  padding: '10px 16px',
  fontSize: 13,
  color: '#cbd5e1',
};

function SortButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? '#334155' : 'none',
        border: '1px solid #334155',
        borderRadius: 6,
        color: active ? '#f1f5f9' : '#64748b',
        fontSize: 11,
        padding: '3px 10px',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function AccuracyTable({ participants, sort }: { participants: ParticipantInsight[]; sort: AccuracySort }) {
  const sorted = [...participants].sort((a, b) => {
    if (sort === 'exact') return b.exactPct - a.exactPct || b.exact - a.exact;
    if (sort === 'accuracy') return b.accuracyPct - a.accuracyPct || (b.exact + b.correct) - (a.exact + a.correct);
    return b.drawPct - a.drawPct || b.drawPredictions - a.drawPredictions;
  });

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ color: '#475569', textAlign: 'left' }}>
            <th style={{ padding: '4px 8px 8px 0', fontWeight: 600 }}>#</th>
            <th style={{ padding: '4px 8px 8px 0', fontWeight: 600 }}>Name</th>
            <th style={{ padding: '4px 8px 8px 0', fontWeight: 600, textAlign: 'center' }}>Exact</th>
            <th style={{ padding: '4px 8px 8px 0', fontWeight: 600, textAlign: 'center' }}>Correct</th>
            <th style={{ padding: '4px 8px 8px 0', fontWeight: 600, textAlign: 'center' }}>Miss</th>
            <th style={{ padding: '4px 8px 8px 0', fontWeight: 600, textAlign: 'center' }}>Acc%</th>
            <th style={{ padding: '4px 0 8px 0', fontWeight: 600, textAlign: 'center' }}>Draw%</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, i) => (
            <tr
              key={p.id}
              style={{ borderTop: i === 0 ? 'none' : '1px solid #0f172a' }}
            >
              <td style={{ padding: '6px 8px 6px 0', color: '#475569', width: 24 }}>{i + 1}</td>
              <td style={{ padding: '6px 8px 6px 0', color: '#e2e8f0' }}>{p.name}</td>
              <td style={{ padding: '6px 8px', textAlign: 'center', color: '#f59e0b', fontWeight: 600 }}>{p.exact}</td>
              <td style={{ padding: '6px 8px', textAlign: 'center', color: '#22c55e' }}>{p.correct}</td>
              <td style={{ padding: '6px 8px', textAlign: 'center', color: '#475569' }}>{p.miss}</td>
              <td style={{ padding: '6px 8px', textAlign: 'center', color: '#94a3b8' }}>{p.accuracyPct}%</td>
              <td style={{ padding: '6px 0', textAlign: 'center', color: '#94a3b8' }}>{p.drawPct}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrajectorySection({ participants, firstGameDate }: { participants: ParticipantInsight[]; firstGameDate?: string }) {
  const withTrajectory = participants.filter((p) => p.rankChange !== undefined && p.rankOnFirstDay !== undefined);
  if (withTrajectory.length === 0) return null;

  const climbers = [...withTrajectory].sort((a, b) => (b.rankChange ?? 0) - (a.rankChange ?? 0)).slice(0, 6);
  const fallers = [...withTrajectory].sort((a, b) => (a.rankChange ?? 0) - (b.rankChange ?? 0)).slice(0, 6);

  const dateLabel = firstGameDate
    ? new Date(`${firstGameDate}T12:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : 'Day 1';

  const row = (p: ParticipantInsight, dir: 'up' | 'down') => {
    const delta = p.rankChange ?? 0;
    const color = dir === 'up' ? '#22c55e' : '#ef4444';
    const arrow = dir === 'up' ? '↑' : '↓';
    return (
      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderTop: '1px solid #0f172a' }}>
        <span style={{ color: '#e2e8f0', fontSize: 13 }}>{p.name}</span>
        <span style={{ fontSize: 12, color, fontWeight: 600, whiteSpace: 'nowrap' }}>
          #{p.rankOnFirstDay} {arrow} #{p.currentRank}
          <span style={{ color: '#475569', fontWeight: 400 }}> ({arrow}{Math.abs(delta)})</span>
        </span>
      </div>
    );
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={SECTION_LABEL}>Tournament trajectory · since {dateLabel}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={CARD}>
          <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 600, marginBottom: 6 }}>Biggest climbers</div>
          {climbers.filter((p) => (p.rankChange ?? 0) > 0).map((p) => row(p, 'up'))}
        </div>
        <div style={CARD}>
          <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginBottom: 6 }}>Biggest drops</div>
          {fallers.filter((p) => (p.rankChange ?? 0) < 0).map((p) => row(p, 'down'))}
        </div>
      </div>
    </div>
  );
}

interface Props {
  data: InsightsResponse | null;
  loading: boolean;
}

export function Insights({ data, loading }: Props) {
  const [sort, setSort] = useState<AccuracySort>('exact');

  if (loading) {
    return <p style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>Loading insights…</p>;
  }
  if (!data) return null;

  return (
    <div>
      <TrajectorySection participants={data.participants} firstGameDate={data.firstGameDate} />

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={SECTION_LABEL}>Prediction accuracy</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <SortButton label="Exact" active={sort === 'exact'} onClick={() => setSort('exact')} />
            <SortButton label="Accuracy" active={sort === 'accuracy'} onClick={() => setSort('accuracy')} />
            <SortButton label="Draws" active={sort === 'draws'} onClick={() => setSort('draws')} />
          </div>
        </div>
        <div style={CARD}>
          <AccuracyTable participants={data.participants} sort={sort} />
        </div>
      </div>
    </div>
  );
}
