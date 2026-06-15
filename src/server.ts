import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { getOfficialLeaderboard, getBracket, getGames } from './services/quiniela.js';
import { getLiveMatches } from './services/footballData.js';
import { calculateLivePoints } from './scoring.js';

const app = express();
app.use(cors());

const MOCK_MATCH = {
  homeTeam: 'Spain',
  awayTeam: 'Cape Verde',
  homeCode: 'es',
  awayCode: 'cv',
  homeGoals: 1,
  awayGoals: 0,
  utcDate: new Date().toISOString(),
};

app.get('/api/live-leaderboard', async (req, res) => {
  try {
    const [{ leaderboard, rules }, fetchedMatches] = await Promise.all([
      getOfficialLeaderboard(),
      getLiveMatches(),
    ]);
    const liveMatches = req.query['mock'] === 'true' ? [MOCK_MATCH] : fetchedMatches;

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

    // Fetch all brackets in parallel to get predictions for live games
    const brackets = await Promise.all(
      leaderboard.map((p) => getBracket(p.id).then((preds) => ({ id: p.id, preds }))),
    );

    const bracketMap = new Map(brackets.map((b) => [b.id, b.preds]));

    // Calculate live points per participant
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
          homeCode: (match as Record<string, unknown>)['homeCode'] ?? pred.home_code,
          awayCode: (match as Record<string, unknown>)['awayCode'] ?? pred.away_code,
          liveHome: match.homeGoals,
          liveAway: match.awayGoals,
          predictedHome: pred.predicted_home,
          predictedAway: pred.predicted_away,
          points,
        });
      }

      return { ...p, livePoints, totalPoints: p.total_points + livePoints, liveBreakdown };
    });

    // Re-rank by live total
    const liveRanked = [...withLive].sort(
      (a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name),
    );

    const liveRankMap = new Map<number, number>();
    for (let i = 0; i < liveRanked.length; i++) {
      const prev = liveRanked[i - 1];
      const rank =
        prev && prev.totalPoints === liveRanked[i].totalPoints
          ? liveRankMap.get(prev.id)!
          : i + 1;
      liveRankMap.set(liveRanked[i].id, rank);
    }

    // Build prediction distribution per live match
    function getDistribution(match: typeof liveMatches[0]) {
      const dist = { home: 0, draw: 0, away: 0 };
      for (const { preds } of brackets) {
        const pred = preds.find(
          (p) => p.home_team === match.homeTeam && p.away_team === match.awayTeam,
        );
        if (!pred || pred.predicted_home === null || pred.predicted_away === null) continue;
        if (pred.predicted_home > pred.predicted_away) dist.home++;
        else if (pred.predicted_home < pred.predicted_away) dist.away++;
        else dist.draw++;
      }
      return dist;
    }

    return res.json({
      updatedAt: new Date().toISOString(),
      liveMatches: liveMatches.map((m) => {
        const anyBracket = brackets[0]?.preds ?? [];
        const pred = anyBracket.find(
          (p) => p.home_team === m.homeTeam && p.away_team === m.awayTeam,
        );
        return {
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          homeCode: (m as Record<string, unknown>)['homeCode'] ?? pred?.home_code ?? '',
          awayCode: (m as Record<string, unknown>)['awayCode'] ?? pred?.away_code ?? '',
          homeGoals: m.homeGoals,
          awayGoals: m.awayGoals,
          distribution: getDistribution(m),
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

app.get('/api/schedule', async (_req, res) => {
  try {
    const allGames = await getGames();
    const today = new Date().toISOString().slice(0, 10);

    const todayGames = allGames.filter((g) => g.scheduled_at.slice(0, 10) === today);

    const matches = todayGames.map((g) => {
      const elapsedMin = (Date.now() - new Date(g.scheduled_at).getTime()) / 60000;
      let status: 'UPCOMING' | 'LIVE' | 'FINISHED';
      if (g.is_completed) status = 'FINISHED';
      else if (elapsedMin >= 0 && elapsedMin < 110) status = 'LIVE';
      else status = 'UPCOMING';

      return {
        homeTeam: g.home_team_name,
        awayTeam: g.away_team_name,
        homeCode: g.home_flag,
        awayCode: g.away_flag,
        kickoffUtc: g.scheduled_at,
        status,
        homeGoals: g.actual_home_score,
        awayGoals: g.actual_away_score,
      };
    });

    res.json({ updatedAt: new Date().toISOString(), matches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(process.cwd(), 'client/dist');
  app.use(express.static(distPath));
  app.get('/{*path}', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
