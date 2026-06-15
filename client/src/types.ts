export interface LiveMatch {
  homeTeam: string;
  awayTeam: string;
  homeCode: string;
  awayCode: string;
  homeGoals: number;
  awayGoals: number;
  distribution: { home: number; draw: number; away: number };
}

export interface LivePrediction {
  homeTeam: string;
  awayTeam: string;
  homeCode: string;
  awayCode: string;
  liveHome: number;
  liveAway: number;
  predictedHome: number;
  predictedAway: number;
  points: number;
}

export interface LeaderboardEntry {
  rank: number;
  rankDelta: number;
  id: number;
  name: string;
  officialPoints: number;
  livePoints: number;
  totalPoints: number;
  liveBreakdown: LivePrediction[];
}

export interface LiveLeaderboardResponse {
  updatedAt: string;
  liveMatches: LiveMatch[];
  leaderboard: LeaderboardEntry[];
}
