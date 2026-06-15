import { useEffect, useState } from 'react';
import { fetchSchedule } from '../api';
import type { ScheduledMatch, ScheduleResponse } from '../types';
import { Nav } from './Nav';

const POLL_INTERVAL = 5 * 60 * 1000;

function statusBadge(status: ScheduledMatch['status']) {
  if (status === 'LIVE') {
    return (
      <span
        style={{
          background: '#166534',
          color: '#86efac',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1,
          padding: '2px 8px',
          borderRadius: 4,
        }}
      >
        ⚽ LIVE
      </span>
    );
  }
  if (status === 'FINISHED') {
    return (
      <span style={{ color: '#475569', fontSize: 12 }}>Final</span>
    );
  }
  return null;
}

function MatchCard({ match }: { match: ScheduledMatch }) {
  const kickoff = new Date(match.kickoffUtc);
  const timeStr = kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isDecided = match.status === 'LIVE' || match.status === 'FINISHED';

  return (
    <div
      style={{
        background: '#1e293b',
        borderRadius: 8,
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      {/* Home team */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 14, color: '#f1f5f9', textAlign: 'right' }}>{match.homeTeam}</span>
        {match.homeCrest && (
          <img
            src={match.homeCrest}
            alt={match.homeTeam}
            width={28}
            height={28}
            style={{ objectFit: 'contain' }}
          />
        )}
      </div>

      {/* Score / time */}
      <div style={{ textAlign: 'center', minWidth: 80 }}>
        {isDecided ? (
          <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', letterSpacing: 2 }}>
            {match.homeGoals} – {match.awayGoals}
          </div>
        ) : (
          <div style={{ fontSize: 15, fontWeight: 600, color: '#94a3b8' }}>{timeStr}</div>
        )}
        <div style={{ marginTop: 4 }}>{statusBadge(match.status)}</div>
        {match.status === 'UPCOMING' && (
          <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>local time</div>
        )}
      </div>

      {/* Away team */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
        {match.awayCrest && (
          <img
            src={match.awayCrest}
            alt={match.awayTeam}
            width={28}
            height={28}
            style={{ objectFit: 'contain' }}
          />
        )}
        <span style={{ fontSize: 14, color: '#f1f5f9' }}>{match.awayTeam}</span>
      </div>
    </div>
  );
}

function groupByStatus(matches: ScheduledMatch[]) {
  const live = matches.filter((m) => m.status === 'LIVE');
  const upcoming = matches.filter((m) => m.status === 'UPCOMING');
  const finished = matches.filter((m) => m.status === 'FINISHED');
  return { live, upcoming, finished };
}

function Section({ title, matches }: { title: string; matches: ScheduledMatch[] }) {
  if (matches.length === 0) return null;
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1, color: '#64748b', textTransform: 'uppercase', marginBottom: 10 }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {matches.map((m, i) => <MatchCard key={i} match={m} />)}
      </div>
    </div>
  );
}

export function Schedule() {
  const [data, setData] = useState<ScheduleResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const result = await fetchSchedule();
        setData(result);
        setError(null);
      } catch {
        setError('Failed to load schedule. Retrying soon…');
      } finally {
        setLoading(false);
      }
    }

    load();
    const id = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const today = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  const groups = data ? groupByStatus(data.matches) : null;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Quiniela Popular</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
            World Cup 2026 — {today}
          </p>
        </div>
        {data && (
          <div style={{ textAlign: 'right', fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
            <div>Updated {new Date(data.updatedAt).toLocaleTimeString()}</div>
            <div>Refreshes every 5 min</div>
          </div>
        )}
      </div>

      <Nav />

      {loading && <p style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>Loading…</p>}
      {error && <p style={{ color: '#ef4444', textAlign: 'center', padding: 20 }}>{error}</p>}

      {groups && (
        <>
          {groups.live.length === 0 && groups.upcoming.length === 0 && groups.finished.length === 0 && (
            <p style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>No matches scheduled for today.</p>
          )}
          <Section title="Live" matches={groups.live} />
          <Section title="Upcoming" matches={groups.upcoming} />
          <Section title="Finished" matches={groups.finished} />
        </>
      )}
    </div>
  );
}
