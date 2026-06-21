import type { LiveLeaderboardResponse, ScheduleResponse, DailyRecapResponse, InsightsResponse, UpcomingPrediction } from './types';

function todayRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
  return { from, to };
}

export async function fetchLeaderboard(bust = false): Promise<LiveLeaderboardResponse> {
  const mock = new URLSearchParams(window.location.search).get('mock');
  const params = new URLSearchParams();
  if (mock === 'true') params.set('mock', 'true');
  if (bust) params.set('bust', 'true');
  const res = await fetch(`/api/leaderboard?${params}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function fetchSchedule(bust = false): Promise<ScheduleResponse> {
  const { from, to } = todayRange();
  const params = new URLSearchParams({ from, to });
  if (bust) params.set('bust', 'true');
  const mock = new URLSearchParams(window.location.search).get('mock');
  if (mock === 'true') params.set('mock', 'true');
  const res = await fetch(`/api/schedule?${params}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function fetchDailyRecap(bust = false): Promise<DailyRecapResponse> {
  const { from, to } = todayRange();
  const params = new URLSearchParams({ from, to });
  if (bust) params.set('bust', 'true');
  const mock = new URLSearchParams(window.location.search).get('mock');
  if (mock === 'true') params.set('mock', 'true');
  const res = await fetch(`/api/daily-recap?${params}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function fetchParticipantUpcoming(participantId: number): Promise<UpcomingPrediction[]> {
  const res = await fetch(`/api/upcoming/${participantId}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json() as { predictions: UpcomingPrediction[] };
  return data.predictions;
}

export async function fetchAltLeaderboard(bust = false): Promise<LiveLeaderboardResponse> {
  const mock = new URLSearchParams(window.location.search).get('mock');
  const params = new URLSearchParams();
  if (mock === 'true') params.set('mock', 'true');
  if (bust) params.set('bust', 'true');
  const res = await fetch(`/api/alt-leaderboard?${params}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function fetchInsights(bust = false): Promise<InsightsResponse> {
  const params = new URLSearchParams();
  if (bust) params.set('bust', 'true');
  const res = await fetch(`/api/insights?${params}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}
