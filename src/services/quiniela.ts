import axios from 'axios';
import * as cache from '../cache.js';
import type { ScoringRules } from '../scoring.js';

const API_KEY = process.env.QUINIELA_POPULAR_API_KEY!;
const BASE = 'https://www.quinielapopular.com/api/play';

const client = axios.create({ baseURL: BASE });

export interface Prediction {
  game_id: number;
  stage: 'group' | 'ko';
  home_team: string;
  away_team: string;
  predicted_home: number | null;
  predicted_away: number | null;
}

export interface ParticipantStanding {
  id: number;
  name: string;
  total_points: number;
}

const FIVE_MIN = 5 * 60 * 1000;

export async function getOfficialLeaderboard(): Promise<{
  leaderboard: ParticipantStanding[];
  rules: ScoringRules;
}> {
  const cacheKey = 'quiniela:scores';
  const cached = cache.get<{ leaderboard: ParticipantStanding[]; rules: ScoringRules }>(cacheKey);
  if (cached) return cached;

  const [scoresRes, scoringRes] = await Promise.all([
    client.get(`/${API_KEY}/scores`),
    client.get(`/${API_KEY}/scoring`),
  ]);

  const leaderboard: ParticipantStanding[] = scoresRes.data.leaderboard.map(
    (p: Record<string, unknown>) => ({
      id: p['id'] as number,
      name: p['name'] as string,
      total_points: p['total_points'] as number,
    }),
  );

  const cats: Array<Record<string, unknown>> = scoringRes.data.categories;
  const byCode: Record<string, number> = {};
  for (const cat of cats) {
    byCode[cat['code'] as string] = cat['points'] as number;
  }

  const rules: ScoringRules = {
    A: byCode['A'] ?? 3,
    B: byCode['B'] ?? 3,
    D: byCode['D'] ?? 5,
    E: byCode['E'] ?? 2,
    marginFactor: Number(scoringRes.data.settings.margin_factor ?? 1),
  };

  const result = { leaderboard, rules };
  cache.set(cacheKey, result, FIVE_MIN);
  return result;
}

export async function getBracket(participantId: number): Promise<Prediction[]> {
  const cacheKey = `quiniela:bracket:${participantId}`;
  const cached = cache.get<Prediction[]>(cacheKey);
  if (cached) return cached;

  const res = await client.get(`/${API_KEY}/brackets/${participantId}`);
  const predictions: Prediction[] = res.data.predictions.map(
    (p: Record<string, unknown>) => ({
      game_id: p['game_id'] as number,
      stage: (p['stage'] as string) === 'group' ? 'group' : ('ko' as const),
      home_team: p['home_team_name'] as string,
      away_team: p['away_team_name'] as string,
      predicted_home: p['predicted_home_score'] as number | null,
      predicted_away: p['predicted_away_score'] as number | null,
    }),
  );

  // Predictions are locked for the tournament duration
  cache.set(cacheKey, predictions, 30 * 24 * 60 * 60 * 1000);
  return predictions;
}
