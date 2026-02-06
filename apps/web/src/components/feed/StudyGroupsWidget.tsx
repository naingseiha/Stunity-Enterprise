'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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

const CLUB_TYPE_COLORS: Record<string, string> = {
  SUBJECT: 'from-blue-400 to-indigo-500',
  SKILL: 'from-purple-400 to-pink-500',
  RESEARCH: 'from-teal-400 to-cyan-500',
  PROJECT: 'from-orange-400 to-red-500',
  EXAM_PREP: 'from-rose-400 to-pink-500',
  LANGUAGE: 'from-green-400 to-emerald-500',
  COMPETITION: 'from-amber-400 to-orange-500',
  TUTORING: 'from-indigo-400 to-purple-500',
};

const CLUB_TYPE_ICONS: Record<string, React.ReactNode> = {
  SUBJECT: <BookOpen className="w-4 h-4" />,
  SKILL: <Code className="w-4 h-4" />,
  RESEARCH: <FlaskConical className="w-4 h-4" />,
  PROJECT: <Rocket className="w-4 h-4" />,
  EXAM_PREP: <GraduationCap className="w-4 h-4" />,
  LANGUAGE: <Languages className="w-4 h-4" />,
  COMPETITION: <Trophy className="w-4 h-4" />,
  TUTORING: <UserPlus className="w-4 h-4" />,
};

export default function StudyGroupsWidget() {
  const [clubs, setClubs] = useState<StudyClub[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) return;

      // Fetch user's clubs
      const response = await fetch('http://localhost:3010/clubs/my-clubs?limit=4', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setClubs(data.slice(0, 4));
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
      const response = await fetch(`http://localhost:3010/clubs/${clubId}/join`, {
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-amber-50/50 to-orange-50/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Users className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold text-gray-900">Study Clubs</h3>
        </div>
        <Link 
          href="/en/clubs"
          className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Join
        </Link>
      </div>

      {/* Clubs List */}
      <div className="divide-y divide-gray-50">
        {loading ? (
          <div className="px-4 py-6 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
          </div>
        ) : clubs.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-amber-500" />
            </div>
            <p className="text-sm text-gray-500 mb-3">No clubs yet</p>
            <Link
              href="/en/clubs"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-xs font-medium hover:from-amber-600 hover:to-orange-600 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Discover Clubs
            </Link>
          </div>
        ) : (
          clubs.map((club) => (
            <Link
              key={club.id}
              href={`/en/clubs/${club.id}`}
              className="px-4 py-3 flex items-center gap-3 hover:bg-amber-50/50 transition-colors"
            >
              {/* Club Icon */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${CLUB_TYPE_COLORS[club.clubType] || 'from-amber-400 to-orange-500'}`}>
                <span className="text-white">
                  {CLUB_TYPE_ICONS[club.clubType] || <Users className="w-4 h-4" />}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 text-sm truncate">{club.name}</h4>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {club._count.members}
                  </span>
                  <span>•</span>
                  <span>{club._count.posts} posts</span>
                </div>
              </div>

              {/* Privacy Icon */}
              {club.privacy === 'PRIVATE' || club.privacy === 'SECRET' ? (
                <Lock className="w-3.5 h-3.5 text-gray-400" />
              ) : (
                <Globe className="w-3.5 h-3.5 text-gray-400" />
              )}
            </Link>
          ))
        )}
      </div>

      {/* Footer */}
      {clubs.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
          <Link 
            href="/en/clubs"
            className="text-xs text-gray-600 hover:text-amber-600 transition-colors font-medium flex items-center justify-center gap-1"
          >
            View all clubs
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
