import 'dotenv/config';
import axios from 'axios';

const client = axios.create({
  baseURL: 'https://api.football-data.org/v4',
  headers: {
    'X-Auth-Token': process.env.FOOTBALL_DATA_API_TOKEN,
  },
});

function isLikelyStillLive(utcDate: string): boolean {
  const kickoff = new Date(utcDate).getTime();
  const elapsed = (Date.now() - kickoff) / 1000 / 60;
  return elapsed < 110;
}

async function getLiveScores() {
  const res = await client.get('/competitions/WC/matches', {
    params: { status: 'LIVE' },
  });

  const matches = res.data.matches.filter((m: any) => isLikelyStillLive(m.utcDate));

  console.log(JSON.stringify(matches, null, 2));
}

getLiveScores();
