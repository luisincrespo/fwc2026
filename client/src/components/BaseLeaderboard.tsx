import { useState, Fragment } from 'react';
import type { CSSProperties, ReactNode } from 'react';

const flashStyle = document.createElement('style');
flashStyle.textContent = `
  @keyframes flash-up   { 0%,100%{background:inherit} 30%{background:#14532d} }
  @keyframes flash-down { 0%,100%{background:inherit} 30%{background:#450a0a} }
  .flash-up   { animation: flash-up   1.5s ease-out }
  .flash-down { animation: flash-down 1.5s ease-out }
`;
document.head.appendChild(flashStyle);

export const cell: CSSProperties = {
  padding: '10px 14px',
  textAlign: 'right',
  borderBottom: '1px solid #1e293b',
};

export const headerCell: CSSProperties = {
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

export interface ColumnDef<T> {
  header: string;
  align?: 'left' | 'right';
  width?: number;
  headerStyle?: CSSProperties;
  tdStyle?: (entry: T) => CSSProperties;
  render: (entry: T, isExpanded: boolean) => ReactNode;
}

interface Props<T extends { id: number; rank: number; name: string }> {
  entries: T[];
  columns: ColumnDef<T>[];
  flashMap?: Map<number, 'up' | 'down'>;
  isExpandable?: (entry: T) => boolean;
  renderExpanded?: (entry: T) => ReactNode;
}

export function BaseLeaderboard<T extends { id: number; rank: number; name: string }>({
  entries,
  columns,
  flashMap,
  isExpandable,
  renderExpanded,
}: Props<T>) {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = search.trim()
    ? entries.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : entries;

  return (
    <div>
      <input
        type="search"
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
          boxSizing: 'border-box',
        }}
      />
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  style={{
                    ...headerCell,
                    textAlign: col.align ?? 'right',
                    ...(col.width ? { width: col.width } : {}),
                    ...col.headerStyle,
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry, i) => {
              const isExpanded = expandedId === entry.id;
              const canExpand = isExpandable?.(entry) ?? false;
              const rowBg = i % 2 === 0 ? '#131c2e' : '#0f172a';
              const flash = flashMap?.get(entry.id);
              return (
                <Fragment key={entry.id}>
                  <tr
                    className={flash ? `flash-${flash}` : undefined}
                    style={{ background: isExpanded ? '#1a2740' : rowBg, cursor: canExpand ? 'pointer' : 'default' }}
                    onClick={() => canExpand && setExpandedId((prev) => prev === entry.id ? null : entry.id)}
                  >
                    {columns.map((col, j) => (
                      <td
                        key={j}
                        style={{ ...cell, textAlign: col.align ?? 'right', ...col.tdStyle?.(entry) }}
                      >
                        {col.render(entry, isExpanded)}
                      </td>
                    ))}
                  </tr>
                  {isExpanded && renderExpanded?.(entry)}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
