'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Loader2, Trophy } from 'lucide-react';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { TokenManager } from '@/lib/api/auth';
import { FEED_SERVICE_URL } from '@/lib/api/config';

interface LeaderboardUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  totalPoints: number;
}

interface Contributor {
  id: string;
  name: string;
  role: string;
  points: number;
  rank: number;
}

const rankStyles = {
  first: 'bg-yellow-100 text-yellow-700',
  second: 'bg-gray-100 text-gray-600',
  third: 'bg-orange-100 text-orange-600',
  default: 'bg-gray-50 text-gray-500',
};

export default function ContributorLeaderboardPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  const tFeed = useTranslations('feed');
  const tCommon = useTranslations('common');

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const userData = TokenManager.getUserData();
    setCurrentUser(userData?.user || null);
    setSchool(userData?.school || null);
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = TokenManager.getAccessToken();
      if (!token) {
        router.push(`/${locale}/auth/login`);
        return;
      }

      const response = await TokenManager.fetchWithAuth(
        `${FEED_SERVICE_URL}/users/leaderboard?limit=50&period=${period}`
      );

      const responseText = await response.text();
      let data: any = {};
      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          data = {};
        }
      }

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to load leaderboard');
      }

      const mappedContributors = ((data?.leaderboard || []) as LeaderboardUser[]).map((user, index) => ({
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User',
        role: user.role || 'STUDENT',
        points: Number(user.totalPoints || 0),
        rank: index + 1,
      }));

      setContributors(mappedContributors);
    } catch (fetchError) {
      console.error('Error fetching contributor leaderboard:', fetchError);
      setError('load_failed');
      setContributors([]);
    } finally {
      setLoading(false);
    }
  }, [locale, period, router]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

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
    <div className="min-h-screen bg-gray-50">
      <UnifiedNavigation user={currentUser} school={school} onLogout={handleLogout} />

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <Link
            href={`/${locale}/feed`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#F9A825] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {tCommon('back')}
          </Link>

          <div className="flex text-xs">
            <button
              onClick={() => setPeriod('week')}
              className={`px-2.5 py-1 rounded-l border ${
                period === 'week' ? 'bg-amber-50 border-[#F9A825] text-[#F9A825]' : 'border-gray-200 text-gray-500'
              }`}
            >
              {tFeed('widgets.topContributors.week')}
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-2.5 py-1 rounded-r border-t border-r border-b ${
                period === 'month' ? 'bg-amber-50 border-[#F9A825] text-[#F9A825]' : 'border-gray-200 text-gray-500'
              }`}
            >
              {tFeed('widgets.topContributors.month')}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#F9A825]" />
            <h1 className="text-lg font-semibold text-gray-900">
              {tFeed('widgets.topContributors.title')}
            </h1>
          </div>

          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="px-5 py-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-[#F9A825]" />
              </div>
            ) : error ? (
              <div className="px-5 py-10 text-center text-sm text-gray-500">
                {error === 'load_failed' ? tFeed('widgets.topContributors.loadFailed') : error}
              </div>
            ) : contributors.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-500">
                {tFeed('widgets.topContributors.noContributors')}
              </div>
            ) : (
              contributors.map((contributor) => (
                <div key={contributor.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${getRankStyle(contributor.rank)}`}>
                    {contributor.rank}
                  </div>

                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-sm font-semibold flex items-center justify-center flex-shrink-0">
                    {contributor.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{contributor.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{getRoleLabel(contributor.role)}</p>
                  </div>

                  <div className="text-sm font-semibold text-gray-700">
                    {contributor.points.toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
