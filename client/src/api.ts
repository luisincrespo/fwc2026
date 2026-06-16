import type { LiveLeaderboardResponse, ScheduleResponse, DailyRecapResponse } from './types';

export async function fetchLeaderboard(): Promise<LiveLeaderboardResponse> {
  const mock = new URLSearchParams(window.location.search).get('mock');
  const url = mock === 'true' ? '/api/live-leaderboard?mock=true' : '/api/live-leaderboard';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

function todayRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
  return { from, to };
}

export async function fetchSchedule(): Promise<ScheduleResponse> {
  const { from, to } = todayRange();
  const res = await fetch(`/api/schedule?from=${from}&to=${to}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function fetchDailyRecap(): Promise<DailyRecapResponse> {
  const { from, to } = todayRange();
  const res = await fetch(`/api/daily-recap?from=${from}&to=${to}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}
