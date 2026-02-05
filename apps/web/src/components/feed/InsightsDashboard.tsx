'use client';

import { useState, useEffect } from 'react';
import {
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  TrendingUp,
  FileText,
  BarChart3,
  Megaphone,
  HelpCircle,
  Award,
  Loader2,
  ChevronDown,
} from 'lucide-react';

interface InsightsDashboardProps {
  apiUrl: string;
}

interface Insights {
  period: string;
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalBookmarks: number;
  avgEngagement: number;
  topPosts: {
    id: string;
    content: string;
    postType: string;
    views: number;
    likes: number;
    comments: number;
    engagement: string | number;
    createdAt: string;
  }[];
  postsByType: Record<string, number>;
}

const PERIOD_OPTIONS = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
];

const POST_TYPE_ICONS: Record<string, any> = {
  ARTICLE: FileText,
  POLL: BarChart3,
  ANNOUNCEMENT: Megaphone,
  QUESTION: HelpCircle,
  ACHIEVEMENT: Award,
};

const POST_TYPE_COLORS: Record<string, string> = {
  ARTICLE: 'bg-blue-100 text-blue-600',
  POLL: 'bg-purple-100 text-purple-600',
  ANNOUNCEMENT: 'bg-red-100 text-red-600',
  QUESTION: 'bg-green-100 text-green-600',
  ACHIEVEMENT: 'bg-yellow-100 text-yellow-600',
};

export default function InsightsDashboard({ apiUrl }: InsightsDashboardProps) {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  useEffect(() => {
    fetchInsights();
  }, [period]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${apiUrl}/analytics/my-insights?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setInsights(data.insights);
      }
    } catch (err) {
      console.error('Failed to fetch insights:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <Loader2 className="w-8 h-8 mx-auto text-purple-500 animate-spin mb-3" />
        <p className="text-gray-600">Loading insights...</p>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-600">Failed to load insights</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Period Selector */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Your Insights</h2>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700"
            >
              {PERIOD_OPTIONS.find(p => p.id === period)?.label}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showPeriodDropdown && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-xl border py-2 z-10">
                {PERIOD_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setPeriod(opt.id); setShowPeriodDropdown(false); }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${period === opt.id ? 'bg-purple-50 text-purple-700' : 'text-gray-700'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={FileText} label="Posts" value={insights.totalPosts} color="blue" />
        <StatCard icon={Eye} label="Views" value={insights.totalViews} color="purple" />
        <StatCard icon={Heart} label="Likes" value={insights.totalLikes} color="red" />
        <StatCard icon={MessageCircle} label="Comments" value={insights.totalComments} color="green" />
        <StatCard icon={Share2} label="Shares" value={insights.totalShares} color="cyan" />
        <StatCard icon={TrendingUp} label="Avg. Engagement" value={`${insights.avgEngagement}%`} color="orange" />
      </div>

      {/* Posts by Type */}
      {Object.keys(insights.postsByType).length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Posts by Type</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(insights.postsByType).map(([type, count]) => {
              const Icon = POST_TYPE_ICONS[type] || FileText;
              return (
                <div key={type} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${POST_TYPE_COLORS[type] || 'bg-gray-100 text-gray-600'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{type.charAt(0) + type.slice(1).toLowerCase()}</p>
                    <p className="text-xs text-gray-500">{count} post{count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Performing Posts */}
      {insights.topPosts.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Top Performing Posts</h3>
          <div className="space-y-3">
            {insights.topPosts.map((post, idx) => {
              const Icon = POST_TYPE_ICONS[post.postType] || FileText;
              return (
                <div key={post.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 line-clamp-2">{post.content}...</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {post.views}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {post.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {post.comments}
                      </span>
                      <span className="text-green-600 font-medium">
                        {post.engagement}% engagement
                      </span>
                    </div>
                  </div>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${POST_TYPE_COLORS[post.postType] || 'bg-gray-100'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600',
    green: 'bg-green-100 text-green-600',
    cyan: 'bg-cyan-100 text-cyan-600',
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
