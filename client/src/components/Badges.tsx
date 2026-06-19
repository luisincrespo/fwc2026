import type { Badge } from '../types';

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 1,
  color: '#475569',
  textTransform: 'uppercase',
  marginBottom: 8,
};

function BadgeCard({ badge }: { badge: Badge }) {
  const hasWinners = badge.winners.length > 0;
  return (
    <div style={{
      background: '#1e293b',
      borderRadius: 8,
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
    }}>
      <div style={{ fontSize: 22, lineHeight: 1 }}>{badge.emoji}</div>
      <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 13, marginTop: 4 }}>{badge.name}</div>
      <div style={{ color: '#475569', fontSize: 11 }}>{badge.description}</div>
      <div style={{ marginTop: 4, fontSize: 12 }}>
        {hasWinners
          ? <>
              {badge.winners.map((w, i) => (
                <span key={w.id}>
                  {i > 0 && ', '}
                  <span style={{ color: '#e2e8f0' }}>{w.name}</span>
                </span>
              ))}
              {badge.winners[0].detail && (
                <span style={{ color: '#475569' }}> · {badge.winners[0].detail}</span>
              )}
            </>
          : <span style={{ color: '#334155' }}>No one yet</span>
        }
      </div>
    </div>
  );
}

export function Badges({ badges }: { badges: Badge[] }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={SECTION_LABEL}>Achievements</div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
        gap: 8,
      }}>
        {badges.map((badge) => (
          <BadgeCard key={badge.id} badge={badge} />
        ))}
      </div>
    </div>
  );
}
