'use client';

import { useState } from 'react';
import { 
  Trophy, 
  Star, 
  TrendingUp,
  Crown,
  Medal,
  Award,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface Contributor {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  points: number;
  rank: number;
  badge: 'gold' | 'silver' | 'bronze' | 'rising';
  weeklyChange: number;
  contributions: {
    posts: number;
    answers: number;
    likes: number;
  };
}

// Mock data
const TOP_CONTRIBUTORS: Contributor[] = [
  {
    id: '1',
    name: 'Sreymom Chen',
    role: 'Teacher',
    points: 2450,
    rank: 1,
    badge: 'gold',
    weeklyChange: 12,
    contributions: { posts: 28, answers: 45, likes: 312 },
  },
  {
    id: '2',
    name: 'Dara Sok',
    role: 'Student',
    points: 1890,
    rank: 2,
    badge: 'silver',
    weeklyChange: 8,
    contributions: { posts: 15, answers: 67, likes: 189 },
  },
  {
    id: '3',
    name: 'Vanna Kim',
    role: 'Student',
    points: 1650,
    rank: 3,
    badge: 'bronze',
    weeklyChange: -2,
    contributions: { posts: 22, answers: 34, likes: 156 },
  },
  {
    id: '4',
    name: 'Pisey Mao',
    role: 'Student',
    points: 1420,
    rank: 4,
    badge: 'rising',
    weeklyChange: 24,
    contributions: { posts: 18, answers: 29, likes: 98 },
  },
];

const BADGE_STYLES = {
  gold: { bg: 'from-yellow-400 to-amber-500', icon: Crown, text: 'text-yellow-600' },
  silver: { bg: 'from-gray-300 to-gray-400', icon: Medal, text: 'text-gray-500' },
  bronze: { bg: 'from-orange-300 to-orange-400', icon: Medal, text: 'text-orange-600' },
  rising: { bg: 'from-[#F9A825] to-[#FFB74D]', icon: TrendingUp, text: 'text-[#F9A825]' },
};

export default function TopContributorsWidget() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header - Simple */}
      <div className="px-3 py-2.5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm">Top Contributors</h3>
          <div className="flex text-xs">
            <button
              onClick={() => setPeriod('week')}
              className={`px-2 py-0.5 rounded-l border ${
                period === 'week' ? 'bg-amber-50 border-[#F9A825] text-[#F9A825]' : 'border-gray-200 text-gray-500'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-2 py-0.5 rounded-r border-t border-r border-b ${
                period === 'month' ? 'bg-amber-50 border-[#F9A825] text-[#F9A825]' : 'border-gray-200 text-gray-500'
              }`}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      {/* Contributors List */}
      <div className="divide-y divide-gray-50">
        {TOP_CONTRIBUTORS.map((contributor) => {
          const badgeStyle = BADGE_STYLES[contributor.badge];
          
          return (
            <div
              key={contributor.id}
              className="px-3 py-2 flex items-center gap-2.5 hover:bg-gray-50 transition-colors"
            >
              {/* Rank */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                contributor.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                contributor.rank === 2 ? 'bg-gray-100 text-gray-600' :
                contributor.rank === 3 ? 'bg-orange-100 text-orange-600' :
                'bg-gray-50 text-gray-500'
              }`}>
                {contributor.rank}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 text-xs truncate">
                  {contributor.name}
                </h4>
                <p className="text-[11px] text-gray-400 capitalize">{contributor.role}</p>
              </div>

              {/* Points */}
              <span className="text-xs font-medium text-gray-500">{contributor.points.toLocaleString()}</span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-gray-100">
        <button className="text-xs text-gray-500 hover:text-[#F9A825] transition-colors">
          View leaderboard →
        </button>
      </div>
    </div>
  );
}
