import type { FunFact } from '../types';

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 1,
  color: '#475569',
  textTransform: 'uppercase',
  marginBottom: 8,
};

export function FunFacts({ facts }: { facts: FunFact[] }) {
  if (!facts.length) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={SECTION_LABEL}>Fun facts</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {facts.map((fact) => (
          <div
            key={fact.id}
            style={{ background: '#1e293b', borderRadius: 8, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}
          >
            <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{fact.emoji}</span>
            <div>
              <div style={{ color: '#475569', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>
                {fact.label}
              </div>
              <div style={{ color: '#e2e8f0', fontSize: 13 }}>{fact.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
