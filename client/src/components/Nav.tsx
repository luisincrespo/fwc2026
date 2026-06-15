import { Link, useLocation } from 'react-router-dom';

const TABS = [
  { label: 'Live Leaderboard', path: '/quinielapopular/live_leaderboard' },
  { label: "Today's Matches", path: '/quinielapopular/schedule' },
];

export function Nav() {
  const { pathname } = useLocation();

  return (
    <nav style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
      {TABS.map((tab) => {
        const active = pathname === tab.path;
        return (
          <Link
            key={tab.path}
            to={tab.path}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: active ? 600 : 400,
              textDecoration: 'none',
              background: active ? '#0f172a' : 'transparent',
              color: active ? '#f1f5f9' : '#64748b',
              border: `1px solid ${active ? '#334155' : 'transparent'}`,
              transition: 'color 0.15s, background 0.15s',
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
