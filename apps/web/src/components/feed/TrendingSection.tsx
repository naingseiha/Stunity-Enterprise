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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-semibold text-gray-900">Trending</h2>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              {PERIOD_OPTIONS.find(p => p.id === period)?.label}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showPeriodDropdown && (
              <div className="absolute right-0 top-full mt-1 w-28 bg-white rounded-lg shadow-xl border py-1 z-10">
                {PERIOD_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setPeriod(opt.id); setShowPeriodDropdown(false); }}
                    className={`w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 ${period === opt.id ? 'bg-orange-50 text-orange-700' : 'text-gray-700'}`}
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
      <div className="p-3">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
          </div>
        ) : trending.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-6">No trending posts yet</p>
        ) : (
          <div className="space-y-3">
            {trending.map((post, idx) => (
              <button
                key={post.id}
                onClick={() => onPostClick?.(post.id)}
                className="w-full flex items-start gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors text-left"
              >
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' :
                  idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                  idx === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-400 text-white' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 line-clamp-2 font-medium">{post.content}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1.5">
                      {post.author.profilePictureUrl ? (
                        <img 
                          src={post.author.profilePictureUrl} 
                          alt="" 
                          className="w-4 h-4 rounded-full"
                        />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[8px] text-gray-600 font-bold">
                          {getInitials(post.author.firstName, post.author.lastName)}
                        </div>
                      )}
                      <span className="text-xs text-gray-500">
                        {post.author.firstName} {post.author.lastName}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {formatNumber(post.views)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {formatNumber(post.likes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {formatNumber(post.comments)}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
