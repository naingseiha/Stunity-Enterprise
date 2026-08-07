'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock, Users, Zap } from 'lucide-react';
import type { QuizWar } from '@/lib/feed-smart-scroll-types';

const formatMMSS = (totalSec: number): string => {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

interface QuizWarBannerProps {
  war: QuizWar;
  onJoin?: (warId: string) => void;
}

export default function QuizWarBanner({ war, onJoin }: QuizWarBannerProps) {
  const [remainingSec, setRemainingSec] = useState(war.timeRemainingSec);

  useEffect(() => {
    setRemainingSec(war.timeRemainingSec);
  }, [war.timeRemainingSec]);

  useEffect(() => {
    if (war.status !== 'LIVE') return;
    const id = window.setInterval(() => {
      setRemainingSec((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [war.status]);

  const { aPercent, bPercent } = useMemo(() => {
    const total = Math.max(1, war.teamA.score + war.teamB.score);
    const a = Math.round((war.teamA.score / total) * 100);
    return { aPercent: a, bPercent: 100 - a };
  }, [war.teamA.score, war.teamB.score]);

  const userTeam =
    war.userTeamId === war.teamA.id ? 'A' : war.userTeamId === war.teamB.id ? 'B' : null;

  return (
    <article className="feed-card-mobile quiz-war-card-mobile bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-white/10 px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0 text-red-600">
          <Zap className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Quiz War</h3>
            {war.status === 'LIVE' && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/30 text-red-600 text-[10px] font-black tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                LIVE
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{war.subject}</p>
        </div>
        {war.status === 'LIVE' && (
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-300">
            <Clock className="w-3.5 h-3.5" />
            {formatMMSS(remainingSec)}
          </div>
        )}
      </div>

      <div className="my-3 h-px bg-gray-100 dark:bg-white/10" />

      <p className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">
        Round {war.round} of {war.totalRounds}
      </p>

      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xl font-black text-gray-900 dark:text-gray-100">{war.teamA.score}</p>
          <p className="text-xs text-gray-500 truncate">
            <span
              className="inline-block w-2 h-2 rounded-full mr-1"
              style={{ backgroundColor: war.teamA.color }}
            />
            {war.teamA.name}
            {userTeam === 'A' ? ' (Your Class)' : ''}
          </p>
        </div>
        <span className="text-[11px] font-black text-gray-400 tracking-widest">VS</span>
        <div className="flex-1 min-w-0 text-right">
          <p className="text-xl font-black text-gray-900 dark:text-gray-100">{war.teamB.score}</p>
          <p className="text-xs text-gray-500 truncate">
            {war.teamB.name}
            {userTeam === 'B' ? ' (Your Class)' : ''}
            <span
              className="inline-block w-2 h-2 rounded-full ml-1"
              style={{ backgroundColor: war.teamB.color }}
            />
          </p>
        </div>
      </div>

      <div className="mt-3 h-2.5 rounded-full overflow-hidden flex bg-gray-100 dark:bg-gray-800">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${aPercent}%`, backgroundColor: war.teamA.color }}
        />
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${bPercent}%`, backgroundColor: war.teamB.color }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
          <Users className="w-3.5 h-3.5" />
          {war.classmatesFighting} fighting · +{war.rewardXp} XP
        </span>
        {!war.isUserParticipating ? (
          <button
            type="button"
            onClick={() => onJoin?.(war.id)}
            className="px-4 py-2 rounded-full text-sm font-bold text-white bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 transition-colors"
          >
            Join War
          </button>
        ) : (
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">You&apos;re in!</span>
        )}
      </div>
    </article>
  );
}
