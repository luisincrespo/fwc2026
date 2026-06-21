import { useState } from 'react';
import { COLOR_EXACT, COLOR_CORRECT, COLOR_MISS, COLOR_MARGIN } from '../lib/colors';
import type { InsightsResponse, ParticipantInsight } from '../types';
import { RankChart } from './RankChart';
import { Badges } from './Badges';
import { FunFacts } from './FunFacts';
import { PointsPerDayChart } from './PointsPerDayChart';

type AccuracySort = 'exact' | 'accuracy';

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
    return b.accuracyPct - a.accuracyPct || (b.exact + b.correct) - (a.exact + a.correct);
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
            <th style={{ padding: '4px 0 8px 0', fontWeight: 600, textAlign: 'center' }}>Acc%</th>
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
              <td style={{ padding: '6px 8px', textAlign: 'center', color: COLOR_EXACT, fontWeight: 600 }}>{p.exact}</td>
              <td style={{ padding: '6px 8px', textAlign: 'center', color: COLOR_CORRECT }}>{p.correct}</td>
              <td style={{ padding: '6px 8px', textAlign: 'center', color: COLOR_MISS }}>{p.miss}</td>
              <td style={{ padding: '6px 0', textAlign: 'center', color: COLOR_MARGIN }}>{p.accuracyPct}%</td>
            </tr>
          ))}
        </tbody>
      </table>
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
      <FunFacts facts={data.funFacts} />
      <Badges badges={data.badges} />

      <div style={{ marginBottom: 20 }}>
        <div style={SECTION_LABEL}>Points per game day</div>
        <div style={{ ...CARD, paddingBottom: 14 }}>
          <PointsPerDayChart data={data} />
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={SECTION_LABEL}>Rank trajectory</div>
        <div style={{ ...CARD, paddingBottom: 14 }}>
          <RankChart data={data} />
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={SECTION_LABEL}>Prediction accuracy</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <SortButton label="Exact" active={sort === 'exact'} onClick={() => setSort('exact')} />
            <SortButton label="Accuracy" active={sort === 'accuracy'} onClick={() => setSort('accuracy')} />
          </div>
        </div>
        <div style={CARD}>
          <AccuracyTable participants={data.participants} sort={sort} />
        </div>
      </div>
    </div>
  );
}
