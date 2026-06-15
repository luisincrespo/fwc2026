import type { LiveLeaderboardResponse, ScheduleResponse } from './types';

export async function fetchLeaderboard(): Promise<LiveLeaderboardResponse> {
  const mock = new URLSearchParams(window.location.search).get('mock');
  const url = mock === 'true' ? '/api/live-leaderboard?mock=true' : '/api/live-leaderboard';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function fetchSchedule(): Promise<ScheduleResponse> {
  const res = await fetch('/api/schedule');
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}
