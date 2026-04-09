'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Plus,
  Search,
  BookOpen,
  Code,
  Rocket,
  GraduationCap,
  Globe,
  Lock,
  ChevronRight,
  Loader2,
  Compass,
  X,
  Sparkles,
  Crown,
  Shield,
  MessageCircle,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import { FEED_SERVICE_URL } from '@/lib/api/config';
import { buildRouteDataCacheKey, readRouteDataCache, writeRouteDataCache } from '@/lib/route-data-cache';
import UnifiedNavigation from '@/components/UnifiedNavigation';

interface StudyClub {
  id: string;
  name: string;
  description?: string;
  clubType: string;
  type?: string;
  category?: string;
  privacy: string;
  mode?: string;
  coverImage?: string;
  creatorId: string;
  isActive: boolean;
  createdAt: string;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl?: string;
  };
  _count: {
    members: number;
    posts: number;
  };
  isMember?: boolean;
  myRole?: string;
}

interface ClubType {
  value: string;
  label: string;
  description: string;
}

const CLUB_TYPE_ICONS: Record<string, React.ReactNode> = {
  CASUAL_STUDY_GROUP: <BookOpen className="w-4 h-4" />,
  STRUCTURED_CLASS: <Code className="w-4 h-4" />,
  PROJECT_GROUP: <Rocket className="w-4 h-4" />,
  EXAM_PREP: <GraduationCap className="w-4 h-4" />,
};

const CLUB_TYPE_COLORS: Record<string, string> = {
  CASUAL_STUDY_GROUP: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400',
  STRUCTURED_CLASS: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400',
  PROJECT_GROUP: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400',
  EXAM_PREP: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400',
};

const PRIVACY_ICONS: Record<string, React.ReactNode> = {
  PUBLIC: <Globe className="w-3.5 h-3.5" />,
  INVITE_ONLY: <Lock className="w-3.5 h-3.5" />,
  APPROVAL_REQUIRED: <Shield className="w-3.5 h-3.5" />,
};

const normalizeClub = (club: StudyClub): StudyClub => {
  const resolvedType = club.clubType || club.type || 'CASUAL_STUDY_GROUP';
  const resolvedPrivacy = club.privacy || club.mode || 'PUBLIC';

  return {
    ...club,
    clubType: resolvedType,
    privacy: resolvedPrivacy,
  };
};

const CLUBS_CACHE_TTL_MS = 2 * 60 * 1000;

export default function StudyClubsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  
  const [activeTab, setActiveTab] = useState<'my-clubs' | 'discover'>('my-clubs');
  const [clubs, setClubs] = useState<StudyClub[]>([]);
  const [discoverClubs, setDiscoverClubs] = useState<StudyClub[]>([]);
  const [clubTypes, setClubTypes] = useState<ClubType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDiscover, setLoadingDiscover] = useState(false);
  const [hasFetchedDiscover, setHasFetchedDiscover] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joiningClubId, setJoiningClubId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      const schoolStr = localStorage.getItem('school');
      if (userStr) setCurrentUser(JSON.parse(userStr));
      if (schoolStr) setSchool(JSON.parse(schoolStr));
    }
  }, []);

  // Debounce only the search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLogout = async () => {
    await TokenManager.logout();
    router.replace(`/${locale}/auth/login`);
  };

  const myClubsCacheKey = buildRouteDataCacheKey('clubs', 'my');
  const clubTypesCacheKey = buildRouteDataCacheKey('clubs', 'types');
  const discoverCacheKey = buildRouteDataCacheKey('clubs', 'discover', debouncedSearchQuery || 'all', selectedType || 'all');

  const fetchMyClubs = useCallback(async () => {
    try {
      const token = TokenManager.getAccessToken();
      const response = await fetch(`${FEED_SERVICE_URL}/clubs?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const clubsList = Array.isArray(data.clubs) ? data.clubs.map(normalizeClub) : [];
        setClubs(clubsList);
        writeRouteDataCache(myClubsCacheKey, clubsList);
      }
    } catch (error) {
      console.error('Error fetching clubs:', error);
    }
  }, [myClubsCacheKey]);

  const fetchDiscoverClubs = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoadingDiscover(true);
    try {
      const token = TokenManager.getAccessToken();
      const urlParams = new URLSearchParams();
      if (debouncedSearchQuery) urlParams.set('search', debouncedSearchQuery);
      if (selectedType) urlParams.set('clubType', selectedType);

      const response = await fetch(`${FEED_SERVICE_URL}/clubs/discover?limit=20&${urlParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const clubsList = Array.isArray(data.clubs) ? data.clubs.map(normalizeClub) : [];
        setDiscoverClubs(clubsList);
        setHasFetchedDiscover(true);
        writeRouteDataCache(discoverCacheKey, clubsList);
      }
    } catch (error) {
      console.error('Error discovering clubs:', error);
    } finally {
      if (!isBackground) setLoadingDiscover(false);
    }
  }, [debouncedSearchQuery, discoverCacheKey, selectedType]);

  const fetchClubTypes = useCallback(async () => {
    try {
      const token = TokenManager.getAccessToken();
      const response = await fetch(`${FEED_SERVICE_URL}/clubs/types`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setClubTypes(data);
        writeRouteDataCache(clubTypesCacheKey, data);
      }
    } catch (error) {
      console.error('Error fetching club types:', error);
    }
  }, [clubTypesCacheKey]);

  useEffect(() => {
    const cachedMyClubs = readRouteDataCache<StudyClub[]>(myClubsCacheKey, CLUBS_CACHE_TTL_MS);
    const cachedClubTypes = readRouteDataCache<ClubType[]>(clubTypesCacheKey, CLUBS_CACHE_TTL_MS);
    const cachedDiscoverClubs = readRouteDataCache<StudyClub[]>(discoverCacheKey, CLUBS_CACHE_TTL_MS);

    if (cachedMyClubs) setClubs(cachedMyClubs);
    if (cachedClubTypes) setClubTypes(cachedClubTypes);
    if (cachedDiscoverClubs) {
      setDiscoverClubs(cachedDiscoverClubs);
      setHasFetchedDiscover(true);
    }

    if (cachedMyClubs || cachedClubTypes || cachedDiscoverClubs) {
      setLoading(false);
    }
  }, [clubTypesCacheKey, discoverCacheKey, myClubsCacheKey]);

  // Initial fetch for everything to make navigation instantaneous
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) return;
      const hasCachedData = Boolean(
        readRouteDataCache<StudyClub[]>(myClubsCacheKey, CLUBS_CACHE_TTL_MS) ||
        readRouteDataCache<ClubType[]>(clubTypesCacheKey, CLUBS_CACHE_TTL_MS) ||
        readRouteDataCache<StudyClub[]>(discoverCacheKey, CLUBS_CACHE_TTL_MS)
      );
      
      if (!hasCachedData) setLoading(true);
      await Promise.all([
        fetchMyClubs(), 
        fetchClubTypes(),
        fetchDiscoverClubs(true) // Prefetch discover clubs in background
      ]);
      setLoading(false);
    };
    loadData();
  }, [clubTypesCacheKey, currentUser, discoverCacheKey, fetchMyClubs, fetchClubTypes, fetchDiscoverClubs, myClubsCacheKey]);

  // Handle active tab changes and search queries for Discover tab
  useEffect(() => {
    if (activeTab === 'discover') {
      // Only show full loading spinner if we haven't fetched yet or if doing a search
      const needsLoader = !hasFetchedDiscover || debouncedSearchQuery !== '' || selectedType !== '';
      fetchDiscoverClubs(!needsLoader);
    }
  }, [activeTab, debouncedSearchQuery, selectedType, fetchDiscoverClubs, hasFetchedDiscover]);

  const handleJoinClub = async (clubId: string) => {
    try {
      setJoiningClubId(clubId);
      const token = TokenManager.getAccessToken();
      const response = await fetch(`${FEED_SERVICE_URL}/clubs/${clubId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        await Promise.all([fetchMyClubs(), fetchDiscoverClubs()]);
      }
    } catch (error) {
      console.error('Error joining club:', error);
    } finally {
      setJoiningClubId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Clean club card with more info
  const ClubCard = ({ club, showJoin = false }: { club: StudyClub; showJoin?: boolean }) => (
    <Link 
      href={`/${locale}/clubs/${club.id}`}
      className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:border-amber-200 dark:hover:border-amber-500/50 transition-all group"
    >
      <div className="flex items-start gap-4">
        {/* Club Icon */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${CLUB_TYPE_COLORS[club.clubType] || 'bg-gray-100 text-gray-600'}`}>
          {CLUB_TYPE_ICONS[club.clubType] || <Users className="w-5 h-5" />}
        </div>
        
        {/* Club Info */}
        <div className="flex-1 min-w-0">
          {/* Header row with name and role */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              {club.name}
            </h3>
            {club.myRole === 'OWNER' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">
                <Crown className="w-3 h-3" />
                Owner
              </span>
            )}
            {club.myRole === 'ADMIN' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">
                <Shield className="w-3 h-3" />
                Admin
              </span>
            )}
          </div>
          
          {/* Description */}
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
            {club.description || 'A collaborative study group for learning and growth together.'}
          </p>
          
          {/* Creator info */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              {club.creator.profilePictureUrl ? (
                <img src={club.creator.profilePictureUrl} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-[10px] text-white font-medium">{club.creator.firstName[0]}</span>
              )}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Created by <span className="font-medium text-gray-700 dark:text-gray-300">{club.creator.firstName} {club.creator.lastName}</span>
            </span>
          </div>
          
          {/* Meta info row */}
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${CLUB_TYPE_COLORS[club.clubType] || 'bg-gray-100 text-gray-600'}`}>
              {clubTypes.find(t => t.value === club.clubType)?.label || club.clubType}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {club._count.members} members
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5" />
              {club._count.posts} posts
            </span>
            <span className="flex items-center gap-1">
              {PRIVACY_ICONS[club.privacy] || PRIVACY_ICONS.PUBLIC}
              <span className="capitalize">{club.privacy.replace(/_/g, ' ').toLowerCase()}</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDate(club.createdAt)}
            </span>
          </div>
        </div>
        
        {/* Action */}
        <div className="flex-shrink-0">
          {showJoin && !club.isMember ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleJoinClub(club.id);
              }}
              disabled={joiningClubId === club.id}
              className="px-3 py-1.5 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {joiningClubId === club.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Join'
              )}
            </button>
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
          )}
        </div>
      </div>
    </Link>
  );

  return (
    <>
      {/* Content handled globally */}
      
      {/* Show skeleton layout immediately for perceived performance */}
      {!currentUser ? (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 scrollbar-hide">
          <UnifiedNavigation />
          <div className="max-w-6xl mx-auto px-4 py-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Left Sidebar Skeleton */}
              <aside className="hidden lg:block lg:col-span-3">
                <div className="sticky top-20 space-y-3">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-48 animate-pulse" />
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-10 animate-pulse" />
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-64 animate-pulse" />
                </div>
              </aside>

              {/* Main Feed Skeleton */}
              <main className="lg:col-span-6 space-y-4">
                {/* Tabs & Search Skeleton */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-24 animate-pulse" />
                {/* Clubs List Skeleton */}
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                      <div className="flex-1 space-y-3">
                        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                        <div className="flex gap-2">
                          <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700" />
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </main>

              {/* Right Sidebar Skeleton */}
              <aside className="hidden lg:block lg:col-span-3">
                <div className="sticky top-20 space-y-3">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-64 animate-pulse" />
                </div>
              </aside>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
          <UnifiedNavigation user={currentUser} school={school} onLogout={handleLogout} />
          
          {/* LinkedIn-style 3-column layout */}
          <div className="max-w-6xl mx-auto px-4 py-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Left Sidebar */}
              <aside className="hidden lg:block lg:col-span-3">
                <div className="sticky top-20 space-y-3">
                  {/* Overview Card */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="h-16 bg-gradient-to-r from-amber-500 to-orange-500 relative">
                      <Users className="absolute bottom-2 right-3 w-6 h-6 text-white/30" />
                    </div>
                    <div className="p-4">
                      <h2 className="font-bold text-gray-900 dark:text-white">Study Clubs</h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Collaborate and learn together</p>
                      
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2.5 text-center">
                          <p className="text-lg font-bold text-gray-900 dark:text-white">{clubs.length}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">Joined</p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2.5 text-center">
                          <p className="text-lg font-bold text-gray-900 dark:text-white">{discoverClubs.length}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">Available</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3">
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Create Club
                    </button>
                  </div>
                  
                  {/* Club Types Filter */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Categories</h3>
                    </div>
                    <nav className="py-1">
                      <button
                        onClick={() => { setSelectedType(''); setActiveTab('discover'); }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                          !selectedType && activeTab === 'discover' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        All Types
                      </button>
                      {clubTypes.slice(0, 6).map((type) => (
                        <button
                          key={type.value}
                          onClick={() => { setSelectedType(type.value); setActiveTab('discover'); }}
                          className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                            selectedType === type.value ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }`}
                        >
                          {CLUB_TYPE_ICONS[type.value]}
                          {type.label}
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>
              </aside>
              
              {/* Main Content */}
              <main className="lg:col-span-6">
                {/* Tabs */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-4 overflow-hidden">
                  <div className="flex border-b border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => setActiveTab('my-clubs')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'my-clubs'
                          ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50/50 dark:bg-amber-900/10'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      My Clubs
                    </button>
                    <button
                      onClick={() => setActiveTab('discover')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'discover'
                          ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50/50 dark:bg-amber-900/10'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Compass className="w-4 h-4" />
                      Discover
                    </button>
                  </div>
                  
                  {/* Search - only in Discover */}
                  {activeTab === 'discover' && (
                    <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search clubs..."
                          className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Club List */}
                <div className="space-y-3">
                  {activeTab === 'my-clubs' && (
                    <>
                      {loading && clubs.length === 0 ? (
                        <div className="space-y-3">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse flex items-start gap-4">
                              <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                              <div className="flex-1 space-y-2.5">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
                                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                                <div className="flex gap-2">
                                  <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
                                  <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : clubs.length === 0 && !loading ? (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
                          <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <Users className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                          </div>
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">No clubs yet</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Create or join a study club to get started</p>
                          <div className="flex justify-center gap-3">
                            <button
                              onClick={() => setShowCreateModal(true)}
                              className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600"
                            >
                              Create Club
                            </button>
                            <button
                              onClick={() => setActiveTab('discover')}
                              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                              Discover
                            </button>
                          </div>
                        </div>
                      ) : (
                        clubs.map((club) => <ClubCard key={club.id} club={club} />)
                      )}
                    </>
                  )}
                  
                  {activeTab === 'discover' && (
                    <>
                      {loadingDiscover && discoverClubs.length === 0 ? (
                        <div className="space-y-3">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse flex items-start gap-4">
                              <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                              <div className="flex-1 space-y-2.5">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
                                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                                <div className="flex gap-2">
                                  <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
                                  <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : discoverClubs.length === 0 && !loadingDiscover ? (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
                          <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <Compass className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                          </div>
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">No clubs found</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Try adjusting your search or create a new club</p>
                        </div>
                      ) : (
                        discoverClubs.map((club) => <ClubCard key={club.id} club={club} showJoin />)
                      )}
                    </>
                  )}
                </div>
              </main>
              
              {/* Right Sidebar */}
              <aside className="hidden lg:block lg:col-span-3">
                <div className="sticky top-20 space-y-3">
                  {/* Trending Clubs */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-500" />
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Popular Clubs</h3>
                    </div>
                    <div className="p-3 space-y-2">
                      {clubs.slice(0, 3).map((club) => (
                        <Link
                          key={club.id}
                          href={`/${locale}/clubs/${club.id}`}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${CLUB_TYPE_COLORS[club.clubType] || 'bg-gray-100'}`}>
                            {CLUB_TYPE_ICONS[club.clubType] || <Users className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{club.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{club._count.members} members</p>
                          </div>
                        </Link>
                      ))}
                      {clubs.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-2">No clubs yet</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Footer Links */}
                  <div className="px-4 py-3">
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
                      <Link href="#" className="hover:text-gray-600">About</Link>
                      <Link href="#" className="hover:text-gray-600">Help</Link>
                      <Link href="#" className="hover:text-gray-600">Privacy</Link>
                      <Link href="#" className="hover:text-gray-600">Terms</Link>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">© 2026 Stunity</p>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}

      {/* Create Club Modal */}
      {showCreateModal && (
        <CreateClubModal
          clubTypes={clubTypes}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchMyClubs();
          }}
        />
      )}
    </>
  );
}

// Create Club Modal Component
function CreateClubModal({
  clubTypes,
  onClose,
  onCreated,
}: {
  clubTypes: ClubType[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clubType, setClubType] = useState('CASUAL_STUDY_GROUP');
  const [category, setCategory] = useState('');
  const [privacy, setPrivacy] = useState('PUBLIC');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim() || name.trim().length < 3) {
      setError('Club name must be at least 3 characters');
      return;
    }

    try {
      setCreating(true);
      setError('');
      const token = TokenManager.getAccessToken();
      const response = await fetch(`${FEED_SERVICE_URL}/clubs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          type: clubType,
          mode: privacy,
          clubType,
          category: category.trim(),
          privacy,
        }),
      });

      if (response.ok) {
        onCreated();
      } else {
        const data = await response.json();
        setError(data.error || data.message || 'Failed to create club');
      }
    } catch {
      setError('Failed to create club');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md shadow-xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Create Study Club</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Start a new learning community</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Club Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Advanced Mathematics"
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this club about?"
              rows={2}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Type</label>
              <select
                value={clubType}
                onChange={(e) => setClubType(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:text-white"
              >
                {clubTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Privacy</label>
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:text-white"
              >
                <option value="PUBLIC">Public</option>
                <option value="INVITE_ONLY">Invite Only</option>
                <option value="APPROVAL_REQUIRED">Approval Required</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category (optional)</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Mathematics, Programming"
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:text-white"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
          >
            {creating && <Loader2 className="w-4 h-4 animate-spin" />}
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
