import type { GoalEvent } from '../types';

function formatSideGoals(goals: GoalEvent[]): string {
  const grouped = new Map<string, string[]>();
  for (const g of goals) {
    const suffix = g.ownGoal ? ' (og)' : g.penaltyKick ? ' (p)' : '';
    if (!grouped.has(g.scorer)) grouped.set(g.scorer, []);
    grouped.get(g.scorer)!.push(`${g.minute}${suffix}`);
  }
  return [...grouped.entries()].map(([name, minutes]) => `${name} ${minutes.map((m) => `⚽ ${m}`).join(' ')}`).join(' · ');
}

export function GoalList({ goals, color }: { goals: GoalEvent[]; color: string }) {
  const homeGoals = goals.filter((g) => g.team === 'home');
  const awayGoals = goals.filter((g) => g.team === 'away');

  return (
    <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 12, color }}>
      <span style={{ flex: 1, textAlign: 'right' }}>
        {formatSideGoals(homeGoals)}
      </span>
      <span style={{ color: `${color}66`, flexShrink: 0 }}>|</span>
      <span style={{ flex: 1 }}>
        {formatSideGoals(awayGoals)}
      </span>
    </div>
  );
}
