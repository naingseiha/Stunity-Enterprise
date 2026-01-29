"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  X, Eye, Heart, MessageCircle, TrendingUp, Users, Clock, BarChart3, 
  Calendar, Sparkles, Target, Activity, Zap, MousePointer, Share2,
  ArrowUp, ArrowDown, Minus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getPostAnalytics, PostAnalytics } from "@/lib/api/analytics";
import MetricCard from "./MetricCard";

interface AnalyticsModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AnalyticsModal({
  postId,
  isOpen,
  onClose,
}: AnalyticsModalProps) {
  const [analytics, setAnalytics] = useState<PostAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "all">("7d");

  useEffect(() => {
    if (isOpen) {
      fetchAnalytics();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, postId, dateRange]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const dateTo = new Date().toISOString();
      let dateFrom: string | undefined;

      if (dateRange === "7d") {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        dateFrom = date.toISOString();
      } else if (dateRange === "30d") {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        dateFrom = date.toISOString();
      }

      const data = await getPostAnalytics(postId, { dateFrom, dateTo });
      setAnalytics(data);
    } catch (err: any) {
      console.error("Failed to fetch analytics:", err);
      setError(err.message || "Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const getEngagementLevel = (rate: number) => {
    if (rate >= 80) return { label: "Excellent", color: "text-green-600", bgColor: "bg-green-50 dark:bg-green-900/20", icon: Sparkles };
    if (rate >= 60) return { label: "Great", color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-900/20", icon: TrendingUp };
    if (rate >= 40) return { label: "Good", color: "text-yellow-600", bgColor: "bg-yellow-50 dark:bg-yellow-900/20", icon: Target };
    if (rate >= 20) return { label: "Fair", color: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-900/20", icon: Activity };
    return { label: "Needs Work", color: "text-red-600", bgColor: "bg-red-50 dark:bg-red-900/20", icon: Zap };
  };

  if (!isOpen) return null;
  if (typeof window === "undefined") return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-6xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            {/* Header with gradient */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 opacity-10 dark:opacity-20"></div>
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      Post Analytics
                      <Sparkles className="w-5 h-5 text-yellow-500" />
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Detailed performance insights and metrics</p>
                  </div>
                </div>
                <button 
                  onClick={onClose} 
                  className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover:rotate-90"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Time Range:</span>
                <div className="flex gap-2">
                  {[{ value: "7d", label: "Last 7 Days" }, { value: "30d", label: "Last 30 Days" }, { value: "all", label: "All Time" }].map((option) => (
                    <button key={option.value} onClick={() => setDateRange(option.value as any)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${dateRange === option.value ? "bg-blue-600 text-white shadow-md" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"}`}>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <X className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Failed to Load</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                    <button onClick={fetchAnalytics} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Try Again</button>
                  </div>
                </div>
              ) : analytics ? (
                <div className="space-y-6">
                  {/* Engagement Level Badge */}
                  {(() => {
                    const engagement = getEngagementLevel(analytics.overview.engagementRate);
                    const EngagementIcon = engagement.icon;
                    return (
                      <div className={`${engagement.bgColor} border-2 ${engagement.color.replace('text-', 'border-')} rounded-2xl p-5`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-14 h-14 ${engagement.bgColor} rounded-xl flex items-center justify-center shadow-lg`}>
                              <EngagementIcon className={`w-7 h-7 ${engagement.color}`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Engagement Level</p>
                              <h3 className={`text-2xl font-bold ${engagement.color}`}>{engagement.label}</h3>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Score</p>
                            <p className={`text-4xl font-bold ${engagement.color}`}>{analytics.overview.engagementRate.toFixed(1)}%</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Key Metrics Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-600" />
                        Key Metrics
                      </h3>
                      <span className="text-xs px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full font-medium">
                        Live Data
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <MetricCard 
                        title="Total Views" 
                        value={analytics.overview.totalViews} 
                        icon={Eye} 
                        color="blue" 
                        subtitle={`${analytics.overview.uniqueViews} unique viewers`} 
                      />
                      <MetricCard 
                        title="Total Likes" 
                        value={analytics.overview.likes} 
                        icon={Heart} 
                        color="pink"
                        subtitle={`${((analytics.overview.likes / analytics.overview.totalViews) * 100).toFixed(1)}% of views`}
                      />
                      <MetricCard 
                        title="Total Comments" 
                        value={analytics.overview.comments} 
                        icon={MessageCircle} 
                        color="purple"
                        subtitle={`${((analytics.overview.comments / analytics.overview.totalViews) * 100).toFixed(1)}% of views`}
                      />
                      <MetricCard 
                        title="Interactions" 
                        value={analytics.overview.likes + analytics.overview.comments} 
                        icon={MousePointer} 
                        color="orange"
                        subtitle="Total engagements"
                      />
                    </div>
                  </div>

                  {/* Audience Demographics */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-600" />
                      Audience Demographics
                    </h3>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-5">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: "Students", count: analytics.audienceBreakdown.students, color: "blue", icon: "🎓" },
                          { label: "Teachers", count: analytics.audienceBreakdown.teachers, color: "purple", icon: "👨‍🏫" },
                          { label: "Admins", count: analytics.audienceBreakdown.admins, color: "orange", icon: "👔" },
                          { label: "Guests", count: analytics.audienceBreakdown.guests, color: "gray", icon: "👤" },
                        ].map((audience) => {
                          const total = analytics.overview.uniqueViews;
                          const percentage = total > 0 ? ((audience.count / total) * 100).toFixed(1) : '0';
                          return (
                            <div key={audience.label} className="relative group">
                              <div className={`bg-gradient-to-br from-${audience.color}-50 to-${audience.color}-100 dark:from-${audience.color}-900/20 dark:to-${audience.color}-800/20 rounded-xl p-4 border-2 border-${audience.color}-200 dark:border-${audience.color}-800 transition-all hover:scale-105 hover:shadow-lg`}>
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-2xl">{audience.icon}</span>
                                  <span className={`text-xs px-2 py-1 bg-${audience.color}-200 dark:bg-${audience.color}-800 text-${audience.color}-800 dark:text-${audience.color}-200 rounded-full font-bold`}>
                                    {percentage}%
                                  </span>
                                </div>
                                <p className={`text-sm font-medium text-${audience.color}-900 dark:text-${audience.color}-100 mb-1`}>
                                  {audience.label}
                                </p>
                                <p className={`text-3xl font-bold text-${audience.color}-900 dark:text-${audience.color}-100`}>
                                  {audience.count}
                                </p>
                                <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                  <div 
                                    className={`bg-gradient-to-r from-${audience.color}-500 to-${audience.color}-600 h-2 rounded-full transition-all duration-500`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Performance Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Peak Viewing Times */}
                    {analytics.peakTimes.length > 0 && (
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border-2 border-blue-200 dark:border-blue-800 p-5">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <Clock className="w-5 h-5 text-blue-600" />
                          Peak Viewing Times
                        </h4>
                        <div className="space-y-3">
                          {analytics.peakTimes.map((time, index) => {
                            const maxViews = Math.max(...analytics.peakTimes.map((t) => t.views));
                            const percentage = (time.views / maxViews) * 100;
                            return (
                              <div key={time.hour} className="group">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs px-2 py-1 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-lg font-bold">
                                      #{index + 1}
                                    </span>
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                      {time.hour}:00 - {time.hour + 1}:00
                                    </span>
                                  </div>
                                  <span className="text-lg font-bold text-blue-900 dark:text-blue-100">{time.views}</span>
                                </div>
                                <div className="w-full bg-blue-200 dark:bg-blue-900/40 rounded-full h-3 overflow-hidden">
                                  <div 
                                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500 group-hover:scale-105"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Top View Sources */}
                    {analytics.topViewSources.length > 0 && (
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border-2 border-green-200 dark:border-green-800 p-5">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <Share2 className="w-5 h-5 text-green-600" />
                          Traffic Sources
                        </h4>
                        <div className="space-y-3">
                          {analytics.topViewSources.slice(0, 5).map((source, index) => {
                            const percentage = (source.count / analytics.overview.totalViews) * 100;
                            const sourceIcons: { [key: string]: string } = {
                              feed: "📱",
                              profile: "👤",
                              search: "🔍",
                              notification: "🔔",
                              direct: "🔗"
                            };
                            return (
                              <div key={source.source} className="group">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xl">{sourceIcons[source.source] || "📍"}</span>
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize">
                                      {source.source}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs px-2 py-1 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded-lg font-bold">
                                      {percentage.toFixed(1)}%
                                    </span>
                                    <span className="text-lg font-bold text-green-900 dark:text-green-100">{source.count}</span>
                                  </div>
                                </div>
                                <div className="w-full bg-green-200 dark:bg-green-900/40 rounded-full h-3 overflow-hidden">
                                  <div 
                                    className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full transition-all duration-500 group-hover:scale-105"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Average Duration & Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {analytics.avgDuration > 0 && (
                      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-5 border-2 border-indigo-200 dark:border-indigo-800 hover:scale-105 transition-transform">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-indigo-200 dark:bg-indigo-800 rounded-xl flex items-center justify-center">
                            <Clock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Avg Duration</p>
                            <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">{formatDuration(analytics.avgDuration)}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Time users spend viewing</p>
                      </div>
                    )}
                    
                    {/* View to Like Ratio */}
                    <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-2xl p-5 border-2 border-pink-200 dark:border-pink-800 hover:scale-105 transition-transform">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-pink-200 dark:bg-pink-800 rounded-xl flex items-center justify-center">
                          <Heart className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Like Rate</p>
                          <p className="text-2xl font-bold text-pink-900 dark:text-pink-100">
                            {analytics.overview.totalViews > 0 
                              ? ((analytics.overview.likes / analytics.overview.totalViews) * 100).toFixed(1)
                              : '0'}%
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Views converted to likes</p>
                    </div>

                    {/* Comment Rate */}
                    <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-2xl p-5 border-2 border-purple-200 dark:border-purple-800 hover:scale-105 transition-transform">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-purple-200 dark:bg-purple-800 rounded-xl flex items-center justify-center">
                          <MessageCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Comment Rate</p>
                          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                            {analytics.overview.totalViews > 0 
                              ? ((analytics.overview.comments / analytics.overview.totalViews) * 100).toFixed(1)
                              : '0'}%
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Views converted to comments</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t-2 border-gray-200 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Analytics updated in real-time</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={fetchAnalytics} 
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                  >
                    <Activity className="w-4 h-4" />
                    Refresh
                  </button>
                  <button 
                    onClick={onClose} 
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
