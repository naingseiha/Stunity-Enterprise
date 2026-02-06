'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Plus,
  ArrowLeft,
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
  Settings,
  Loader2,
  FileText,
  MoreVertical,
  LogOut,
  UserMinus,
  Shield,
  Crown,
  Star,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import PostCard, { PostData } from '@/components/feed/PostCard';

interface ClubMember {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl?: string;
    headline?: string;
    role?: string;
  };
}

interface StudyClub {
  id: string;
  name: string;
  description?: string;
  clubType: string;
  category?: string;
  privacy: string;
  coverImage?: string;
  creatorId: string;
  maxMembers?: number;
  isActive: boolean;
  createdAt: string;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl?: string;
    headline?: string;
  };
  members: ClubMember[];
  _count: {
    members: number;
    posts: number;
  };
  isMember: boolean;
  myRole?: string;
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

const CLUB_TYPE_LABELS: Record<string, string> = {
  SUBJECT: 'Subject Club',
  SKILL: 'Skill Development',
  RESEARCH: 'Research Group',
  PROJECT: 'Project Team',
  EXAM_PREP: 'Exam Preparation',
  LANGUAGE: 'Language Club',
  COMPETITION: 'Competition Prep',
  TUTORING: 'Tutoring Circle',
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  OWNER: <Crown className="w-3.5 h-3.5 text-amber-500" />,
  ADMIN: <Shield className="w-3.5 h-3.5 text-blue-500" />,
  MODERATOR: <Star className="w-3.5 h-3.5 text-purple-500" />,
  MEMBER: null,
};

export default function ClubDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  const clubId = params?.id as string;
  
  const [club, setClub] = useState<StudyClub | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'members'>('posts');
  const [allMembers, setAllMembers] = useState<ClubMember[]>([]);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    const userData = TokenManager.getUserData();
    if (userData?.user?.id) {
      setCurrentUserId(userData.user.id);
    }
  }, []);

  const fetchClub = useCallback(async () => {
    try {
      const token = TokenManager.getAccessToken();
      const response = await fetch(`http://localhost:3010/clubs/${clubId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setClub(data);
      } else if (response.status === 404) {
        router.push(`/${locale}/clubs`);
      }
    } catch (error) {
      console.error('Error fetching club:', error);
    }
  }, [clubId, locale, router]);

  const fetchPosts = useCallback(async () => {
    try {
      setLoadingPosts(true);
      const token = TokenManager.getAccessToken();
      const response = await fetch(`http://localhost:3010/clubs/${clubId}/posts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  }, [clubId]);

  const fetchAllMembers = useCallback(async () => {
    try {
      const token = TokenManager.getAccessToken();
      const response = await fetch(`http://localhost:3010/clubs/${clubId}/members?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAllMembers(data.members);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  }, [clubId]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchClub();
      setLoading(false);
    };
    loadData();
  }, [fetchClub]);

  useEffect(() => {
    if (club?.isMember) {
      if (activeTab === 'posts') {
        fetchPosts();
      } else if (activeTab === 'members') {
        fetchAllMembers();
      }
    }
  }, [club?.isMember, activeTab, fetchPosts, fetchAllMembers]);

  const handleJoin = async () => {
    try {
      setJoining(true);
      const token = TokenManager.getAccessToken();
      const response = await fetch(`http://localhost:3010/clubs/${clubId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        await fetchClub();
      }
    } catch (error) {
      console.error('Error joining club:', error);
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm('Are you sure you want to leave this club?')) return;
    
    try {
      setLeaving(true);
      const token = TokenManager.getAccessToken();
      const response = await fetch(`http://localhost:3010/clubs/${clubId}/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        router.push(`/${locale}/clubs`);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to leave club');
      }
    } catch (error) {
      console.error('Error leaving club:', error);
    } finally {
      setLeaving(false);
    }
  };

  const handleLike = async (postId: string) => {
    const token = TokenManager.getAccessToken();
    await fetch(`http://localhost:3010/posts/${postId}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const handleComment = async (postId: string, content: string) => {
    const token = TokenManager.getAccessToken();
    await fetch(`http://localhost:3010/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
    });
    fetchPosts();
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50/40 via-white to-orange-50/30 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!club) {
    return null;
  }

  const isAdmin = club.myRole === 'OWNER' || club.myRole === 'ADMIN';

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/40 via-white to-orange-50/30">
      {/* Cover */}
      <div className={`h-48 md:h-64 bg-gradient-to-br ${CLUB_TYPE_COLORS[club.clubType] || 'from-amber-400 to-orange-500'} relative`}>
        {club.coverImage && (
          <img src={club.coverImage} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Back Button */}
        <Link
          href={`/${locale}/clubs`}
          className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium text-gray-700 hover:bg-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          All Clubs
        </Link>

        {/* Settings Button (Admin) */}
        {isAdmin && (
          <Link
            href={`/${locale}/clubs/${club.id}/settings`}
            className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all"
          >
            <Settings className="w-5 h-5 text-gray-700" />
          </Link>
        )}

        {/* Club Info */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white rounded-full px-3 py-1 text-sm">
                {CLUB_TYPE_ICONS[club.clubType]}
                {CLUB_TYPE_LABELS[club.clubType]}
              </span>
              {club.category && (
                <span className="bg-white/20 backdrop-blur-sm text-white rounded-full px-3 py-1 text-sm">
                  {club.category}
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{club.name}</h1>
            {club.description && (
              <p className="text-white/80 text-lg max-w-2xl">{club.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{club._count.members}</p>
              <p className="text-sm text-gray-500">Members</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{club._count.posts}</p>
              <p className="text-sm text-gray-500">Posts</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {club.isMember ? (
              <>
                {club.myRole && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm font-medium">
                    {ROLE_ICONS[club.myRole]}
                    {club.myRole}
                  </span>
                )}
                {club.myRole !== 'OWNER' && (
                  <button
                    onClick={handleLeave}
                    disabled={leaving}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all disabled:opacity-50"
                  >
                    {leaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogOut className="w-4 h-4" />
                    )}
                    Leave
                  </button>
                )}
              </>
            ) : club.privacy !== 'PRIVATE' && club.privacy !== 'SECRET' ? (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20"
              >
                {joining ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Join Club
              </button>
            ) : (
              <span className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl">
                <Lock className="w-4 h-4" />
                Invite Only
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        {club.isMember && (
          <>
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
              <button
                onClick={() => setActiveTab('posts')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'posts'
                    ? 'bg-white text-amber-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                Posts
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'members'
                    ? 'bg-white text-amber-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="w-4 h-4" />
                Members
              </button>
            </div>

            {/* Posts Tab */}
            {activeTab === 'posts' && (
              <div className="space-y-4">
                {loadingPosts ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                  </div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No posts yet. Be the first to share!</p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onLike={handleLike}
                      onComment={handleComment}
                      currentUserId={currentUserId}
                    />
                  ))
                )}
              </div>
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
                {allMembers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No members yet</p>
                  </div>
                ) : (
                  allMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                      <Link 
                        href={`/${locale}/profile/${member.user.id}`}
                        className="flex items-center gap-3"
                      >
                        {member.user.profilePictureUrl ? (
                          <img
                            src={member.user.profilePictureUrl}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-semibold text-sm">
                            {getInitials(member.user.firstName, member.user.lastName)}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 flex items-center gap-1.5">
                            {member.user.firstName} {member.user.lastName}
                            {ROLE_ICONS[member.role]}
                          </p>
                          <p className="text-sm text-gray-500">
                            {member.user.headline || member.role}
                          </p>
                        </div>
                      </Link>
                      
                      {isAdmin && member.user.id !== currentUserId && member.role !== 'OWNER' && (
                        <button className="p-2 hover:bg-gray-100 rounded-full">
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {/* Non-member view */}
        {!club.isMember && (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <Lock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Join this club to view posts and members</p>
          </div>
        )}
      </div>
    </div>
  );
}
