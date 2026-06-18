import type { GoalEvent } from '../types';

function groupGoals(goals: GoalEvent[]): { name: string; minutes: string[] }[] {
  const grouped = new Map<string, string[]>();
  for (const g of goals) {
    const suffix = g.ownGoal ? ' (og)' : g.penaltyKick ? ' (p)' : '';
    if (!grouped.has(g.scorer)) grouped.set(g.scorer, []);
    grouped.get(g.scorer)!.push(`${g.minute}${suffix}`);
  }
  return [...grouped.entries()].map(([name, minutes]) => ({ name, minutes }));
}

function SideGoals({ goals, align }: { goals: GoalEvent[]; align: 'left' | 'right' }) {
  const entries = groupGoals(goals);
  return (
    <span style={{ flex: 1, minWidth: 0, textAlign: align, display: 'block' }}>
      {entries.flatMap((e, i) => {
        const el = (
          <span key={e.name} style={{ whiteSpace: 'nowrap' }}>
            {e.name} {e.minutes.map((m) => `⚽ ${m}`).join(' ')}
          </span>
        );
        return i === 0 ? [el] : [' · ', el];
      })}
    </span>
  );
}

export function GoalList({ goals, color }: { goals: GoalEvent[]; color: string }) {
  const homeGoals = goals.filter((g) => g.team === 'home');
  const awayGoals = goals.filter((g) => g.team === 'away');

  return (
    <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 12, color }}>
      <SideGoals goals={homeGoals} align="right" />
      <span style={{ color: `${color}66`, flexShrink: 0 }}>|</span>
      <SideGoals goals={awayGoals} align="left" />
    </div>
  );
}
