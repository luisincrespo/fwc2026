import type { LiveLeaderboardResponse, ScheduleResponse, DailyRecapResponse } from './types';

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
  const res = await fetch(`/api/live-leaderboard?${params}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function fetchSchedule(bust = false): Promise<ScheduleResponse> {
  const { from, to } = todayRange();
  const params = new URLSearchParams({ from, to });
  if (bust) params.set('bust', 'true');
  const res = await fetch(`/api/schedule?${params}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function fetchDailyRecap(bust = false): Promise<DailyRecapResponse> {
  const { from, to } = todayRange();
  const params = new URLSearchParams({ from, to });
  if (bust) params.set('bust', 'true');
  const res = await fetch(`/api/daily-recap?${params}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}
