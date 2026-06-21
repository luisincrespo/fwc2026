import type { ScoringRules } from '../types';

function outcome(h: number, a: number): 'H' | 'D' | 'A' {
  return h > a ? 'H' : h < a ? 'A' : 'D';
}

export function calculatePoints(
  predicted: { home: number; away: number },
  actual: { home: number; away: number },
  stage: 'group' | 'ko',
  rules: ScoringRules,
  altE = false,
): number {
  const isExact = predicted.home === actual.home && predicted.away === actual.away;
  const isCorrect = outcome(predicted.home, predicted.away) === outcome(actual.home, actual.away);
  const isMargin = altE
    ? isCorrect && (Math.abs(predicted.home - actual.home) + Math.abs(predicted.away - actual.away)) <= 1
    : Math.abs(predicted.home - actual.home) <= rules.marginFactor && Math.abs(predicted.away - actual.away) <= rules.marginFactor;
  const outcomePoints = (stage === 'group' ? rules.A : rules.B) * 2;

  if (isExact) return rules.D + outcomePoints;
  return (isCorrect ? outcomePoints : 0) + (isMargin ? rules.E : 0);
}
