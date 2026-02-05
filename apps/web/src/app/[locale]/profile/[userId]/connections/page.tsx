'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft, Users, UserPlus, UserMinus, Search, 
  Loader2, CheckCircle, Plus, MessageCircle
} from 'lucide-react';
import BlurLoader from '@/components/BlurLoader';
import { TokenManager } from '@/lib/api/auth';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  profilePictureUrl?: string;
  headline?: string;
  professionalTitle?: string;
}

interface ConnectionsData {
  followers: UserProfile[];
  following: UserProfile[];
  followersCount: number;
  followingCount: number;
}

function ConnectionsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          </div>
          <div className="w-24 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export default function ConnectionsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'en';
  const userId = params?.userId as string;
  const initialTab = searchParams.get('tab') === 'following' ? 'following' : 'followers';

  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [data, setData] = useState<ConnectionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [followingLoading, setFollowingLoading] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [profileName, setProfileName] = useState('');
  const [pageReady, setPageReady] = useState(false);

  // Get current user
  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.userId);
      } catch (e) {
        console.error('Failed to decode token');
      }
    }
  }, []);

  // Fetch connections
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = TokenManager.getAccessToken();
        if (!token) {
          router.push(`/${locale}/auth/login`);
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };
        const feedUrl = process.env.NEXT_PUBLIC_FEED_SERVICE_URL || 'http://localhost:3010';

        // Fetch all data in parallel
        const [followersRes, followingRes, profileRes, myFollowingRes] = await Promise.all([
          fetch(`${feedUrl}/users/${userId}/followers`, { headers }),
          fetch(`${feedUrl}/users/${userId}/following`, { headers }),
          fetch(`${feedUrl}/users/${userId}/profile`, { headers }),
          currentUserId ? fetch(`${feedUrl}/users/me/following`, { headers }) : Promise.resolve(null),
        ]);

        const [followersData, followingData, profileData] = await Promise.all([
          followersRes.json(),
          followingRes.json(),
          profileRes.json(),
        ]);

        let myFollowingData = null;
        if (myFollowingRes) {
          myFollowingData = await myFollowingRes.json();
        }

        if (profileData.success) {
          setProfileName(`${profileData.profile.firstName} ${profileData.profile.lastName}`);
        }

        setData({
          followers: followersData.success ? followersData.followers : [],
          following: followingData.success ? followingData.following : [],
          followersCount: followersData.count || 0,
          followingCount: followingData.count || 0,
        });

        // Build following set for current user
        if (myFollowingData?.success) {
          setFollowingSet(new Set(myFollowingData.following.map((u: UserProfile) => u.id)));
        }

        setLoading(false);
        setTimeout(() => setPageReady(true), 100);
      } catch (error) {
        console.error('Error fetching connections:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, currentUserId, locale, router]);

  // Handle follow/unfollow
  const handleFollow = async (targetUserId: string) => {
    if (!currentUserId) return;

    setFollowingLoading(prev => new Set(prev).add(targetUserId));

    try {
      const token = TokenManager.getAccessToken();
      const feedUrl = process.env.NEXT_PUBLIC_FEED_SERVICE_URL || 'http://localhost:3010';

      const res = await fetch(`${feedUrl}/users/${targetUserId}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await res.json();
      if (result.success) {
        setFollowingSet(prev => {
          const next = new Set(prev);
          if (result.action === 'followed') {
            next.add(targetUserId);
          } else {
            next.delete(targetUserId);
          }
          return next;
        });
      }
    } catch (error) {
      console.error('Follow error:', error);
    } finally {
      setFollowingLoading(prev => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
    }
  };

  // Filter users by search query
  const filterUsers = (users: UserProfile[]) => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(user => 
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(query) ||
      user.headline?.toLowerCase().includes(query) ||
      user.professionalTitle?.toLowerCase().includes(query)
    );
  };

  const currentList = activeTab === 'followers' ? data?.followers : data?.following;
  const filteredList = currentList ? filterUsers(currentList) : [];
  const isOwnProfile = currentUserId === userId;

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-opacity duration-500 ${pageReady ? 'opacity-100' : 'opacity-0'}`}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isOwnProfile ? 'Your Connections' : `${profileName}'s Connections`}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {data?.followersCount || 0} followers · {data?.followingCount || 0} following
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex">
            <button
              onClick={() => setActiveTab('followers')}
              className={`flex-1 flex items-center justify-center gap-2 py-4 font-medium text-sm border-b-2 transition-all ${
                activeTab === 'followers'
                  ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <Users className="w-4 h-4" />
              Followers
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'followers' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}>
                {data?.followersCount || 0}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('following')}
              className={`flex-1 flex items-center justify-center gap-2 py-4 font-medium text-sm border-b-2 transition-all ${
                activeTab === 'following'
                  ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Following
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'following' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}>
                {data?.followingCount || 0}
              </span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>

        {/* User List */}
        <BlurLoader isLoading={loading} skeleton={<ConnectionsSkeleton />} blur={false}>
          {filteredList.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchQuery 
                  ? `No ${activeTab} found`
                  : activeTab === 'followers' 
                    ? 'No followers yet' 
                    : 'Not following anyone yet'
                }
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto">
                {searchQuery 
                  ? 'Try a different search term'
                  : activeTab === 'followers'
                    ? 'When people follow this profile, they will appear here.'
                    : 'When this profile follows someone, they will appear here.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
              {filteredList.map((user, index) => {
                const isCurrentUser = user.id === currentUserId;
                const isFollowing = followingSet.has(user.id);
                const isLoadingFollow = followingLoading.has(user.id);

                return (
                  <div
                    key={user.id}
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all animate-in slide-in-from-left duration-300"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <Link href={`/${locale}/profile/${user.id}`}>
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 hover:ring-2 hover:ring-blue-400 transition-all">
                          {user.profilePictureUrl ? (
                            <Image
                              src={user.profilePictureUrl}
                              alt={`${user.firstName} ${user.lastName}`}
                              width={56}
                              height={56}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white text-xl font-semibold">
                              {user.firstName[0]}{user.lastName[0]}
                            </div>
                          )}
                        </div>
                      </Link>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <Link href={`/${locale}/profile/${user.id}`}>
                          <h3 className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate">
                            {user.firstName} {user.lastName}
                          </h3>
                        </Link>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {user.headline || user.professionalTitle || 'Stunity Member'}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!isCurrentUser && (
                          <>
                            <Link
                              href={`/${locale}/messages?startWith=${user.id}`}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                              title="Message"
                            >
                              <MessageCircle className="w-5 h-5" />
                            </Link>
                            <button
                              onClick={() => handleFollow(user.id)}
                              disabled={isLoadingFollow}
                              className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1.5 transition-all ${
                                isFollowing
                                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25'
                              }`}
                            >
                              {isLoadingFollow ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : isFollowing ? (
                                <>
                                  <CheckCircle className="w-4 h-4" />
                                  Following
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4" />
                                  Follow
                                </>
                              )}
                            </button>
                          </>
                        )}
                        {isCurrentUser && (
                          <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-sm">
                            You
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </BlurLoader>
      </main>
    </div>
  );
}
