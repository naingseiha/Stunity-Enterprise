'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
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
import { buildRouteDataCacheKey, readRouteDataCache } from '@/lib/route-data-cache';
import {
  isProfileCacheFresh,
  patchProfileCache,
  readProfileCache,
  seedOwnProfileFromAuthUser,
  writeProfileCache,
  type ProfileCachePayload,
} from '@/lib/profile-cache';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import ProfileSkeleton from '@/components/profile/ProfileSkeleton';
import PostCard, { PostData } from '@/components/feed/PostCard';
import { feedApiPostToPost, feedPostToCardData } from '@/lib/feed-normalize';
import { FeedSkeletonList } from '@/components/feed/FeedPostSkeleton';
import { PerformanceTab, ActivityTab } from '@/components/profile';

import { useTranslations } from 'next-intl';

const ROLE_GRADIENT: Record<string, string> = {
  TEACHER: 'from-indigo-500 to-violet-500',
  ADMIN: 'from-red-600 to-red-700',
  SUPER_ADMIN: 'from-red-600 to-red-800',
  SCHOOL_ADMIN: 'from-amber-600 to-amber-700',
  PARENT: 'from-emerald-600 to-emerald-700',
  STAFF: 'from-violet-600 to-violet-700',
  STUDENT: 'from-sky-500 to-cyan-600',
};
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

function readInitialProfileSeed(userId: string): ProfileCachePayload | null {
  if (typeof window === 'undefined') return null;
  const cached = readProfileCache(userId);
  if (cached?.profile) return cached;

  // Migrate short-lived session cache from older route-data key (one-time bridge)
  try {
    const legacy = readRouteDataCache<ProfileCachePayload>(
      buildRouteDataCacheKey('profile', userId),
      24 * 60 * 60 * 1000,
    );
    if (legacy?.profile) {
      writeProfileCache(userId, legacy);
      return legacy;
    }
  } catch {
    // ignore
  }

  // Own profile: paint from auth user immediately (mobile parity)
  if (userId === 'me') {
    return seedOwnProfileFromAuthUser();
  }
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.id && u.id === userId) return seedOwnProfileFromAuthUser();
    }
  } catch {
    // ignore
  }
  return null;
}

function mapPosts(rawList: unknown[]): PostData[] {
  return (rawList || [])
    .map((raw) => {
      const normalized = feedApiPostToPost(raw);
      return normalized ? (feedPostToCardData(normalized) as PostData) : null;
    })
    .filter((p): p is PostData => Boolean(p));
}

export default function ProfilePage() {
  const autoT = useTranslations();
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('common');
  const tProfile = useTranslations('profile');
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
  const [following, setFollowing] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [revalidating, setRevalidating] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);

  const applySeed = useCallback((seed: ProfileCachePayload) => {
    if (!seed.profile) return;
    setProfile(seed.profile as UserProfile);
    setSkills(seed.skills || []);
    setExperiences(seed.experiences || []);
    setProjects(seed.projects || []);
    setCertifications(seed.certifications || []);
    setEducation(seed.education || []);
    setAchievements(seed.achievements || []);
    setRecommendations(seed.recommendations || []);
    setPosts(seed.posts || []);
    setFollowing(Boolean(seed.profile?.isFollowing));
    if (seed.statsSummary) setStatsSummary(seed.statsSummary);
    setLoading(false);
    setPageReady(true);
  }, []);

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/login`);
  };

  const fetchProfileData = async ({ soft }: { soft: boolean }) => {
    if (soft && isProfileCacheFresh(userId)) {
      setLoading(false);
      setPageReady(true);
      return;
    }

    try {
      const token = TokenManager.getAccessToken();
      if (!token) {
        router.push(`/${locale}/auth/login`);
        return;
      }

      if (!soft) setLoading(true);
      else setRevalidating(true);

      const headers = { Authorization: `Bearer ${token}` };
      const feedUrl = FEED_SERVICE_URL;

      const safeJson = async (res: Response, defaultVal: any = { success: false }) => {
        try {
          if (!res.ok) return defaultVal;
          return await res.json();
        } catch {
          return defaultVal;
        }
      };

      // Phase 1 — critical hero path (instant feel)
      const profileRes = await fetch(`${feedUrl}/users/${userId}/profile`, { headers });
      const profileData = await safeJson(profileRes);
      if (profileData.success && profileData.profile) {
        setProfile(profileData.profile);
        setFollowing(Boolean(profileData.profile.isFollowing));
        patchProfileCache(userId, { profile: profileData.profile });
        setLoading(false);
        setPageReady(true);
      }

      // Phase 2 — about + posts in parallel (fill tabs without blocking hero)
      const [skillsRes, expRes, projectsRes, certsRes, eduRes, achievementsRes, recsRes, postsRes] =
        await Promise.all([
          fetch(`${feedUrl}/users/${userId}/skills`, { headers }),
          fetch(`${feedUrl}/users/${userId}/experiences`, { headers }),
          fetch(`${feedUrl}/users/${userId}/projects`, { headers }),
          fetch(`${feedUrl}/users/${userId}/certifications`, { headers }),
          fetch(`${feedUrl}/users/${userId}/education`, { headers }),
          fetch(`${feedUrl}/users/${userId}/achievements`, { headers }),
          fetch(`${feedUrl}/users/${userId}/recommendations`, { headers }),
          fetch(`${feedUrl}/posts?authorId=${userId}&limit=50`, { headers }),
        ]);

      const [skillsData, expData, projectsData, certsData, eduData, achievementsData, recsData, postsData] =
        await Promise.all([
          safeJson(skillsRes),
          safeJson(expRes),
          safeJson(projectsRes),
          safeJson(certsRes),
          safeJson(eduRes),
          safeJson(achievementsRes),
          safeJson(recsRes),
          safeJson(postsRes),
        ]);

      const nextSkills = skillsData.success ? skillsData.skills : [];
      const nextExperiences = expData.success ? expData.experiences : [];
      const nextProjects = projectsData.success ? projectsData.projects : [];
      const nextCerts = certsData.success ? certsData.certifications : [];
      const nextEducation = eduData.success ? eduData.education : [];
      const nextAchievements = achievementsData.success ? achievementsData.achievements : [];
      const nextRecs = recsData.success ? recsData.recommendations : [];
      const nextPosts = postsData.success ? mapPosts(postsData.data || []) : [];

      if (skillsData.success) setSkills(nextSkills);
      if (expData.success) setExperiences(nextExperiences);
      if (projectsData.success) setProjects(nextProjects);
      if (certsData.success) setCertifications(nextCerts);
      if (eduData.success) setEducation(nextEducation);
      if (achievementsData.success) setAchievements(nextAchievements);
      if (recsData.success) setRecommendations(nextRecs);
      if (postsData.success) setPosts(nextPosts);

      writeProfileCache(userId, {
        profile: profileData.success ? profileData.profile : readProfileCache(userId)?.profile || null,
        skills: nextSkills,
        experiences: nextExperiences,
        projects: nextProjects,
        certifications: nextCerts,
        education: nextEducation,
        achievements: nextAchievements,
        recommendations: nextRecs,
        posts: nextPosts,
        statsSummary: readProfileCache(userId)?.statsSummary ?? statsSummary,
      });

      setLoading(false);
      setPageReady(true);
    } catch (error: unknown) {
      console.error('Error fetching profile:', error);
      setLoading(false);
      if (profile) setPageReady(true);
    } finally {
      setRevalidating(false);
    }
  };

  const fetchStatsSummary = async ({ soft }: { soft?: boolean } = {}) => {
    if (soft && isProfileCacheFresh(userId) && statsSummary) return;
    try {
      const res = await TokenManager.fetchWithAuth(`${ANALYTICS_SERVICE_URL}/stats/${userId}/summary`);
      if (res.ok) {
        const data = await res.json();
        if (data?.data) {
          setStatsSummary(data.data);
          patchProfileCache(userId, { statsSummary: data.data });
        }
      }
    } catch {
      /* use profile defaults */
    }
  };

  // Sync seed before paint — no skeleton flash when cache/auth seed exists
  useLayoutEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      const schoolStr = localStorage.getItem('school');
      if (userStr) setCurrentUser(JSON.parse(userStr));
      if (schoolStr) setSchool(JSON.parse(schoolStr));
    } catch {
      // ignore
    }

    const seed = readInitialProfileSeed(userId);
    if (seed?.profile) {
      applySeed(seed);
      void fetchProfileData({ soft: true });
      void fetchStatsSummary({ soft: true });
    } else {
      setLoading(true);
      setPageReady(false);
      void fetchProfileData({ soft: false });
      void fetchStatsSummary({ soft: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

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

  const handleReact = async (postId: string, type: string) => {
    try {
      const token = TokenManager.getAccessToken();
      const feedUrl = FEED_SERVICE_URL;
      const current = posts.find((p) => p.id === postId);
      const prevReaction = current?.myReaction ?? (current?.isLiked ? 'LIKE' : null);
      const prevCount = current?.likesCount ?? 0;

      let nextReaction: string | null = type;
      let nextCount = prevCount;
      if (prevReaction === type) {
        nextReaction = null;
        nextCount = Math.max(0, prevCount - 1);
      } else if (!prevReaction) {
        nextCount = prevCount + 1;
      }

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, myReaction: nextReaction, isLiked: Boolean(nextReaction), likesCount: nextCount }
            : p,
        ),
      );

      const res = await fetch(`${feedUrl}/posts/${postId}/react`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (data.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, myReaction: data.myReaction ?? null, isLiked: Boolean(data.myReaction) }
              : p,
          ),
        );
      } else {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, myReaction: prevReaction, isLiked: Boolean(prevReaction), likesCount: prevCount }
              : p,
          ),
        );
      }
    } catch (error) {
      console.error('React error:', error);
    }
  };

  const handleLike = async (postId: string) => {
    return handleReact(postId, 'LIKE');
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

  const handleComment = async (postId: string, content: string, parentId?: string) => {
    try {
      const token = TokenManager.getAccessToken();
      const feedUrl = FEED_SERVICE_URL;
      const res = await fetch(`${feedUrl}/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ content, parentId: parentId || null }),
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

  const roleLabel = (role: string) => {
    const map: Record<string, string> = {
      TEACHER: tProfile('roles.teacher'),
      ADMIN: tProfile('roles.admin'),
      SUPER_ADMIN: tProfile('roles.superAdmin'),
      SCHOOL_ADMIN: tProfile('roles.schoolAdmin'),
      PARENT: tProfile('roles.parent'),
      STAFF: tProfile('roles.staff'),
      STUDENT: tProfile('roles.student'),
    };
    return map[role] || map.STUDENT;
  };

  const handleShareProfile = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const title = profile
      ? `${profile.lastName} ${profile.firstName}`
      : tProfile('title');
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // user cancelled share
    }
  };

  // Show zoom loader during initial load
  if (loading) {
    return <ProfileSkeleton />;
  }
  
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F4F8] dark:bg-gray-950">
        <div className="text-center bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-slate-200 dark:border-gray-800">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-sky-100 to-cyan-100 dark:from-sky-900/40 dark:to-cyan-900/40 rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-[#00B8DB]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2"><AutoI18nText i18nKey="auto.web.locale_profile_userId_page.k_fbd6ab91" /></h2>
          <p className="text-gray-600 mb-6"><AutoI18nText i18nKey="auto.web.locale_profile_userId_page.k_2dc4a99c" /></p>
          <Link 
            href={`/${locale}/feed`} 
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#09CFF7] to-[#00B8DB] text-white rounded-full font-medium hover:opacity-90 transition-all shadow-md"
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
      <div className="min-h-screen bg-[#F0F4F8] dark:bg-gray-950">
        <UnifiedNavigation user={currentUser} school={school} onLogout={handleLogout} />
        {revalidating && (
          <div className="h-0.5 w-full overflow-hidden bg-transparent">
            <div className="h-full w-1/3 bg-gradient-to-r from-[#09CFF7] to-[#00B8DB] animate-[profileProgress_1.1s_ease-in-out_infinite]" />
          </div>
        )}

        {/* LinkedIn-style: constrained card with cover inside (e-learning social) */}
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div
            className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden"
            style={{ animation: pageReady ? 'slideInUp 0.45s ease-out forwards' : 'none' }}
          >
            {/*
              Cover ratio ~4:1 on desktop (LinkedIn banner), taller on mobile.
              Soft blur fill reduces harsh crop without going Facebook full-bleed.
            */}
            <div className="relative w-full h-40 sm:h-48 md:h-[196px] lg:h-[220px] bg-gradient-to-br from-[#F0F9FF] via-[#E0F2FE] to-[#BAE6FD] dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 overflow-hidden">
              {profile.coverPhotoUrl ? (
                <>
                  <Image
                    src={profile.coverPhotoUrl}
                    alt=""
                    fill
                    aria-hidden
                    className="object-cover scale-110 blur-xl opacity-35 saturate-125"
                    priority
                  />
                  <Image
                    src={profile.coverPhotoUrl}
                    alt={autoT('auto.web.locale_profile_userId_page.k_7b74323b')}
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 1024px) 100vw, 1024px"
                    priority
                  />
                </>
              ) : (
                <div className="absolute inset-0 opacity-40">
                  <div className="absolute top-1/4 left-1/4 w-28 h-28 rounded-full border-2 border-[#09CFF7]/40" />
                  <div className="absolute top-1/3 right-1/4 w-20 h-20 rounded-full border-2 border-[#00B8DB]/30" />
                  <div className="absolute bottom-1/4 left-1/3 w-14 h-14 rounded-full border-2 border-sky-300/40" />
                </div>
              )}
              {profile.isOwnProfile && (
                <Link
                  href={`/${locale}/profile/${profile.id}/edit`}
                  className="absolute top-3 right-3 z-10 p-2.5 bg-white/95 dark:bg-gray-900/90 hover:bg-white rounded-full shadow-md transition-all hover:scale-105"
                >
                  <Camera className="w-4 h-4 text-[#00B8DB]" />
                </Link>
              )}
            </div>

            <div className="px-5 md:px-6 pb-5">
              {/* Avatar overlaps cover — LinkedIn-style left alignment */}
              <div className="relative -mt-14 md:-mt-[72px] mb-3">
                <div className="relative inline-block group">
                  <div className="w-[120px] h-[120px] md:w-[152px] md:h-[152px] rounded-full border-[4px] border-white dark:border-gray-800 overflow-hidden bg-gradient-to-br from-sky-200 to-cyan-200 shadow-[0_6px_14px_rgba(0,0,0,0.10)]">
                    {profile.profilePictureUrl ? (
                      <Image
                        src={profile.profilePictureUrl}
                        alt={`${profile.lastName} ${profile.firstName}`}
                        width={152}
                        height={152}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#0284C7] text-4xl font-bold">
                        {profile.firstName[0]}{profile.lastName[0]}
                      </div>
                    )}
                  </div>
                  {profile.isOwnProfile && (
                    <Link
                      href={`/${locale}/profile/${profile.id}/edit`}
                      className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-white dark:bg-gray-900 shadow-md flex items-center justify-center border border-slate-200 dark:border-gray-700"
                    >
                      <Camera className="w-4 h-4 text-[#09CFF7]" />
                    </Link>
                  )}
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl md:text-[26px] font-extrabold text-gray-900 dark:text-white tracking-tight">
                      {profile.lastName} {profile.firstName}
                    </h1>
                    {profile.isVerified && (
                      <CheckCircle className="w-5 h-5 text-blue-500" aria-label={tProfile('about.verified')} />
                    )}
                  </div>
                  {(profile.englishFirstName || profile.englishLastName) && (
                    <p className="text-base font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                      {profile.englishLastName} {profile.englishFirstName}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mt-2.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-white bg-gradient-to-r ${ROLE_GRADIENT[profile.role] || ROLE_GRADIENT.STUDENT}`}>
                      {roleLabel(profile.role)}
                    </span>
                    {profile.isOpenToOpportunities && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600">
                        <Briefcase className="w-3 h-3" />
                        {tProfile('openToOpportunities')}
                      </span>
                    )}
                  </div>

                  <p className="text-gray-600 dark:text-gray-300 mt-2 text-[15px] leading-snug">
                    {profile.headline || profile.professionalTitle || `${roleLabel(profile.role)}${profile.school?.name ? ` · ${profile.school.name}` : ''}`}
                  </p>

                  {profile.bio && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                      {profile.bio}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {profile.location && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        {profile.location}
                      </span>
                    )}
                    {(profile.email || profile.phone) && (
                      <button
                        type="button"
                        onClick={() => setShowContact((v) => !v)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-950/40 text-xs font-semibold text-[#00B8DB] hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        {tProfile('info.title')}
                      </button>
                    )}
                    {profile.socialLinks?.linkedin && (
                      <a
                        href={profile.socialLinks.linkedin.startsWith('http') ? profile.socialLinks.linkedin : `https://linkedin.com/in/${profile.socialLinks.linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-gray-700 text-xs font-medium text-[#0077B5]"
                      >
                        LinkedIn
                      </a>
                    )}
                    {profile.socialLinks?.github && (
                      <a
                        href={profile.socialLinks.github.startsWith('http') ? profile.socialLinks.github : `https://github.com/${profile.socialLinks.github}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-200"
                      >
                        GitHub
                      </a>
                    )}
                  </div>

                  {showContact && (profile.email || profile.phone) && (
                    <div className="mt-3 p-3 rounded-xl border border-sky-100 dark:border-sky-900/40 bg-sky-50/80 dark:bg-sky-950/20 space-y-1.5 text-sm">
                      {profile.email && (
                        <a href={`mailto:${profile.email}`} className="flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:text-[#00B8DB]">
                          <Mail className="w-4 h-4 text-gray-400" />
                          {profile.email}
                        </a>
                      )}
                      {profile.phone && (
                        <a href={`tel:${profile.phone}`} className="flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:text-[#00B8DB]">
                          <Phone className="w-4 h-4 text-gray-400" />
                          {profile.phone}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Stats row — mobile parity */}
                  <div className="flex items-center gap-5 mt-4 pt-1">
                    <div className="text-center min-w-[56px]">
                      <div className="text-lg font-extrabold text-gray-900 dark:text-white tabular-nums">{profile.stats.posts}</div>
                      <div className="text-xs font-semibold text-gray-500">{tProfile('stats.posts')}</div>
                    </div>
                    <div className="w-px h-8 bg-slate-200 dark:bg-gray-700" />
                    <Link href={`/${locale}/profile/${userId}/connections`} className="text-center min-w-[56px] hover:opacity-80">
                      <div className="text-lg font-extrabold text-gray-900 dark:text-white tabular-nums">{profile.stats.followers}</div>
                      <div className="text-xs font-semibold text-gray-500">{tProfile('stats.followers')}</div>
                    </Link>
                    <div className="w-px h-8 bg-slate-200 dark:bg-gray-700" />
                    <Link href={`/${locale}/profile/${userId}/connections`} className="text-center min-w-[56px] hover:opacity-80">
                      <div className="text-lg font-extrabold text-gray-900 dark:text-white tabular-nums">{profile.stats.following}</div>
                      <div className="text-xs font-semibold text-gray-500">{tProfile('stats.following')}</div>
                    </Link>
                  </div>
                </div>

                {profile.school && (
                  <div className="flex items-center gap-3 text-sm bg-sky-50 dark:bg-sky-950/30 px-4 py-2.5 rounded-xl border border-sky-100 dark:border-sky-900/40 shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#09CFF7] to-[#00B8DB] rounded-lg flex items-center justify-center shadow-sm">
                      <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-gray-800 dark:text-gray-100 font-semibold max-w-[180px] truncate">{profile.school.name}</span>
                  </div>
                )}
              </div>

              {/* CTAs — Edit + Share (own) / Follow + Message (other) */}
              <div className="flex flex-wrap gap-2.5 mt-5">
                {profile.isOwnProfile ? (
                  <>
                    <Link
                      href={`/${locale}/profile/${profile.id}/edit`}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#09CFF7] to-[#00B8DB] hover:opacity-95 text-white rounded-full text-sm font-bold transition-all shadow-md shadow-cyan-500/20"
                    >
                      <Edit3 className="w-4 h-4" />
                      {tProfile('editProfile')}
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleShareProfile()}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#FFC53D] to-[#FFA600] hover:opacity-95 text-[#78350F] rounded-full text-sm font-bold transition-all shadow-md shadow-amber-500/20"
                    >
                      <Share2 className="w-4 h-4" />
                      {shareCopied ? tProfile('linkCopied') : tProfile('shareProfile')}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleFollow}
                      className={`inline-flex items-center justify-center px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
                        following
                          ? 'border-2 border-[#09CFF7] text-[#00B8DB] bg-white dark:bg-gray-800 hover:bg-sky-50 dark:hover:bg-sky-950/30'
                          : 'bg-gradient-to-r from-[#09CFF7] to-[#00B8DB] text-white shadow-md shadow-cyan-500/20 hover:opacity-95'
                      }`}
                    >
                      {following ? tProfile('following') : tProfile('follow')}
                    </button>
                    <Link
                      href={`/${locale}/messages?startWith=${profile.id}`}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#FFC53D] to-[#FFA600] text-[#78350F] rounded-full text-sm font-bold transition-all shadow-md shadow-amber-500/20 hover:opacity-95"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {tProfile('message')}
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleShareProfile()}
                      className="p-2.5 border border-slate-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 rounded-full transition-all"
                      aria-label="Share"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Underline tabs — mobile parity */}
          <div
            className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 mt-3 shadow-sm overflow-x-auto"
            style={{ animation: pageReady ? 'slideInUp 0.6s ease-out 0.1s forwards' : 'none', opacity: pageReady ? 1 : 0 }}
          >
            <div className="flex px-2">
              {([
                { key: 'performance', label: tProfile('performance.title'), icon: BarChart2 },
                { key: 'posts', label: tProfile('posts'), icon: Send },
                { key: 'about', label: tProfile('about.title'), icon: BookOpen },
                { key: 'activity', label: tProfile('activity.title'), icon: Flame },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex items-center gap-2 px-5 py-3.5 font-semibold text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.key
                      ? 'text-[#09CFF7]'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {activeTab === tab.key && (
                    <span className="absolute bottom-0 left-3 right-3 h-[3px] rounded-full bg-[#09CFF7]" />
                  )}
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
                  {posts.length > 0 ? (
                    posts.map(post => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onLike={handleLike}
                        onReact={handleReact}
                        onValue={handleValue}
                        onComment={handleComment}
                        onDelete={handleDeletePost}
                        currentUserId={currentUser?.id}
                      />
                    ))
                  ) : revalidating ? (
                    <FeedSkeletonList count={2} />
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Send className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{tProfile('noPosts')}</h3>
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
                          <Edit3 className="w-4 h-4 text-gray-400 group-hover:text-[#09CFF7] transition-colors" />
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
                              className="inline-flex items-center gap-1 mt-3 text-[#00B8DB] hover:underline text-xs font-bold"
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
                          <Plus className="w-4 h-4 text-gray-400 group-hover:text-[#09CFF7]" />
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
                          <Plus className="w-4 h-4 text-gray-400 group-hover:text-[#09CFF7]" />
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
                          <Plus className="w-4 h-4 text-gray-400 group-hover:text-[#09CFF7]" />
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
                              className="px-3.5 py-2 bg-sky-50 dark:bg-sky-950/30 text-sky-800 dark:text-sky-300 rounded-full text-xs font-bold border border-sky-100 dark:border-sky-900/40 flex items-center gap-1 shadow-sm"
                            >
                              {skill.skillName}
                              {skill.endorsementCount > 0 && (
                                <span className="bg-sky-500/10 text-[10px] text-[#00B8DB] font-extrabold px-1.5 py-0.5 rounded-full">
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
                          <Plus className="w-4 h-4 text-gray-400 group-hover:text-[#09CFF7]" />
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
                          <Plus className="w-4 h-4 text-gray-400 group-hover:text-[#09CFF7]" />
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
                                    className="inline-flex items-center gap-1 mt-2.5 text-xs text-[#00B8DB] hover:underline font-bold"
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
                <ActivityTab
                  locale={locale}
                  profileId={profile.id}
                  posts={posts}
                  achievements={achievements}
                  currentStreak={statsSummary?.currentStreak ?? profile.currentStreak}
                  stats={{
                    posts: profile.stats.posts,
                    followers: profile.stats.followers,
                    postsThisMonth: profile.stats.postsThisMonth,
                    totalLikes: profile.stats.totalLikes,
                    totalViews: profile.stats.totalViews,
                  }}
                />
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
                  <button className="mt-4 w-full py-2 border border-[#09CFF7] text-[#00B8DB] hover:bg-sky-50 dark:hover:bg-sky-950/20 rounded-full text-xs font-bold transition-all">
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
            box-shadow: 0 0 20px rgba(9, 207, 247, 0.3);
          }
          50% {
            opacity: 0.8;
            box-shadow: 0 0 40px rgba(9, 207, 247, 0.5);
          }
        }
        @keyframes profileProgress {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(320%); }
        }
      `}</style>
    </>
  );
}
