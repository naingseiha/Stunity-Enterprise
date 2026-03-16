'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  Loader2,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import { FEED_SERVICE_URL } from '@/lib/api/config';

interface Contributor {
  id: string;
  name: string;
  role: string;
  points: number;
  rank: number;
}

interface LeaderboardUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  totalPoints: number;
}

const rankStyles = {
  first: 'bg-yellow-100 text-yellow-700',
  second: 'bg-gray-100 text-gray-600',
  third: 'bg-orange-100 text-orange-600',
  default: 'bg-gray-50 text-gray-500',
};

export default function TopContributorsWidget() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const tFeed = useTranslations('feed');
  const tCommon = useTranslations('common');
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = TokenManager.getAccessToken();
        if (!token) {
          if (mounted) {
            setContributors([]);
            setLoading(false);
          }
          return;
        }

        const response = await TokenManager.fetchWithAuth(
          `${FEED_SERVICE_URL}/users/leaderboard?limit=4&period=${period}`
        );

        const responseText = await response.text();
        const data = responseText ? JSON.parse(responseText) : {};

        if (!response.ok || !data?.success) {
          const message = data?.error || 'Failed to load contributors';
          throw new Error(message);
        }

        const mappedContributors = ((data?.leaderboard || []) as LeaderboardUser[])
          .slice(0, 4)
          .map((user, index) => ({
            id: user.id,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User',
            role: user.role || 'STUDENT',
            points: Number(user.totalPoints || 0),
            rank: index + 1,
          }));

        if (mounted) {
          setContributors(mappedContributors);
        }
      } catch (fetchError) {
        console.error('Error fetching contributors:', fetchError);
        if (mounted) {
          setError('load_failed');
          setContributors([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchLeaderboard();

    return () => {
      mounted = false;
    };
  }, [period]);

  const getRoleLabel = (role: string) => {
    const normalizedRole = role.toLowerCase();
    if (normalizedRole === 'teacher') return tCommon('teacher');
    if (normalizedRole === 'student') return tFeed('widgets.topContributors.student');
    return role;
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return rankStyles.first;
    if (rank === 2) return rankStyles.second;
    if (rank === 3) return rankStyles.third;
    return rankStyles.default;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header - Simple */}
      <div className="px-3 py-2.5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm">{tFeed('widgets.topContributors.title')}</h3>
          <div className="flex text-xs">
            <button
              onClick={() => setPeriod('week')}
              className={`px-2 py-0.5 rounded-l border ${
                period === 'week' ? 'bg-amber-50 border-[#F9A825] text-[#F9A825]' : 'border-gray-200 text-gray-500'
              }`}
            >
              {tFeed('widgets.topContributors.week')}
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-2 py-0.5 rounded-r border-t border-r border-b ${
                period === 'month' ? 'bg-amber-50 border-[#F9A825] text-[#F9A825]' : 'border-gray-200 text-gray-500'
              }`}
            >
              {tFeed('widgets.topContributors.month')}
            </button>
          </div>
        </div>
      </div>

      {/* Contributors List */}
      <div className="divide-y divide-gray-50">
        {loading ? (
          <div className="px-3 py-5 flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-[#F9A825]" />
          </div>
        ) : error ? (
          <div className="px-3 py-4 text-center text-xs text-gray-500">
            {error === 'load_failed' ? tFeed('widgets.topContributors.loadFailed') : error}
          </div>
        ) : contributors.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-gray-500">
            {tFeed('widgets.topContributors.noContributors')}
          </div>
        ) : (
          contributors.map((contributor) => {
          return (
            <div
              key={contributor.id}
              className="px-3 py-2 flex items-center gap-2.5 hover:bg-gray-50 transition-colors"
            >
              {/* Rank */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${getRankStyle(contributor.rank)}`}>
                {contributor.rank}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 text-xs truncate">
                  {contributor.name}
                </h4>
                <p className="text-[11px] text-gray-400 capitalize">{getRoleLabel(contributor.role)}</p>
              </div>

              {/* Points */}
              <span className="text-xs font-medium text-gray-500">{contributor.points.toLocaleString()}</span>
            </div>
          );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-gray-100">
        <Link
          href={`/${locale}/leaderboard`}
          className="text-xs text-gray-500 hover:text-[#F9A825] transition-colors"
        >
          {tFeed('widgets.topContributors.viewLeaderboard')} →
        </Link>
      </div>
    </div>
  );
}
