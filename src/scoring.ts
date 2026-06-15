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
): number {
  const { marginFactor } = rules;
  let points = 0;

  const isExact =
    predicted.home === live.home && predicted.away === live.away;

  const isCorrectOutcome =
    outcome(predicted.home, predicted.away) === outcome(live.home, live.away);

  const isWithinMargin =
    Math.abs(predicted.home - live.home) <= marginFactor &&
    Math.abs(predicted.away - live.away) <= marginFactor;

  const outcomePoints = (stage === 'group' ? rules.A : rules.B) * 2;

  if (isExact) {
    points += rules.D + outcomePoints;
  } else {
    if (isCorrectOutcome) points += outcomePoints;
    if (isWithinMargin) points += rules.E;
  }

  return points;
}
