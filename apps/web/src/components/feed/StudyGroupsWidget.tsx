'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Users,
  Lock,
  Globe,
  Plus,
  BookOpen,
  Code,
  FlaskConical,
  Rocket,
  GraduationCap,
  Languages,
  Trophy,
  UserPlus,
  Loader2,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import { FEED_SERVICE_URL } from '@/lib/api/config';

interface StudyClub {
  id: string;
  name: string;
  clubType: string;
  privacy: string;
  _count: {
    members: number;
    posts: number;
  };
  isMember?: boolean;
}

const CLUB_TYPE_ICONS: Record<string, React.ReactNode> = {
  CASUAL_STUDY_GROUP: <Users className="w-4 h-4" />,
  STRUCTURED_CLASS: <GraduationCap className="w-4 h-4" />,
  PROJECT_GROUP: <Rocket className="w-4 h-4" />,
  EXAM_PREP: <Trophy className="w-4 h-4" />,
  SUBJECT: <BookOpen className="w-4 h-4" />,
  SKILL: <Code className="w-4 h-4" />,
  RESEARCH: <FlaskConical className="w-4 h-4" />,
  PROJECT: <Rocket className="w-4 h-4" />,
  LANGUAGE: <Languages className="w-4 h-4" />,
  COMPETITION: <Trophy className="w-4 h-4" />,
  TUTORING: <UserPlus className="w-4 h-4" />,
};

const CLUB_AVATAR_GRADIENTS = [
  'from-[#F9A825] to-[#FFB74D]',
  'from-teal-400 to-cyan-400',
  'from-rose-400 to-pink-500',
  'from-violet-400 to-purple-500',
  'from-blue-400 to-indigo-500',
  'from-emerald-400 to-green-500',
];

function getClubAvatarGradient(index: number): string {
  return CLUB_AVATAR_GRADIENTS[index % CLUB_AVATAR_GRADIENTS.length];
}

export default function StudyGroupsWidget() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const tFeed = useTranslations('feed');
  const [clubs, setClubs] = useState<StudyClub[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) fetchClubs();
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const fetchClubs = async () => {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) return;

      // Fetch user's clubs
      const response = await fetch(`${FEED_SERVICE_URL}/clubs?limit=4`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setClubs(data.clubs.slice(0, 4));
      }
    } catch (error) {
      console.error('Error fetching clubs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClub = async (clubId: string) => {
    try {
      const token = TokenManager.getAccessToken();
      const response = await fetch(`${FEED_SERVICE_URL}/clubs/${clubId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        fetchClubs();
      }
    } catch (error) {
      console.error('Error joining club:', error);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Users className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{tFeed('widgets.studyClubs.title')}</h3>
        </div>
        <Link
          href={`/${locale}/clubs`}
          className="text-xs text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 font-medium flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          {tFeed('widgets.studyClubs.join')}
        </Link>
      </div>

      {/* Clubs List */}
      <div className="divide-y divide-gray-50 dark:divide-gray-800">
        {loading ? (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
                  <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : clubs.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-100 dark:from-amber-900/30 to-orange-100 dark:to-orange-900/30 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-amber-500" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{tFeed('widgets.studyClubs.noClubs')}</p>
            <Link
              href={`/${locale}/clubs`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-xs font-medium hover:from-amber-600 hover:to-orange-600 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              {tFeed('widgets.studyClubs.discover')}
            </Link>
          </div>
        ) : (
          clubs.map((club, index) => {
            const clubGradient = getClubAvatarGradient(index);
            return (
              <Link
                key={club.id}
                href={`/${locale}/clubs/${club.id}`}
                className="px-4 py-3 flex items-center gap-3 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors"
              >
                {/* Club Icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${clubGradient}`}>
                  <span className="text-white">
                    {CLUB_TYPE_ICONS[club.clubType] || <Users className="w-4 h-4" />}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{club.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {club._count.members}
                    </span>
                    <span>•</span>
                    <span>{tFeed('widgets.studyClubs.posts', { count: club._count.posts })}</span>
                  </div>
                </div>

                {/* Privacy Icon */}
                {club.privacy === 'PRIVATE' || club.privacy === 'SECRET' ? (
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-gray-400" />
                )}
              </Link>
            );
          })
        )}
      </div>

      {/* Footer */}
      {clubs.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
          <Link
            href={`/${locale}/clubs`}
            className="text-xs text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-500 transition-colors font-medium flex items-center justify-center gap-1"
          >
            {tFeed('widgets.studyClubs.viewAll')}
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
