import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { getOfficialLeaderboard, getBracket, getGames, getLeaderboardWithBreakdown, getUpcoming } from './services/quiniela.js';
import { getEspnMatches, type EspnGoal } from './services/espn.js';
import { calculateLivePoints } from './scoring.js';
import * as cache from './cache.js';

function bustQuinielaCache() {
  cache.del('quiniela:scores');
  cache.del('quiniela:scores:full');
  cache.del('quiniela:games');
}

const app = express();
app.use(cors());

interface LiveMatchInternal {
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

function isEspnFlipped(espnHomeTeam: string, quinielaHomeTeam: string): boolean {
  return !quinielaHomeTeam.toLowerCase().split(' ').some(
    (w) => espnHomeTeam.toLowerCase().includes(w),
  );
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

    const quinielaByTime = new Map<string, typeof allGames[0]>();
    for (const g of allGames) {
      quinielaByTime.set(g.scheduled_at.slice(0, 16), g);
    }

    const espnLiveMatches: LiveMatchInternal[] = espnMatches
      .filter((e) => {
        if (!e.isLive) return false;
        // If quiniela already processed the result, points are in official totals — skip.
        const q = quinielaByTime.get(e.kickoffUtc.slice(0, 16));
        return !q?.is_completed;
      })
      .map((e) => {
        const q = quinielaByTime.get(e.kickoffUtc.slice(0, 16));
        const quinielaHome = q?.home_team_name ?? e.espnHomeTeam;
        const flipped = isEspnFlipped(e.espnHomeTeam, quinielaHome);
        return {
          homeTeam: quinielaHome,
          awayTeam: q?.away_team_name ?? '',
          homeCode: q?.home_flag ?? '',
          awayCode: q?.away_flag ?? '',
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
        })),
      });
    }

    const brackets = await Promise.all(
      leaderboard.map((p) => getBracket(p.id).then((preds) => ({ id: p.id, preds }))),
    );
    const bracketMap = new Map(brackets.map((b) => [b.id, b.preds]));

    const withLive = leaderboard.map((p) => {
      const preds = bracketMap.get(p.id) ?? [];
      let livePoints = 0;
      const liveBreakdown = [];

      for (const match of liveMatches) {
        const pred = preds.find(
          (pr) => pr.home_team === match.homeTeam && pr.away_team === match.awayTeam,
        );
        if (!pred || pred.predicted_home === null || pred.predicted_away === null) continue;

        const points = calculateLivePoints(
          { home: pred.predicted_home, away: pred.predicted_away },
          { home: match.homeGoals, away: match.awayGoals },
          pred.stage,
          rules,
        );
        livePoints += points;
        liveBreakdown.push({
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          homeCode: match.homeCode,
          awayCode: match.awayCode,
          liveHome: match.homeGoals,
          liveAway: match.awayGoals,
          predictedHome: pred.predicted_home,
          predictedAway: pred.predicted_away,
          points,
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
    const [{ leaderboard, rules }, allGames, espnMatches] = await Promise.all([
      getOfficialLeaderboard(),
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
        const flipped = espn ? isEspnFlipped(espn.espnHomeTeam, g.home_team_name) : false;
        const homeScore = g.actual_home_score ?? (flipped ? espn?.awayScore : espn?.homeScore) ?? null;
        const awayScore = g.actual_away_score ?? (flipped ? espn?.homeScore : espn?.awayScore) ?? null;
        return finished && homeScore != null && awayScore != null;
      })
      .map((g) => {
        if (!isMock) return g;
        const espn = espnByTime.get(g.scheduled_at.slice(0, 16));
        const flipped = espn ? isEspnFlipped(espn.espnHomeTeam, g.home_team_name) : false;
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

    const withToday = leaderboard.map((p) => {
      const preds = bracketMap.get(p.id) ?? [];
      let pointsToday = 0;
      const breakdown = [];
      for (const game of todayCompleted) {
        const pred = preds.find(
          (pr) => pr.home_team === game.home_team_name && pr.away_team === game.away_team_name,
        );
        if (!pred || pred.predicted_home === null || pred.predicted_away === null) continue;
        const stage = game.stage === 'group' ? 'group' : 'ko';
        const points = calculateLivePoints(
          { home: pred.predicted_home, away: pred.predicted_away },
          { home: game.actual_home_score!, away: game.actual_away_score! },
          stage,
          rules,
        );
        pointsToday += points;
        breakdown.push({
          homeTeam: game.home_team_name,
          awayTeam: game.away_team_name,
          homeCode: game.home_flag,
          awayCode: game.away_flag,
          homeGoals: game.actual_home_score!,
          awayGoals: game.actual_away_score!,
          predictedHome: pred.predicted_home,
          predictedAway: pred.predicted_away,
          points,
        });
      }
      return { ...p, pointsToday, breakdown, preTodayPoints: p.total_points - pointsToday };
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
    const [allGames, espnMatches, { leaderboard: participants, rules }] = await Promise.all([
      getGames(), getEspnMatches(), getOfficialLeaderboard(),
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
      from = new Date((req.query['from'] as string) || new Date().toISOString().slice(0, 10));
      to = new Date((req.query['to'] as string) || new Date().toISOString().slice(0, 10) + 'T23:59:59.999Z');
    }

    const espnByTime = new Map<string, typeof espnMatches[0]>();
    for (const e of espnMatches) {
      espnByTime.set(e.kickoffUtc.slice(0, 16), e);
    }

    const todayGames = allGames
      .filter((g) => { const t = new Date(g.scheduled_at); return t >= from && t <= to; })
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

    const now = Date.now();
    const upcomingGameIds = new Set(
      todayGames.filter((g) => !g.is_completed && (new Date(g.scheduled_at).getTime() - now) > 0).map((g) => g.game_id),
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
      for (const id of upcomingGameIds) picksMap.set(id, { home: 0, draw: 0, away: 0, scores: new Map(), total: 0 });
      for (const { preds } of allBracketsWithName) {
        for (const pred of preds) {
          if (!upcomingGameIds.has(pred.game_id) || pred.predicted_home == null || pred.predicted_away == null) continue;
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

      const espn = espnByTime.get(g.scheduled_at.slice(0, 16));
      if (espn?.minute === 'FT') status = 'FINISHED';

      const flipped = espn ? isEspnFlipped(espn.espnHomeTeam, g.home_team_name) : false;

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
      if (status === 'UPCOMING' && picksMap.has(g.game_id)) {
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

app.get('/api/insights', async (req, res) => {
  try {
    if (req.query['bust'] === 'true') bustQuinielaCache();

    const { participants } = await getLeaderboardWithBreakdown();

    // Fetch upcoming predictions for every participant in parallel
    const upcomingAll = await Promise.all(
      participants.map((p) => getUpcoming(p.id).then((games) => ({ id: p.id, games }))),
    );
    const upcomingMap = new Map(upcomingAll.map((u) => [u.id, u.games]));

    // Current ranking
    const currentSorted = [...participants].sort((a, b) => b.total_points - a.total_points);
    const currentRankMap = new Map<number, number>();
    for (let i = 0; i < currentSorted.length; i++) {
      const prev = currentSorted[i - 1];
      const rank = prev && prev.total_points === currentSorted[i].total_points
        ? currentRankMap.get(prev.id)!
        : i + 1;
      currentRankMap.set(currentSorted[i].id, rank);
    }

    // Collect all distinct game dates from breakdown entries
    const allDateSet = new Set<string>();
    for (const p of participants) {
      for (const g of p.breakdown) allDateSet.add(g.scheduled_at.slice(0, 10));
    }
    const gameDates = [...allDateSet].sort();

    // For each game date, compute rank at the end of that day (cumulative)
    function rankAtCutoff(cutoffDate: string): Map<number, number> {
      const cutoff = new Date(`${cutoffDate}T23:59:59.999Z`);
      const pts = participants.map((p) => ({
        id: p.id,
        points: p.breakdown
          .filter((g) => new Date(g.scheduled_at) <= cutoff)
          .reduce((sum, g) => sum + g.points, 0),
      }));
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

      const upcoming = upcomingMap.get(p.id) ?? [];
      const allPreds = [
        ...bd.map((g) => ({ h: g.predicted_home, a: g.predicted_away })),
        ...upcoming.map((g) => ({ h: g.predicted_home, a: g.predicted_away })),
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
        pointsPerDay: gameDates.map((date) =>
          bd.filter((g) => g.scheduled_at.slice(0, 10) === date).reduce((s, g) => s + g.points, 0),
        ),
      };
    });

    // Badge helpers
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

    const contraryStats = participants.map((p) => ({
      id: p.id, name: p.name,
      count: p.breakdown.filter((g) => {
        const myO = outcomeOf(g.predicted_home, g.predicted_away);
        return myO !== majorityMap.get(g.game_id) && myO === outcomeOf(g.actual_home, g.actual_away);
      }).length,
    }));

    const consensusStats = participants.map((p) => ({
      id: p.id, name: p.name,
      count: p.breakdown.filter((g) =>
        outcomeOf(g.predicted_home, g.predicted_away) === majorityMap.get(g.game_id),
      ).length,
    }));

    const last3Dates = new Set(gameDates.slice(-3));
    const onFireStats = participants.map((p) => ({
      id: p.id, name: p.name,
      pts: p.breakdown.filter((g) => last3Dates.has(g.scheduled_at.slice(0, 10))).reduce((s, g) => s + g.points, 0),
    }));

    const perfectDayStats = participants.map((p) => {
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
    const trajectoryStats = result.map((p) => {
      const currentRank = p.ranks[p.ranks.length - 1] ?? 0;
      const pastRank = p.ranks[lookbackIdx] ?? currentRank;
      return { id: p.id, name: p.name, rise: pastRank - currentRank, drop: currentRank - pastRank, pastRank, currentRank };
    });

    const daysAtTopStats = result.map((p) => ({
      id: p.id, name: p.name,
      days: rankMaps.filter((m) => m.get(p.id) === 1).length,
    }));

    const badges = [
      {
        id: 'leader', emoji: '👑', name: 'Leader',
        description: 'Currently sitting at #1',
        winners: result.filter((p) => p.currentRank === 1).map(({ id, name }) => ({ id, name })),
      },
      {
        id: 'dominant', emoji: '⭐', name: 'Dominant',
        description: 'Most game days spent at rank #1',
        winners: topWinners(daysAtTopStats, (p) => p.days, (p) => `${p.days}d`),
      },
      {
        id: 'sniper', emoji: '🎯', name: 'Sniper',
        description: 'Most exact score predictions',
        winners: topWinners(result, (p) => p.exact, (p) => `${p.exact} exact`),
      },
      {
        id: 'analyst', emoji: '🧠', name: 'Analyst',
        description: 'Highest outcome accuracy (min 5 games)',
        winners: topWinners(result.filter((p) => p.gamesPlayed >= 5), (p) => p.accuracyPct, (p) => `${p.accuracyPct}%`),
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
        description: 'Most draw predictions',
        winners: topWinners(result, (p) => p.drawPredictions, (p) => `${p.drawPredictions} draws (${p.drawPct}%)`),
      },
      {
        id: 'contrarian', emoji: '🎲', name: 'Contrarian',
        description: 'Most correct picks that went against the crowd',
        winners: topWinners(contraryStats, (p) => p.count, (p) => `${p.count} picks`),
      },
      {
        id: 'consensus', emoji: '🐑', name: 'Consensus',
        description: 'Predictions align most with the group',
        winners: topWinners(consensusStats, (p) => p.count, (p) => `${p.count} matches`),
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

    // Fun facts
    const scorelineCounts = new Map<string, number>();
    const gameStatsMap = new Map<number, { home: string; away: string; correct: number; total: number; totalPts: number }>();
    for (const p of participants) {
      for (const g of p.breakdown) {
        const key = `${g.predicted_home}–${g.predicted_away}`;
        scorelineCounts.set(key, (scorelineCounts.get(key) ?? 0) + 1);
        if (!gameStatsMap.has(g.game_id)) {
          gameStatsMap.set(g.game_id, { home: g.home_team, away: g.away_team, correct: 0, total: 0, totalPts: 0 });
        }
        const s = gameStatsMap.get(g.game_id)!;
        s.total++;
        if (g.categories_awarded.includes('A') || g.categories_awarded.includes('D')) s.correct++;
        s.totalPts += g.points;
      }
    }

    const totalPredictions = [...scorelineCounts.values()].reduce((s, n) => s + n, 0);
    const [topScoreline, topScorelineCount] = [...scorelineCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
    const scorelinePct = totalPredictions > 0 && topScorelineCount ? Math.round(topScorelineCount / totalPredictions * 100) : 0;

    const gameList = [...gameStatsMap.entries()].map(([id, s]) => ({
      id,
      name: `${s.home} vs ${s.away}`,
      accuracyPct: s.total > 0 ? Math.round(s.correct / s.total * 100) : 0,
      avgPts: s.total > 0 ? Math.round(s.totalPts / s.total * 10) / 10 : 0,
    }));
    const byAccuracy = [...gameList].sort((a, b) => a.accuracyPct - b.accuracyPct);
    const hardestGame = byAccuracy[0];
    const easiestGame = byAccuracy[byAccuracy.length - 1];
    const bestScoringGame = [...gameList].sort((a, b) => b.avgPts - a.avgPts)[0];

    const funFacts: { id: string; emoji: string; label: string; value: string }[] = [];
    if (topScoreline) {
      funFacts.push({
        id: 'top_scoreline', emoji: '⚽', label: 'Most predicted scoreline',
        value: `${topScoreline} — chosen in ${scorelinePct}% of all predictions`,
      });
    }
    if (hardestGame) {
      funFacts.push({
        id: 'hardest_game', emoji: '💀', label: 'Hardest game to predict',
        value: `${hardestGame.name} — only ${hardestGame.accuracyPct}% got the outcome right`,
      });
    }
    if (easiestGame && easiestGame.id !== hardestGame?.id) {
      funFacts.push({
        id: 'easiest_game', emoji: '🎁', label: 'Easiest game to predict',
        value: `${easiestGame.name} — ${easiestGame.accuracyPct}% got the outcome right`,
      });
    }
    if (bestScoringGame) {
      funFacts.push({
        id: 'best_scoring', emoji: '💰', label: 'Best scoring game',
        value: `${bestScoringGame.name} — ${bestScoringGame.avgPts} avg pts per participant`,
      });
    }

    res.json({ updatedAt: new Date().toISOString(), participants: result, gameDates, badges, funFacts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to build insights' });
  }
});

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(process.cwd(), 'client/dist');
  app.use(express.static(distPath));
  app.get('/{*path}', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
