'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joiningClubId, setJoiningClubId] = useState<string | null>(null);

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

  const ClubCard = ({ club, showJoin = false }: { club: StudyClub; showJoin?: boolean }) => (
    <div 
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer"
      onClick={() => router.push(`/${locale}/clubs/${club.id}`)}
    >
      {/* Cover Image / Gradient */}
      <div className={`h-24 bg-gradient-to-br ${CLUB_TYPE_COLORS[club.clubType] || 'from-amber-400 to-orange-500'} relative`}>
        {club.coverImage && (
          <img src={club.coverImage} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/10" />
        
        {/* Club Type Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1">
          <span className={`bg-gradient-to-r ${CLUB_TYPE_COLORS[club.clubType]} bg-clip-text text-transparent`}>
            {CLUB_TYPE_ICONS[club.clubType]}
          </span>
          <span className="text-xs font-medium text-gray-700">
            {clubTypes.find(t => t.value === club.clubType)?.label || club.clubType}
          </span>
        </div>

        {/* Privacy Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1">
          {PRIVACY_ICONS[club.privacy]}
          <span className="text-xs text-gray-600">{club.privacy.charAt(0) + club.privacy.slice(1).toLowerCase()}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-lg mb-1 group-hover:text-amber-600 transition-colors">
          {club.name}
        </h3>
        {club.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">{club.description}</p>
        )}
        {club.category && (
          <span className="inline-block text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full mb-3">
            {club.category}
          </span>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-gray-500">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {club._count.members}
            </span>
            <span className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              {club._count.posts}
            </span>
          </div>

          {showJoin && !club.isMember ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleJoinClub(club.id);
              }}
              disabled={joiningClubId === club.id}
              className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full text-sm font-medium hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50"
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
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              {club.myRole}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/40 via-white to-orange-50/30">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-7 h-7 text-amber-500" />
              Study Clubs
            </h1>
            <p className="text-gray-500 mt-1">Collaborate and learn together</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-5 h-5" />
            Create Club
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
          <button
            onClick={() => setActiveTab('my-clubs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
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
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'discover'
                ? 'bg-white text-amber-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Compass className="w-4 h-4" />
            Discover
          </button>
        </div>

        {/* Discover Filters */}
        {activeTab === 'discover' && (
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search clubs..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              />
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            >
              <option value="">All Types</option>
              {clubTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* My Clubs */}
            {activeTab === 'my-clubs' && (
              <>
                {clubs.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No clubs yet</h3>
                    <p className="text-gray-500 mb-6">Create your first study club or discover existing ones</p>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Create Club
                      </button>
                      <button
                        onClick={() => setActiveTab('discover')}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                      >
                        <Compass className="w-4 h-4" />
                        Discover
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clubs.map((club) => (
                      <ClubCard key={club.id} club={club} />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Discover */}
            {activeTab === 'discover' && (
              <>
                {discoverClubs.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                    <Compass className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No clubs found</h3>
                    <p className="text-gray-500">Try adjusting your search or create a new club</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {discoverClubs.map((club) => (
                      <ClubCard key={club.id} club={club} showJoin />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

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
    </div>
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
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Create Study Club</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Club Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Advanced Mathematics Club"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Club Type</label>
              <select
                value={clubType}
                onChange={(e) => setClubType(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                {clubTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Privacy</label>
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                <option value="PUBLIC">Public - Anyone can join</option>
                <option value="SCHOOL">School - School members only</option>
                <option value="PRIVATE">Private - Invite only</option>
                <option value="SECRET">Secret - Hidden from search</option>
              </select>
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
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50"
          >
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Create Club
          </button>
        </div>
      </div>
    </div>
  );
}
