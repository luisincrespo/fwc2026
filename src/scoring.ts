export interface ScoringRules {
  A: number; // correct outcome group stage
  B: number; // correct outcome KO stage
  D: number; // exact score
  E: number; // within margin factor
  marginFactor: number;
}

function outcome(h: number, a: number): 'H' | 'D' | 'A' {
  return h > a ? 'H' : h < a ? 'A' : 'D';
}

export function calculateLivePoints(
  predicted: { home: number; away: number },
  live: { home: number; away: number },
  stage: 'group' | 'ko',
  rules: ScoringRules,
  altE = false,
  teamMatchCount = 2,  // KO: how many predicted teams are in this actual game (0, 1, or 2)
): number {
  const { marginFactor } = rules;

  const isExact = predicted.home === live.home && predicted.away === live.away;
  const isCorrectOutcome = outcome(predicted.home, predicted.away) === outcome(live.home, live.away);

  const isWithinMargin = altE
    ? isCorrectOutcome && (Math.abs(predicted.home - live.home) + Math.abs(predicted.away - live.away)) <= 1
    : Math.abs(predicted.home - live.home) <= marginFactor && Math.abs(predicted.away - live.away) <= marginFactor;

  // KO: B scales by how many predicted teams appear in the actual matchup; D requires both teams to match
  const outcomePoints = stage === 'group' ? rules.A * 2 : rules.B * teamMatchCount;
  const canAwardD = stage === 'group' || teamMatchCount === 2;

  if (canAwardD && isExact) return rules.D + outcomePoints;
  return (isCorrectOutcome ? outcomePoints : 0) + (isWithinMargin ? rules.E : 0);
}
