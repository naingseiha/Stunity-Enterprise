'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Flame, Trophy } from 'lucide-react';
import {
  getStreakLeaderboard,
  type StreakLeaderEntry,
  type StreakScope,
} from '@/lib/api/analytics';
import { STREAK_LEADERBOARD_ENABLED } from '@/lib/feature-flags';

const SCOPES: StreakScope[] = ['class', 'club', 'school'];
const TOP_N = 10;

interface StreakLeaderboardProps {
  profileUserId?: string;
  currentUserId?: string;
  isKm?: boolean;
}

export default function StreakLeaderboardWidget({
  profileUserId,
  currentUserId,
  isKm = false,
}: StreakLeaderboardProps) {
  const isOwn =
    !!currentUserId && (!profileUserId || profileUserId === currentUserId || profileUserId === 'me');
  const [scope, setScope] = useState<StreakScope>('class');
  const [entries, setEntries] = useState<StreakLeaderEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOwn || !STREAK_LEADERBOARD_ENABLED) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getStreakLeaderboard(scope)
      .then((data) => {
        if (cancelled) return;
        setEntries(data.entries);
        setMyRank(data.myRank);
      })
      .catch(() => {
        if (!cancelled) {
          setEntries([]);
          setMyRank(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope, isOwn]);

  if (!isOwn || !STREAK_LEADERBOARD_ENABLED) return null;

  const top = entries.slice(0, TOP_N);
  const meInTop = top.some((e) => e.isMe);
  const me = entries.find((e) => e.isMe);

  const scopeLabel = (s: StreakScope) => {
    if (s === 'class') return isKm ? 'ថ្នាក់' : 'Class';
    if (s === 'club') return isKm ? 'ក្លឹប' : 'Club';
    return isKm ? 'សាលា' : 'School';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
          <Trophy className="w-4 h-4 text-orange-500" />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">
            {isKm ? 'តារាង streak' : 'Streak leaderboard'}
          </h3>
          {myRank != null && (
            <p className="text-[11px] text-slate-500">
              {isKm ? `ចំណាត់ថ្នាក់ #${myRank}` : `Your rank #${myRank}`}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 mb-3">
        {SCOPES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
              scope === s
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500'
            }`}
          >
            {scopeLabel(s)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-slate-400">
          {isKm ? 'កំពុងផ្ទុក…' : 'Loading…'}
        </div>
      ) : top.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-400">
          {isKm ? 'មិនទាន់មានទិន្នន័យ' : 'No streak data yet'}
        </p>
      ) : (
        <div className="space-y-1">
          {top.map((entry) => (
            <Row key={entry.userId} entry={entry} isKm={isKm} />
          ))}
          {!meInTop && me && (
            <>
              <div className="border-t border-dashed border-slate-200 dark:border-slate-700 my-2" />
              <Row entry={me} isKm={isKm} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ entry, isKm }: { entry: StreakLeaderEntry; isKm: boolean }) {
  const medal =
    entry.rank === 1 ? '#F59E0B' : entry.rank === 2 ? '#9CA3AF' : entry.rank === 3 ? '#B45309' : null;

  return (
    <div
      className={`flex items-center gap-2.5 px-2 py-2 rounded-xl ${
        entry.isMe ? 'bg-orange-50 dark:bg-orange-500/10' : ''
      }`}
    >
      <div className="w-6 flex items-center justify-center shrink-0">
        {medal ? (
          <Trophy className="w-4 h-4" style={{ color: medal }} />
        ) : (
          <span className="text-xs font-bold text-slate-400">{entry.rank}</span>
        )}
      </div>
      <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0">
        {entry.avatar ? (
          <Image src={entry.avatar} alt="" width={32} height={32} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-500">
            {entry.name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
      <p className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
        {entry.name}
        {entry.isMe ? (
          <span className="text-[10px] text-orange-600 font-bold ml-1">
            · {isKm ? 'អ្នក' : 'you'}
          </span>
        ) : null}
      </p>
      <div className="inline-flex items-center gap-1 text-orange-600 font-bold text-xs tabular-nums">
        <Flame className="w-3.5 h-3.5" />
        {entry.currentStreak}
      </div>
    </div>
  );
}
