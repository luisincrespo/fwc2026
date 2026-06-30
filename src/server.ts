import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { getOfficialLeaderboard, getBracket, getGames, getLeaderboardWithBreakdown, getUpcoming } from './services/quiniela.js';
import { getEspnMatches, type EspnGoal } from './services/espn.js';
import { calculateLivePoints } from './scoring.js';
import { espnAbbrToIso2, isEspnFlipped, buildQuinielaByFlags, buildQuinielaByTeamNames, buildEspnByFlags, buildEspnByTeamNames } from './match-utils.js';
import * as cache from './cache.js';

function bustQuinielaCache() {
  cache.del('quiniela:scores');
  cache.del('quiniela:scores:full');
  cache.del('quiniela:games');
}

const app = express();
app.use(cors());

interface LiveMatchInternal {
  gameId?: number;
  homeTeam: string;
  awayTeam: string;
  homeCode: string;
  awayCode: string;
  homeGoals: number;
  awayGoals: number;
  utcDate: string;
  minute: string | null;
  goals: EspnGoal[];
  venue?: { name: string; city: string };
}

async function getMockMatches(): Promise<LiveMatchInternal[]> {
  const allGames = await getGames();
  const today = new Date().toISOString().slice(0, 10);
  const todayUpcoming = allGames
    .filter((g) => !g.is_completed && g.scheduled_at.slice(0, 10) === today)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  const candidates = (todayUpcoming.length >= 2 ? todayUpcoming : allGames
    .filter((g) => !g.is_completed)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()))
    .slice(0, 2);

  return candidates.map((g, i) => ({
    gameId: g.game_id,
    homeTeam: g.home_team_name,
    awayTeam: g.away_team_name,
    homeCode: g.home_flag,
    awayCode: g.away_flag,
    homeGoals: i === 0 ? 2 : 0,
    awayGoals: i === 0 ? 1 : 0,
    utcDate: g.scheduled_at,
    minute: i === 0 ? "67'" : "12'",
    goals: i === 0
      ? [
          { team: 'home' as const, scorer: 'Scorer A', minute: "23'", ownGoal: false, penaltyKick: false },
          { team: 'away' as const, scorer: 'Scorer B', minute: "51'", ownGoal: false, penaltyKick: false },
          { team: 'home' as const, scorer: 'Scorer C', minute: "67'", ownGoal: false, penaltyKick: false },
        ]
      : [],
  }));
}

function flipGoals(goals: EspnGoal[]): EspnGoal[] {
  return goals.map((g) => ({ ...g, team: g.team === 'home' ? 'away' : 'home' as const }));
}

app.get('/api/leaderboard', async (req, res) => {
  try {
    if (req.query['bust'] === 'true') bustQuinielaCache();
    const [{ leaderboard, rules }, espnMatches, allGames] = await Promise.all([
      getOfficialLeaderboard(),
      getEspnMatches(),
      getGames(),
    ]);

    const quinielaByFlags = buildQuinielaByFlags(allGames);
    const quinielaByTeamNames = buildQuinielaByTeamNames(allGames);

    const espnLiveMatches: LiveMatchInternal[] = espnMatches
      .filter((e) => {
        if (!e.isLive) return false;
        // If quiniela already processed the result, points are in official totals — skip.
        const h = espnAbbrToIso2(e.espnHomeAbbr);
        const a = espnAbbrToIso2(e.espnAwayAbbr);
        const q = quinielaByFlags.get(`${h}|${a}`)
          ?? quinielaByTeamNames.get(`${e.espnHomeTeam.toLowerCase()}|${e.espnAwayTeam.toLowerCase()}`);
        return !q?.is_completed;
      })
      .map((e) => {
        const h = espnAbbrToIso2(e.espnHomeAbbr);
        const a = espnAbbrToIso2(e.espnAwayAbbr);
        const q = quinielaByFlags.get(`${h}|${a}`)
          ?? quinielaByTeamNames.get(`${e.espnHomeTeam.toLowerCase()}|${e.espnAwayTeam.toLowerCase()}`);
        if (!q) console.warn(`[leaderboard] No quiniela match for ESPN ${e.espnHomeAbbr} vs ${e.espnAwayAbbr} (flags: ${h}|${a}, teams: ${e.espnHomeTeam}|${e.espnAwayTeam})`);
        const quinielaHome = q?.home_team_name ?? e.espnHomeTeam;
        const flipped = isEspnFlipped(e.espnHomeAbbr, e.espnAwayAbbr, q?.home_flag ?? '');
        return {
          ...(q?.game_id != null && { gameId: q.game_id }),
          homeTeam: quinielaHome,
          awayTeam: q?.away_team_name ?? e.espnAwayTeam,
          homeCode: q?.home_flag ?? (flipped ? a : h),
          awayCode: q?.away_flag ?? (flipped ? h : a),
          homeGoals: (flipped ? e.awayScore : e.homeScore) ?? 0,
          awayGoals: (flipped ? e.homeScore : e.awayScore) ?? 0,
          utcDate: e.kickoffUtc,
          minute: e.minute,
          goals: flipped ? flipGoals(e.goals) : e.goals,
          venue: e.venue,
        };
      });

    const liveMatches = req.query['mock'] === 'true' ? await getMockMatches() : espnLiveMatches;

    // Assign official ranks (1-indexed, ties share the same rank)
    const sorted = [...leaderboard].sort((a, b) => b.total_points - a.total_points);
    const officialRankMap = new Map<number, number>();
    for (let i = 0; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const rank = prev && prev.total_points === sorted[i].total_points ? officialRankMap.get(prev.id)! : i + 1;
      officialRankMap.set(sorted[i].id, rank);
    }

    if (liveMatches.length === 0) {
      return res.json({
        updatedAt: new Date().toISOString(),
        liveMatches: [],
        leaderboard: sorted.map((p, i) => ({
          rank: officialRankMap.get(p.id) ?? i + 1,
          rankDelta: 0,
          id: p.id,
          name: p.name,
          officialPoints: p.total_points,
          livePoints: 0,
          totalPoints: p.total_points,
          liveBreakdown: [],
        })),
      });
    }

    const brackets = await Promise.all(
      leaderboard.map((p) => getBracket(p.id).then((preds) => ({ id: p.id, preds }))),
    );
    const bracketMap = new Map(brackets.map((b) => [b.id, b.preds]));

    const teamFlagMap = new Map(allGames.flatMap((g) => [
      [g.home_team_name?.toLowerCase(), g.home_flag],
      [g.away_team_name?.toLowerCase(), g.away_flag],
    ]));

    const withLive = leaderboard.map((p) => {
      const preds = bracketMap.get(p.id) ?? [];
      const predByGameId = new Map(preds.map((pr) => [pr.game_id, pr]));
      let livePoints = 0;
      const liveBreakdown = [];

      for (const match of liveMatches) {
        const pred = match.gameId != null
          ? predByGameId.get(match.gameId)
          : preds.find((pr) => pr.home_team === match.homeTeam && pr.away_team === match.awayTeam);
        if (!pred || pred.predicted_home === null || pred.predicted_away === null) continue;

        const actualTeams = new Set([match.homeTeam.toLowerCase(), match.awayTeam.toLowerCase()]);
        const teamMatchCount = pred.stage === 'ko'
          ? [pred.home_team, pred.away_team].filter((t) => t && actualTeams.has(t.toLowerCase())).length
          : 2;

        const points = calculateLivePoints(
          { home: pred.predicted_home, away: pred.predicted_away },
          { home: match.homeGoals, away: match.awayGoals },
          pred.stage,
          rules,
          false,
          teamMatchCount,
        );
        livePoints += points;

        const predictedTeamsDiffer = pred.stage === 'ko' && teamMatchCount < 2;
        liveBreakdown.push({
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          homeCode: match.homeCode,
          awayCode: match.awayCode,
          liveHome: match.homeGoals,
          liveAway: match.awayGoals,
          predictedHome: pred.predicted_home,
          predictedAway: pred.predicted_away,
          stage: pred.stage,
          points,
          predictedPenalties: pred.predicted_penalties ?? undefined,
          ...(predictedTeamsDiffer && {
            predictedHomeTeam: pred.home_team,
            predictedAwayTeam: pred.away_team,
            predictedHomeCode: pred.home_flag || teamFlagMap.get(pred.home_team?.toLowerCase()) || '',
            predictedAwayCode: pred.away_flag || teamFlagMap.get(pred.away_team?.toLowerCase()) || '',
          }),
        });
      }

      return { ...p, livePoints, totalPoints: p.total_points + livePoints, liveBreakdown };
    });

    // Aggregate prediction performance per live match from liveBreakdown
    type PerfEntry = { name: string; predicted: string };
    type PerfAgg = { exact: PerfEntry[]; correct: PerfEntry[]; miss: PerfEntry[]; total: number };
    const livePerfMap = new Map<string, PerfAgg>();
    for (const m of liveMatches) livePerfMap.set(`${m.homeTeam}|${m.awayTeam}`, { exact: [], correct: [], miss: [], total: 0 });
    for (const p of withLive) {
      for (const bd of p.liveBreakdown) {
        const agg = livePerfMap.get(`${bd.homeTeam}|${bd.awayTeam}`);
        if (!agg) continue;
        agg.total++;
        const entry = { name: p.name, predicted: `${bd.predictedHome}-${bd.predictedAway}` };
        if (bd.points >= 11) agg.exact.push(entry);
        else if (bd.points >= 3) agg.correct.push(entry);
        else agg.miss.push(entry);
      }
    }

    const liveRanked = [...withLive].sort(
      (a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name),
    );

    const liveRankMap = new Map<number, number>();
    for (let i = 0; i < liveRanked.length; i++) {
      const prev = liveRanked[i - 1];
      const rank = prev && prev.totalPoints === liveRanked[i].totalPoints
        ? liveRankMap.get(prev.id)!
        : i + 1;
      liveRankMap.set(liveRanked[i].id, rank);
    }

    return res.json({
      updatedAt: new Date().toISOString(),
      scoringRules: rules,
      liveMatches: liveMatches.map((m) => {
        const perf = livePerfMap.get(`${m.homeTeam}|${m.awayTeam}`);
        return {
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          homeCode: m.homeCode,
          awayCode: m.awayCode,
          homeGoals: m.homeGoals,
          awayGoals: m.awayGoals,
          minute: m.minute,
          goals: m.goals,
          venue: m.venue,
          performance: perf && perf.total > 0
            ? { exact: perf.exact, correct: perf.correct, miss: perf.miss, total: perf.total }
            : undefined,
        };
      }),
      leaderboard: liveRanked.map((p) => {
        const officialRank = officialRankMap.get(p.id) ?? 0;
        const liveRank = liveRankMap.get(p.id) ?? 0;
        return {
          rank: liveRank,
          rankDelta: officialRank - liveRank,
          id: p.id,
          name: p.name,
          officialPoints: p.total_points,
          livePoints: p.livePoints,
          totalPoints: p.totalPoints,
          liveBreakdown: p.liveBreakdown,
        };
      }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to build live leaderboard' });
  }
});

app.get('/api/daily-recap', async (req, res) => {
  try {
    if (req.query['bust'] === 'true') bustQuinielaCache();
    const isMock = req.query['mock'] === 'true';
    const [{ participants: leaderboard, rules }, allGames, espnMatches] = await Promise.all([
      getLeaderboardWithBreakdown(),
      getGames(),
      isMock ? getEspnMatches() : Promise.resolve([] as Awaited<ReturnType<typeof getEspnMatches>>),
    ]);

    let from: Date, to: Date;
    if (isMock) {
      const nextDate = allGames
        .filter((g) => !g.is_completed && new Date(g.scheduled_at) > new Date())
        .map((g) => g.scheduled_at.slice(0, 10))
        .sort()[0];
      from = nextDate ? new Date(`${nextDate}T00:00:00Z`) : new Date(req.query['from'] as string);
      to = nextDate ? new Date(`${nextDate}T23:59:59.999Z`) : new Date(req.query['to'] as string);
    } else {
      from = new Date((req.query['from'] as string) || new Date().toISOString().slice(0, 10));
      to = new Date((req.query['to'] as string) || new Date().toISOString().slice(0, 10) + 'T23:59:59.999Z');
    }

    const espnByTime = new Map<string, typeof espnMatches[0]>();
    for (const e of espnMatches) espnByTime.set(e.kickoffUtc.slice(0, 16), e);

    const todayCompleted = allGames
      .filter((g) => {
        const t = new Date(g.scheduled_at);
        if (t < from || t > to) return false;
        if (!isMock) return g.is_completed && g.actual_home_score != null && g.actual_away_score != null;
        const elapsedMin = (Date.now() - t.getTime()) / 60000;
        const espn = espnByTime.get(g.scheduled_at.slice(0, 16));
        const finished = g.is_completed || elapsedMin >= 150 || espn?.minute === 'FT';
        const flipped = espn ? isEspnFlipped(espn.espnHomeAbbr, espn.espnAwayAbbr, g.home_flag) : false;
        const homeScore = g.actual_home_score ?? (flipped ? espn?.awayScore : espn?.homeScore) ?? null;
        const awayScore = g.actual_away_score ?? (flipped ? espn?.homeScore : espn?.awayScore) ?? null;
        return finished && homeScore != null && awayScore != null;
      })
      .map((g) => {
        if (!isMock) return g;
        const espn = espnByTime.get(g.scheduled_at.slice(0, 16));
        const flipped = espn ? isEspnFlipped(espn.espnHomeAbbr, espn.espnAwayAbbr, g.home_flag) : false;
        return {
          ...g,
          actual_home_score: g.actual_home_score ?? (flipped ? espn?.awayScore : espn?.homeScore) ?? null,
          actual_away_score: g.actual_away_score ?? (flipped ? espn?.homeScore : espn?.awayScore) ?? null,
        };
      });

    const sorted = [...leaderboard].sort(
      (a, b) => b.total_points - a.total_points || a.name.localeCompare(b.name),
    );
    const officialRankMap = new Map<number, number>();
    for (let i = 0; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const rank = prev && prev.total_points === sorted[i].total_points
        ? officialRankMap.get(prev.id)!
        : i + 1;
      officialRankMap.set(sorted[i].id, rank);
    }

    if (todayCompleted.length === 0) {
      return res.json({
        updatedAt: new Date().toISOString(),
        todayMatchCount: 0,
        leaderboard: sorted.map((p) => ({
          rank: officialRankMap.get(p.id) ?? 1,
          preTodayRank: officialRankMap.get(p.id) ?? 1,
          dailyDelta: 0,
          id: p.id,
          name: p.name,
          pointsToday: 0,
          totalPoints: p.total_points,
        })),
      });
    }

    const brackets = await Promise.all(
      leaderboard.map((p) => getBracket(p.id).then((preds) => ({ id: p.id, preds }))),
    );
    const bracketMap = new Map(brackets.map((b) => [b.id, b.preds]));

    // Find groups whose positions lock in today (all 6 games complete, last game is today).
    const groupGamesMap = new Map<string, typeof allGames>();
    for (const g of allGames) {
      if (!g.group_letter || g.stage !== 'group') continue;
      if (!groupGamesMap.has(g.group_letter)) groupGamesMap.set(g.group_letter, []);
      groupGamesMap.get(g.group_letter)!.push(g);
    }
    const lockedInToday = [...groupGamesMap.entries()].filter(([, games]) =>
      games.length === 6 &&
      games.every((g) => g.is_completed && g.actual_home_score != null) &&
      games.some((g) => { const t = new Date(g.scheduled_at); return t >= from && t <= to; })
    );

    const STAGE_TO_KO_CAT: Record<string, string> = { r32: 'G', r16: 'H', qf: 'I', sf: 'J', final: 'K' };
    const teamFlagMapRecap = new Map(allGames.flatMap((g) => [
      [g.home_team_name?.toLowerCase(), g.home_flag],
      [g.away_team_name?.toLowerCase(), g.away_flag],
    ]));

    const withToday = leaderboard.map((p) => {
      const preds = bracketMap.get(p.id) ?? [];
      const predByGameId = new Map(preds.map((pr) => [pr.game_id, pr]));
      const officialBdMap = new Map(p.breakdown.map((bd) => [bd.game_id, bd]));
      let pointsToday = 0;
      const breakdown = [];

      for (const game of todayCompleted) {
        const bracketPred = predByGameId.get(game.game_id);
        if (!bracketPred || bracketPred.predicted_home === null || bracketPred.predicted_away === null) continue;
        const officialBd = officialBdMap.get(game.game_id);
        const points = officialBd?.points ?? 0;
        pointsToday += points;

        const actualTeams = new Set([game.home_team_name.toLowerCase(), game.away_team_name.toLowerCase()]);
        const predictedTeamsDiffer = game.stage !== 'group' &&
          ![bracketPred.home_team, bracketPred.away_team].every((t) => t && actualTeams.has(t.toLowerCase()));

        breakdown.push({
          homeTeam: game.home_team_name,
          awayTeam: game.away_team_name,
          homeCode: game.home_flag,
          awayCode: game.away_flag,
          homeGoals: game.actual_home_score!,
          awayGoals: game.actual_away_score!,
          predictedHome: bracketPred.predicted_home,
          predictedAway: bracketPred.predicted_away,
          points,
          predictedPenalties: bracketPred.predicted_penalties ?? undefined,
          categoriesAwarded: officialBd?.categories_awarded,
          ...(predictedTeamsDiffer && {
            predictedHomeTeam: bracketPred.home_team,
            predictedAwayTeam: bracketPred.away_team,
            predictedHomeCode: bracketPred.home_flag || teamFlagMapRecap.get(bracketPred.home_team?.toLowerCase()) || '',
            predictedAwayCode: bracketPred.away_flag || teamFlagMapRecap.get(bracketPred.away_team?.toLowerCase()) || '',
          }),
        });
      }

      // Compute L bonus for each group that locked in today.
      const groupBonuses: { group: string; points: number; correct: number }[] = [];
      for (const [grpLetter, grpGames] of lockedInToday) {
        const predRows = grpGames.map((g) => {
          const pr = predByGameId.get(g.game_id);
          if (!pr || pr.predicted_home == null || pr.predicted_away == null) return null;
          return { hf: g.home_flag, af: g.away_flag, hs: pr.predicted_home, as_: pr.predicted_away };
        });
        if (predRows.some((r) => r == null)) continue;
        const actual  = computeGroupStandings(grpGames.map((g) => ({ hf: g.home_flag, af: g.away_flag, hs: g.actual_home_score!, as_: g.actual_away_score! })));
        const implied = computeGroupStandings(predRows as Array<{ hf: string; af: string; hs: number; as_: number }>);
        const correct = actual.filter((flag, i) => implied[i] === flag).length;
        const lBonus  = correct * 5;
        groupBonuses.push({ group: grpLetter, points: lBonus, correct });
        pointsToday += lBonus;
      }

      // Compute KO advancement bonuses earned today (G = team reached R16, H = QF, etc.)
      const koBonuses: { category: string; points: number; teamName: string; flagCode: string }[] = [];
      for (const game of todayCompleted) {
        if (game.stage === 'group') continue;
        const bonusCat = STAGE_TO_KO_CAT[game.stage];
        if (!bonusCat) continue;
        const catEntry = (p.ko_bonuses ?? []).find((kb) => kb.category === bonusCat);
        if (!catEntry) continue;
        const todayTeams = new Set([game.home_team_name, game.away_team_name]);
        for (const team of catEntry.teams) {
          if (todayTeams.has(team.team_name)) {
            koBonuses.push({ category: bonusCat, points: catEntry.points, teamName: team.team_name, flagCode: team.flag_emoji });
            pointsToday += catEntry.points;
          }
        }
      }

      return { ...p, pointsToday, breakdown, groupBonuses, koBonuses, preTodayPoints: p.total_points - pointsToday };
    });

    const preSorted = [...withToday].sort(
      (a, b) => b.preTodayPoints - a.preTodayPoints || a.name.localeCompare(b.name),
    );
    const preTodayRankMap = new Map<number, number>();
    for (let i = 0; i < preSorted.length; i++) {
      const prev = preSorted[i - 1];
      const rank = prev && prev.preTodayPoints === preSorted[i].preTodayPoints
        ? preTodayRankMap.get(prev.id)!
        : i + 1;
      preTodayRankMap.set(preSorted[i].id, rank);
    }

    return res.json({
      updatedAt: new Date().toISOString(),
      todayMatchCount: todayCompleted.length,
      leaderboard: sorted.map((p) => {
        const currentRank = officialRankMap.get(p.id) ?? 0;
        const preTodayRank = preTodayRankMap.get(p.id) ?? 0;
        const entry = withToday.find((e) => e.id === p.id)!;
        return {
          rank: currentRank,
          preTodayRank,
          dailyDelta: preTodayRank - currentRank,
          id: p.id,
          name: p.name,
          pointsToday: entry.pointsToday,
          totalPoints: p.total_points,
          breakdown: entry.breakdown,
          groupBonuses: entry.groupBonuses,
          koBonuses: entry.koBonuses,
        };
      }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to build daily recap' });
  }
});

app.get('/api/schedule', async (req, res) => {
  try {
    if (req.query['bust'] === 'true') bustQuinielaCache();

    // Pre-compute the UTC date(s) the client is requesting so we can fetch
    // ESPN data for those dates (quiniela lags in populating upcoming KO teams).
    const preFrom = req.query['from'] as string | undefined;
    const preTo = req.query['to'] as string | undefined;
    const extraEspnDates: string[] = [];
    if (preFrom) extraEspnDates.push(new Date(preFrom).toISOString().slice(0, 10).replace(/-/g, ''));
    if (preTo)   extraEspnDates.push(new Date(preTo).toISOString().slice(0, 10).replace(/-/g, ''));

    const [allGames, espnMatches, { leaderboard: participants, rules }] = await Promise.all([
      getGames(), getEspnMatches(extraEspnDates), getOfficialLeaderboard(),
    ]);

    let from: Date, to: Date;
    if (req.query['mock'] === 'true') {
      // Shift window to the next day that has any uncompleted games
      const nextDate = allGames
        .filter((g) => !g.is_completed && new Date(g.scheduled_at) > new Date())
        .map((g) => g.scheduled_at.slice(0, 10))
        .sort()[0];
      if (nextDate) {
        from = new Date(`${nextDate}T00:00:00Z`);
        to = new Date(`${nextDate}T23:59:59.999Z`);
      } else {
        from = new Date(req.query['from'] as string);
        to = new Date(req.query['to'] as string);
      }
    } else {
      from = new Date(preFrom || new Date().toISOString().slice(0, 10));
      to = new Date(preTo || new Date().toISOString().slice(0, 10) + 'T23:59:59.999Z');
    }

    const espnByFlags = buildEspnByFlags(espnMatches);

    const todayGames = allGames
      .filter((g) => { const t = new Date(g.scheduled_at); return t >= from && t <= to; })
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

    const now = Date.now();
    // Include games not yet completed and within 150 min of kickoff (covers the ESPN lag window).
    const gameIdsForPicks = new Set(
      todayGames.filter((g) => !g.is_completed && (now - new Date(g.scheduled_at).getTime()) < 150 * 60 * 1000).map((g) => g.game_id),
    );

    type PicksEntry = { home: number; draw: number; away: number; scores: Map<string, number>; total: number };
    type PerfParticipant = { name: string; predicted: string };
    type PerfEntry = { exact: PerfParticipant[]; correct: PerfParticipant[]; miss: PerfParticipant[]; total: number };
    const picksMap = new Map<number, PicksEntry>();
    const perfMap = new Map<number, PerfEntry>();
    let allBracketsWithName: { name: string; preds: Awaited<ReturnType<typeof getBracket>> }[] = [];

    if (todayGames.length > 0) {
      allBracketsWithName = await Promise.all(
        participants.map((p) => getBracket(p.id).then((preds) => ({ name: p.name, preds }))),
      );
      for (const id of gameIdsForPicks) picksMap.set(id, { home: 0, draw: 0, away: 0, scores: new Map(), total: 0 });
      for (const { preds } of allBracketsWithName) {
        for (const pred of preds) {
          if (!gameIdsForPicks.has(pred.game_id) || pred.predicted_home == null || pred.predicted_away == null) continue;
          const entry = picksMap.get(pred.game_id)!;
          entry.total++;
          if (pred.predicted_home > pred.predicted_away) entry.home++;
          else if (pred.predicted_home < pred.predicted_away) entry.away++;
          else entry.draw++;
          const key = `${pred.predicted_home}-${pred.predicted_away}`;
          entry.scores.set(key, (entry.scores.get(key) ?? 0) + 1);
        }
      }
    }

    let hasPendingResults = false;

    const matches = todayGames.map((g) => {
      const elapsedMin = (Date.now() - new Date(g.scheduled_at).getTime()) / 60000;
      let status: 'UPCOMING' | 'LIVE' | 'FINISHED';
      if (g.is_completed || elapsedMin >= 150) status = 'FINISHED';
      else if (elapsedMin >= 0) status = 'LIVE';
      else status = 'UPCOMING';

      const espn = g.home_flag && g.away_flag
        ? espnByFlags.get(`${g.home_flag.toLowerCase()}|${g.away_flag.toLowerCase()}`)
        : undefined;
      if (espn?.minute === 'FT') status = 'FINISHED';

      const flipped = espn ? isEspnFlipped(espn.espnHomeAbbr, espn.espnAwayAbbr, g.home_flag) : false;

      let goals: EspnGoal[] = [];
      let homeGoals: number | null = g.actual_home_score;
      let awayGoals: number | null = g.actual_away_score;

      if (status === 'FINISHED' && espn) {
        goals = flipped ? flipGoals(espn.goals) : espn.goals;
        if (homeGoals == null) homeGoals = (flipped ? espn.awayScore : espn.homeScore) ?? null;
        if (awayGoals == null) awayGoals = (flipped ? espn.homeScore : espn.awayScore) ?? null;
        if (!g.is_completed) hasPendingResults = true;
      }

      let picks: { home: number; draw: number; away: number; topScores: { score: string; count: number }[]; total: number } | undefined;
      if ((status === 'UPCOMING' || status === 'LIVE') && picksMap.has(g.game_id)) {
        const p = picksMap.get(g.game_id)!;
        const topScores = [...p.scores.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([score, count]) => ({ score, count }));
        picks = { home: p.home, draw: p.draw, away: p.away, topScores, total: p.total };
      }

      // Track finished game scores for performance computation below
      if (status === 'FINISHED' && homeGoals != null && awayGoals != null) {
        perfMap.set(g.game_id, { exact: [], correct: [], miss: [], total: 0 });
      }

      return {
        homeTeam: g.home_team_name,
        awayTeam: g.away_team_name,
        homeCode: g.home_flag,
        awayCode: g.away_flag,
        kickoffUtc: g.scheduled_at,
        status,
        homeGoals,
        awayGoals,
        goals,
        picks,
        venue: espn?.venue,
        _gameId: g.game_id,
        _stage: g.stage,
      };
    });

    // Second pass: compute prediction performance for finished matches
    if (allBracketsWithName.length > 0 && perfMap.size > 0) {
      const scoreById = new Map(
        matches
          .filter((m) => m.status === 'FINISHED' && m.homeGoals != null && m.awayGoals != null)
          .map((m) => [m._gameId, { home: m.homeGoals as number, away: m.awayGoals as number }]),
      );
      for (const { name, preds } of allBracketsWithName) {
        for (const pred of preds) {
          const score = scoreById.get(pred.game_id);
          if (!score || pred.predicted_home == null || pred.predicted_away == null) continue;
          const agg = perfMap.get(pred.game_id);
          if (!agg) continue;
          agg.total++;
          const pts = calculateLivePoints(
            { home: pred.predicted_home, away: pred.predicted_away },
            { home: score.home, away: score.away },
            pred.stage,
            rules,
          );
          const participant = { name, predicted: `${pred.predicted_home}-${pred.predicted_away}` };
          if (pts >= 11) agg.exact.push(participant);
          else if (pts >= 3) agg.correct.push(participant);
          else agg.miss.push(participant);
        }
      }
    }

    // Strip internal fields and attach performance to finished matches
    const finalMatches = matches.map(({ _gameId, _stage, ...m }) => ({
      ...m,
      performance: m.status === 'FINISHED' && perfMap.has(_gameId) && perfMap.get(_gameId)!.total > 0
        ? perfMap.get(_gameId)
        : undefined,
    }));

    res.json({ updatedAt: new Date().toISOString(), matches: finalMatches, hasPendingResults });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

app.get('/api/upcoming/:id', async (req, res) => {
  try {
    const id = Number(req.params['id']);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const [upcoming, bracket, games] = await Promise.all([
      getUpcoming(id),
      getBracket(id),
      getGames(),
    ]);

    const bracketMap = new Map(bracket.map((p) => [p.game_id, p]));
    const gamesMap = new Map(games.map((g) => [g.game_id, g]));
    const teamFlagMap = new Map(games.flatMap((g) => [
      [g.home_team_name?.toLowerCase(), g.home_flag],
      [g.away_team_name?.toLowerCase(), g.away_flag],
    ]));

    const predictions = upcoming
      .map((u) => {
        const b = bracketMap.get(u.game_id);
        const g = gamesMap.get(u.game_id);
        if (!b || !g) return null;
        return {
          game_id: u.game_id,
          home_team: b.home_team,
          away_team: b.away_team,
          home_code: b.home_flag || teamFlagMap.get(b.home_team?.toLowerCase()) || '',
          away_code: b.away_flag || teamFlagMap.get(b.away_team?.toLowerCase()) || '',
          actual_home_team: g.home_team_name,
          actual_away_team: g.away_team_name,
          actual_home_code: g.home_flag,
          actual_away_code: g.away_flag,
          predicted_home: u.predicted_home,
          predicted_away: u.predicted_away,
          predicted_penalties: b.predicted_penalties ?? null,
          scheduled_at: g.scheduled_at,
        };
      })
      .filter(Boolean);

    res.json({ predictions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch upcoming predictions' });
  }
});

// Games before 06:00 UTC belong to the previous calendar date for users in the Americas.
// WC 2026 late games (e.g. 01:00 UTC) are evening games in every American timezone.
function gameDate(scheduledAt: string): string {
  const d = new Date(scheduledAt);
  if (d.getUTCHours() < 6) d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// End of a "local game day": next UTC midnight + 6h covers late evening games.
function endOfGameDay(date: string): Date {
  return new Date(new Date(`${date}T00:00:00.000Z`).getTime() + 30 * 60 * 60 * 1000 - 1);
}

// Compute group standings (1st→4th) from a list of game score rows.
// Used both in buildInsights (L bonus trajectory) and daily-recap (L bonus today).
function computeGroupStandings(games: Array<{ hf: string; af: string; hs: number; as_: number }>): string[] {
  const pts: Record<string, number> = {};
  const gd:  Record<string, number> = {};
  const gs:  Record<string, number> = {};
  for (const g of games) {
    pts[g.hf] ??= 0; pts[g.af] ??= 0;
    gd[g.hf]  ??= 0; gd[g.af]  ??= 0;
    gs[g.hf]  ??= 0; gs[g.af]  ??= 0;
    if (g.hs > g.as_)      pts[g.hf] += 3;
    else if (g.hs < g.as_) pts[g.af] += 3;
    else { pts[g.hf] += 1; pts[g.af] += 1; }
    gd[g.hf] += g.hs - g.as_; gd[g.af] += g.as_ - g.hs;
    gs[g.hf] += g.hs;          gs[g.af] += g.as_;
  }
  return Object.keys(pts).sort((a, b) => pts[b] - pts[a] || gd[b] - gd[a] || gs[b] - gs[a]);
}

async function buildInsights(bust: boolean, altE = false) {
  if (bust) bustQuinielaCache();

  const { participants, rules } = await getLeaderboardWithBreakdown();

  // Fetch full brackets for all participants and game list in parallel.
  // getUpcoming() misses games that have kicked off but aren't scored by quiniela yet.
  const [allBrackets, allGames] = await Promise.all([
    Promise.all(participants.map((p) => getBracket(p.id).then((preds) => ({ id: p.id, preds })))),
    getGames(),
  ]);
  const bracketByParticipant = new Map(allBrackets.map((b) => [b.id, b.preds]));
  const stageById = new Map(allGames.map((g) => [g.game_id, g.stage === 'group' ? 'group' : 'ko'] as [number, 'group' | 'ko']));

  type Bd = typeof participants[0]['breakdown'][0];
  function effectivePts(g: Bd): number {
    if (!altE) return g.points;
    return calculateLivePoints(
      { home: g.predicted_home, away: g.predicted_away },
      { home: g.actual_home, away: g.actual_away },
      stageById.get(g.game_id) ?? 'group', rules, true,
    );
  }

  // Current ranking
  const currentRankMap = new Map<number, number>();
  if (!altE) {
    const currentSorted = [...participants].sort((a, b) => b.total_points - a.total_points);
    for (let i = 0; i < currentSorted.length; i++) {
      const prev = currentSorted[i - 1];
      const rank = prev && prev.total_points === currentSorted[i].total_points
        ? currentRankMap.get(prev.id)!
        : i + 1;
      currentRankMap.set(currentSorted[i].id, rank);
    }
  } else {
    const altTotals = participants.map((p) => ({ id: p.id, pts: p.breakdown.reduce((s, g) => s + effectivePts(g), 0) }));
    const altSorted = [...altTotals].sort((a, b) => b.pts - a.pts);
    for (let i = 0; i < altSorted.length; i++) {
      const prev = altSorted[i - 1];
      const rank = prev && prev.pts === altSorted[i].pts ? currentRankMap.get(prev.id)! : i + 1;
      currentRankMap.set(altSorted[i].id, rank);
    }
  }

    // Collect all distinct game dates from breakdown entries, using local game-day date.
    const allDateSet = new Set<string>();
    for (const p of participants) {
      for (const g of p.breakdown) allDateSet.add(gameDate(g.scheduled_at));
    }
    const gameDates = [...allDateSet].sort();

    // Group position bonus (rule 'L'): +5 per correctly predicted group table position.
    // Quiniela derives each participant's predicted standings from their game score
    // predictions — no separate group-position prediction exists. We replicate that
    // calculation here so we know exactly how many L points each participant earned
    // from each group, and when (the date of the group's final-round games).
    // L bonus only applies to the non-altE trajectory (altE leaderboard excludes it).
    const gameGroupMap = new Map(
      allGames.filter((g) => g.group_letter).map((g) => [g.game_id, g.group_letter!])
    );
    // Last game date per group = when that group's positions are locked in (local game-day).
    const groupLockDate = new Map<string, string>();
    for (const g of allGames) {
      if (!g.group_letter || g.stage !== 'group') continue;
      const date = gameDate(g.scheduled_at);
      if (date > (groupLockDate.get(g.group_letter) ?? '')) groupLockDate.set(g.group_letter, date);
    }

    const bonusByParticipant = new Map<number, Map<string, number>>();
    for (const p of participants) {
      const byDate = new Map<string, number>();
      if (!altE) {
        // Cluster this participant's breakdown by group
        const entriesByGroup = new Map<string, typeof p.breakdown>();
        for (const g of p.breakdown) {
          const grp = gameGroupMap.get(g.game_id);
          if (!grp) continue;
          if (!entriesByGroup.has(grp)) entriesByGroup.set(grp, []);
          entriesByGroup.get(grp)!.push(g);
        }
        for (const [grp, entries] of entriesByGroup) {
          if (entries.length !== 6) continue; // group not fully complete yet
          const lockDate = groupLockDate.get(grp);
          if (!lockDate) continue;
          const toRow = (g: typeof entries[0], hs: number, as_: number) =>
            ({ hf: g.home_code, af: g.away_code, hs, as_ });
          const actual  = computeGroupStandings(entries.map((g) => toRow(g, g.actual_home, g.actual_away)));
          const implied = computeGroupStandings(entries.map((g) => toRow(g, g.predicted_home, g.predicted_away)));
          const lBonus  = actual.reduce((sum, flag, i) => sum + (implied[i] === flag ? 5 : 0), 0);
          if (lBonus > 0) byDate.set(lockDate, (byDate.get(lockDate) ?? 0) + lBonus);
        }
      }
      bonusByParticipant.set(p.id, byDate);
    }

    // For each game date, compute rank at the end of that day (cumulative).
    function rankAtCutoff(cutoffDate: string): Map<number, number> {
      const cutoff = endOfGameDay(cutoffDate);
      const pts = participants.map((p) => {
        const byDate = bonusByParticipant.get(p.id)!;
        let bonus = 0;
        for (const [date, b] of byDate) {
          if (date <= cutoffDate) bonus += b;
        }
        return {
          id: p.id,
          points: p.breakdown
            .filter((g) => new Date(g.scheduled_at) <= cutoff)
            .reduce((sum, g) => sum + effectivePts(g), 0) + bonus,
        };
      });
      const sorted = [...pts].sort((a, b) => b.points - a.points);
      const map = new Map<number, number>();
      for (let i = 0; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const rank = prev && sorted[i].points === prev.points ? map.get(prev.id)! : i + 1;
        map.set(sorted[i].id, rank);
      }
      return map;
    }

    const rankMaps = gameDates.map(rankAtCutoff);

    const result = participants.map((p) => {
      const bd = p.breakdown;
      const exact = bd.filter((g) => g.categories_awarded.includes('D')).length;
      const correct = bd.filter((g) => !g.categories_awarded.includes('D') && g.categories_awarded.includes('A')).length;
      const gamesPlayed = bd.length;

      const completedIds = new Set(bd.map((g) => g.game_id));
      const bracket = bracketByParticipant.get(p.id) ?? [];
      const nonCompleted = bracket.filter((g) => !completedIds.has(g.game_id) && g.predicted_home != null && g.predicted_away != null);
      const allPreds = [
        ...bd.map((g) => ({ h: g.predicted_home, a: g.predicted_away })),
        ...nonCompleted.map((g) => ({ h: g.predicted_home!, a: g.predicted_away! })),
      ];
      const draws = allPreds.filter((x) => x.h === x.a).length;

      return {
        id: p.id,
        name: p.name,
        currentRank: currentRankMap.get(p.id) ?? 0,
        gamesPlayed,
        exact,
        correct,
        miss: gamesPlayed - exact - correct,
        exactPct: gamesPlayed > 0 ? Math.round(exact / gamesPlayed * 100) : 0,
        accuracyPct: gamesPlayed > 0 ? Math.round((exact + correct) / gamesPlayed * 100) : 0,
        drawPredictions: draws,
        totalPredictions: allPreds.length,
        drawPct: allPreds.length > 0 ? Math.round(draws / allPreds.length * 100) : 0,
        ranks: rankMaps.map((m) => m.get(p.id) ?? 0),
        pointsPerDay: gameDates.map((date) => {
          const gamePts = bd.filter((g) => gameDate(g.scheduled_at) === date).reduce((s, g) => s + effectivePts(g), 0);
          const bonusPts = bonusByParticipant.get(p.id)?.get(date) ?? 0;
          return gamePts + bonusPts;
        }),
      };
    });

    // Badge helpers
    // Excluded from badges: intentionally bad predictions would always win negative badges.
    const BADGE_EXCLUDED = new Set(['Miguel Guareschi']);
    const badgeParticipants = participants.filter((p) => !BADGE_EXCLUDED.has(p.name));
    const badgeResult = result.filter((p) => !BADGE_EXCLUDED.has(p.name));

    const outcomeOf = (h: number, a: number): 'H' | 'D' | 'A' => h > a ? 'H' : h < a ? 'A' : 'D';

    type Winner = { id: number; name: string; detail?: string };
    function topWinners<T extends { id: number; name: string }>(
      arr: T[], val: (x: T) => number, det?: (x: T) => string, min = 1,
    ): Winner[] {
      if (!arr.length) return [];
      const best = Math.max(...arr.map(val));
      if (best < min) return [];
      return arr.filter((x) => val(x) === best).map((x) => ({ id: x.id, name: x.name, ...(det ? { detail: det(x) } : {}) }));
    }
    function bottomWinners<T extends { id: number; name: string }>(
      arr: T[], val: (x: T) => number, det?: (x: T) => string, max = -1,
    ): Winner[] {
      if (!arr.length) return [];
      const best = Math.min(...arr.map(val));
      if (best > max) return [];
      return arr.filter((x) => val(x) === best).map((x) => ({ id: x.id, name: x.name, ...(det ? { detail: det(x) } : {}) }));
    }

    // Majority predicted outcome per game (for Contrarian / Consensus badges)
    const allGameIds = new Set(participants.flatMap((p) => p.breakdown.map((g) => g.game_id)));
    const majorityMap = new Map<number, 'H' | 'D' | 'A'>();
    for (const gid of allGameIds) {
      const counts = { H: 0, D: 0, A: 0 };
      for (const p of participants) {
        const g = p.breakdown.find((x) => x.game_id === gid);
        if (g) counts[outcomeOf(g.predicted_home, g.predicted_away)]++;
      }
      const top = (Object.entries(counts) as ['H' | 'D' | 'A', number][]).sort((a, b) => b[1] - a[1])[0][0];
      majorityMap.set(gid, top);
    }

    const contraryStats = badgeParticipants.map((p) => ({
      id: p.id, name: p.name,
      count: p.breakdown.filter((g) => {
        const myO = outcomeOf(g.predicted_home, g.predicted_away);
        return myO !== majorityMap.get(g.game_id) && myO === outcomeOf(g.actual_home, g.actual_away);
      }).length,
    }));

    const last3Dates = new Set(gameDates.slice(-3));
    const onFireStats = badgeParticipants.map((p) => ({
      id: p.id, name: p.name,
      pts: p.breakdown.filter((g) => last3Dates.has(g.scheduled_at.slice(0, 10))).reduce((s, g) => s + effectivePts(g), 0),
    }));

    const perfectDayStats = badgeParticipants.map((p) => {
      const byDate = new Map<string, typeof p.breakdown>();
      for (const g of p.breakdown) {
        const d = g.scheduled_at.slice(0, 10);
        if (!byDate.has(d)) byDate.set(d, []);
        byDate.get(d)!.push(g);
      }
      const count = [...byDate.values()].filter((gs) => gs.length > 0 && gs.every((g) => g.categories_awarded.includes('D'))).length;
      return { id: p.id, name: p.name, count };
    });

    const lookbackCount = Math.min(3, rankMaps.length - 1);
    const lookbackIdx = rankMaps.length - 1 - lookbackCount;
    const trajectoryStats = badgeResult.map((p) => {
      const currentRank = p.ranks[p.ranks.length - 1] ?? 0;
      const pastRank = p.ranks[lookbackIdx] ?? currentRank;
      return { id: p.id, name: p.name, rise: pastRank - currentRank, drop: currentRank - pastRank, pastRank, currentRank };
    });

    const daysAtTopStats = badgeResult.map((p) => ({
      id: p.id, name: p.name,
      days: rankMaps.filter((m) => m.get(p.id) === 1).length,
    }));

    const badges = [
      {
        id: 'leader', emoji: '👑', name: 'Leader',
        description: 'Currently sitting at #1',
        winners: badgeResult.filter((p) => p.currentRank === 1).map(({ id, name }) => ({ id, name })),
      },
      {
        id: 'dominant', emoji: '⭐', name: 'Dominant',
        description: 'Most game days spent at rank #1',
        winners: topWinners(daysAtTopStats, (p) => p.days, (p) => `${p.days}d`),
      },
      {
        id: 'sniper', emoji: '🎯', name: 'Sniper',
        description: 'Most exact score predictions',
        winners: topWinners(badgeResult, (p) => p.exact, (p) => `${p.exact} exact`),
      },
      {
        id: 'analyst', emoji: '🧠', name: 'Analyst',
        description: 'Highest outcome accuracy (min 5 games)',
        winners: topWinners(badgeResult.filter((p) => p.gamesPlayed >= 5), (p) => p.accuracyPct, (p) => `${p.accuracyPct}%`),
      },
      {
        id: 'on_fire', emoji: '🔥', name: 'On Fire',
        description: `Most points in the last ${Math.min(3, gameDates.length)} game days`,
        winners: topWinners(onFireStats, (p) => p.pts, (p) => `${p.pts} pts`),
      },
      {
        id: 'cold_streak', emoji: '🧊', name: 'Cold Streak',
        description: `Least points in the last ${Math.min(3, gameDates.length)} game days`,
        winners: bottomWinners(onFireStats, (p) => p.pts, (p) => `${p.pts} pts`, Infinity),
      },
      {
        id: 'peacemaker', emoji: '🕊️', name: 'Peacemaker',
        description: 'Highest % of draw predictions',
        winners: topWinners(badgeResult, (p) => p.drawPct, (p) => `${p.drawPredictions} draws (${p.drawPct}%)`),
      },
      {
        id: 'contrarian', emoji: '🤠', name: 'Maverick',
        description: 'Most correct picks that went against the crowd',
        winners: topWinners(contraryStats, (p) => p.count, (p) => `${p.count} picks`),
      },
      {
        id: 'rising_star', emoji: '📈', name: 'Rising Star',
        description: `Biggest rank climb in the last ${lookbackCount} game days`,
        winners: topWinners(trajectoryStats, (p) => p.rise, (p) => `#${p.pastRank} → #${p.currentRank}`),
      },
      {
        id: 'rough_patch', emoji: '📉', name: 'Rough Patch',
        description: `Biggest rank drop in the last ${lookbackCount} game days`,
        winners: topWinners(trajectoryStats, (p) => p.drop, (p) => `#${p.pastRank} → #${p.currentRank}`),
      },
      {
        id: 'perfect_day', emoji: '💎', name: 'Perfect Day',
        description: 'Most days with an exact score on every game',
        winners: topWinners(perfectDayStats, (p) => p.count, (p) => `${p.count}d`),
      },
    ];

    return { updatedAt: new Date().toISOString(), participants: result, gameDates, badges };
}

app.get('/api/insights', async (req, res) => {
  try {
    res.json(await buildInsights(req.query['bust'] === 'true', false));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to build insights' });
  }
});

app.get('/api/alt-insights', async (req, res) => {
  try {
    res.json(await buildInsights(req.query['bust'] === 'true', true));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to build alt insights' });
  }
});

app.get('/api/alt-daily-recap', async (req, res) => {
  try {
    if (req.query['bust'] === 'true') bustQuinielaCache();
    const isMock = req.query['mock'] === 'true';
    const [{ participants, rules }, allGames, espnMatches] = await Promise.all([
      getLeaderboardWithBreakdown(),
      getGames(),
      isMock ? getEspnMatches() : Promise.resolve([] as Awaited<ReturnType<typeof getEspnMatches>>),
    ]);

    const stageById = new Map(allGames.map((g) => [g.game_id, g.stage === 'group' ? 'group' : 'ko'] as [number, 'group' | 'ko']));

    let from: Date, to: Date;
    if (isMock) {
      const nextDate = allGames
        .filter((g) => !g.is_completed && new Date(g.scheduled_at) > new Date())
        .map((g) => g.scheduled_at.slice(0, 10)).sort()[0];
      from = nextDate ? new Date(`${nextDate}T00:00:00Z`) : new Date(req.query['from'] as string);
      to = nextDate ? new Date(`${nextDate}T23:59:59.999Z`) : new Date(req.query['to'] as string);
    } else {
      from = new Date((req.query['from'] as string) || new Date().toISOString().slice(0, 10));
      to = new Date((req.query['to'] as string) || new Date().toISOString().slice(0, 10) + 'T23:59:59.999Z');
    }

    const espnByTime = new Map<string, typeof espnMatches[0]>();
    for (const e of espnMatches) espnByTime.set(e.kickoffUtc.slice(0, 16), e);

    const todayCompleted = allGames
      .filter((g) => {
        const t = new Date(g.scheduled_at);
        if (t < from || t > to) return false;
        if (!isMock) return g.is_completed && g.actual_home_score != null && g.actual_away_score != null;
        const elapsedMin = (Date.now() - t.getTime()) / 60000;
        const espn = espnByTime.get(g.scheduled_at.slice(0, 16));
        const finished = g.is_completed || elapsedMin >= 150 || espn?.minute === 'FT';
        const flipped = espn ? isEspnFlipped(espn.espnHomeAbbr, espn.espnAwayAbbr, g.home_flag) : false;
        const homeScore = g.actual_home_score ?? (flipped ? espn?.awayScore : espn?.homeScore) ?? null;
        const awayScore = g.actual_away_score ?? (flipped ? espn?.homeScore : espn?.awayScore) ?? null;
        return finished && homeScore != null && awayScore != null;
      })
      .map((g) => {
        if (!isMock) return g;
        const espn = espnByTime.get(g.scheduled_at.slice(0, 16));
        const flipped = espn ? isEspnFlipped(espn.espnHomeAbbr, espn.espnAwayAbbr, g.home_flag) : false;
        return {
          ...g,
          actual_home_score: g.actual_home_score ?? (flipped ? espn?.awayScore : espn?.homeScore) ?? null,
          actual_away_score: g.actual_away_score ?? (flipped ? espn?.homeScore : espn?.awayScore) ?? null,
        };
      });

    const todayIds = new Set(todayCompleted.map((g) => g.game_id));

    // Recalculate all historical points with alt E rule, split by today vs prior
    const withAlt = participants.map((p) => {
      let altTotal = 0;
      let altToday = 0;
      const todayBreakdown: { homeTeam: string; awayTeam: string; homeCode: string; awayCode: string; homeGoals: number; awayGoals: number; predictedHome: number; predictedAway: number; points: number }[] = [];

      for (const g of p.breakdown) {
        const stage = stageById.get(g.game_id) ?? 'group';
        const pts = calculateLivePoints(
          { home: g.predicted_home, away: g.predicted_away },
          { home: g.actual_home, away: g.actual_away },
          stage, rules, true,
        );
        altTotal += pts;
        if (todayIds.has(g.game_id)) {
          altToday += pts;
          const game = todayCompleted.find((tc) => tc.game_id === g.game_id);
          if (game) {
            todayBreakdown.push({
              homeTeam: game.home_team_name, awayTeam: game.away_team_name,
              homeCode: game.home_flag, awayCode: game.away_flag,
              homeGoals: game.actual_home_score!, awayGoals: game.actual_away_score!,
              predictedHome: g.predicted_home, predictedAway: g.predicted_away,
              points: pts,
            });
          }
        }
      }

      return { ...p, altTotal, altToday, altPreToday: altTotal - altToday, todayBreakdown };
    });

    const rank = (sorted: typeof withAlt, key: keyof typeof withAlt[0]) => {
      const map = new Map<number, number>();
      for (let i = 0; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const cur = sorted[i][key] as number;
        const prevVal = prev?.[key] as number | undefined;
        map.set(sorted[i].id, prev && cur === prevVal ? map.get(prev.id)! : i + 1);
      }
      return map;
    };

    const currentSorted = [...withAlt].sort((a, b) => b.altTotal - a.altTotal || a.name.localeCompare(b.name));
    const preTodaySorted = [...withAlt].sort((a, b) => b.altPreToday - a.altPreToday || a.name.localeCompare(b.name));
    const currentRankMap = rank(currentSorted, 'altTotal');
    const preTodayRankMap = rank(preTodaySorted, 'altPreToday');

    return res.json({
      updatedAt: new Date().toISOString(),
      todayMatchCount: todayCompleted.length,
      leaderboard: currentSorted.map((p) => ({
        rank: currentRankMap.get(p.id) ?? 0,
        preTodayRank: preTodayRankMap.get(p.id) ?? 0,
        dailyDelta: (preTodayRankMap.get(p.id) ?? 0) - (currentRankMap.get(p.id) ?? 0),
        id: p.id,
        name: p.name,
        pointsToday: p.altToday,
        totalPoints: p.altTotal,
        breakdown: p.todayBreakdown,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to build alt daily recap' });
  }
});

app.get('/api/alt-leaderboard', async (req, res) => {
  try {
    if (req.query['bust'] === 'true') bustQuinielaCache();
    const [{ participants, rules }, espnMatches, allGames] = await Promise.all([
      getLeaderboardWithBreakdown(),
      getEspnMatches(),
      getGames(),
    ]);

    const stageById = new Map(allGames.map((g) => [g.game_id, g.stage === 'group' ? 'group' : 'ko'] as [number, 'group' | 'ko']));
    const quinielaByFlags = buildQuinielaByFlags(allGames);
    const quinielaByTeamNames = buildQuinielaByTeamNames(allGames);

    const espnLiveMatches: LiveMatchInternal[] = espnMatches
      .filter((e) => {
        if (!e.isLive) return false;
        const h = espnAbbrToIso2(e.espnHomeAbbr);
        const a = espnAbbrToIso2(e.espnAwayAbbr);
        const q = quinielaByFlags.get(`${h}|${a}`)
          ?? quinielaByTeamNames.get(`${e.espnHomeTeam.toLowerCase()}|${e.espnAwayTeam.toLowerCase()}`);
        return !q?.is_completed;
      })
      .map((e) => {
        const h = espnAbbrToIso2(e.espnHomeAbbr);
        const a = espnAbbrToIso2(e.espnAwayAbbr);
        const q = quinielaByFlags.get(`${h}|${a}`)
          ?? quinielaByTeamNames.get(`${e.espnHomeTeam.toLowerCase()}|${e.espnAwayTeam.toLowerCase()}`);
        if (!q) console.warn(`[alt-leaderboard] No quiniela match for ESPN ${e.espnHomeAbbr} vs ${e.espnAwayAbbr} (flags: ${h}|${a}, teams: ${e.espnHomeTeam}|${e.espnAwayTeam})`);
        const flipped = isEspnFlipped(e.espnHomeAbbr, e.espnAwayAbbr, q?.home_flag ?? '');
        return {
          homeTeam: q?.home_team_name ?? e.espnHomeTeam,
          awayTeam: q?.away_team_name ?? e.espnAwayTeam,
          homeCode: q?.home_flag ?? (flipped ? a : h),
          awayCode: q?.away_flag ?? (flipped ? h : a),
          homeGoals: (flipped ? e.awayScore : e.homeScore) ?? 0,
          awayGoals: (flipped ? e.homeScore : e.awayScore) ?? 0,
          utcDate: e.kickoffUtc,
          minute: e.minute,
          goals: flipped ? flipGoals(e.goals) : e.goals,
          venue: e.venue,
        };
      });

    const liveMatches = req.query['mock'] === 'true' ? await getMockMatches() : espnLiveMatches;

    // Recalculate completed-game points per participant using alt E rule
    const withAlt = participants.map((p) => {
      let altOfficialPoints = 0;
      for (const g of p.breakdown) {
        const stage = stageById.get(g.game_id) ?? 'group';
        altOfficialPoints += calculateLivePoints(
          { home: g.predicted_home, away: g.predicted_away },
          { home: g.actual_home, away: g.actual_away },
          stage,
          rules,
          true,
        );
      }
      return { ...p, altOfficialPoints };
    });

    const altOfficialSorted = [...withAlt].sort((a, b) => b.altOfficialPoints - a.altOfficialPoints);
    const altOfficialRankMap = new Map<number, number>();
    for (let i = 0; i < altOfficialSorted.length; i++) {
      const prev = altOfficialSorted[i - 1];
      const rank = prev && prev.altOfficialPoints === altOfficialSorted[i].altOfficialPoints
        ? altOfficialRankMap.get(prev.id)!
        : i + 1;
      altOfficialRankMap.set(altOfficialSorted[i].id, rank);
    }

    if (liveMatches.length === 0) {
      return res.json({
        updatedAt: new Date().toISOString(),
        scoringRules: rules,
        liveMatches: [],
        leaderboard: altOfficialSorted.map((p, i) => ({
          rank: altOfficialRankMap.get(p.id) ?? i + 1,
          rankDelta: 0,
          id: p.id,
          name: p.name,
          officialPoints: p.altOfficialPoints,
          livePoints: 0,
          totalPoints: p.altOfficialPoints,
          liveBreakdown: [],
        })),
      });
    }

    const brackets = await Promise.all(
      participants.map((p) => getBracket(p.id).then((preds) => ({ id: p.id, preds }))),
    );
    const bracketMap = new Map(brackets.map((b) => [b.id, b.preds]));

    const withLive = withAlt.map((p) => {
      const preds = bracketMap.get(p.id) ?? [];
      let livePoints = 0;
      const liveBreakdown = [];
      for (const match of liveMatches) {
        const pred = preds.find((pr) => pr.home_team === match.homeTeam && pr.away_team === match.awayTeam);
        if (!pred || pred.predicted_home === null || pred.predicted_away === null) continue;
        const points = calculateLivePoints(
          { home: pred.predicted_home, away: pred.predicted_away },
          { home: match.homeGoals, away: match.awayGoals },
          pred.stage,
          rules,
          true,
        );
        livePoints += points;
        liveBreakdown.push({
          homeTeam: match.homeTeam, awayTeam: match.awayTeam,
          homeCode: match.homeCode, awayCode: match.awayCode,
          liveHome: match.homeGoals, liveAway: match.awayGoals,
          predictedHome: pred.predicted_home, predictedAway: pred.predicted_away,
          stage: pred.stage, points,
        });
      }
      return { ...p, livePoints, totalPoints: p.altOfficialPoints + livePoints, liveBreakdown };
    });

    const altLiveRanked = [...withLive].sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));
    const altLiveRankMap = new Map<number, number>();
    for (let i = 0; i < altLiveRanked.length; i++) {
      const prev = altLiveRanked[i - 1];
      const rank = prev && prev.totalPoints === altLiveRanked[i].totalPoints ? altLiveRankMap.get(prev.id)! : i + 1;
      altLiveRankMap.set(altLiveRanked[i].id, rank);
    }

    return res.json({
      updatedAt: new Date().toISOString(),
      scoringRules: rules,
      liveMatches: liveMatches.map((m) => ({
        homeTeam: m.homeTeam, awayTeam: m.awayTeam,
        homeCode: m.homeCode, awayCode: m.awayCode,
        homeGoals: m.homeGoals, awayGoals: m.awayGoals,
        minute: m.minute, goals: m.goals, venue: m.venue,
      })),
      leaderboard: altLiveRanked.map((p) => ({
        rank: altLiveRankMap.get(p.id) ?? 0,
        rankDelta: (altOfficialRankMap.get(p.id) ?? 0) - (altLiveRankMap.get(p.id) ?? 0),
        id: p.id,
        name: p.name,
        officialPoints: p.altOfficialPoints,
        livePoints: p.livePoints,
        totalPoints: p.totalPoints,
        liveBreakdown: p.liveBreakdown,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to build alt leaderboard' });
  }
});

app.get('/api/debug-scores-raw', async (_req, res) => {
  try {
    const axios = (await import('axios')).default;
    const API_KEY = process.env.QUINIELA_POPULAR_API_KEY!;
    const scoresRes = await axios.get(`https://www.quinielapopular.com/api/play/${API_KEY}/scores`);
    // Return first participant only to avoid a huge payload
    const first = scoresRes.data?.leaderboard?.[0];
    res.json({ first, keys: first ? Object.keys(first) : [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/debug-flags', async (_req, res) => {
  try {
    const [allGames, espnMatches] = await Promise.all([getGames(), getEspnMatches()]);
    res.json({
      quinielaGames: allGames.map((g) => ({
        home_team: g.home_team_name, away_team: g.away_team_name,
        home_flag: g.home_flag, away_flag: g.away_flag,
        scheduled_at: g.scheduled_at,
      })),
      espnMatches: espnMatches.map((e) => ({
        home: e.espnHomeTeam, away: e.espnAwayTeam,
        homeAbbr: e.espnHomeAbbr, awayAbbr: e.espnAwayAbbr,
        homeMapped: espnAbbrToIso2(e.espnHomeAbbr), awayMapped: espnAbbrToIso2(e.espnAwayAbbr),
        isLive: e.isLive, minute: e.minute,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(process.cwd(), 'client/dist');
  app.use(express.static(distPath));
  app.get('/{*path}', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
