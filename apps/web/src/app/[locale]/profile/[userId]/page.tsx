'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft, MapPin, Calendar, ExternalLink, Mail, Phone,
  Award, Briefcase, GraduationCap, Star, Users, Eye, Heart,
  MessageCircle, BookmarkPlus, Share2, MoreHorizontal, Edit3,
  CheckCircle, Plus, ChevronRight, Zap, TrendingUp, Trophy,
  Code, Palette, BookOpen, Target, Clock, Globe, Shield
} from 'lucide-react';
import BlurLoader from '@/components/BlurLoader';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';

// Types
interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role: string;
  profilePictureUrl?: string;
  coverPhotoUrl?: string;
  bio?: string;
  headline?: string;
  professionalTitle?: string;
  location?: string;
  languages: string[];
  interests: string[];
  skills: string[];
  careerGoals?: string;
  socialLinks?: Record<string, string>;
  profileCompleteness: number;
  profileVisibility: string;
  isVerified: boolean;
  verifiedAt?: string;
  totalLearningHours: number;
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  level: number;
  isOpenToOpportunities: boolean;
  resumeUrl?: string;
  createdAt: string;
  school?: { id: string; name: string; logo?: string };
  teacher?: { id: string; position?: string; degree?: string; hireDate?: string; major1?: string; major2?: string };
  student?: { id: string; firstName: string; lastName: string; class?: { id: string; name: string; grade: string } };
  isOwnProfile: boolean;
  isFollowing: boolean;
  stats: {
    posts: number;
    followers: number;
    following: number;
    skills: number;
    experiences: number;
    certifications: number;
    projects: number;
    achievements: number;
    recommendations: number;
    postsThisMonth: number;
    totalLikes: number;
    totalViews: number;
  };
}

interface Skill {
  id: string;
  skillName: string;
  category: string;
  level: string;
  yearsOfExp?: number;
  description?: string;
  endorsementCount: number;
  endorsements: Array<{
    id: string;
    endorser: { id: string; firstName: string; lastName: string; profilePictureUrl?: string; headline?: string };
  }>;
}

interface Experience {
  id: string;
  type: string;
  title: string;
  organization: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description?: string;
  achievements: string[];
  skills: string[];
}

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  startDate?: string;
  endDate?: string;
  technologies: string[];
  mediaUrls: string[];
  projectUrl?: string;
  githubUrl?: string;
  isFeatured: boolean;
}

interface Certification {
  id: string;
  name: string;
  issuingOrg: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
  description?: string;
  skills: string[];
}

interface Achievement {
  id: string;
  type: string;
  title: string;
  description: string;
  issuedBy?: string;
  issuedDate: string;
  badgeUrl?: string;
  points: number;
  rarity: string;
}

interface Recommendation {
  id: string;
  relationship: string;
  content: string;
  rating?: number;
  createdAt: string;
  author: { id: string; firstName: string; lastName: string; profilePictureUrl?: string; headline?: string; professionalTitle?: string };
}

// Skeleton Component
function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Cover skeleton */}
      <div className="h-48 md:h-64 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 animate-pulse" />
      
      <div className="max-w-5xl mx-auto px-4 -mt-16 relative z-10">
        {/* Profile header skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse border-4 border-white dark:border-gray-800" />
            <div className="flex-1 space-y-3">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-64 animate-pulse" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
              <div className="flex gap-4 mt-4">
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Content skeleton */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4" />
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-6">
            {[1, 2].map(i => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-4" />
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Skill Level Badge
const skillLevelColors: Record<string, string> = {
  BEGINNER: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  INTERMEDIATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ADVANCED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  EXPERT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

// Achievement Rarity Colors
const rarityColors: Record<string, string> = {
  COMMON: 'from-gray-400 to-gray-500',
  UNCOMMON: 'from-green-400 to-green-600',
  RARE: 'from-blue-400 to-blue-600',
  EPIC: 'from-purple-400 to-purple-600',
  LEGENDARY: 'from-amber-400 to-orange-500',
};

// Skill Category Icons
const categoryIcons: Record<string, React.ElementType> = {
  PROGRAMMING: Code,
  LANGUAGES: Globe,
  MATHEMATICS: Target,
  SCIENCE: Zap,
  HUMANITIES: BookOpen,
  ARTS: Palette,
  SPORTS: Trophy,
  TEACHING: GraduationCap,
};

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  const userId = params?.userId as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'activity' | 'skills' | 'experience' | 'certifications' | 'projects'>('about');
  const [following, setFollowing] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  
  // Get current user and school from localStorage for navigation
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);

  useEffect(() => {
    // Load user and school from localStorage
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      const schoolStr = localStorage.getItem('school');
      if (userStr) setCurrentUser(JSON.parse(userStr));
      if (schoolStr) setSchool(JSON.parse(schoolStr));
    }
    fetchProfileData();
  }, [userId]);

  const handleLogout = () => {
    TokenManager.clearTokens();
    router.push(`/${locale}/login`);
  };

  const fetchProfileData = async () => {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) {
        router.push(`/${locale}/auth/login`);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const feedUrl = process.env.NEXT_PUBLIC_FEED_SERVICE_URL || 'http://localhost:3010';

      // Fetch all profile data in parallel
      const [profileRes, skillsRes, expRes, projectsRes, certsRes, achievementsRes, recsRes] = await Promise.all([
        fetch(`${feedUrl}/users/${userId}/profile`, { headers }),
        fetch(`${feedUrl}/users/${userId}/skills`, { headers }),
        fetch(`${feedUrl}/users/${userId}/experiences`, { headers }),
        fetch(`${feedUrl}/users/${userId}/projects`, { headers }),
        fetch(`${feedUrl}/users/${userId}/certifications`, { headers }),
        fetch(`${feedUrl}/users/${userId}/achievements`, { headers }),
        fetch(`${feedUrl}/users/${userId}/recommendations`, { headers }),
      ]);

      const [profileData, skillsData, expData, projectsData, certsData, achievementsData, recsData] = await Promise.all([
        profileRes.json(),
        skillsRes.json(),
        expRes.json(),
        projectsRes.json(),
        certsRes.json(),
        achievementsRes.json(),
        recsRes.json(),
      ]);

      if (profileData.success) {
        setProfile(profileData.profile);
        setFollowing(profileData.profile.isFollowing);
      }
      if (skillsData.success) setSkills(skillsData.skills);
      if (expData.success) setExperiences(expData.experiences);
      if (projectsData.success) setProjects(projectsData.projects);
      if (certsData.success) setCertifications(certsData.certifications);
      if (achievementsData.success) setAchievements(achievementsData.achievements);
      if (recsData.success) setRecommendations(recsData.recommendations);

      setLoading(false);
      setTimeout(() => setPageReady(true), 100);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!profile) return;
    try {
      const token = TokenManager.getAccessToken();
      const feedUrl = process.env.NEXT_PUBLIC_FEED_SERVICE_URL || 'http://localhost:3010';
      const res = await fetch(`${feedUrl}/users/${profile.id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setFollowing(data.action === 'followed');
        setProfile(prev => prev ? {
          ...prev,
          stats: {
            ...prev.stats,
            followers: prev.stats.followers + (data.action === 'followed' ? 1 : -1),
          },
        } : null);
      }
    } catch (error) {
      console.error('Follow error:', error);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (loading) return <ProfileSkeleton />;
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Profile Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">This profile doesn't exist or is private.</p>
          <Link href={`/${locale}/feed`} className="text-blue-600 hover:underline">← Back to Feed</Link>
        </div>
      </div>
    );
  }

  return (
    <BlurLoader isLoading={loading} skeleton={<ProfileSkeleton />}>
      <div className={`min-h-screen bg-gray-100 dark:bg-gray-900 transition-opacity duration-500 ${pageReady ? 'opacity-100' : 'opacity-0'}`}>
        {/* Navigation Bar */}
        <UnifiedNavigation user={currentUser} school={school} onLogout={handleLogout} />
        
        {/* Cover Photo */}
        <div className="relative h-48 md:h-56 bg-gradient-to-r from-emerald-600 via-blue-600 to-indigo-600">
          {profile.coverPhotoUrl ? (
            <Image
              src={profile.coverPhotoUrl}
              alt="Cover"
              fill
              className="object-cover"
            />
          ) : (
            // Education-themed default cover pattern
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%)] bg-[length:60px_60px]" />
              <div className="absolute bottom-4 right-8 flex items-center gap-3 opacity-20">
                <GraduationCap className="w-16 h-16 text-white" />
                <BookOpen className="w-12 h-12 text-white" />
                <Award className="w-14 h-14 text-white" />
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

          {/* Edit cover button (own profile) */}
          {profile.isOwnProfile && (
            <Link
              href={`/${locale}/profile/${userId}/edit`}
              className="absolute top-4 right-4 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white text-sm flex items-center gap-2 transition-all hover:scale-105"
            >
              <Edit3 className="w-4 h-4" />
              Edit Profile
            </Link>
          )}
        </div>

        <div className="max-w-5xl mx-auto px-4 -mt-16 relative z-10 pb-12">
          {/* Profile Header Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <div className="relative flex-shrink-0 -mt-20 md:-mt-24">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl border-4 border-white dark:border-gray-800 shadow-xl overflow-hidden bg-gradient-to-br from-emerald-500 to-blue-500">
                  {profile.profilePictureUrl ? (
                    <Image
                      src={profile.profilePictureUrl}
                      alt={`${profile.firstName} ${profile.lastName}`}
                      width={160}
                      height={160}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-5xl font-bold">
                      {profile.firstName[0]}{profile.lastName[0]}
                    </div>
                  )}
                </div>
                {profile.isVerified && (
                  <div className="absolute bottom-2 right-2 bg-emerald-500 rounded-lg p-1.5 shadow-lg">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                )}
                {/* Level Badge */}
                {profile.level > 1 && (
                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full text-xs font-bold shadow-lg">
                    Lv.{profile.level}
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 md:pt-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      {profile.firstName} {profile.lastName}
                      {profile.isVerified && (
                        <span className="text-emerald-500" title="Verified Educator">
                          <Shield className="w-5 h-5" />
                        </span>
                      )}
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300 mt-1">
                      {profile.headline || profile.professionalTitle || `${profile.role} at ${profile.school?.name || 'School'}`}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-gray-500 dark:text-gray-400">
                      {profile.location && (
                        <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-full">
                          <MapPin className="w-3.5 h-3.5" />
                          {profile.location}
                        </span>
                      )}
                      {profile.school && (
                        <span className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full">
                          <GraduationCap className="w-3.5 h-3.5" />
                          {profile.school.name}
                        </span>
                      )}
                      {profile.isOpenToOpportunities && (
                        <span className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2.5 py-1 rounded-full">
                          <Zap className="w-3.5 h-3.5" />
                          Open to opportunities
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {profile.isOwnProfile ? (
                      <Link
                        href={`/${locale}/profile/${profile.id}/edit`}
                        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit Profile
                      </Link>
                    ) : (
                      <>
                        <button
                          onClick={handleFollow}
                          className={`px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all ${
                            following
                              ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                              : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-105'
                          }`}
                        >
                          {following ? (
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
                        <Link
                          href={`/${locale}/messages?startWith=${profile.id}`}
                          className="px-5 py-2.5 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2 transition-all hover:scale-105"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Message
                        </Link>
                      </>
                    )}
                    <button className="p-2.5 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Stats Row - Education Focused */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="text-xl font-bold text-gray-900 dark:text-white">{profile.stats.followers}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Followers</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="text-xl font-bold text-gray-900 dark:text-white">{profile.stats.following}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Following</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{profile.stats.posts}</div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide">Posts</div>
                  </div>
                  <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                    <div className="text-xl font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                      <Trophy className="w-4 h-4" />
                      {profile.totalPoints.toLocaleString()}
                    </div>
                    <div className="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wide">Points</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/30 rounded-xl">
                    <div className="text-xl font-bold text-orange-600 dark:text-orange-400 flex items-center justify-center gap-1">
                      <Zap className="w-4 h-4" />
                      {profile.currentStreak}
                    </div>
                    <div className="text-xs text-orange-600 dark:text-orange-400 uppercase tracking-wide">Day Streak</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <div className="flex">
              {([
                { key: 'about', label: 'About', icon: BookOpen },
                { key: 'activity', label: 'Activity', icon: TrendingUp },
                { key: 'skills', label: 'Skills', icon: Star },
                { key: 'experience', label: 'Experience', icon: Briefcase },
                { key: 'certifications', label: 'Certifications', icon: Award },
                { key: 'projects', label: 'Projects', icon: Code },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium text-sm whitespace-nowrap transition-all border-b-2 ${
                    activeTab === tab.key
                      ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Main Content - Left/Center */}
            <div className="md:col-span-2 space-y-6">
              {/* About Section */}
              {activeTab === 'about' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Bio */}
                  {profile.bio && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-emerald-500" />
                        About
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{profile.bio}</p>
                    </div>
                  )}

                  {/* Career Goals */}
                  {profile.careerGoals && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200 dark:border-blue-800 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-500" />
                        Career Goals
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{profile.careerGoals}</p>
                    </div>
                  )}

                  {/* Interests */}
                  {profile.interests.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Interests</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.interests.map((interest, i) => (
                          <span key={i} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Languages */}
                  {profile.languages.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-green-500" />
                        Languages
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.languages.map((lang, i) => (
                          <span key={i} className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Skills Section */}
              {activeTab === 'skills' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Skills & Expertise</h3>
                    {profile.isOwnProfile && (
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                        <Plus className="w-4 h-4" />
                        Add Skill
                      </button>
                    )}
                  </div>
                  
                  {skills.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">No skills added yet</p>
                  ) : (
                    <div className="grid gap-4">
                      {skills.map(skill => {
                        const CategoryIcon = categoryIcons[skill.category] || Star;
                        return (
                          <div key={skill.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                  <CategoryIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 dark:text-white">{skill.skillName}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${skillLevelColors[skill.level]}`}>
                                      {skill.level}
                                    </span>
                                    {skill.yearsOfExp && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {skill.yearsOfExp} yrs
                                      </span>
                                    )}
                                  </div>
                                  {skill.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{skill.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  {skill.endorsementCount}
                                </span>
                                {!profile.isOwnProfile && (
                                  <button className="text-blue-600 hover:text-blue-700 text-sm">Endorse</button>
                                )}
                              </div>
                            </div>
                            {/* Endorsers avatars */}
                            {skill.endorsements.length > 0 && (
                              <div className="flex -space-x-2 mt-3">
                                {skill.endorsements.slice(0, 5).map(e => (
                                  <div
                                    key={e.id}
                                    className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-700 overflow-hidden"
                                    title={`${e.endorser.firstName} ${e.endorser.lastName}`}
                                  >
                                    {e.endorser.profilePictureUrl ? (
                                      <Image src={e.endorser.profilePictureUrl} alt="" width={32} height={32} className="object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                                        {e.endorser.firstName[0]}
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {skill.endorsementCount > 5 && (
                                  <div className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                                    +{skill.endorsementCount - 5}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Experience Section */}
              {activeTab === 'experience' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Experience</h3>
                    {profile.isOwnProfile && (
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                        <Plus className="w-4 h-4" />
                        Add Experience
                      </button>
                    )}
                  </div>

                  {experiences.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">No experience added yet</p>
                  ) : (
                    <div className="space-y-6">
                      {experiences.map((exp, index) => (
                        <div key={exp.id} className="relative pl-6 pb-6 last:pb-0">
                          {/* Timeline line */}
                          {index < experiences.length - 1 && (
                            <div className="absolute left-[7px] top-6 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                          )}
                          {/* Timeline dot */}
                          <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 ${
                            exp.isCurrent 
                              ? 'bg-green-500 border-green-500' 
                              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                          }`} />
                          
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">{exp.title}</h4>
                            <p className="text-gray-600 dark:text-gray-300">{exp.organization}</p>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                              <Calendar className="w-4 h-4" />
                              {formatDate(exp.startDate)} - {exp.isCurrent ? 'Present' : exp.endDate ? formatDate(exp.endDate) : 'N/A'}
                              {exp.location && (
                                <>
                                  <span>•</span>
                                  <MapPin className="w-4 h-4" />
                                  {exp.location}
                                </>
                              )}
                            </div>
                            {exp.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{exp.description}</p>
                            )}
                            {exp.skills.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {exp.skills.map((skill, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Certifications Section */}
              {activeTab === 'certifications' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-500" />
                      Licenses & Certifications
                    </h3>
                    {profile.isOwnProfile && (
                      <Link
                        href={`/${locale}/profile/${userId}/edit?section=certifications`}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Certification
                      </Link>
                    )}
                  </div>

                  {certifications.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                      <Award className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400 font-medium">No certifications added yet</p>
                      {profile.isOwnProfile && (
                        <Link
                          href={`/${locale}/profile/${userId}/edit?section=certifications`}
                          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm mt-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add your first certification
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {certifications.map((cert, index) => {
                        const isExpired = cert.expiryDate && new Date(cert.expiryDate) < new Date();
                        const expiresSOon = cert.expiryDate && !isExpired && 
                          new Date(cert.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
                        
                        return (
                          <div 
                            key={cert.id} 
                            className={`relative p-4 rounded-xl border-2 transition-all hover:shadow-md animate-in slide-in-from-left duration-300 ${
                              isExpired 
                                ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10'
                                : 'border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700'
                            }`}
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <div className="flex items-start gap-4">
                              {/* Cert Icon */}
                              <div className="flex-shrink-0">
                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-sm ${
                                  isExpired 
                                    ? 'bg-red-100 dark:bg-red-900/30' 
                                    : 'bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30'
                                }`}>
                                  <Award className={`w-7 h-7 ${isExpired ? 'text-red-500' : 'text-amber-600 dark:text-amber-400'}`} />
                                </div>
                              </div>

                              {/* Cert Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-white text-base">
                                      {cert.name}
                                    </h4>
                                    <p className="text-gray-600 dark:text-gray-300 text-sm mt-0.5">
                                      {cert.issuingOrg}
                                    </p>
                                  </div>
                                  
                                  {/* Status Badge */}
                                  {isExpired ? (
                                    <span className="flex-shrink-0 px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium rounded-full">
                                      Expired
                                    </span>
                                  ) : expiresSOon ? (
                                    <span className="flex-shrink-0 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full">
                                      Expires Soon
                                    </span>
                                  ) : cert.expiryDate === null ? (
                                    <span className="flex-shrink-0 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                                      No Expiration
                                    </span>
                                  ) : null}
                                </div>

                                {/* Dates */}
                                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Issued {formatDate(cert.issueDate)}
                                  </span>
                                  {cert.expiryDate && (
                                    <span className={`flex items-center gap-1 ${isExpired ? 'text-red-500 dark:text-red-400' : ''}`}>
                                      •
                                      <Clock className="w-3.5 h-3.5" />
                                      {isExpired ? 'Expired' : 'Expires'} {formatDate(cert.expiryDate)}
                                    </span>
                                  )}
                                </div>

                                {/* Credential ID */}
                                {cert.credentialId && (
                                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    Credential ID: {cert.credentialId}
                                  </p>
                                )}

                                {/* Description */}
                                {cert.description && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                                    {cert.description}
                                  </p>
                                )}

                                {/* Skills */}
                                {cert.skills.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-3">
                                    {cert.skills.slice(0, 5).map((skill, i) => (
                                      <span key={i} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium">
                                        {skill}
                                      </span>
                                    ))}
                                    {cert.skills.length > 5 && (
                                      <span className="px-2 py-0.5 text-gray-500 dark:text-gray-400 text-xs">
                                        +{cert.skills.length - 5} more
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Credential URL */}
                                {cert.credentialUrl && (
                                  <a
                                    href={cert.credentialUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium mt-3 hover:underline"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Show credential
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Projects Section */}
              {activeTab === 'projects' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Projects</h3>
                    {profile.isOwnProfile && (
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                        <Plus className="w-4 h-4" />
                        Add Project
                      </button>
                    )}
                  </div>

                  {projects.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
                      <p className="text-gray-500 dark:text-gray-400">No projects added yet</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {projects.map(project => (
                        <div key={project.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                          {project.mediaUrls.length > 0 && (
                            <div className="h-48 relative bg-gray-100 dark:bg-gray-700">
                              <Image src={project.mediaUrls[0]} alt={project.title} fill className="object-cover" />
                            </div>
                          )}
                          <div className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                  {project.title}
                                  {project.isFeatured && (
                                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                  )}
                                </h4>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{project.category} • {project.status}</span>
                              </div>
                              <div className="flex gap-2">
                                {project.projectUrl && (
                                  <a href={project.projectUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                                    <ExternalLink className="w-4 h-4 text-gray-500" />
                                  </a>
                                )}
                                {project.githubUrl && (
                                  <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                                    <Code className="w-4 h-4 text-gray-500" />
                                  </a>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{project.description}</p>
                            {project.technologies.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-3">
                                {project.technologies.slice(0, 5).map((tech, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs">
                                    {tech}
                                  </span>
                                ))}
                                {project.technologies.length > 5 && (
                                  <span className="text-xs text-gray-500">+{project.technologies.length - 5}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Activity Section */}
              {activeTab === 'activity' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{profile.stats.postsThisMonth}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Posts this month</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="text-2xl font-bold text-red-500">{profile.stats.totalLikes}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Total likes</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="text-2xl font-bold text-green-500">{profile.stats.totalViews}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Total views</div>
                    </div>
                  </div>
                  <Link
                    href={`/${locale}/feed?author=${profile.id}`}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                  >
                    View all posts
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>

            {/* Sidebar - Right */}
            <div className="space-y-6">
              {/* Achievements Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Achievements
                </h3>
                {achievements.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No achievements yet</p>
                ) : (
                  <div className="space-y-3">
                    {achievements.slice(0, 5).map(achievement => (
                      <div key={achievement.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${rarityColors[achievement.rarity]} flex items-center justify-center`}>
                          {achievement.badgeUrl ? (
                            <Image src={achievement.badgeUrl} alt="" width={24} height={24} />
                          ) : (
                            <Award className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">{achievement.title}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{achievement.points} pts</p>
                        </div>
                      </div>
                    ))}
                    {achievements.length > 5 && (
                      <button className="text-blue-600 hover:text-blue-700 text-sm w-full text-center">
                        View all {achievements.length} achievements
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Recommendations Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-purple-500" />
                  Recommendations
                </h3>
                {recommendations.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No recommendations yet</p>
                ) : (
                  <div className="space-y-4">
                    {recommendations.slice(0, 3).map(rec => (
                      <div key={rec.id} className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                            {rec.author.profilePictureUrl ? (
                              <Image src={rec.author.profilePictureUrl} alt="" width={32} height={32} className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
                                {rec.author.firstName[0]}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {rec.author.firstName} {rec.author.lastName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{rec.relationship}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">{rec.content}</p>
                      </div>
                    ))}
                    {recommendations.length > 3 && (
                      <button className="text-blue-600 hover:text-blue-700 text-sm w-full text-center">
                        View all {recommendations.length} recommendations
                      </button>
                    )}
                  </div>
                )}
                {!profile.isOwnProfile && (
                  <button className="mt-4 w-full py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />
                    Write a recommendation
                  </button>
                )}
              </div>

              {/* Profile Stats Card */}
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-sm p-6 text-white animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Profile Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">Level</span>
                    <span className="font-bold">{profile.level}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">Total Points</span>
                    <span className="font-bold">{profile.totalPoints.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">Learning Hours</span>
                    <span className="font-bold">{profile.totalLearningHours}h</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">Longest Streak</span>
                    <span className="font-bold">{profile.longestStreak} days</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-white/80">Profile Completeness</span>
                      <span className="text-sm font-bold">{profile.profileCompleteness}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white rounded-full transition-all duration-500"
                        style={{ width: `${profile.profileCompleteness}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BlurLoader>
  );
}
