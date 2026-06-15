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

export interface ScheduledMatch {
  homeTeam: string;
  awayTeam: string;
  homeCrest: string;
  awayCrest: string;
  kickoffUtc: string;
  status: 'UPCOMING' | 'LIVE' | 'FINISHED';
  homeGoals: number | null;
  awayGoals: number | null;
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
      const goals = m['goals'] as Record<string, number | null>;
      return {
        homeTeam: home['name'],
        awayTeam: away['name'],
        homeGoals: goals['home'] ?? 0,
        awayGoals: goals['away'] ?? 0,
        utcDate: m['utcDate'] as string,
      };
    });

  cache.set(cacheKey, matches, TWO_MIN);
  return matches;
}

export async function getScheduledMatches(): Promise<ScheduledMatch[]> {
  const cacheKey = 'footballdata:schedule';
  const cached = cache.get<ScheduledMatch[]>(cacheKey);
  if (cached) return cached;

  const today = new Date().toISOString().slice(0, 10);
  const res = await client.get('/competitions/WC/matches', {
    params: { dateFrom: today, dateTo: today },
  });

  const matches: ScheduledMatch[] = res.data.matches.map((m: Record<string, unknown>) => {
    const home = m['homeTeam'] as Record<string, string>;
    const away = m['awayTeam'] as Record<string, string>;
    const score = m['score'] as Record<string, Record<string, number | null>>;
    const rawStatus = m['status'] as string;

    let status: ScheduledMatch['status'];
    if (rawStatus === 'FINISHED') status = 'FINISHED';
    else if (rawStatus === 'IN_PLAY' || rawStatus === 'PAUSED') status = 'LIVE';
    else status = 'UPCOMING';

    return {
      homeTeam: home['name'],
      awayTeam: away['name'],
      homeCrest: home['crest'] ?? '',
      awayCrest: away['crest'] ?? '',
      kickoffUtc: m['utcDate'] as string,
      status,
      homeGoals: score?.['fullTime']?.['home'] ?? null,
      awayGoals: score?.['fullTime']?.['away'] ?? null,
    };
  });

  cache.set(cacheKey, matches, FIVE_MIN);
  return matches;
}
