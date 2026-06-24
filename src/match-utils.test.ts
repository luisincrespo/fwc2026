import { describe, it, expect } from 'vitest';
import {
  espnAbbrToIso2,
  isEspnFlipped,
  buildQuinielaByFlags,
  buildEspnByFlags,
  deduplicateEspnMatches,
} from './match-utils.js';

describe('espnAbbrToIso2', () => {
  it('maps BIH → ba (Bosnia regression)', () => {
    expect(espnAbbrToIso2('BIH')).toBe('ba');
  });

  it('maps UK nations to flagcdn.com subdivision codes', () => {
    expect(espnAbbrToIso2('SCO')).toBe('gb-sco');
    expect(espnAbbrToIso2('ENG')).toBe('gb-eng');
    expect(espnAbbrToIso2('WAL')).toBe('gb-wls');
    expect(espnAbbrToIso2('NIR')).toBe('gb-nir');
  });

  it('maps CONCACAF teams whose first-2-chars would be wrong', () => {
    expect(espnAbbrToIso2('HAI')).toBe('ht');  // 'ha' ≠ 'ht'
    expect(espnAbbrToIso2('HON')).toBe('hn');  // 'ho' ≠ 'hn'
    expect(espnAbbrToIso2('GUA')).toBe('gt');  // 'gu' ≠ 'gt'
    expect(espnAbbrToIso2('TRI')).toBe('tt');  // 'tr' would be Turkey!
    expect(espnAbbrToIso2('SLV')).toBe('sv');  // 'sl' would be Sierra Leone!
  });

  it('maps European teams whose first-2-chars would be wrong', () => {
    expect(espnAbbrToIso2('SRB')).toBe('rs');  // 'sr' would be Suriname!
    expect(espnAbbrToIso2('POL')).toBe('pl');  // 'po' ≠ 'pl'
    expect(espnAbbrToIso2('UKR')).toBe('ua');  // 'uk' ≠ 'ua'
  });

  it('maps Saudi Arabia ESPN code to sa', () => {
    expect(espnAbbrToIso2('KSA')).toBe('sa');  // 'ks' ≠ 'sa'
  });

  it('maps explicit table entries correctly', () => {
    expect(espnAbbrToIso2('GER')).toBe('de');
    expect(espnAbbrToIso2('POR')).toBe('pt');
    expect(espnAbbrToIso2('NED')).toBe('nl');
    expect(espnAbbrToIso2('KOR')).toBe('kr');
    expect(espnAbbrToIso2('CRO')).toBe('hr');
    expect(espnAbbrToIso2('SUI')).toBe('ch');
  });

  it('falls back to first-two-chars lowercase for unmapped codes', () => {
    expect(espnAbbrToIso2('BRA')).toBe('br');
    expect(espnAbbrToIso2('ARG')).toBe('ar');
    expect(espnAbbrToIso2('FRA')).toBe('fr');
    expect(espnAbbrToIso2('QAT')).toBe('qa');
    expect(espnAbbrToIso2('MAR')).toBe('ma');
    expect(espnAbbrToIso2('ESP')).toBe('es');
    expect(espnAbbrToIso2('USA')).toBe('us');
  });

  it('is case-insensitive on input', () => {
    expect(espnAbbrToIso2('bih')).toBe('ba');
    expect(espnAbbrToIso2('Ger')).toBe('de');
  });
});

describe('isEspnFlipped', () => {
  it('returns false when ESPN home matches quiniela home', () => {
    expect(isEspnFlipped('BRA', 'MAR', 'br')).toBe(false);
  });

  it('returns true when ESPN home is quiniela away', () => {
    // quiniela has Brazil as home ('br'), but ESPN has Morocco as home
    expect(isEspnFlipped('MAR', 'BRA', 'br')).toBe(true);
  });

  it('returns false when neither side matches (unknown teams)', () => {
    expect(isEspnFlipped('XYZ', 'ABC', 'br')).toBe(false);
  });
});

describe('buildQuinielaByFlags', () => {
  const games = [
    { home_flag: 'br', away_flag: 'ma', home_team_name: 'Brazil', away_team_name: 'Morocco' },
    { home_flag: 'gb-sco', away_flag: 'ht', home_team_name: 'Scotland', away_team_name: 'Haiti' },
    { home_flag: 'ba', away_flag: 'qa', home_team_name: 'Bosnia and Herzegovina', away_team_name: 'Qatar' },
    { home_flag: null, away_flag: null, home_team_name: 'TBD', away_team_name: 'TBD' }, // future knockout
  ];

  it('finds game by ESPN home|away ordering', () => {
    const map = buildQuinielaByFlags(games);
    expect(map.get('br|ma')?.home_team_name).toBe('Brazil');
    expect(map.get('gb-sco|ht')?.home_team_name).toBe('Scotland');
    expect(map.get('ba|qa')?.home_team_name).toBe('Bosnia and Herzegovina');
  });

  it('finds game when ESPN has teams in reverse order (flipped)', () => {
    const map = buildQuinielaByFlags(games);
    expect(map.get('ma|br')?.home_team_name).toBe('Brazil');
    expect(map.get('ht|gb-sco')?.home_team_name).toBe('Scotland');
    expect(map.get('qa|ba')?.home_team_name).toBe('Bosnia and Herzegovina');
  });

  it('does not conflate two simultaneous games — each flag pair returns its own game', () => {
    const map = buildQuinielaByFlags(games);
    expect(map.get('br|ma')?.home_team_name).toBe('Brazil');
    expect(map.get('gb-sco|ht')?.home_team_name).toBe('Scotland');
    expect(map.get('br|ma')).not.toBe(map.get('gb-sco|ht'));
  });

  it('skips games with null flags without throwing', () => {
    expect(() => buildQuinielaByFlags(games)).not.toThrow();
    const map = buildQuinielaByFlags(games);
    expect([...map.keys()].every((k) => !k.includes('null'))).toBe(true);
  });
});

describe('buildEspnByFlags', () => {
  const espnMatches = [
    { espnHomeAbbr: 'BRA', espnAwayAbbr: 'MAR', homeScore: 2, awayScore: 0 },
    { espnHomeAbbr: 'SCO', espnAwayAbbr: 'HAI', homeScore: 1, awayScore: 0 },
    { espnHomeAbbr: 'BIH', espnAwayAbbr: 'QAT', homeScore: 0, awayScore: 0 },
  ];

  it('finds ESPN match from quiniela flag pair (normal ordering)', () => {
    const map = buildEspnByFlags(espnMatches);
    expect(map.get('br|ma')?.homeScore).toBe(2);
    // SCO → gb-sco, HAI → ht (regressions)
    expect(map.get('gb-sco|ht')?.homeScore).toBe(1);
    // BIH → ba (regression)
    expect(map.get('ba|qa')?.homeScore).toBe(0);
  });

  it('finds ESPN match when quiniela has teams in reverse order', () => {
    const map = buildEspnByFlags(espnMatches);
    expect(map.get('ma|br')?.homeScore).toBe(2);
    expect(map.get('ht|gb-sco')?.homeScore).toBe(1);
    expect(map.get('qa|ba')?.homeScore).toBe(0);
  });

  it('does not conflate two simultaneous games', () => {
    const map = buildEspnByFlags(espnMatches);
    expect(map.get('br|ma')).not.toBe(map.get('gb-sco|ht'));
  });
});

describe('deduplicateEspnMatches', () => {
  const sameKickoff = '2026-06-24T20:00:00Z';

  it('keeps both games when two different games share the same kickoff time', () => {
    const matches = [
      { kickoffUtc: sameKickoff, espnHomeAbbr: 'BRA', espnAwayAbbr: 'MAR' },
      { kickoffUtc: sameKickoff, espnHomeAbbr: 'SCO', espnAwayAbbr: 'HAI' },
    ];
    const result = deduplicateEspnMatches(matches);
    expect(result).toHaveLength(2);
  });

  it('collapses the same game appearing in both today and yesterday fetch', () => {
    const matches = [
      { kickoffUtc: sameKickoff, espnHomeAbbr: 'BRA', espnAwayAbbr: 'MAR' },
      { kickoffUtc: sameKickoff, espnHomeAbbr: 'BRA', espnAwayAbbr: 'MAR' }, // duplicate from yesterday
    ];
    const result = deduplicateEspnMatches(matches);
    expect(result).toHaveLength(1);
  });

  it('keeps all unique games with different kickoff times', () => {
    const matches = [
      { kickoffUtc: '2026-06-24T17:00:00Z', espnHomeAbbr: 'BRA', espnAwayAbbr: 'MAR' },
      { kickoffUtc: '2026-06-24T20:00:00Z', espnHomeAbbr: 'ARG', espnAwayAbbr: 'ESP' },
    ];
    const result = deduplicateEspnMatches(matches);
    expect(result).toHaveLength(2);
  });
});
