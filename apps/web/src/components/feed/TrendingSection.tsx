'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Flame,
  Loader2,
  ChevronDown,
} from 'lucide-react';

interface TrendingSectionProps {
  apiUrl: string;
  onPostClick?: (postId: string) => void;
}

interface TrendingPost {
  id: string;
  content: string;
  postType: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl: string | null;
  };
  views: number;
  likes: number;
  comments: number;
  shares: number;
  trendingScore: number;
  createdAt: string;
}

const PERIOD_OPTIONS = [
  { id: '24h', label: '24 hours' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
];

export default function TrendingSection({ apiUrl, onPostClick }: TrendingSectionProps) {
  const [trending, setTrending] = useState<TrendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  useEffect(() => {
    fetchTrending();
  }, [period]);

  const fetchTrending = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${apiUrl}/analytics/trending?period=${period}&limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setTrending(data.trending);
      }
    } catch (err) {
      console.error('Failed to fetch trending:', err);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Trending in your network</h2>
          <div className="relative">
            <button
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              {PERIOD_OPTIONS.find(p => p.id === period)?.label}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showPeriodDropdown && (
              <div className="absolute right-0 top-full mt-1 w-28 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-10">
                {PERIOD_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setPeriod(opt.id); setShowPeriodDropdown(false); }}
                    className={`w-full px-3 py-1.5 text-left text-xs transition-colors ${period === opt.id ? 'bg-amber-50 dark:bg-amber-900/40 text-[#F9A825]' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="divide-y divide-gray-50 dark:divide-gray-800">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-[#F9A825] animate-spin" />
          </div>
        ) : trending.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">No trending posts yet</p>
        ) : (
          trending.map((post, idx) => (
            <button
              key={post.id}
              onClick={() => onPostClick?.(post.id)}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">#{idx + 1} trending</p>
                <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug">{post.content}</p>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <span>{post.author.lastName} {post.author.firstName}</span>
                  <span>•</span>
                  <span>{formatNumber(post.views)} views</span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
      
      {/* Footer */}
      {trending.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <button className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#F9A825] font-medium">
            Show more →
          </button>
        </div>
      )}
    </div>
  );
}
