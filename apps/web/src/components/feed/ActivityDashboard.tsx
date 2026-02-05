'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  FileText,
  Heart,
  MessageCircle,
  Eye,
  Loader2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface ActivityDashboardProps {
  apiUrl: string;
}

interface ActivityData {
  postsThisWeek: number;
  postsThisMonth: number;
  likesGiven: number;
  commentsGiven: number;
  likesReceived: number;
  commentsReceived: number;
  viewsReceived: number;
  dailyActivity: {
    date: string;
    posts: number;
    likes: number;
    comments: number;
  }[];
}

export default function ActivityDashboard({ apiUrl }: ActivityDashboardProps) {
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${apiUrl}/analytics/activity`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setActivity(data.activity);
      }
    } catch (err) {
      console.error('Failed to fetch activity:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <Loader2 className="w-8 h-8 mx-auto text-purple-500 animate-spin mb-3" />
        <p className="text-gray-600">Loading activity...</p>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-600">Failed to load activity</p>
      </div>
    );
  }

  const maxActivity = Math.max(
    ...activity.dailyActivity.map(d => d.posts + d.likes + d.comments),
    1
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Your Activity</h2>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Your Posts */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            {activity.postsThisWeek > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                <ArrowUp className="w-3 h-3" />
                {activity.postsThisWeek} this week
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900">{activity.postsThisMonth}</p>
          <p className="text-sm text-gray-500">Posts this month</p>
        </div>

        {/* Views Received */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mb-2">
            <Eye className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{activity.viewsReceived}</p>
          <p className="text-sm text-gray-500">Views received</p>
        </div>

        {/* Likes Received */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center mb-2">
            <Heart className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{activity.likesReceived}</p>
          <p className="text-sm text-gray-500">Likes received</p>
        </div>

        {/* Comments Received */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{activity.commentsReceived}</p>
          <p className="text-sm text-gray-500">Comments received</p>
        </div>
      </div>

      {/* Your Engagement */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Your Engagement</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <Heart className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{activity.likesGiven}</p>
              <p className="text-xs text-gray-500">Likes given</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{activity.commentsGiven}</p>
              <p className="text-xs text-gray-500">Comments made</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Daily Activity (Last 7 Days)</h3>
        <div className="flex items-end gap-2 h-40">
          {activity.dailyActivity.map((day, idx) => {
            const total = day.posts + day.likes + day.comments;
            const postsHeight = maxActivity > 0 ? (day.posts / maxActivity) * 100 : 0;
            const likesHeight = maxActivity > 0 ? (day.likes / maxActivity) * 100 : 0;
            const commentsHeight = maxActivity > 0 ? (day.comments / maxActivity) * 100 : 0;
            
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col items-center gap-0.5" style={{ height: '120px' }}>
                  <div className="flex-1 flex flex-col justify-end w-full gap-0.5">
                    {day.comments > 0 && (
                      <div 
                        className="w-full bg-green-400 rounded-t"
                        style={{ height: `${commentsHeight}%`, minHeight: '4px' }}
                        title={`${day.comments} comments`}
                      />
                    )}
                    {day.likes > 0 && (
                      <div 
                        className="w-full bg-red-400"
                        style={{ height: `${likesHeight}%`, minHeight: '4px' }}
                        title={`${day.likes} likes`}
                      />
                    )}
                    {day.posts > 0 && (
                      <div 
                        className="w-full bg-blue-400 rounded-t"
                        style={{ height: `${postsHeight}%`, minHeight: '4px' }}
                        title={`${day.posts} posts`}
                      />
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-gray-500">
                  {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-4 mt-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-400" />
            <span className="text-xs text-gray-600">Posts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-400" />
            <span className="text-xs text-gray-600">Likes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-400" />
            <span className="text-xs text-gray-600">Comments</span>
          </div>
        </div>
      </div>
    </div>
  );
}
