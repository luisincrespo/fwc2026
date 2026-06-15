import axios from 'axios';
import * as cache from '../cache.js';

const client = axios.create({
  baseURL: 'https://api.football-data.org/v4',
  headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_TOKEN },
});

export interface LiveMatch {
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  utcDate: string;
}

function isLikelyStillLive(utcDate: string): boolean {
  const elapsed = (Date.now() - new Date(utcDate).getTime()) / 1000 / 60;
  return elapsed < 110;
}

const FIVE_MIN = 5 * 60 * 1000;
const TWO_MIN = 2 * 60 * 1000;

export async function getLiveMatches(): Promise<LiveMatch[]> {
  const cacheKey = 'footballdata:live';
  const cached = cache.get<LiveMatch[]>(cacheKey);
  if (cached) return cached;

  const res = await client.get('/competitions/WC/matches', {
    params: { status: 'LIVE' },
  });

  const matches: LiveMatch[] = res.data.matches
    .filter((m: Record<string, unknown>) => isLikelyStillLive(m['utcDate'] as string))
    .map((m: Record<string, unknown>) => {
      const home = m['homeTeam'] as Record<string, string>;
      const away = m['awayTeam'] as Record<string, string>;
      const score = m['score'] as Record<string, Record<string, number | null>>;
      return {
        homeTeam: home['name'],
        awayTeam: away['name'],
        homeGoals: score?.['fullTime']?.['home'] ?? 0,
        awayGoals: score?.['fullTime']?.['away'] ?? 0,
        utcDate: m['utcDate'] as string,
      };
    });

  cache.set(cacheKey, matches, TWO_MIN);
  return matches;
}
