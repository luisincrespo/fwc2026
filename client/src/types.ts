export interface GoalEvent {
  team: 'home' | 'away';
  scorer: string;
  minute: string;
  ownGoal: boolean;
  penaltyKick: boolean;
}

export interface MatchPicks {
  home: number;
  draw: number;
  away: number;
  topScores: { score: string; count: number }[];
  total: number;
}

export interface MatchPerformanceEntry {
  name: string;
  predicted: string;
}

export interface MatchPerformance {
  exact: MatchPerformanceEntry[];
  correct: MatchPerformanceEntry[];
  miss: MatchPerformanceEntry[];
  total: number;
}

export interface Venue {
  name: string;
  city: string;
}

export interface LiveMatch {
  homeTeam: string;
  awayTeam: string;
  homeCode: string;
  awayCode: string;
  homeGoals: number;
  awayGoals: number;
  minute: string | null;
  goals: GoalEvent[];
  venue?: Venue;
  performance?: MatchPerformance;
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

export interface ScheduledMatch {
  homeTeam: string;
  awayTeam: string;
  homeCode: string;
  awayCode: string;
  kickoffUtc: string;
  status: 'UPCOMING' | 'LIVE' | 'FINISHED';
  homeGoals: number | null;
  awayGoals: number | null;
  goals: GoalEvent[];
  venue?: Venue;
  picks?: MatchPicks;
  performance?: MatchPerformance;
}

export interface ScheduleResponse {
  updatedAt: string;
  matches: ScheduledMatch[];
  hasPendingResults: boolean;
}

export interface DailyBreakdown {
  homeTeam: string;
  awayTeam: string;
  homeCode: string;
  awayCode: string;
  homeGoals: number;
  awayGoals: number;
  predictedHome: number;
  predictedAway: number;
  points: number;
}

export interface DailyEntry {
  rank: number;
  preTodayRank: number;
  dailyDelta: number;
  id: number;
  name: string;
  pointsToday: number;
  totalPoints: number;
  breakdown: DailyBreakdown[];
}

export interface DailyRecapResponse {
  updatedAt: string;
  todayMatchCount: number;
  leaderboard: DailyEntry[];
}
