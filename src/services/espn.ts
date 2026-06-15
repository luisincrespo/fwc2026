import axios from 'axios';
import * as cache from '../cache.js';

const TWO_MIN = 2 * 60 * 1000;

export interface EspnGoal {
  team: 'home' | 'away';
  scorer: string;
  minute: string;
  ownGoal: boolean;
  penaltyKick: boolean;
}

export interface EspnMatch {
  kickoffUtc: string;
  minute: string | null;
  goals: EspnGoal[];
}

export async function getEspnMatches(): Promise<EspnMatch[]> {
  const cacheKey = 'espn:scoreboard';
  const cached = cache.get<EspnMatch[]>(cacheKey);
  if (cached) return cached;

  const res = await axios.get(
    'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard',
  );

  const events: Record<string, unknown>[] = res.data.events ?? [];
  const matches: EspnMatch[] = [];

  for (const event of events) {
    const comps = event['competitions'] as Record<string, unknown>[];
    if (!comps?.length) continue;
    const comp = comps[0];

    const competitors = comp['competitors'] as Record<string, unknown>[];
    const home = competitors.find((c) => c['homeAway'] === 'home');
    const away = competitors.find((c) => c['homeAway'] === 'away');
    if (!home || !away) continue;

    const homeTeamId = (home['team'] as Record<string, string>)['id'];

    const status = comp['status'] as Record<string, unknown>;
    const statusType = status['type'] as Record<string, unknown>;
    const state = statusType['state'] as string;
    const statusName = statusType['name'] as string;

    const details = (comp['details'] as Record<string, unknown>[]) ?? [];
    const goals: EspnGoal[] = details
      .filter((d) => d['scoringPlay'] === true)
      .map((d) => {
        const scorerTeamId = (d['team'] as Record<string, string>)['id'];
        const athletes = (d['athletesInvolved'] as Record<string, string>[]) ?? [];
        return {
          team: scorerTeamId === homeTeamId ? 'home' : 'away',
          scorer: athletes[0]?.['shortName'] ?? '',
          minute: (d['clock'] as Record<string, string>)['displayValue'] ?? '',
          ownGoal: (d['ownGoal'] as boolean) ?? false,
          penaltyKick: (d['penaltyKick'] as boolean) ?? false,
        };
      });

    matches.push({
      kickoffUtc: event['date'] as string,
      minute: state === 'post' ? 'FT'
        : statusName === 'STATUS_HALFTIME' ? 'HT'
        : state === 'in' ? (status['displayClock'] as string)
        : null,
      goals,
    });
  }

  cache.set(cacheKey, matches, TWO_MIN);
  return matches;
}
