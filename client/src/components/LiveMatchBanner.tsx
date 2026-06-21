import type { LiveMatch } from '../types';
import { Matchup } from './Matchup';
import { PerformanceBar } from './PerformanceBar';
import { VenueLabel } from './VenueLabel';
import { GoalList } from './GoalList';
import { COLOR_SIMULATION, COLOR_CORRECT } from '../lib/colors';

export type HypoScores = Record<string, { home: number; away: number }>;

interface Props {
  matches: LiveMatch[];
  hypo: HypoScores;
  onAdjust: (key: string, home: number, away: number) => void;
  onReset: () => void;
}

function AdjustBtn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 22, height: 22,
        borderRadius: 4,
        border: '1px solid #334155',
        background: disabled ? 'transparent' : '#1e293b',
        color: disabled ? '#334155' : '#94a3b8',
        fontSize: 14,
        lineHeight: 1,
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

export function LiveMatchBanner({ matches, hypo, onAdjust, onReset }: Props) {
  const isSimulating = Object.keys(hypo).length > 0;

  const label = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#475569', textTransform: 'uppercase' }}>
        Live games
      </div>
      {isSimulating && (
        <>
          <span style={{ fontSize: 11, fontWeight: 600, color: COLOR_SIMULATION, background: '#0c1a2e', border: '1px solid #1e3a5f', borderRadius: 4, padding: '1px 6px' }}>
            Simulating
          </span>
          <button
            onClick={onReset}
            style={{ fontSize: 11, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
          >
            Reset
          </button>
        </>
      )}
    </div>
  );

  if (matches.length === 0) {
    return (
      <div style={{ marginBottom: 20 }}>
        {label}
        <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, color: '#64748b', fontSize: 14 }}>
          <span>⏸</span>
          <span style={{ color: '#94a3b8' }}>No live matches right now — leaderboard shows official standings.</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 20 }}>
      {label}
      <style>{`
        @keyframes livePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        .live-minute { animation: livePulse 2s ease-in-out infinite; }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {matches.map((m, i) => {
          const key = `${m.homeTeam}|${m.awayTeam}`;
          const hypoHome = hypo[key]?.home ?? m.homeGoals;
          const hypoAway = hypo[key]?.away ?? m.awayGoals;
          const changed = hypoHome !== m.homeGoals || hypoAway !== m.awayGoals;

          return (
            <div
              key={i}
              style={{
                background: '#1e293b',
                borderRadius: 8,
                padding: '10px 16px',
                borderLeft: `3px solid ${changed ? COLOR_SIMULATION : COLOR_CORRECT}`,
                fontSize: 14,
                color: '#cbd5e1',
              }}
            >
              {m.venue && <VenueLabel venue={m.venue} />}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                <Matchup
                  variant="inline"
                  homeTeam={m.homeTeam} awayTeam={m.awayTeam}
                  homeCode={m.homeCode} awayCode={m.awayCode}
                />
                {m.minute && (
                  <span className="live-minute" style={{ fontSize: 11, color: COLOR_CORRECT }}>
                    {m.minute}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <AdjustBtn onClick={() => onAdjust(key, hypoHome - 1, hypoAway)} disabled={hypoHome <= m.homeGoals}>−</AdjustBtn>
                <span style={{ fontWeight: 700, fontSize: 20, color: changed ? COLOR_SIMULATION : '#f1f5f9', letterSpacing: 2, minWidth: 16, textAlign: 'center' }}>
                  {hypoHome}
                </span>
                <AdjustBtn onClick={() => onAdjust(key, hypoHome + 1, hypoAway)}>+</AdjustBtn>
                <span style={{ color: '#475569', margin: '0 6px', fontSize: 18 }}>–</span>
                <AdjustBtn onClick={() => onAdjust(key, hypoHome, hypoAway - 1)} disabled={hypoAway <= m.awayGoals}>−</AdjustBtn>
                <span style={{ fontWeight: 700, fontSize: 20, color: changed ? COLOR_SIMULATION : '#f1f5f9', letterSpacing: 2, minWidth: 16, textAlign: 'center' }}>
                  {hypoAway}
                </span>
                <AdjustBtn onClick={() => onAdjust(key, hypoHome, hypoAway + 1)}>+</AdjustBtn>
              </div>
              {m.goals.length > 0 && <GoalList goals={m.goals} color="#86efac" />}
              {m.performance && m.performance.total > 0 && (
                <div style={{ margin: '10px -16px -10px', padding: '10px 16px', borderTop: '1px solid #0f172a' }}>
                  <PerformanceBar performance={m.performance} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
