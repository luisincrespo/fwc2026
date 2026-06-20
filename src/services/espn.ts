import axios from 'axios';
import * as cache from '../cache.js';

const ONE_MIN = 60 * 1000;

export interface EspnGoal {
  team: 'home' | 'away';
  scorer: string;
  minute: string;
  ownGoal: boolean;
  penaltyKick: boolean;
}

export interface EspnMatch {
  kickoffUtc: string;
  espnHomeTeam: string;
  espnAwayTeam: string;
  espnHomeAbbr: string;
  espnAwayAbbr: string;
  isLive: boolean;
  minute: string | null;
  homeScore: number | null;
  awayScore: number | null;
  goals: EspnGoal[];
  venue?: { name: string; city: string };
}

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

function utcDateStr(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

function parseEvents(events: Record<string, unknown>[]): EspnMatch[] {
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

    const venueRaw = comp['venue'] as Record<string, unknown> | undefined;
    const venueAddr = venueRaw?.['address'] as Record<string, string> | undefined;
    const venue = venueRaw ? { name: venueRaw['fullName'] as string, city: venueAddr?.['city'] ?? '' } : undefined;

    const homeTeam = home['team'] as Record<string, string>;
    const awayTeam = away['team'] as Record<string, string>;
    matches.push({
      kickoffUtc: event['date'] as string,
      espnHomeTeam: homeTeam['displayName'] ?? '',
      espnAwayTeam: awayTeam['displayName'] ?? '',
      espnHomeAbbr: homeTeam['abbreviation'] ?? '',
      espnAwayAbbr: awayTeam['abbreviation'] ?? '',
      isLive: state === 'in',
      minute: state === 'post' ? 'FT'
        : statusName === 'STATUS_HALFTIME' ? 'HT'
        : state === 'in' ? (status['displayClock'] as string)
        : null,
      homeScore: home['score'] != null ? Number(home['score']) : null,
      awayScore: away['score'] != null ? Number(away['score']) : null,
      goals,
      venue,
    });
  }
  return matches;
}

export async function getEspnMatches(): Promise<EspnMatch[]> {
  const today = utcDateStr(0);
  const yesterday = utcDateStr(-1);
  const cacheKey = `espn:scoreboard:${today}`;
  const cached = cache.get<EspnMatch[]>(cacheKey);
  if (cached) return cached;

  // Fetch both UTC dates so local evenings that cross midnight UTC are covered
  const [resToday, resYesterday] = await Promise.all([
    axios.get(`${BASE}?dates=${today}`),
    axios.get(`${BASE}?dates=${yesterday}`),
  ]);

  const seenKickoffs = new Set<string>();
  const matches: EspnMatch[] = [];

  for (const m of [...parseEvents(resToday.data.events ?? []), ...parseEvents(resYesterday.data.events ?? [])]) {
    if (!seenKickoffs.has(m.kickoffUtc)) {
      seenKickoffs.add(m.kickoffUtc);
      matches.push(m);
    }
  }

  cache.set(cacheKey, matches, ONE_MIN);
  return matches;
}
