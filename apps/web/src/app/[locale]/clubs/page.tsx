'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Users,
  Plus,
  Search,
  BookOpen,
  Code,
  FlaskConical,
  Rocket,
  GraduationCap,
  Languages,
  Trophy,
  UserPlus,
  Globe,
  School,
  Lock,
  EyeOff,
  ChevronRight,
  Loader2,
  Compass,
  X,
  FileText,
  Settings,
  Sparkles,
  Crown,
  Shield,
  Star,
  TrendingUp,
  Calendar,
  MessageCircle,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import FeedZoomLoader from '@/components/feed/FeedZoomLoader';

interface StudyClub {
  id: string;
  name: string;
  description?: string;
  clubType: string;
  category?: string;
  privacy: string;
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
  SUBJECT: <BookOpen className="w-5 h-5" />,
  SKILL: <Code className="w-5 h-5" />,
  RESEARCH: <FlaskConical className="w-5 h-5" />,
  PROJECT: <Rocket className="w-5 h-5" />,
  EXAM_PREP: <GraduationCap className="w-5 h-5" />,
  LANGUAGE: <Languages className="w-5 h-5" />,
  COMPETITION: <Trophy className="w-5 h-5" />,
  TUTORING: <UserPlus className="w-5 h-5" />,
};

const CLUB_TYPE_COLORS: Record<string, string> = {
  SUBJECT: 'from-blue-500 to-indigo-500',
  SKILL: 'from-emerald-500 to-teal-500',
  RESEARCH: 'from-purple-500 to-violet-500',
  PROJECT: 'from-orange-500 to-red-500',
  EXAM_PREP: 'from-amber-500 to-yellow-500',
  LANGUAGE: 'from-pink-500 to-rose-500',
  COMPETITION: 'from-cyan-500 to-blue-500',
  TUTORING: 'from-green-500 to-emerald-500',
};

const PRIVACY_ICONS: Record<string, React.ReactNode> = {
  PUBLIC: <Globe className="w-4 h-4" />,
  SCHOOL: <School className="w-4 h-4" />,
  PRIVATE: <Lock className="w-4 h-4" />,
  SECRET: <EyeOff className="w-4 h-4" />,
};

export default function StudyClubsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  
  const [activeTab, setActiveTab] = useState<'my-clubs' | 'discover'>('my-clubs');
  const [clubs, setClubs] = useState<StudyClub[]>([]);
  const [discoverClubs, setDiscoverClubs] = useState<StudyClub[]>([]);
  const [clubTypes, setClubTypes] = useState<ClubType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joiningClubId, setJoiningClubId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);

  // Load user and school from localStorage for navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      const schoolStr = localStorage.getItem('school');
      if (userStr) setCurrentUser(JSON.parse(userStr));
      if (schoolStr) setSchool(JSON.parse(schoolStr));
    }
  }, []);

  const handleLogout = () => {
    TokenManager.clearTokens();
    router.push(`/${locale}/login`);
  };

  const fetchMyClubs = useCallback(async () => {
    try {
      const token = TokenManager.getAccessToken();
      const response = await fetch('http://localhost:3010/clubs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setClubs(data.clubs);
      }
    } catch (error) {
      console.error('Error fetching clubs:', error);
    }
  }, []);

  const fetchDiscoverClubs = useCallback(async () => {
    try {
      const token = TokenManager.getAccessToken();
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedType) params.set('clubType', selectedType);
      
      const response = await fetch(`http://localhost:3010/clubs/discover?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setDiscoverClubs(data.clubs);
      }
    } catch (error) {
      console.error('Error discovering clubs:', error);
    }
  }, [searchQuery, selectedType]);

  const fetchClubTypes = useCallback(async () => {
    try {
      const token = TokenManager.getAccessToken();
      const response = await fetch('http://localhost:3010/clubs/types', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setClubTypes(data);
      }
    } catch (error) {
      console.error('Error fetching club types:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMyClubs(), fetchClubTypes()]);
      setLoading(false);
    };
    loadData();
  }, [fetchMyClubs, fetchClubTypes]);

  useEffect(() => {
    if (activeTab === 'discover') {
      fetchDiscoverClubs();
    }
  }, [activeTab, fetchDiscoverClubs]);

  const handleJoinClub = async (clubId: string) => {
    try {
      setJoiningClubId(clubId);
      const token = TokenManager.getAccessToken();
      const response = await fetch(`http://localhost:3010/clubs/${clubId}/join`, {
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

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const ClubCard = ({ club, showJoin = false, index = 0 }: { club: StudyClub; showJoin?: boolean; index?: number }) => (
    <div 
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:border-amber-200/50 transition-all duration-300 group cursor-pointer"
      onClick={() => router.push(`/${locale}/clubs/${club.id}`)}
      style={{
        animation: 'slideInUp 0.5s ease-out forwards',
        animationDelay: `${index * 60}ms`,
        opacity: 0,
      }}
    >
      {/* Cover Image / Gradient with overlay pattern */}
      <div className={`h-28 bg-gradient-to-br ${CLUB_TYPE_COLORS[club.clubType] || 'from-amber-400 to-orange-500'} relative overflow-hidden`}>
        {club.coverImage ? (
          <img src={club.coverImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          /* Decorative pattern for clubs without cover */
          <div className="absolute inset-0">
            <div className="absolute top-1/4 -left-4 w-20 h-20 rounded-full bg-white/10" />
            <div className="absolute -top-4 right-1/4 w-16 h-16 rounded-full bg-white/10" />
            <div className="absolute bottom-0 right-0 w-24 h-24 rounded-full bg-white/5" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        
        {/* Club Icon - Floating on cover */}
        <div className={`absolute -bottom-5 left-4 w-14 h-14 rounded-xl bg-gradient-to-br ${CLUB_TYPE_COLORS[club.clubType] || 'from-amber-400 to-orange-500'} flex items-center justify-center border-4 border-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          <span className="text-white scale-110">
            {CLUB_TYPE_ICONS[club.clubType]}
          </span>
        </div>

        {/* Privacy Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm">
          <span className="text-gray-600">
            {PRIVACY_ICONS[club.privacy]}
          </span>
          <span className="text-xs font-medium text-gray-700">
            {club.privacy === 'PUBLIC' ? 'Public' : club.privacy === 'SCHOOL' ? 'School' : club.privacy === 'PRIVATE' ? 'Private' : 'Secret'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="pt-7 pb-4 px-4">
        {/* Club Type Tag */}
        <div className="flex items-center gap-2 mb-2">
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gradient-to-r ${CLUB_TYPE_COLORS[club.clubType]} text-white shadow-sm`}>
            {clubTypes.find(t => t.value === club.clubType)?.label || club.clubType}
          </span>
          {club.category && (
            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100">
              {club.category}
            </span>
          )}
        </div>

        {/* Club Name */}
        <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-amber-600 transition-colors line-clamp-1">
          {club.name}
        </h3>
        
        {/* Description */}
        {club.description ? (
          <p className="text-sm text-gray-500 line-clamp-2 mb-3 min-h-[2.5rem]">{club.description}</p>
        ) : (
          <p className="text-sm text-gray-400 italic mb-3 min-h-[2.5rem]">No description</p>
        )}

        {/* Creator Info */}
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
          {club.creator.profilePictureUrl ? (
            <img src={club.creator.profilePictureUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-medium">
              {club.creator.firstName?.[0]}{club.creator.lastName?.[0]}
            </div>
          )}
          <span className="text-xs text-gray-500">
            Created by <span className="font-medium text-gray-700">{club.creator.firstName} {club.creator.lastName}</span>
          </span>
        </div>

        {/* Stats & Action Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-gray-500">
              <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">{club._count.members}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500">
              <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">{club._count.posts}</span>
            </div>
          </div>

          {showJoin && !club.isMember ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleJoinClub(club.id);
              }}
              disabled={joiningClubId === club.id}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-semibold hover:from-amber-600 hover:to-orange-600 hover:shadow-lg hover:shadow-amber-500/25 transition-all disabled:opacity-50 transform hover:scale-105"
            >
              {joiningClubId === club.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Join
                </>
              )}
            </button>
          ) : club.myRole ? (
            <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
              club.myRole === 'OWNER' 
                ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border border-amber-200' 
                : club.myRole === 'ADMIN'
                ? 'bg-blue-50 text-blue-700 border border-blue-100'
                : 'bg-gray-100 text-gray-600 border border-gray-200'
            }`}>
              {club.myRole === 'OWNER' && <Crown className="w-3 h-3" />}
              {club.myRole === 'ADMIN' && <Shield className="w-3 h-3" />}
              {club.myRole}
            </span>
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Stunity Logo Zoom Loader - same as feed and profile */}
      <FeedZoomLoader 
        isLoading={loading} 
        onAnimationComplete={() => setShowContent(true)}
        minimumDuration={600}
      />
      
      {showContent && (
        <div className="min-h-screen bg-gradient-to-br from-amber-50/40 via-white to-orange-50/30">
          {/* Navigation Bar */}
          <UnifiedNavigation user={currentUser} school={school} onLogout={handleLogout} />
          
          <div className="max-w-5xl mx-auto px-4 py-6">
            {/* Page Header Card - Matching Profile Page Style */}
            <div 
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6 animate-fadeInUp"
            >
              {/* Gradient Header Banner - Taller like profile page */}
              <div className="h-48 md:h-56 bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500 relative overflow-hidden">
                {/* Decorative pattern */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full border-2 border-white/30" />
                  <div className="absolute top-1/3 right-1/4 w-24 h-24 rounded-full border-2 border-white/20" />
                  <div className="absolute bottom-1/4 left-1/3 w-16 h-16 rounded-full border-2 border-white/25" />
                </div>
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
              
              {/* Header Content */}
              <div className="px-6 pb-6">
                {/* Avatar - Circular like profile page */}
                <div className="relative -mt-16 md:-mt-20 mb-4">
                  <div className="w-32 h-32 md:w-36 md:h-36 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center border-4 border-white shadow-xl ring-4 ring-amber-100/50">
                    <Users className="w-14 h-14 md:w-16 md:h-16 text-white" />
                  </div>
                </div>
                
                {/* Title and Action */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Study Clubs</h1>
                    <p className="text-gray-500 mt-1">Collaborate and learn together</p>
                  </div>
                  
                  {/* Action Button */}
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/25 hover:shadow-xl hover:scale-105"
                  >
                    <Plus className="w-5 h-5" />
                    Create Club
                  </button>
                </div>
                
                {/* Quick Stats */}
                <div className="flex items-center gap-6 mt-6 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-gray-900">{clubs.length}</p>
                      <p className="text-xs text-gray-500">My Clubs</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                      <Compass className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-gray-900">{discoverClubs.length}</p>
                      <p className="text-xs text-gray-500">Discover</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-gray-900">{clubTypes.length}</p>
                      <p className="text-xs text-gray-500">Categories</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Card */}
            <div 
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fadeInUp"
              style={{ animationDelay: '0.1s' }}
            >
              {/* Tabs */}
              <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => setActiveTab('my-clubs')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                      activeTab === 'my-clubs'
                        ? 'bg-white text-amber-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    My Clubs
                  </button>
                  <button
                    onClick={() => setActiveTab('discover')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                      activeTab === 'discover'
                        ? 'bg-white text-amber-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Compass className="w-4 h-4" />
                    Discover
                  </button>
                </div>
              </div>

              <div className="p-4">
                {/* Discover Filters */}
                {activeTab === 'discover' && (
                <div className="space-y-4 mb-6">
                  {/* Search and dropdown */}
                  <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search clubs..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all focus:bg-white"
                      />
                    </div>
                  </div>
                  
                  {/* Club Type Quick Filter Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedType('')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        selectedType === ''
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-300 hover:text-amber-600'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      All Types
                    </button>
                    {clubTypes.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setSelectedType(type.value === selectedType ? '' : type.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          selectedType === type.value
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                            : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-300 hover:text-amber-600'
                        }`}
                      >
                        {CLUB_TYPE_ICONS[type.value]}
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* My Clubs Tab Content */}
              {activeTab === 'my-clubs' && (
                <>
                  {clubs.length === 0 ? (
                    <div className="text-center py-16 bg-gradient-to-r from-amber-50/50 to-orange-50/50 rounded-xl border border-amber-100/50">
                      <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center">
                        <Users className="w-10 h-10 text-amber-500" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No clubs yet</h3>
                      <p className="text-gray-500 mb-6 max-w-md mx-auto">Create your first study club or discover existing ones to collaborate with others</p>
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold shadow-lg shadow-amber-500/25 hover:scale-105 transition-all"
                        >
                          <Plus className="w-5 h-5" />
                          Create Club
                        </button>
                        <button
                          onClick={() => setActiveTab('discover')}
                          className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 rounded-xl font-medium hover:bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all"
                        >
                          <Compass className="w-5 h-5" />
                          Discover
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {clubs.map((club, index) => (
                        <ClubCard key={club.id} club={club} index={index} />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Discover Tab Content */}
              {activeTab === 'discover' && (
                <>
                  {discoverClubs.length === 0 ? (
                    <div className="text-center py-16 bg-gradient-to-r from-amber-50/50 to-orange-50/50 rounded-xl border border-amber-100/50">
                      <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center">
                        <Compass className="w-10 h-10 text-amber-500" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No clubs found</h3>
                      <p className="text-gray-500 max-w-md mx-auto">Try adjusting your search or create a new club</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {discoverClubs.map((club, index) => (
                        <ClubCard key={club.id} club={club} showJoin index={index} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
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

// CSS Animations are in globals.css

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
  const [clubType, setClubType] = useState('SUBJECT');
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
      const response = await fetch('http://localhost:3010/clubs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          clubType,
          category: category.trim(),
          privacy,
        }),
      });

      if (response.ok) {
        onCreated();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create club');
      }
    } catch (error) {
      setError('Failed to create club');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'slideInUp 0.3s ease-out forwards',
        }}
      >
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Create Study Club</h2>
                <p className="text-white/80 text-xs">Start a new learning community</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <X className="w-3 h-3 text-red-600" />
              </div>
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Club Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Advanced Mathematics Club"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this club about?"
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Club Type</label>
              <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto pr-1">
                {clubTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setClubType(type.value)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-left transition-all ${
                      clubType === type.value
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 hover:border-amber-300'
                    }`}
                  >
                    <span className={`${clubType === type.value ? 'text-amber-500' : 'text-gray-400'}`}>
                      {CLUB_TYPE_ICONS[type.value]}
                    </span>
                    <span className={`text-xs font-medium ${clubType === type.value ? 'text-amber-700' : 'text-gray-700'}`}>
                      {type.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Privacy</label>
              <div className="space-y-2">
                {[
                  { value: 'PUBLIC', label: 'Public', icon: Globe, desc: 'Anyone can join' },
                  { value: 'SCHOOL', label: 'School', icon: School, desc: 'School members only' },
                  { value: 'PRIVATE', label: 'Private', icon: Lock, desc: 'Invite only' },
                  { value: 'SECRET', label: 'Secret', icon: EyeOff, desc: 'Hidden' },
                ].map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPrivacy(opt.value)}
                      className={`w-full flex items-center gap-2.5 p-2 rounded-xl border-2 text-left transition-all ${
                        privacy === opt.value
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-gray-200 hover:border-amber-300'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${privacy === opt.value ? 'text-amber-500' : 'text-gray-400'}`} />
                      <div>
                        <span className={`text-xs font-medium ${privacy === opt.value ? 'text-amber-700' : 'text-gray-700'}`}>
                          {opt.label}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">- {opt.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category (optional)</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Mathematics, Programming, Physics"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 hover:shadow-lg hover:shadow-amber-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
          >
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Create Club
          </button>
        </div>
        
        {/* CSS Animation */}
        <style jsx>{`
          @keyframes slideInUp {
            from {
              opacity: 0;
              transform: translateY(20px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
