// ESPN uses 3-letter FIFA/IOC abbreviations; quiniela flags are ISO 3166-1 alpha-2
// (or flagcdn.com subdivision codes for UK nations).
// Entries only needed where the first two letters of the FIFA code ≠ the flag code.
export const FIFA_TO_ISO2: Record<string, string> = {
  // Africa
  ALG: 'dz', ANG: 'ao', COD: 'cd', CON: 'cg', GNB: 'gw', MOZ: 'mz',
  RSA: 'za', SEN: 'sn', TUN: 'tn', ZAM: 'zm', ZIM: 'zw',
  // Asia
  IRN: 'ir', KOR: 'kr', PHI: 'ph',
  // Europe
  BIH: 'ba', CRO: 'hr', DEN: 'dk', ENG: 'gb-eng', GER: 'de', NED: 'nl',
  NIR: 'gb-nir', POL: 'pl', POR: 'pt', SCO: 'gb-sct', SLO: 'si', SRB: 'rs',
  SUI: 'ch', SVK: 'sk', SWE: 'se', UKR: 'ua', WAL: 'gb-wls',
  // Middle East / Asia
  KSA: 'sa',
  // North & Central America / Caribbean
  CUW: 'cw', GUA: 'gt', HAI: 'ht', HON: 'hn', JAM: 'jm', MEX: 'mx', SLV: 'sv', TRI: 'tt',
  // South America
  CHI: 'cl', PAR: 'py', URU: 'uy',
};

export function espnAbbrToIso2(abbr: string): string {
  const upper = abbr.toUpperCase();
  return (FIFA_TO_ISO2[upper] ?? abbr.slice(0, 2)).toLowerCase();
}

// Returns true when ESPN has home/away swapped relative to quiniela.
export function isEspnFlipped(espnHomeAbbr: string, espnAwayAbbr: string, quinielaHomeFlag: string): boolean {
  const flag = quinielaHomeFlag.toLowerCase();
  if (espnAbbrToIso2(espnHomeAbbr) === flag) return false;
  if (espnAbbrToIso2(espnAwayAbbr) === flag) return true;
  return false;
}

// Build a flag-pair → quiniela game map: each team pair plays exactly once.
// Both orderings are stored so ESPN's home/away order doesn't matter.
// Games with null flags (knockout rounds before bracket is filled) are skipped — use
// buildQuinielaByTeamNames as a fallback for those.
export function buildQuinielaByFlags<T extends { home_flag: string | null; away_flag: string | null }>(games: T[]): Map<string, T> {
  const m = new Map<string, T>();
  for (const g of games) {
    if (!g.home_flag || !g.away_flag) continue;
    const h = g.home_flag.toLowerCase();
    const a = g.away_flag.toLowerCase();
    m.set(`${h}|${a}`, g);
    m.set(`${a}|${h}`, g);
  }
  return m;
}

// Fallback for knockout games where quiniela has null flags but known team names.
export function buildQuinielaByTeamNames<T extends { home_team_name: string | null; away_team_name: string | null; home_flag: string | null; away_flag: string | null }>(games: T[]): Map<string, T> {
  const m = new Map<string, T>();
  for (const g of games) {
    if (g.home_flag && g.away_flag) continue; // already covered by buildQuinielaByFlags
    if (!g.home_team_name || !g.away_team_name) continue;
    const h = g.home_team_name.toLowerCase();
    const a = g.away_team_name.toLowerCase();
    m.set(`${h}|${a}`, g);
    m.set(`${a}|${h}`, g);
  }
  return m;
}

// Build a flag-pair → ESPN match map (reverse direction).
export function buildEspnByFlags<T extends { espnHomeAbbr: string; espnAwayAbbr: string }>(matches: T[]): Map<string, T> {
  const m = new Map<string, T>();
  for (const e of matches) {
    const h = espnAbbrToIso2(e.espnHomeAbbr);
    const a = espnAbbrToIso2(e.espnAwayAbbr);
    m.set(`${h}|${a}`, e);
    m.set(`${a}|${h}`, e);
  }
  return m;
}

// Fallback ESPN lookup by display team name for schedule handler when quiniela flags are null.
export function buildEspnByTeamNames<T extends { espnHomeTeam: string; espnAwayTeam: string }>(matches: T[]): Map<string, T> {
  const m = new Map<string, T>();
  for (const e of matches) {
    const h = e.espnHomeTeam.toLowerCase();
    const a = e.espnAwayTeam.toLowerCase();
    m.set(`${h}|${a}`, e);
    m.set(`${a}|${h}`, e);
  }
  return m;
}

// Deduplicate ESPN matches by kickoff + team identity so simultaneous games are both kept,
// while the same game appearing in both today's and yesterday's fetch is collapsed to one.
export function deduplicateEspnMatches<T extends { kickoffUtc: string; espnHomeAbbr: string; espnAwayAbbr: string }>(matches: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const m of matches) {
    const key = `${m.kickoffUtc}|${m.espnHomeAbbr}|${m.espnAwayAbbr}`;
    if (!seen.has(key)) { seen.add(key); result.push(m); }
  }
  return result;
}
