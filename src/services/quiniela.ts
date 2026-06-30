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

export interface BreakdownEntry {
  game_id: number;
  scheduled_at: string;
  home_team: string;
  away_team: string;
  home_code: string;
  away_code: string;
  predicted_home: number;
  predicted_away: number;
  actual_home: number;
  actual_away: number;
  points: number;
  categories_awarded: string[];
}

export interface ParticipantWithBreakdown extends ParticipantStanding {
  breakdown: BreakdownEntry[];
}

function parseScoringRules(scoringRes: Record<string, unknown>): ScoringRules {
  const cats = scoringRes['categories'] as Array<Record<string, unknown>>;
  const byCode: Record<string, number> = {};
  for (const cat of cats) byCode[cat['code'] as string] = cat['points'] as number;
  const settings = scoringRes['settings'] as Record<string, unknown>;
  return {
    A: byCode['A'] ?? 3,
    B: byCode['B'] ?? 3,
    D: byCode['D'] ?? 5,
    E: byCode['E'] ?? 2,
    marginFactor: Number(settings['margin_factor'] ?? 1),
  };
}

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

  const result = { leaderboard, rules: parseScoringRules(scoringRes.data) };
  cache.set(cacheKey, result, FIVE_MIN);
  return result;
}

export async function getLeaderboardWithBreakdown(): Promise<{
  participants: ParticipantWithBreakdown[];
  rules: ScoringRules;
}> {
  const cacheKey = 'quiniela:scores:full';
  const cached = cache.get<{ participants: ParticipantWithBreakdown[]; rules: ScoringRules }>(cacheKey);
  if (cached) return cached;

  const [scoresRes, scoringRes] = await Promise.all([
    client.get(`/${API_KEY}/scores`),
    client.get(`/${API_KEY}/scoring`),
  ]);

  const participants: ParticipantWithBreakdown[] = scoresRes.data.leaderboard.map(
    (p: Record<string, unknown>) => ({
      id: p['id'] as number,
      name: p['name'] as string,
      total_points: p['total_points'] as number,
      breakdown: ((p['breakdown'] as unknown[]) ?? []).map((g) => {
        const r = g as Record<string, unknown>;
        return {
          game_id: r['game_id'] as number,
          scheduled_at: r['scheduled_at'] as string,
          home_team: r['home_team'] as string,
          away_team: r['away_team'] as string,
          home_code: r['home_code'] as string,
          away_code: r['away_code'] as string,
          predicted_home: r['predicted_home'] as number,
          predicted_away: r['predicted_away'] as number,
          actual_home: r['actual_home'] as number,
          actual_away: r['actual_away'] as number,
          points: r['points'] as number,
          categories_awarded: (r['categories_awarded'] as string[]) ?? [],
        };
      }),
    }),
  );

  const result = { participants, rules: parseScoringRules(scoringRes.data) };
  cache.set(cacheKey, result, FIVE_MIN);
  return result;
}

export interface UpcomingPrediction {
  game_id: number;
  predicted_home: number;
  predicted_away: number;
}

export async function getUpcoming(participantId: number): Promise<UpcomingPrediction[]> {
  const cacheKey = `quiniela:upcoming:${participantId}`;
  const cached = cache.get<UpcomingPrediction[]>(cacheKey);
  if (cached) return cached;

  const res = await client.get(`/${API_KEY}/upcoming/${participantId}`);
  const games: UpcomingPrediction[] = ((res.data.games as unknown[]) ?? []).map((g) => {
    const r = g as Record<string, unknown>;
    return {
      game_id: r['game_id'] as number,
      predicted_home: r['predicted_home'] as number,
      predicted_away: r['predicted_away'] as number,
    };
  });

  cache.set(cacheKey, games, FIVE_MIN);
  return games;
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

  // Group stage predictions are locked; KO predictions are submitted round-by-round.
  const hasNullPreds = predictions.some((p) => p.predicted_home == null);
  const ttl = hasNullPreds ? 5 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  cache.set(cacheKey, predictions, ttl);
  return predictions;
}

export interface QuinielaGame {
  game_id: number;
  stage: string;
  group_letter: string | null;
  scheduled_at: string;
  is_completed: number;
  actual_home_score: number | null;
  actual_away_score: number | null;
  home_team_name: string;
  away_team_name: string;
  home_flag: string;
  away_flag: string;
}

export async function getGames(): Promise<QuinielaGame[]> {
  const cacheKey = 'quiniela:games';
  const cached = cache.get<QuinielaGame[]>(cacheKey);
  if (cached) return cached;

  const res = await client.get(`/${API_KEY}/games`);
  const games: QuinielaGame[] = res.data.games.map((g: Record<string, unknown>) => ({
    game_id: g['game_id'] as number,
    stage: g['stage'] as string,
    group_letter: (g['group_letter'] as string | null) ?? null,
    scheduled_at: g['scheduled_at'] as string,
    is_completed: g['is_completed'] as number,
    actual_home_score: g['actual_home_score'] as number | null,
    actual_away_score: g['actual_away_score'] as number | null,
    // KO games use resolved_* when the matchup is known but not yet started
    home_team_name: (g['home_team_name'] ?? g['resolved_home_name']) as string,
    away_team_name: (g['away_team_name'] ?? g['resolved_away_name']) as string,
    home_flag: (g['home_flag'] ?? g['resolved_home_flag']) as string,
    away_flag: (g['away_flag'] ?? g['resolved_away_flag']) as string,
  }));

  cache.set(cacheKey, games, FIVE_MIN);
  return games;
}
