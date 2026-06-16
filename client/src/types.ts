export interface GoalEvent {
  team: 'home' | 'away';
  scorer: string;
  minute: string;
  ownGoal: boolean;
  penaltyKick: boolean;
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
}

export interface ScheduleResponse {
  updatedAt: string;
  matches: ScheduledMatch[];
}

export interface DailyEntry {
  rank: number;
  preTodayRank: number;
  dailyDelta: number;
  id: number;
  name: string;
  pointsToday: number;
  totalPoints: number;
}

export interface DailyRecapResponse {
  updatedAt: string;
  todayMatchCount: number;
  leaderboard: DailyEntry[];
}
