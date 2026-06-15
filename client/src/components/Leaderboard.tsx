import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { LeaderboardEntry, LivePrediction } from '../types';
import { RankDelta } from './RankDelta';
import { Flag } from './Flag';

const flashStyle = document.createElement('style');
flashStyle.textContent = `
  @keyframes flash-up   { 0%,100%{background:inherit} 30%{background:#14532d} }
  @keyframes flash-down { 0%,100%{background:inherit} 30%{background:#450a0a} }
  .flash-up   { animation: flash-up   1.5s ease-out }
  .flash-down { animation: flash-down 1.5s ease-out }
`;
document.head.appendChild(flashStyle);

interface Props {
  entries: LeaderboardEntry[];
  hasLive: boolean;
  flashMap: Map<number, 'up' | 'down'>;
}

const cell: CSSProperties = {
  padding: '10px 14px',
  textAlign: 'right',
  borderBottom: '1px solid #1e293b',
};

const headerCell: CSSProperties = {
  ...cell,
  color: '#94a3b8',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 1,
  textTransform: 'uppercase',
  background: '#0f172a',
  position: 'sticky',
  top: 0,
};

function PredictionRow({ pred }: { pred: LivePrediction }) {
  const isExact = pred.predictedHome === pred.liveHome && pred.predictedAway === pred.liveAway;
  return (
    <tr style={{ background: '#0a1628' }}>
      <td colSpan={6} style={{ padding: '8px 14px 8px 40px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 13, color: '#94a3b8' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Flag code={pred.homeCode} size={16} /> {pred.homeTeam} vs {pred.awayTeam} <Flag code={pred.awayCode} size={16} />
          </span>
          <span>
            Live: <strong style={{ color: '#e2e8f0' }}>{pred.liveHome}–{pred.liveAway}</strong>
          </span>
          <span>
            Prediction:{' '}
            <strong style={{ color: isExact ? '#4ade80' : '#e2e8f0' }}>
              {pred.predictedHome}–{pred.predictedAway}
            </strong>
          </span>
          <span style={{ color: pred.points > 0 ? '#4ade80' : '#475569', fontWeight: 600 }}>
            {pred.points > 0 ? `+${pred.points} pts` : '0 pts'}
          </span>
        </div>
      </td>
    </tr>
  );
}

export function Leaderboard({ entries, hasLive, flashMap }: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const toggle = (id: number) => setExpandedId((prev) => (prev === id ? null : id));

  const filtered = search.trim()
    ? entries.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : entries;

  return (
    <div>
      <input
        type="text"
        placeholder="Search participant…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%',
          marginBottom: 12,
          padding: '8px 12px',
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 6,
          color: '#e2e8f0',
          fontSize: 14,
          outline: 'none',
        }}
      />
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr>
            <th style={{ ...headerCell, textAlign: 'left', width: 48 }}>#</th>
            <th style={{ ...headerCell, textAlign: 'left' }}>Name</th>
            <th style={headerCell}>Official</th>
            {hasLive && <th style={{ ...headerCell, color: '#4ade80' }}>Live +</th>}
            <th style={headerCell}>Live Score</th>
            <th style={headerCell}>Δ</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((entry, i) => {
            const isTop3 = entry.rank <= 3;
            const isExpanded = expandedId === entry.id;
            const canExpand = hasLive && entry.liveBreakdown.length > 0;
            const rowBg = i % 2 === 0 ? '#131c2e' : '#0f172a';
            const flash = flashMap.get(entry.id);

            return (
              <>
                <tr
                  key={entry.id}
                  className={flash ? `flash-${flash}` : undefined}
                  style={{
                    background: isExpanded ? '#1a2740' : rowBg,
                    cursor: canExpand ? 'pointer' : 'default',
                  }}
                  onClick={() => canExpand && toggle(entry.id)}
                >
                  <td
                    style={{
                      ...cell,
                      textAlign: 'left',
                      fontWeight: isTop3 ? 700 : 400,
                      color:
                        entry.rank === 1
                          ? '#fbbf24'
                          : entry.rank === 2
                            ? '#94a3b8'
                            : entry.rank === 3
                              ? '#cd7f32'
                              : '#e2e8f0',
                    }}
                  >
                    {entry.rank}
                  </td>
                  <td style={{ ...cell, textAlign: 'left', fontWeight: isTop3 ? 600 : 400 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {entry.name}
                      {canExpand && (
                        <span style={{ color: '#475569', fontSize: 11 }}>
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      )}
                    </span>
                  </td>
                  <td style={{ ...cell, color: '#94a3b8' }}>{entry.officialPoints}</td>
                  {hasLive && (
                    <td
                      style={{
                        ...cell,
                        color: entry.livePoints > 0 ? '#4ade80' : '#475569',
                        fontWeight: entry.livePoints > 0 ? 700 : 400,
                      }}
                    >
                      {entry.livePoints > 0 ? `+${entry.livePoints}` : '—'}
                    </td>
                  )}
                  <td style={{ ...cell, fontWeight: 700 }}>{entry.totalPoints}</td>
                  <td style={cell}>
                    <RankDelta delta={entry.rankDelta} />
                  </td>
                </tr>
                {isExpanded &&
                  entry.liveBreakdown.map((pred, j) => (
                    <PredictionRow key={j} pred={pred} />
                  ))}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
    </div>
  );
}
