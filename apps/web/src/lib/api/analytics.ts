import { TokenManager } from '@/lib/api/auth';
import { ANALYTICS_SERVICE_URL } from '@/lib/api/config';

export type StreakScope = 'school' | 'class' | 'club';

export interface StreakLeaderEntry {
  rank: number;
  userId: string;
  name: string;
  avatar: string | null;
  currentStreak: number;
  longestStreak: number;
  isMe: boolean;
}

export interface StreakLeaderboard {
  scope: StreakScope;
  entries: StreakLeaderEntry[];
  myRank: number | null;
  myStreak: number;
}

export interface StreakFreezeResult {
  success: boolean;
  currentStreak?: number;
  freezesAvailable?: number;
  weekActivity?: boolean[];
  studiedToday?: boolean;
  streakAtRisk?: boolean;
}

async function authJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await TokenManager.fetchWithAuth(url, init);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function postStreakFreeze(): Promise<StreakFreezeResult | null> {
  const data = await authJson<any>(`${ANALYTICS_SERVICE_URL}/streak/freeze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!data) return null;
  const streak = data.streak ?? data.data?.streak ?? data;
  return {
    success: Boolean(data.success ?? true),
    currentStreak: Number(streak?.currentStreak ?? data.currentStreak ?? 0),
    freezesAvailable: Number(
      streak?.freezesAvailable ?? data.freezesAvailable ?? 0,
    ),
    weekActivity: data.weekActivity ?? streak?.weekActivity,
    studiedToday: data.studiedToday ?? streak?.studiedToday,
    streakAtRisk: data.streakAtRisk ?? streak?.streakAtRisk,
  };
}

export async function getStreakLeaderboard(
  scope: StreakScope,
): Promise<StreakLeaderboard> {
  const data = await authJson<any>(
    `${ANALYTICS_SERVICE_URL}/streak/leaderboard?scope=${encodeURIComponent(scope)}`,
  );
  const d = data?.data ?? data ?? {};
  return {
    scope,
    entries: Array.isArray(d.entries) ? d.entries : [],
    myRank: d.myRank ?? null,
    myStreak: Number(d.myStreak ?? 0),
  };
}

export async function getGlobalStanding(): Promise<{ rank: number | null }> {
  const data = await authJson<any>(
    `${ANALYTICS_SERVICE_URL}/leaderboard/global?page=1&limit=1`,
  );
  const d = data?.data ?? data ?? {};
  const rank =
    d.userStanding?.rank ??
    d.myRank ??
    d.userRank ??
    d.rank ??
    d.standing?.rank ??
    null;
  return { rank: typeof rank === 'number' ? rank : null };
}
