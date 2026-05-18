'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft, MapPin, Calendar, ExternalLink, Mail, Phone,
  Award, Briefcase, GraduationCap, Star, Users, Eye, Heart,
  MessageCircle, BookmarkPlus, Share2, MoreHorizontal, Edit3,
  CheckCircle, Plus, ChevronRight, Zap, TrendingUp, Trophy,
  Code, Palette, BookOpen, Target, Clock, Globe, Shield, Camera, Send,
  Flame, Diamond, BarChart2
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import { FEED_SERVICE_URL, ANALYTICS_SERVICE_URL } from '@/lib/api/config';
import { buildRouteDataCacheKey, readRouteDataCache, writeRouteDataCache } from '@/lib/route-data-cache';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import ProfileSkeleton from '@/components/profile/ProfileSkeleton';
import PostCard, { PostData } from '@/components/feed/PostCard';
import { FeedSkeletonList } from '@/components/feed/FeedPostSkeleton';
import { PerformanceTab } from '@/components/profile';

import { useTranslations } from 'next-intl';
// Types
interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  englishFirstName?: string;
  englishLastName?: string;
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

interface Education {
  id: string;
  school: string;
  degree?: string;
  fieldOfStudy?: string;
  grade?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description?: string;
  activities: string[];
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

interface CachedProfilePayload {
  profile: UserProfile | null;
  skills: Skill[];
  experiences: Experience[];
  projects: Project[];
  certifications: Certification[];
  education: Education[];
  achievements: Achievement[];
  recommendations: Recommendation[];
  posts: PostData[];
}

interface PerformanceStatsSummary {
  xp: number;
  level: number;
  xpProgress: number;
  xpToNextLevel: number;
  totalQuizzes: number;
  totalPoints: number;
  avgScore: number;
  winRate: number;
  winStreak: number;
  correctAnswers: number;
  totalAnswers: number;
  currentStreak: number;
  longestStreak?: number;
  recentScores: number[];
  weekActivity?: boolean[];
  freezesAvailable?: number;
  studiedToday?: boolean;
}

// Skeleton Component - Use imported ProfileSkeleton instead
// The ProfileSkeleton component provides a more polished loading experience

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

const PROFILE_CACHE_TTL_MS = 2 * 60 * 1000;

export default function ProfilePage() {
    const autoT = useTranslations();
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('common');
  const locale = (params?.locale as string) || 'en';
  const userId = params?.userId as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'performance' | 'posts' | 'about' | 'activity'>('performance');
  const [statsSummary, setStatsSummary] = useState<PerformanceStatsSummary | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [following, setFollowing] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  
  // Get current user and school from localStorage for navigation
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const profileCacheKey = buildRouteDataCacheKey('profile', userId);

  useEffect(() => {
    // Load user and school from localStorage
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      const schoolStr = localStorage.getItem('school');
      if (userStr) setCurrentUser(JSON.parse(userStr));
      if (schoolStr) setSchool(JSON.parse(schoolStr));
    }
    const cachedProfile = readRouteDataCache<CachedProfilePayload>(profileCacheKey, PROFILE_CACHE_TTL_MS);
    if (cachedProfile) {
      setProfile(cachedProfile.profile);
      setSkills(cachedProfile.skills);
      setExperiences(cachedProfile.experiences);
      setProjects(cachedProfile.projects);
      setCertifications(cachedProfile.certifications);
      setEducation(cachedProfile.education);
      setAchievements(cachedProfile.achievements);
      setRecommendations(cachedProfile.recommendations);
      setPosts(cachedProfile.posts);
      setFollowing(Boolean(cachedProfile.profile?.isFollowing));
      setLoading(false);
      setPageReady(true);
    }
    fetchProfileData();
    fetchStatsSummary();
  }, [profileCacheKey, userId]);

  const handleLogout = async () => {
    await TokenManager.logout();
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
      const feedUrl = FEED_SERVICE_URL;

      // Fetch all profile data in parallel
      const [profileRes, skillsRes, expRes, projectsRes, certsRes, eduRes, achievementsRes, recsRes, postsRes] = await Promise.all([
        fetch(`${feedUrl}/users/${userId}/profile`, { headers }),
        fetch(`${feedUrl}/users/${userId}/skills`, { headers }),
        fetch(`${feedUrl}/users/${userId}/experiences`, { headers }),
        fetch(`${feedUrl}/users/${userId}/projects`, { headers }),
        fetch(`${feedUrl}/users/${userId}/certifications`, { headers }),
        fetch(`${feedUrl}/users/${userId}/education`, { headers }),
        fetch(`${feedUrl}/users/${userId}/achievements`, { headers }),
        fetch(`${feedUrl}/users/${userId}/recommendations`, { headers }),
        fetch(`${feedUrl}/posts?authorId=${userId}&limit=50`, { headers }),
      ]);

      const safeJson = async (res: Response, defaultVal: any = { success: false }) => {
        try {
          if (!res.ok) return defaultVal;
          return await res.json();
        } catch (e) {
          console.error('JSON parse error:', e);
          return defaultVal;
        }
      };

      const [profileData, skillsData, expData, projectsData, certsData, eduData, achievementsData, recsData, postsData] = await Promise.all([
        safeJson(profileRes),
        safeJson(skillsRes),
        safeJson(expRes),
        safeJson(projectsRes),
        safeJson(certsRes),
        safeJson(eduRes),
        safeJson(achievementsRes),
        safeJson(recsRes),
        safeJson(postsRes),
      ]);

      if (profileData.success) {
        setProfile(profileData.profile);
        setFollowing(profileData.profile.isFollowing);
      }
      if (skillsData.success) setSkills(skillsData.skills);
      if (expData.success) setExperiences(expData.experiences);
      if (projectsData.success) setProjects(projectsData.projects);
      if (certsData.success) setCertifications(certsData.certifications);
      if (eduData.success) setEducation(eduData.education);
      if (achievementsData.success) setAchievements(achievementsData.achievements);
      if (recsData.success) setRecommendations(recsData.recommendations);
      if (postsData.success) setPosts(postsData.data || []);

      writeRouteDataCache<CachedProfilePayload>(profileCacheKey, {
        profile: profileData.success ? profileData.profile : null,
        skills: skillsData.success ? skillsData.skills : [],
        experiences: expData.success ? expData.experiences : [],
        projects: projectsData.success ? projectsData.projects : [],
        certifications: certsData.success ? certsData.certifications : [],
        education: eduData.success ? eduData.education : [],
        achievements: achievementsData.success ? achievementsData.achievements : [],
        recommendations: recsData.success ? recsData.recommendations : [],
        posts: postsData.success ? (postsData.data || []) : [],
      });

      setLoading(false);
      setTimeout(() => setPageReady(true), 100);
    } catch (error: unknown) {
      console.error('Error fetching profile:', error);
      setLoading(false);
    }
  };

  const fetchStatsSummary = async () => {
    try {
      const res = await TokenManager.fetchWithAuth(`${ANALYTICS_SERVICE_URL}/stats/${userId}/summary`);
      if (res.ok) {
        const data = await res.json();
        if (data?.data) setStatsSummary(data.data);
      }
    } catch { /* use profile defaults */ }
  };

  const handleFollow = async () => {
    if (!profile) return;
    try {
      const token = TokenManager.getAccessToken();
      const feedUrl = FEED_SERVICE_URL;
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

  const handleLike = async (postId: string) => {
    try {
      const token = TokenManager.getAccessToken();
      const feedUrl = FEED_SERVICE_URL;
      const res = await fetch(`${feedUrl}/posts/${postId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, isLiked: data.action === 'liked', likesCount: p.likesCount + (data.action === 'liked' ? 1 : -1) } : p
        ));
      }
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const handleValue = async (postId: string) => {
    try {
      const token = TokenManager.getAccessToken();
      const feedUrl = FEED_SERVICE_URL;
      const res = await fetch(`${feedUrl}/posts/${postId}/value`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, isValued: data.action === 'valued', valuesCount: (p.valuesCount || 0) + (data.action === 'valued' ? 1 : -1) } : p
        ));
      }
    } catch (error) {
      console.error('Value error:', error);
    }
  };

  const handleComment = async (postId: string, content: string) => {
    try {
      const token = TokenManager.getAccessToken();
      const feedUrl = FEED_SERVICE_URL;
      const res = await fetch(`${feedUrl}/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (data.success) {
        setPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
        ));
      }
    } catch (error) {
      console.error('Comment error:', error);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      const token = TokenManager.getAccessToken();
      const feedUrl = FEED_SERVICE_URL;
      const res = await fetch(`${feedUrl}/posts/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setPosts(prev => prev.filter(p => p.id !== postId));
      }
    } catch (error) {
      console.error('Delete post error:', error);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Show zoom loader during initial load
  if (loading) {
    return <ProfileSkeleton />;
  }
  
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50/40 via-white to-orange-50/30">
        <div className="text-center bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-100">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2"><AutoI18nText i18nKey="auto.web.locale_profile_userId_page.k_fbd6ab91" /></h2>
          <p className="text-gray-600 mb-6"><AutoI18nText i18nKey="auto.web.locale_profile_userId_page.k_2dc4a99c" /></p>
          <Link 
            href={`/${locale}/feed`} 
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full font-medium hover:from-amber-600 hover:to-orange-600 transition-all shadow-md hover:shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <AutoI18nText i18nKey="auto.web.locale_profile_userId_page.k_ab6fc6a1" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`min-h-screen bg-gradient-to-br from-amber-50/40 via-white to-orange-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 transition-all duration-700 ease-out ${pageReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Navigation Bar */}
        <UnifiedNavigation user={currentUser} school={school} onLogout={handleLogout} />
        
        <div className="max-w-5xl mx-auto px-4 py-6">
          {/* Profile Card - Contains Cover Photo */}
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm dark:border-gray-700 overflow-hidden"
            style={{
              animation: pageReady ? 'slideInUp 0.6s ease-out forwards' : 'none',
            }}
          >
            {/* Cover Photo - Lighter gradient for better look */}
            <div className="relative h-80 md:h-[450px] bg-gradient-to-br from-amber-100 via-orange-100 to-yellow-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800">
              {profile.coverPhotoUrl ? (
                <Image
                  src={profile.coverPhotoUrl}
                  alt={autoT("auto.web.locale_profile_userId_page.k_7b74323b")}
                  fill
                  className="object-cover"
                />
              ) : (
                /* Decorative pattern overlay for default cover */
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full border-2 border-amber-300/40" />
                  <div className="absolute top-1/3 right-1/4 w-24 h-24 rounded-full border-2 border-orange-300/30" />
                  <div className="absolute bottom-1/4 left-1/3 w-16 h-16 rounded-full border-2 border-yellow-300/30" />
                </div>
              )}
              {/* Edit cover button */}
              {profile.isOwnProfile && (
                <Link 
                  href={`/${locale}/profile/me/edit`}
                  className="absolute top-4 right-4 p-2.5 bg-white dark:bg-gray-900/90 dark:bg-gray-800/90 hover:bg-white dark:bg-gray-900 dark:hover:bg-gray-700 rounded-full shadow-lg transition-all hover:scale-105 group"
                >
                  <Edit3 className="w-4 h-4 text-gray-700 dark:text-gray-200 group-hover:text-amber-600" />
                </Link>
              )}
              {/* Cover gradient overlay */}
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/40 to-transparent" />
            </div>

            {/* Profile Content */}
            <div className="px-6 pb-6">
              {/* Avatar - Lighter gradient for default avatar */}
              <div className="relative -mt-20 md:-mt-24 mb-4">
                <div className="relative inline-block group">
                  <div className="w-36 h-36 md:w-44 md:h-44 rounded-full border-4 border-white dark:border-gray-800 overflow-hidden bg-gradient-to-br from-amber-200 to-orange-200 shadow-xl ring-4 ring-amber-50">
                    {profile.profilePictureUrl ? (
                      <Image
                        src={profile.profilePictureUrl}
                        alt={`${profile.lastName} ${profile.firstName}`}
                        width={176}
                        height={176}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-amber-700 text-5xl font-bold">
                        {profile.firstName[0]}{profile.lastName[0]}
                      </div>
                    )}
                  </div>
                  {/* Edit avatar overlay for own profile */}
                  {profile.isOwnProfile && (
                    <Link
                      href={`/${locale}/profile/me/edit`}
                      className="absolute inset-0 w-36 h-36 md:w-44 md:h-44 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                    >
                      <div className="flex flex-col items-center text-white">
                        <Camera className="w-6 h-6 mb-1" />
                        <span className="text-xs font-medium"><AutoI18nText i18nKey="auto.web.locale_profile_userId_page.k_ff3d6a8c" /></span>
                      </div>
                    </Link>
                  )}
                  {/* Open to Learn badge ring */}
                  {profile.isOpenToOpportunities && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gradient-to-r from-sky-400 to-blue-500 text-white text-[10px] font-semibold px-3 py-1 rounded-full whitespace-nowrap shadow-md">
                      <AutoI18nText i18nKey="auto.web.locale_profile_userId_page.k_bb34380f" />
                    </div>
                  )}
                </div>
              </div>

              {/* Name and Info Row */}
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div className="flex-1">
                  {/* Name */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex flex-col">
                      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white-800">
                        {profile.lastName} {profile.firstName}
                      </h1>
                      {(profile.englishFirstName || profile.englishLastName) && (
                        <p className="text-lg md:text-xl font-medium text-gray-500 dark:text-gray-400 -mt-1">
                          {profile.englishLastName} {profile.englishFirstName}
                        </p>
                      )}
                    </div>
                    {profile.isVerified && (
                      <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <AutoI18nText i18nKey="auto.web.locale_profile_userId_page.k_530923fc" />
                      </span>
                    )}
                    {/* Level Badge */}
                    {profile.level >= 5 && (
                      <span 
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          profile.level >= 20 ? 'bg-gradient-to-r from-purple-500 to-violet-600 text-white' :
                          profile.level >= 10 ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' :
                          'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                        }`}
                        title={`Level ${profile.level}`}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <AutoI18nText i18nKey="auto.web.locale_profile_userId_page.k_8f7ab6b6" /> {profile.level}
                      </span>
                    )}
                  </div>
                  
                  {/* Top Achievements Row - Show featured badges */}
                  {achievements.length > 0 && (
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {achievements.slice(0, 4).map((achievement) => {
                        const rarityColors: Record<string, string> = {
                          LEGENDARY: 'from-amber-400 to-orange-500',
                          EPIC: 'from-purple-500 to-violet-600',
                          RARE: 'from-blue-500 to-cyan-500',
                          UNCOMMON: 'from-green-500 to-emerald-500',
                          COMMON: 'from-gray-400 to-gray-500',
                        };
                        const gradient = rarityColors[achievement.rarity] || rarityColors.COMMON;
                        return (
                          <span 
                            key={achievement.id}
                            className={`inline-flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r ${gradient} text-white text-xs font-medium rounded-full shadow-sm`}
                            title={achievement.description}
                          >
                            {achievement.type === 'TOP_PERFORMER' && <Trophy className="w-3 h-3" />}
                            {achievement.type === 'COMPETITION_WIN' && <Trophy className="w-3 h-3" />}
                            {achievement.type === 'TEACHING_EXCELLENCE' && <Star className="w-3 h-3" />}
                            {achievement.type === 'SKILL_MASTERY' && <Zap className="w-3 h-3" />}
                            {achievement.type === 'CERTIFICATION' && <Award className="w-3 h-3" />}
                            {!['TOP_PERFORMER', 'COMPETITION_WIN', 'TEACHING_EXCELLENCE', 'SKILL_MASTERY', 'CERTIFICATION'].includes(achievement.type) && <Award className="w-3 h-3" />}
                            {achievement.title}
                          </span>
                        );
                      })}
                      {achievements.length > 4 && (
                        <span className="text-xs text-amber-600 font-medium">+{achievements.length - 4} <AutoI18nText i18nKey="auto.web.locale_profile_userId_page.k_4439c3dc" /></span>
                      )}
                    </div>
                  )}
                  
                  {/* Headline */}
                  <p className="text-gray-700 dark:text-gray-300 mt-1.5 text-lg">
                    {profile.headline || profile.professionalTitle || `${profile.role} at ${profile.school?.name || 'Organization'}`}
                  </p>
                  
                  {/* Location and Contact */}
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1.5">
                    {profile.location && <span>{profile.location}</span>}
                    {profile.location && <span> · </span>}
                    <span className="text-amber-600 hover:text-amber-700 hover:underline cursor-pointer transition-colors"><AutoI18nText i18nKey="auto.web.locale_profile_userId_page.k_31ccbaed" /></span>
                  </p>

                  {/* Connections */}
                  <Link 
                    href={`/${locale}/profile/${userId}/connections`}
                    className="text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 text-sm font-semibold mt-2 inline-block transition-colors"
                  >
                    {profile.stats.followers + profile.stats.following} <AutoI18nText i18nKey="auto.web.locale_profile_userId_page.k_c2205dd5" />
                  </Link>
                </div>

                {/* School/Organization Logo */}
                {profile.school && (
                  <div className="flex items-center gap-3 text-sm bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 px-4 py-2.5 rounded-xl border border-amber-100 dark:border-amber-900/30">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-400 rounded-lg flex items-center justify-center shadow-sm">
                      <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-gray-800 dark:text-gray-100 font-semibold">{profile.school.name}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mt-5">
                {profile.isOwnProfile ? (
                  <>
                    <Link
                      href={`/${locale}/profile/${profile.id}/edit`}
                      className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-full text-sm font-semibold transition-all shadow-md hover:shadow-lg"
                    >
                      <AutoI18nText i18nKey="auto.web.locale_profile_userId_page.k_52061dec" />
                    </Link>
                    <Link
                      href={`/${locale}/profile/${profile.id}/edit`}
                      className="px-5 py-2 border-2 border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-full text-sm font-semibold transition-all"
                    >
                      <AutoI18nText i18nKey="auto.web.locale_profile_userId_page.k_bdb90c33" />
                    </Link>
                    <Link
                      href={`/${locale}/profile/${profile.id}/edit`}
                      className="px-5 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 dark:hover:bg-gray-700 hover:border-gray-400 rounded-full text-sm font-medium transition-all"
                    >
                      <AutoI18nText i18nKey="auto.web.locale_profile_userId_page.k_543612e7" />
                    </Link>
                    <button className="px-5 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 dark:hover:bg-gray-700 hover:border-gray-400 rounded-full text-sm font-medium transition-all">
                      <AutoI18nText i18nKey="auto.web.locale_profile_userId_page.k_710bf09a" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleFollow}
                      className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                        following
                          ? 'border-2 border-gray-300 dark:border-gray-700 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-none dark:bg-gray-800/50 hover:border-gray-400'
                          : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md hover:shadow-lg'
                      }`}
                    >
                      {following ? 'Following' : 'Connect'}
                    </button>
                    <Link
                      href={`/${locale}/messages?startWith=${profile.id}`}
                      className="px-5 py-2 border-2 border-amber-500 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-full text-sm font-semibold transition-all"
                    >
                      <AutoI18nText i18nKey="auto.web.locale_profile_userId_page.k_a00bf4ef" />
                    </Link>
                    <button className="px-5 py-2 border border-gray-300 dark:border-gray-700 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 hover:border-gray-400 rounded-full text-sm font-medium transition-all">
                      <AutoI18nText i18nKey="auto.web.locale_profile_userId_page.k_8bee36ff" />
                    </button>
                  </>
                )}
              </div>

              {/* Open to Learn Card - For own profile */}
              {profile.isOwnProfile && profile.isOpenToOpportunities && (
                <div className="mt-5 p-4 border border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 rounded-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white"><AutoI18nText i18nKey="auto.web.locale_profile_userId_page.k_45bbecd7" /></p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5"><AutoI18nText i18nKey="auto.web.locale_profile_userId_page.k_ac7e55d6" /></p>
                      <button className="text-amber-600 hover:text-amber-700 hover:underline text-sm font-medium mt-1.5 transition-colors"><AutoI18nText i18nKey="auto.web.locale_profile_userId_page.k_f0c079ff" /></button>
                    </div>
                    <button className="p-2 hover:bg-sky-100 dark:hover:bg-sky-800 rounded-lg transition-colors">
                      <Edit3 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mt-3 shadow-sm overflow-x-auto"
            style={{ animation: pageReady ? 'slideInUp 0.6s ease-out 0.1s forwards' : 'none', opacity: pageReady ? 1 : 0 }}
          >
            <div className="flex p-1.5 gap-1">
              {([
                { key: 'performance', label: 'Performance', icon: BarChart2 },
                { key: 'posts', label: 'Posts', icon: Send },
                { key: 'about', label: 'About', icon: BookOpen },
                { key: 'activity', label: 'Activity', icon: TrendingUp },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-2.5 font-semibold text-sm whitespace-nowrap transition-all rounded-lg ${
                    activeTab === tab.key
                      ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          {/* Content Grid - Unified Learning Parity */}
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            {/* Main Content Column */}
            <div className="md:col-span-2 space-y-4">
              
              {/* 1. Performance Tab */}
              {activeTab === 'performance' && (
                <PerformanceTab 
                  statsSummary={statsSummary} 
                  achievements={achievements} 
                  projectsCount={projects.length}
                  profile={profile} 
                  locale={locale} 
                />
              )}

              {/* 2. Posts Tab */}
              {activeTab === 'posts' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {loadingPosts ? (
                    <FeedSkeletonList count={3} />
                  ) : posts.length > 0 ? (
                    posts.map(post => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onLike={handleLike}
                        onValue={handleValue}
                        onComment={handleComment}
                        onDelete={handleDeletePost}
                        currentUserId={currentUser?.id}
                      />
                    ))
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Send className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No Posts Yet</h3>
                      <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto text-sm">
                        {profile.isOwnProfile ? "You haven't shared anything with the community yet." : `${profile.firstName} hasn't shared any posts yet.`}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 3. About Tab - Consolidated detailed e-learning portfolio lists */}
              {activeTab === 'about' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  {/* Biography Card */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-850/50">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">Biography</h3>
                      {profile.isOwnProfile && (
                        <Link
                          href={`/${locale}/profile/${userId}/edit?section=about`}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                        >
                          <Edit3 className="w-4 h-4 text-gray-400 group-hover:text-amber-500 transition-colors" />
                        </Link>
                      )}
                    </div>
                    <div className="p-6">
                      {profile.bio ? (
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm whitespace-pre-wrap">{profile.bio}</p>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-gray-500 dark:text-gray-400 text-xs">
                            {profile.isOwnProfile ? 'Tell visitors about yourself, your background, and what you do.' : 'No bio added yet.'}
                          </p>
                          {profile.isOwnProfile && (
                            <Link
                              href={`/${locale}/profile/${userId}/edit?section=about`}
                              className="inline-flex items-center gap-1 mt-3 text-amber-600 dark:text-amber-500 hover:underline text-xs font-bold"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add Bio
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Consolidated Experience List */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-850/50">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        Experience
                      </h3>
                      {profile.isOwnProfile && (
                        <Link
                          href={`/${locale}/profile/${userId}/edit?section=experience`}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                        >
                          <Plus className="w-4 h-4 text-gray-400 group-hover:text-amber-500" />
                        </Link>
                      )}
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-750">
                      {experiences.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                          <p className="text-xs">No experience items added yet.</p>
                        </div>
                      ) : (
                        experiences.map((exp) => (
                          <div key={exp.id} className="p-5 flex gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-750/30 transition-colors">
                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-750 rounded-xl flex items-center justify-center flex-shrink-0">
                              <Briefcase className="w-5 h-5 text-gray-500 dark:text-gray-450" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-bold text-sm text-gray-900 dark:text-white">{exp.title}</h4>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold mt-0.5">{exp.organization}</p>
                                  <p className="text-gray-400 dark:text-gray-500 text-[11px] font-medium mt-1">
                                    {formatDate(exp.startDate)} - {exp.isCurrent ? 'Present' : exp.endDate ? formatDate(exp.endDate) : ''}
                                    {exp.location && ` · ${exp.location}`}
                                  </p>
                                </div>
                                {exp.isCurrent && (
                                  <span className="px-2 py-0.5 bg-green-50 dark:bg-green-950/55 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full border border-green-100 dark:border-green-900/30">
                                    Current
                                  </span>
                                )}
                              </div>
                              {exp.description && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2.5 leading-relaxed">{exp.description}</p>
                              )}
                              {exp.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-3">
                                  {exp.skills.map((skill, idx) => (
                                    <span key={idx} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-750 text-gray-600 dark:text-gray-400 rounded-md text-[10px] font-semibold">
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Consolidated Education List */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-850/50">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-emerald-600" />
                        Education
                      </h3>
                      {profile.isOwnProfile && (
                        <Link
                          href={`/${locale}/profile/${userId}/edit?section=education`}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                        >
                          <Plus className="w-4 h-4 text-gray-400 group-hover:text-amber-500" />
                        </Link>
                      )}
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-750">
                      {education.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                          <p className="text-xs">No education items added yet.</p>
                        </div>
                      ) : (
                        education.map((edu) => (
                          <div key={edu.id} className="p-5 flex gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-750/30 transition-colors">
                            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl flex items-center justify-center flex-shrink-0">
                              <GraduationCap className="w-5 h-5 text-emerald-600 dark:text-emerald-450" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-bold text-sm text-gray-900 dark:text-white">{edu.school}</h4>
                                  {(edu.degree || edu.fieldOfStudy) && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold mt-0.5">
                                      {edu.degree}{edu.fieldOfStudy && ` · ${edu.fieldOfStudy}`}
                                    </p>
                                  )}
                                  <p className="text-gray-400 dark:text-gray-500 text-[11px] font-medium mt-1">
                                    {formatDate(edu.startDate)} - {edu.isCurrent ? 'Present' : edu.endDate ? formatDate(edu.endDate) : ''}
                                    {edu.grade && ` · Grade: ${edu.grade}`}
                                  </p>
                                </div>
                                {edu.isCurrent && (
                                  <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/55 text-blue-700 dark:text-blue-400 text-[10px] font-bold rounded-full border border-blue-100 dark:border-blue-900/30">
                                    Enrolled
                                  </span>
                                )}
                              </div>
                              {edu.description && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">{edu.description}</p>
                              )}
                              {edu.activities.length > 0 && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
                                  <span className="text-gray-400">Activities:</span> {edu.activities.join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Skills List */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-850/50">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-500" />
                        Skills & Endorsements
                      </h3>
                      {profile.isOwnProfile && (
                        <Link
                          href={`/${locale}/profile/${userId}/edit?section=skills`}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                        >
                          <Plus className="w-4 h-4 text-gray-400 group-hover:text-amber-500" />
                        </Link>
                      )}
                    </div>
                    <div className="p-6">
                      {skills.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-4">No skills listed yet.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2.5">
                          {skills.map((skill) => (
                            <span 
                              key={skill.id} 
                              className="px-3.5 py-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-750 dark:to-gray-750 text-amber-800 dark:text-orange-300 rounded-full text-xs font-bold border border-amber-100 dark:border-gray-700 flex items-center gap-1 shadow-sm"
                            >
                              {skill.skillName}
                              {skill.endorsementCount > 0 && (
                                <span className="bg-amber-550/10 text-[10px] text-amber-600 font-extrabold px-1.5 py-0.5 rounded-full">
                                  {skill.endorsementCount}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Consolidated Projects */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-850/50">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Code className="w-4 h-4 text-purple-600" />
                        Projects
                      </h3>
                      {profile.isOwnProfile && (
                        <Link
                          href={`/${locale}/profile/${userId}/edit?section=projects`}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                        >
                          <Plus className="w-4 h-4 text-gray-400 group-hover:text-amber-500" />
                        </Link>
                      )}
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-750">
                      {projects.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                          <p className="text-xs">No projects listed yet.</p>
                        </div>
                      ) : (
                        projects.map(project => (
                          <div key={project.id} className="p-5 flex gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-750/30 transition-colors">
                            {project.mediaUrls.length > 0 ? (
                              <div className="w-16 h-16 relative bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden flex-shrink-0 border border-gray-200/50 dark:border-gray-700">
                                <img src={project.mediaUrls[0]} alt={project.title} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 bg-purple-50 dark:bg-purple-950/30 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Code className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                                    {project.title}
                                    {project.isFeatured && (
                                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                    )}
                                  </h4>
                                  <p className="text-xs text-gray-550 dark:text-gray-400 font-semibold mt-0.5">
                                    {project.category} · <span className="capitalize">{project.status.toLowerCase()}</span>
                                  </p>
                                </div>
                                <div className="flex gap-1.5">
                                  {project.projectUrl && (
                                    <a href={project.projectUrl} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-gray-100 dark:hover:bg-gray-750 rounded-lg text-gray-550 transition-colors">
                                      <ExternalLink className="w-4 h-4" />
                                    </a>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">{project.description}</p>
                              {project.technologies.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2.5">
                                  {project.technologies.map((tech, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-750 text-gray-600 dark:text-gray-450 rounded text-[10px]">
                                      {tech}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Consolidated Certifications */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-850/50">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-500" />
                        Certifications
                      </h3>
                      {profile.isOwnProfile && (
                        <Link
                          href={`/${locale}/profile/${userId}/edit?section=certifications`}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                        >
                          <Plus className="w-4 h-4 text-gray-400 group-hover:text-amber-500" />
                        </Link>
                      )}
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-750">
                      {certifications.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                          <p className="text-xs">No certifications items added yet.</p>
                        </div>
                      ) : (
                        certifications.map((cert) => {
                          const isExpired = cert.expiryDate && new Date(cert.expiryDate) < new Date();
                          return (
                            <div key={cert.id} className="p-5 flex gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-750/30 transition-colors">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                isExpired ? 'bg-red-50 dark:bg-red-950/30' : 'bg-amber-50 dark:bg-amber-950/30'
                              }`}>
                                <Award className={`w-5 h-5 ${isExpired ? 'text-red-500' : 'text-amber-600 dark:text-amber-450'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">{cert.name}</h4>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold mt-0.5">{cert.issuingOrg}</p>
                                    <p className="text-gray-400 dark:text-gray-500 text-[11px] font-medium mt-1">
                                      Issued: {formatDate(cert.issueDate)}
                                      {cert.expiryDate && ` · ${isExpired ? 'Expired' : 'Expires'}: ${formatDate(cert.expiryDate)}`}
                                    </p>
                                  </div>
                                  {isExpired && (
                                    <span className="px-2 py-0.5 bg-red-50 dark:bg-red-950/55 text-red-700 dark:text-red-400 text-[10px] font-bold rounded-full border border-red-100 dark:border-red-900/30">
                                      Expired
                                    </span>
                                  )}
                                </div>
                                {cert.credentialId && (
                                  <p className="text-[10px] text-gray-400 mt-1.5 font-semibold">Cred ID: {cert.credentialId}</p>
                                )}
                                {cert.credentialUrl && (
                                  <a 
                                    href={cert.credentialUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="inline-flex items-center gap-1 mt-2.5 text-xs text-amber-600 dark:text-amber-500 hover:underline font-bold"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    View Credential
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Languages & Interests snapshot */}
                  {(profile.interests.length > 0 || profile.languages.length > 0) && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all overflow-hidden p-6 grid md:grid-cols-2 gap-6">
                      {profile.interests.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Interests</p>
                          <div className="flex flex-wrap gap-2">
                            {profile.interests.map((interest, i) => (
                              <span key={i} className="px-3.5 py-1.5 bg-gray-50 dark:bg-gray-750 text-gray-700 dark:text-gray-300 rounded-full text-xs font-bold border border-gray-200/50 dark:border-gray-700 shadow-sm">
                                {interest}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {profile.languages.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Languages</p>
                          <div className="flex flex-wrap gap-2">
                            {profile.languages.map((lang, i) => (
                              <span key={i} className="px-3.5 py-1.5 bg-green-50/50 dark:bg-green-950/20 text-green-700 dark:text-green-400 rounded-full text-xs font-bold border border-green-100/30 dark:border-green-900/30 shadow-sm">
                                {lang}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}

              {/* 4. Activity Tab */}
              {activeTab === 'activity' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  {/* Activity Stats overview */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all overflow-hidden p-6">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
                      <Zap className="w-5 h-5 text-amber-500" />
                      Activity Overview
                    </h3>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-gray-55 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-750">
                        <div className="text-2xl font-black text-gray-900 dark:text-white">{profile.stats.postsThisMonth}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase mt-1">Posts (Mo)</div>
                      </div>
                      <div className="text-center p-4 bg-gray-55 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-750">
                        <div className="text-2xl font-black text-gray-900 dark:text-white">{profile.stats.totalLikes}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase mt-1">Total Likes</div>
                      </div>
                      <div className="text-center p-4 bg-gray-55 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-750">
                        <div className="text-2xl font-black text-gray-900 dark:text-white">{profile.stats.totalViews}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase mt-1">Total Views</div>
                      </div>
                    </div>

                    <div className="mt-5 text-center">
                      <Link
                        href={`/${locale}/feed?author=${profile.id}`}
                        className="inline-flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700 font-bold"
                      >
                        Search Posts in Feed
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Sidebar Column - Dynamic Desktop secondary panel */}
            <div className="space-y-4">
              
              {/* Profile Completeness card */}
              {profile.isOwnProfile && profile.profileCompleteness < 100 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 overflow-hidden">
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Completeness</span>
                    <span className="text-sm font-extrabold text-sky-600">{profile.profileCompleteness}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-750 rounded-full h-2 shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${profile.profileCompleteness}%` }}
                    />
                  </div>
                  <Link 
                    href={`/${locale}/profile/me/edit`}
                    className="block text-center text-xs text-sky-600 hover:underline font-bold mt-4"
                  >
                    Complete your e-learning profile
                  </Link>
                </div>
              )}

              {/* Achievements Snapshot */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4 text-sm uppercase tracking-wider text-gray-400">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Achievements
                </h3>
                {achievements.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">No achievements earned yet.</p>
                ) : (
                  <div className="space-y-3">
                    {achievements.slice(0, 3).map(achievement => (
                      <div key={achievement.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${rarityColors[achievement.rarity] || rarityColors.COMMON} flex items-center justify-center flex-shrink-0 text-sm shadow-sm`}>
                          {achievement.badgeUrl ? (
                            <img src={achievement.badgeUrl} alt="" className="w-5 h-5 object-contain" />
                          ) : (
                            <span>🏆</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{achievement.title}</h4>
                          <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{achievement.rarity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recommendations Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4 text-sm uppercase tracking-wider text-gray-400">
                  <Star className="w-4 h-4 text-indigo-500" />
                  Recommendations
                </h3>
                {recommendations.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">No recommendations received yet.</p>
                ) : (
                  <div className="space-y-4">
                    {recommendations.slice(0, 2).map(rec => (
                      <div key={rec.id} className="pb-4 border-b border-gray-100 dark:border-gray-750 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2.5 mb-2">
                          <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                            {rec.author.profilePictureUrl ? (
                              <img src={rec.author.profilePictureUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                                {rec.author.firstName[0]}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                              {rec.author.lastName} {rec.author.firstName}
                            </p>
                            <p className="text-[10px] text-gray-400 font-semibold">{rec.relationship}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-450 italic leading-relaxed">"{rec.content}"</p>
                      </div>
                    ))}
                  </div>
                )}
                {!profile.isOwnProfile && (
                  <button className="mt-4 w-full py-2 border border-amber-500 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-full text-xs font-bold transition-all">
                    Recommend {profile.firstName}
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Global CSS Animations */}
      <style jsx global>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUpContent {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        @keyframes pulseGlow {
          0%, 100% {
            opacity: 0.5;
            box-shadow: 0 0 20px rgba(251, 146, 60, 0.3);
          }
          50% {
            opacity: 0.8;
            box-shadow: 0 0 40px rgba(251, 146, 60, 0.5);
          }
        }
      `}</style>
    </>
  );
}
