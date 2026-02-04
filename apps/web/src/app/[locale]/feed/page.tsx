'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import FeedZoomLoader from '@/components/feed/FeedZoomLoader';
import {
  Users,
  BookOpen,
  Award,
  TrendingUp,
  Heart,
  MessageCircle,
  BarChart3,
  Share2,
  Bookmark,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';

export default function FeedPage({ params: { locale } }: { params: { locale: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('feed');
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
      return;
    }

    const userData = TokenManager.getUserData();
    setUser(userData.user);
    setSchool(userData.school);
    setLoading(false);
  }, [locale, router]);

  const handleLogout = () => {
    TokenManager.clearTokens();
    router.replace(`/${locale}/auth/login`);
  };

  // Show zoom loader while loading, then fade in content
  if (loading || !user || !school || !showContent) {
    return (
      <>
        <FeedZoomLoader 
          isLoading={loading || !user || !school} 
          onAnimationComplete={() => setShowContent(true)}
          minimumDuration={600}
        />
        {/* Pre-render content (hidden) for instant show after animation */}
        {!loading && user && school && (
          <div className="opacity-0 pointer-events-none absolute">
            <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
          </div>
        )}
      </>
    );
  }

  const tabs = [
    { id: 'feed', label: 'Feed', icon: TrendingUp },
    { id: 'posts', label: 'Posts', icon: BookOpen },
    { id: 'groups', label: 'Groups', icon: Users },
    { id: 'portfolio', label: 'Portfolio', icon: Award },
  ];

  // Sample post (preview of what's coming)
  const samplePost = {
    id: 1,
    author: {
      name: user.firstName + ' ' + user.lastName,
      verified: true,
      avatar: null,
    },
    timestamp: 'about 2 hours ago',
    category: 'Research',
    categoryColor: 'purple',
    content: {
      text: 'កំពុងរៀនព្រោះស្រម័គ្រច៍ទាំង៩៩ ហេតុអីបានធ្វើកូដស៍ ភាសា Programming១',
    },
    collaboration: {
      field: 'Computer Science',
      collaborators: ['John', 'Sarah'],
    },
    engagement: {
      likes: 78,
      comments: 0,
      shares: 0,
      bookmarked: false,
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 animate-fade-in">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Tab Navigation - Pill Style */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 animate-slide-down" style={{ animationDelay: '0.1s' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all whitespace-nowrap
                  ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-purple-500 to-purple-400 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Post Creation Box */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-4 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white font-semibold flex-shrink-0">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <button className="flex-1 text-left px-4 py-3 bg-gray-50 rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
              What's on your mind, {user.firstName}?
            </button>
            <button className="p-3 text-green-600 hover:bg-green-50 rounded-full transition-colors">
              <ImageIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feed Content */}
        {activeTab === 'feed' && (
          <div className="space-y-4">
            {/* Sample Post - Preview */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Post Header */}
              <div className="p-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {samplePost.author.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{samplePost.author.name}</span>
                      {samplePost.author.verified && (
                        <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500" />
                      )}
                    </div>
                    <span className="text-sm text-gray-500">{samplePost.timestamp}</span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                  {samplePost.category}
                </span>
              </div>

              {/* Post Content */}
              <div className="px-4 pb-4">
                <p className="text-gray-900 mb-3" style={{ fontFamily: 'Battambang, sans-serif' }}>
                  {samplePost.content.text}
                </p>
                
                {/* Preview Badge */}
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 border border-orange-200">
                  <p className="text-sm text-orange-700">
                    <span className="font-semibold">🎨 Design Preview:</span> This is how posts will look when the feed is fully implemented! Clean cards, engagement metrics, and collaboration tags.
                  </p>
                </div>
              </div>

              {/* Collaboration Section */}
              <div className="mx-4 mb-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm mb-1">{samplePost.category}</p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Field:</span> {samplePost.collaboration.field}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Collaborators:</span> {samplePost.collaboration.collaborators.join(', ')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Engagement Bar */}
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <button className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors">
                  <Heart className="w-5 h-5" />
                  <span className="text-sm font-medium">{samplePost.engagement.likes}</span>
                </button>
                <button className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">{samplePost.engagement.comments}</span>
                </button>
                <button className="flex items-center gap-2 text-gray-600 hover:text-purple-500 transition-colors">
                  <BarChart3 className="w-5 h-5" />
                  <span className="text-sm">Analytics</span>
                </button>
                <button className="flex items-center gap-2 text-gray-600 hover:text-green-500 transition-colors">
                  <Share2 className="w-5 h-5" />
                  <span className="text-sm font-medium">{samplePost.engagement.shares}</span>
                </button>
                <button className="text-gray-600 hover:text-yellow-500 transition-colors">
                  <Bookmark className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Coming Soon Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-100 to-yellow-100 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Full Social Feed Coming Soon!
              </h3>
              <p className="text-gray-600 mb-4 max-w-md mx-auto">
                The professional social network for education is currently under development. For now, use the School Management features.
              </p>
              <button
                onClick={() => router.push(`/${locale}/dashboard`)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-full font-semibold hover:from-orange-600 hover:to-yellow-600 transition-all shadow-md"
              >
                <BookOpen className="w-5 h-5" />
                <span>Go to School Management</span>
              </button>
            </div>

            {/* Feature Preview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2">Connect & Network</h4>
                <p className="text-sm text-gray-600">
                  Build your professional network with students, teachers, and researchers worldwide.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2">Share Knowledge</h4>
                <p className="text-sm text-gray-600">
                  Post articles, projects, and insights. Engage in meaningful educational discussions.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Other Tabs (Coming Soon) */}
        {activeTab !== 'feed' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {tabs.find(t => t.id === activeTab)?.label} - Coming Soon
            </h3>
            <p className="text-gray-600">
              This feature is currently under development.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
