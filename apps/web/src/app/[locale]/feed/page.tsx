'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import {
  TrendingUp,
  Users,
  Zap,
  BookOpen,
  Award,
  MessageCircle,
  Heart,
  Share2,
  Plus,
} from 'lucide-react';

export default function FeedPage({ params: { locale } }: { params: { locale: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
      return;
    }

    const userData = TokenManager.getUserData();
    setUser(userData.user);
    setSchool(userData.school);
  }, [locale, router]);

  const handleLogout = () => {
    TokenManager.clearTokens();
    router.replace(`/${locale}/auth/login`);
  };

  if (!user || !school) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-12 mb-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Welcome to Stunity, {user.firstName}! 👋
            </h1>
            <p className="text-xl text-white/90 mb-6">
              Your professional social network for learning and growth
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create Post
              </button>
              <button className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/30 transition-colors border border-white/30">
                Explore Communities
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6">
            {/* Coming Soon Card */}
            <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Social Feed Coming Soon!
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                The professional social network for education is currently under development. 
                For now, use the School Management features.
              </p>
              <button
                onClick={() => router.push(`/${locale}/dashboard`)}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Go to School Dashboard
              </button>
            </div>

            {/* Preview Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2">Connect & Network</h4>
                <p className="text-sm text-gray-600">
                  Build your professional network with students, teachers, and researchers worldwide.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2">Share Knowledge</h4>
                <p className="text-sm text-gray-600">
                  Post articles, projects, and insights. Engage in meaningful educational discussions.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                  <Award className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2">Build Portfolio</h4>
                <p className="text-sm text-gray-600">
                  Showcase your achievements, projects, and skills to potential employers.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2">Track Growth</h4>
                <p className="text-sm text-gray-600">
                  Monitor your learning journey, achievements, and professional development.
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center text-white text-xl font-bold">
                  {user.firstName[0]}{user.lastName[0]}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{user.firstName} {user.lastName}</h3>
                  <p className="text-sm text-gray-500">{school.name}</p>
                </div>
              </div>
              <button className="w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors">
                View Profile
              </button>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => router.push(`/${locale}/dashboard`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Go to School</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                  <Users className="w-4 h-4" />
                  <span>Find Connections</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  <span>Messages</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
