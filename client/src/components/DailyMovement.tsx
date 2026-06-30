import type { DailyRecapResponse, DailyEntry, DailyBreakdown, GroupBonus, KoBonus } from '../types';
import { BaseLeaderboard, type ColumnDef } from './BaseLeaderboard';
import { MatchBreakdownRow } from './MatchBreakdownRow';
import { COLOR_RANK_1, COLOR_RANK_2, COLOR_RANK_3, COLOR_CORRECT_LIVE, COLOR_MISS, COLOR_RANK_DOWN_SOFT } from '../lib/colors';

interface Props {
  data: DailyRecapResponse | null;
  loading: boolean;
}

const KO_CAT_LABEL: Record<string, string> = {
  F: 'Reached R32', G: 'Reached R16', H: 'Reached QF', I: 'Reached SF', J: 'Reached Final', K: 'Champion',
};

function BreakdownRow({ pred }: { pred: DailyBreakdown }) {
  return (
    <MatchBreakdownRow
      homeTeam={pred.homeTeam} awayTeam={pred.awayTeam}
      homeCode={pred.homeCode} awayCode={pred.awayCode}
      homeGoals={pred.homeGoals} awayGoals={pred.awayGoals}
      predictedHome={pred.predictedHome} predictedAway={pred.predictedAway}
      points={pred.points}
      scoreLabel="Result"
      colSpan={4}
      predictedHomeTeam={pred.predictedHomeTeam}
      predictedAwayTeam={pred.predictedAwayTeam}
      predictedHomeCode={pred.predictedHomeCode}
      predictedAwayCode={pred.predictedAwayCode}
    />
  );
}

function KoBonusRow({ bonus }: { bonus: KoBonus }) {
  const label = KO_CAT_LABEL[bonus.category] ?? bonus.category;
  return (
    <tr>
      <td colSpan={4} style={{ padding: '4px 8px 4px 28px', background: '#0f172a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#94a3b8' }}>
          <img
            src={`https://flagcdn.com/20x15/${bonus.flagCode}.png`}
            alt={bonus.teamName}
            style={{ width: 20, height: 15, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }}
          />
          <span style={{ fontWeight: 600 }}>{bonus.teamName}</span>
          <span style={{ color: '#475569' }}>·</span>
          <span>{label}</span>
          <span style={{ marginLeft: 'auto', color: COLOR_CORRECT_LIVE, fontWeight: 600 }}>
            +{bonus.points}
          </span>
        </div>
      </td>
    </tr>
  );
}

function GroupBonusRow({ bonus }: { bonus: GroupBonus }) {
  const label = bonus.points > 0
    ? `${bonus.correct}/4 positions correct`
    : 'No positions correct';
  return (
    <tr>
      <td colSpan={4} style={{ padding: '4px 8px 4px 28px', background: '#0f172a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#94a3b8' }}>
          <span style={{ color: '#475569', fontWeight: 600, minWidth: 64 }}>Group {bonus.group}</span>
          <span>Group standings bonus</span>
          <span style={{ color: '#475569' }}>·</span>
          <span>{label}</span>
          <span style={{ marginLeft: 'auto', color: bonus.points > 0 ? COLOR_CORRECT_LIVE : COLOR_MISS, fontWeight: 600 }}>
            {bonus.points > 0 ? `+${bonus.points}` : '—'}
          </span>
        </div>
      </td>
    </tr>
  );
}

const columns: ColumnDef<DailyEntry>[] = [
  {
    header: '#',
    align: 'left',
    width: 48,
    tdStyle: (e) => ({
      fontWeight: e.rank <= 3 ? 700 : 400,
      color: e.rank === 1 ? COLOR_RANK_1 : e.rank === 2 ? COLOR_RANK_2 : e.rank === 3 ? COLOR_RANK_3 : '#e2e8f0',
    }),
    render: (e) => e.rank,
  },
  {
    header: 'Name',
    align: 'left',
    tdStyle: (e) => ({ fontWeight: e.rank <= 3 ? 600 : 400 }),
    render: (e, isExpanded) => (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {e.name}
        {(e.breakdown.length > 0 || (e.groupBonuses?.length ?? 0) > 0 || (e.koBonuses?.length ?? 0) > 0) && (
          <span style={{ color: '#475569', fontSize: 11 }}>{isExpanded ? '▲' : '▼'}</span>
        )}
      </span>
    ),
  },
  {
    header: 'Pts today',
    tdStyle: (e) => ({ color: e.pointsToday > 0 ? COLOR_CORRECT_LIVE : COLOR_MISS, fontWeight: e.pointsToday > 0 ? 700 : 400 }),
    render: (e) => e.pointsToday > 0 ? `+${e.pointsToday}` : '—',
  },
  {
    header: 'Move',
    render: (e) => e.dailyDelta > 0 ? (
      <span style={{ color: COLOR_CORRECT_LIVE, fontWeight: 700 }}>▲{e.dailyDelta}</span>
    ) : e.dailyDelta < 0 ? (
      <span style={{ color: COLOR_RANK_DOWN_SOFT, fontWeight: 700 }}>▼{Math.abs(e.dailyDelta)}</span>
    ) : (
      <span style={{ color: COLOR_MISS }}>—</span>
    ),
  },
  {
    header: 'Total',
    tdStyle: (e) => ({ fontWeight: e.rank <= 3 ? 700 : 400 }),
    render: (e) => e.totalPoints,
  },
];

export function DailyMovement({ data, loading }: Props) {
  if (loading) {
    return <div style={{ color: '#64748b', fontSize: 14, padding: '16px 0' }}>Loading…</div>;
  }

  if (!data) return null;

  if (data.todayMatchCount === 0) {
    return (
      <div style={{
        background: '#1e293b',
        borderRadius: 8,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 14,
      }}>
        <span>⏸</span>
        <span style={{ color: '#94a3b8' }}>No completed matches today yet — check back after the first game.</span>
      </div>
    );
  }

  return (
    <BaseLeaderboard
      entries={data.leaderboard}
      columns={columns}
      isExpandable={(e) => e.breakdown.length > 0 || (e.groupBonuses?.length ?? 0) > 0 || (e.koBonuses?.length ?? 0) > 0}
      renderExpanded={(e) => (
        <>
          {e.breakdown.map((pred, j) => <BreakdownRow key={j} pred={pred} />)}
          {e.groupBonuses?.map((bonus, j) => <GroupBonusRow key={j} bonus={bonus} />)}
          {e.koBonuses?.map((bonus, j) => <KoBonusRow key={j} bonus={bonus} />)}
        </>
      )}
    />
  );
}
