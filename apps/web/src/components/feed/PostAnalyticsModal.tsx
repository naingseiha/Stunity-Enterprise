'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Eye,
  Users,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Clock,
  TrendingUp,
  BarChart3,
  Loader2,
} from 'lucide-react';

interface PostAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  apiUrl: string;
}

interface Analytics {
  totalViews: number;
  uniqueViewers: number;
  avgDuration: number;
  views24h: number;
  views7d: number;
  views30d: number;
  likes: number;
  likes24h: number;
  comments: number;
  comments24h: number;
  shares: number;
  bookmarks: number;
  engagementRate: number;
  viewsBySource: Record<string, number>;
  dailyViews: { date: string; views: number }[];
  createdAt: string;
}

export default function PostAnalyticsModal({ isOpen, onClose, postId, apiUrl }: PostAnalyticsModalProps) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && postId) {
      fetchAnalytics();
    }
  }, [isOpen, postId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${apiUrl}/posts/${postId}/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAnalytics(data.analytics);
      } else {
        setError(data.error || 'Failed to load analytics');
      }
    } catch (err) {
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const maxViews = analytics?.dailyViews ? Math.max(...analytics.dailyViews.map(d => d.views), 1) : 1;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Post Analytics</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {analytics && !loading && (
            <div className="space-y-6">
              {/* Overview Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Eye} label="Total Views" value={analytics.totalViews} color="blue" />
                <StatCard icon={Users} label="Unique Viewers" value={analytics.uniqueViewers} color="purple" />
                <StatCard icon={TrendingUp} label="Engagement Rate" value={`${analytics.engagementRate}%`} color="green" />
                <StatCard icon={Clock} label="Avg. Duration" value={`${analytics.avgDuration}s`} color="orange" />
              </div>

              {/* Engagement Stats */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Engagement</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{analytics.likes}</p>
                      <p className="text-xs text-gray-500">Likes</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{analytics.comments}</p>
                      <p className="text-xs text-gray-500">Comments</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <Share2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{analytics.shares}</p>
                      <p className="text-xs text-gray-500">Shares</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                      <Bookmark className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{analytics.bookmarks}</p>
                      <p className="text-xs text-gray-500">Saves</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Views Over Time */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Views (Last 7 Days)</h3>
                <div className="flex items-end gap-2 h-32">
                  {analytics.dailyViews.map((day, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                      <div 
                        className="w-full bg-purple-500 rounded-t transition-all"
                        style={{ height: `${(day.views / maxViews) * 100}%`, minHeight: day.views > 0 ? '4px' : '0' }}
                      />
                      <span className="text-[10px] text-gray-500">
                        {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Views by Period */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Views by Period</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-white rounded-lg p-3 border">
                    <p className="text-2xl font-bold text-gray-900">{analytics.views24h}</p>
                    <p className="text-sm text-gray-500">Last 24h</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border">
                    <p className="text-2xl font-bold text-gray-900">{analytics.views7d}</p>
                    <p className="text-sm text-gray-500">Last 7 days</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border">
                    <p className="text-2xl font-bold text-gray-900">{analytics.views30d}</p>
                    <p className="text-sm text-gray-500">Last 30 days</p>
                  </div>
                </div>
              </div>

              {/* Views by Source */}
              {Object.keys(analytics.viewsBySource).length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Traffic Sources</h3>
                  <div className="space-y-2">
                    {Object.entries(analytics.viewsBySource).map(([source, count]) => {
                      const percentage = (count / analytics.totalViews) * 100;
                      return (
                        <div key={source} className="flex items-center gap-3">
                          <span className="w-16 text-sm text-gray-600 capitalize">{source}</span>
                          <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700 w-16 text-right">{count} ({percentage.toFixed(0)}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-2`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
