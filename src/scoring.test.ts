import { describe, it, expect } from 'vitest';
import { calculateLivePoints } from './scoring.js';

// Scoring rules matching the actual quiniela config
const rules = { A: 3, B: 3, D: 5, E: 2, marginFactor: 1 };

// Shorthand: pts(pred, actual, altE?)
function pts(pred: [number, number], actual: [number, number], altE = false) {
  return calculateLivePoints(
    { home: pred[0], away: pred[1] },
    { home: actual[0], away: actual[1] },
    'group',
    rules,
    altE,
  );
}

describe('exact score', () => {
  it('awards D + outcome points (11 pts group)', () => {
    expect(pts([2, 1], [2, 1])).toBe(11);
  });

  it('alt rule: exact score still awards full points', () => {
    expect(pts([2, 1], [2, 1], true)).toBe(11);
  });
});

describe('official E rule', () => {
  it('awards outcome + E when correct outcome and each side within 1', () => {
    // pred 1-0 vs actual 2-0: correct (H), |1-2|=1 ≤ 1, |0-0|=0 ≤ 1 → 6+2=8
    expect(pts([1, 0], [2, 0])).toBe(8);
  });

  it('awards E even with WRONG outcome when each side within 1', () => {
    // pred 1-0 vs actual 0-1: wrong outcome (H vs A), each within 1 → 0+2=2
    expect(pts([1, 0], [0, 1])).toBe(2);
  });

  it('awards outcome only when correct outcome but total error = 2 (each side = 1)', () => {
    // pred 2-0 vs actual 3-1: correct (H), |2-3|=1 ≤ 1, |0-1|=1 ≤ 1 → 6+2=8
    // Both sides within 1, so E IS awarded under official rules
    expect(pts([2, 0], [3, 1])).toBe(8);
  });

  it('awards outcome only when correct outcome and a side exceeds margin', () => {
    // pred 1-0 vs actual 3-0: correct (H), |1-3|=2 > 1 → 6+0=6
    expect(pts([1, 0], [3, 0])).toBe(6);
  });

  it('awards 0 when wrong outcome and outside margin', () => {
    expect(pts([2, 0], [0, 2])).toBe(0);
  });

  it('awards 0 for complete miss', () => {
    expect(pts([3, 0], [0, 3])).toBe(0);
  });
});

describe('alt E rule', () => {
  it('awards outcome + E when correct outcome and total error = 1', () => {
    // pred 1-0 vs actual 2-0: correct (H), total error = 1 → 6+2=8
    expect(pts([1, 0], [2, 0], true)).toBe(8);
  });

  it('awards outcome only when correct outcome but total error = 2 (each side = 1)', () => {
    // pred 2-0 vs actual 3-1: correct (H), total error = |2-3|+|0-1| = 2 → 6+0=6
    // KEY DIFFERENCE vs official rule which would give 8
    expect(pts([2, 0], [3, 1], true)).toBe(6);
  });

  it('awards 0 E when wrong outcome even if total error = 1', () => {
    // pred 1-0 vs actual 0-0: wrong outcome (H vs D), total error = 1 → 0+0=0
    expect(pts([1, 0], [0, 0], true)).toBe(0);
  });

  it('awards 0 when wrong outcome even if each side within 1', () => {
    // pred 1-0 vs actual 0-1: wrong outcome (H vs A), official gives 2 pts, alt gives 0
    expect(pts([1, 0], [0, 1], true)).toBe(0);
  });

  it('awards 0 for complete miss', () => {
    expect(pts([3, 0], [0, 3], true)).toBe(0);
  });
});

describe('official vs alt E rule: key differences', () => {
  it('both-sides-within-1 with wrong outcome: official gives E, alt gives 0', () => {
    // pred 1-0 vs actual 0-1 (each within 1, wrong outcome)
    expect(pts([1, 0], [0, 1])).toBe(2);        // official: E awarded
    expect(pts([1, 0], [0, 1], true)).toBe(0);  // alt: no E (wrong outcome)
  });

  it('each-side-within-1 correct outcome total-error-2: official gives E, alt does not', () => {
    // pred 2-0 vs actual 3-1 (each within 1, correct H outcome, total error = 2)
    expect(pts([2, 0], [3, 1])).toBe(8);        // official: E awarded
    expect(pts([2, 0], [3, 1], true)).toBe(6);  // alt: no E (total error = 2)
  });
});

describe('KO stage', () => {
  it('KO exact score awards same points as group (A=B=3)', () => {
    const koPoints = calculateLivePoints({ home: 1, away: 0 }, { home: 1, away: 0 }, 'ko', rules);
    expect(koPoints).toBe(11);
  });
});
