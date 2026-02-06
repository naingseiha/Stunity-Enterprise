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
  Search,
  X,
  Send,
  Edit3,
  ChevronDown,
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
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [posting, setPosting] = useState(false);

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

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    
    try {
      setPosting(true);
      const token = TokenManager.getAccessToken();
      const response = await fetch('http://localhost:3010/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: newPostContent.trim(),
          studyClubId: clubId,
          visibility: 'SCHOOL',
          postType: 'ARTICLE',
        }),
      });

      if (response.ok) {
        setNewPostContent('');
        setShowCreatePost(false);
        fetchPosts();
      }
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setPosting(false);
    }
  };

  const handleUpdateMemberRole = async (memberId: string, userId: string, newRole: string) => {
    try {
      const token = TokenManager.getAccessToken();
      const response = await fetch(`http://localhost:3010/clubs/${clubId}/members/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        fetchAllMembers();
        fetchClub();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update role');
      }
    } catch (error) {
      console.error('Error updating member role:', error);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this member from the club?')) return;
    
    try {
      const token = TokenManager.getAccessToken();
      const response = await fetch(`http://localhost:3010/clubs/${clubId}/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        fetchAllMembers();
        fetchClub();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Error removing member:', error);
    }
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
                {/* Invite Button (Admin only) */}
                {(club.myRole === 'OWNER' || club.myRole === 'ADMIN') && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
                  >
                    <UserPlus className="w-4 h-4" />
                    Invite
                  </button>
                )}
                
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
                {/* Create Post Box */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  {showCreatePost ? (
                    <div className="space-y-3">
                      <textarea
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        placeholder={`Share something with ${club.name}...`}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setShowCreatePost(false);
                            setNewPostContent('');
                          }}
                          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleCreatePost}
                          disabled={posting || !newPostContent.trim()}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50"
                        >
                          {posting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          Post
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowCreatePost(true)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-500 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white">
                        <Edit3 className="w-5 h-5" />
                      </div>
                      <span>Share something with the club...</span>
                    </button>
                  )}
                </div>

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
                    <MemberRow
                      key={member.id}
                      member={member}
                      locale={locale}
                      isAdmin={isAdmin}
                      isOwner={club.myRole === 'OWNER'}
                      currentUserId={currentUserId}
                      getInitials={getInitials}
                      onUpdateRole={handleUpdateMemberRole}
                      onRemove={handleRemoveMember}
                    />
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

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          clubId={clubId}
          clubName={club.name}
          onClose={() => setShowInviteModal(false)}
          onInvited={() => {
            setShowInviteModal(false);
            fetchAllMembers();
            fetchClub();
          }}
        />
      )}
    </div>
  );
}

// Member Row Component with role management
function MemberRow({
  member,
  locale,
  isAdmin,
  isOwner,
  currentUserId,
  getInitials,
  onUpdateRole,
  onRemove,
}: {
  member: ClubMember;
  locale: string;
  isAdmin: boolean;
  isOwner: boolean;
  currentUserId: string;
  getInitials: (firstName: string, lastName: string) => string;
  onUpdateRole: (memberId: string, userId: string, role: string) => void;
  onRemove: (userId: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const canManage = isAdmin && member.user.id !== currentUserId && member.role !== 'OWNER';
  const canChangeToAdmin = isOwner && member.role !== 'ADMIN';
  const canChangeToMod = isAdmin && member.role !== 'MODERATOR';
  const canChangeToMember = isAdmin && member.role !== 'MEMBER';

  return (
    <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
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
      
      {canManage && (
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>
          
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                <p className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase">Change Role</p>
                {canChangeToAdmin && (
                  <button
                    onClick={() => {
                      onUpdateRole(member.id, member.user.id, 'ADMIN');
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Shield className="w-4 h-4 text-blue-500" />
                    Make Admin
                  </button>
                )}
                {canChangeToMod && (
                  <button
                    onClick={() => {
                      onUpdateRole(member.id, member.user.id, 'MODERATOR');
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Star className="w-4 h-4 text-purple-500" />
                    Make Moderator
                  </button>
                )}
                {canChangeToMember && (
                  <button
                    onClick={() => {
                      onUpdateRole(member.id, member.user.id, 'MEMBER');
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Users className="w-4 h-4 text-gray-500" />
                    Make Member
                  </button>
                )}
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => {
                    onRemove(member.user.id);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <UserMinus className="w-4 h-4" />
                  Remove from Club
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Invite Modal Component
function InviteModal({
  clubId,
  clubName,
  onClose,
  onInvited,
}: {
  clubId: string;
  clubName: string;
  onClose: () => void;
  onInvited: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState(false);

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      setSearching(true);
      const token = TokenManager.getAccessToken();
      // Search users - using the existing users endpoint
      const response = await fetch(`http://localhost:3001/users/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || data || []);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleInvite = async () => {
    if (selectedUsers.size === 0) return;
    
    try {
      setInviting(true);
      const token = TokenManager.getAccessToken();
      const response = await fetch(`http://localhost:3010/clubs/${clubId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userIds: Array.from(selectedUsers) }),
      });

      if (response.ok) {
        onInvited();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to invite users');
      }
    } catch (error) {
      console.error('Error inviting users:', error);
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Invite to {clubName}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by name..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1">
            {searching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                {searchQuery ? 'No users found' : 'Search for users to invite'}
              </p>
            ) : (
              searchResults.map((user: any) => (
                <button
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    selectedUsers.has(user.id)
                      ? 'bg-amber-50 border-2 border-amber-500'
                      : 'hover:bg-gray-50 border-2 border-transparent'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-semibold text-sm">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                    <p className="text-sm text-gray-500">{user.email || user.role}</p>
                  </div>
                  {selectedUsers.has(user.id) && (
                    <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
          </p>
          <button
            onClick={handleInvite}
            disabled={inviting || selectedUsers.size === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50"
          >
            {inviting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            Invite
          </button>
        </div>
      </div>
    </div>
  );
}
