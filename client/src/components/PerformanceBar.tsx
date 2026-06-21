import { useState } from 'react';
import type { MatchPerformance } from '../types';
import { COLOR_EXACT, COLOR_CORRECT } from '../lib/colors';

interface Props {
  performance: MatchPerformance;
}

export function PerformanceBar({ performance }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { exact, correct, miss } = performance;

  return (
    <div
      onClick={(e) => { e.stopPropagation(); if (exact.length > 0) setExpanded((v) => !v); }}
      style={{ cursor: exact.length > 0 ? 'pointer' : 'default' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: '#64748b' }}>
          Prediction performance
        </span>
        {exact.length > 0 && (
          <span style={{ fontSize: 11, color: '#64748b' }}>{expanded ? '▲' : '▼'}</span>
        )}
      </div>

      <div style={{ display: 'flex', height: 4, borderRadius: 4, overflow: 'hidden', gap: 1 }}>
        <div style={{ flex: exact.length, background: COLOR_EXACT, minWidth: exact.length > 0 ? 2 : 0 }} />
        <div style={{ flex: correct.length, background: COLOR_CORRECT, minWidth: correct.length > 0 ? 2 : 0 }} />
        <div style={{ flex: miss.length, background: '#334155', minWidth: miss.length > 0 ? 2 : 0 }} />
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 5, fontSize: 12 }}>
        <span style={{ color: COLOR_EXACT }}>⭐ Exact {exact.length} ({Math.round(exact.length / performance.total * 100)}%)</span>
        <span style={{ color: COLOR_CORRECT }}>✓ Correct {correct.length} ({Math.round(correct.length / performance.total * 100)}%)</span>
        <span style={{ color: '#64748b' }}>✗ Miss {miss.length} ({Math.round(miss.length / performance.total * 100)}%)</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 8, fontSize: 12, color: COLOR_EXACT }}>
          {exact.map((e) => e.name).join(' · ')}
        </div>
      )}
    </div>
  );
}
