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
  Code, Palette, BookOpen, Target, Clock, Globe, Shield, Camera
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import ProfileZoomLoader from '@/components/profile/ProfileZoomLoader';
import ProfileSkeleton from '@/components/profile/ProfileSkeleton';

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
  const [education, setEducation] = useState<Education[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'activity' | 'skills' | 'experience' | 'education' | 'certifications' | 'projects'>('about');
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
      const [profileRes, skillsRes, expRes, projectsRes, certsRes, eduRes, achievementsRes, recsRes] = await Promise.all([
        fetch(`${feedUrl}/users/${userId}/profile`, { headers }),
        fetch(`${feedUrl}/users/${userId}/skills`, { headers }),
        fetch(`${feedUrl}/users/${userId}/experiences`, { headers }),
        fetch(`${feedUrl}/users/${userId}/projects`, { headers }),
        fetch(`${feedUrl}/users/${userId}/certifications`, { headers }),
        fetch(`${feedUrl}/users/${userId}/education`, { headers }),
        fetch(`${feedUrl}/users/${userId}/achievements`, { headers }),
        fetch(`${feedUrl}/users/${userId}/recommendations`, { headers }),
      ]);

      const [profileData, skillsData, expData, projectsData, certsData, eduData, achievementsData, recsData] = await Promise.all([
        profileRes.json(),
        skillsRes.json(),
        expRes.json(),
        projectsRes.json(),
        certsRes.json(),
        eduRes.json(),
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
      if (eduData.success) setEducation(eduData.education);
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

  // Show zoom loader during initial load
  if (loading) {
    return (
      <>
        <ProfileZoomLoader isLoading={loading} minimumDuration={600} />
        <ProfileSkeleton />
      </>
    );
  }
  
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50/40 via-white to-orange-50/30">
        <div className="text-center bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-6">This profile doesn&apos;t exist or is private.</p>
          <Link 
            href={`/${locale}/feed`} 
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full font-medium hover:from-amber-600 hover:to-orange-600 transition-all shadow-md hover:shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Feed
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Zoom loader for page transitions */}
      <ProfileZoomLoader isLoading={loading} minimumDuration={400} />
      
      <div className={`min-h-screen bg-gradient-to-br from-amber-50/40 via-white to-orange-50/30 transition-all duration-700 ease-out ${pageReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Navigation Bar */}
        <UnifiedNavigation user={currentUser} school={school} onLogout={handleLogout} />
        
        <div className="max-w-5xl mx-auto px-4 py-6">
          {/* Profile Card - Contains Cover Photo */}
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
            style={{
              animation: pageReady ? 'slideInUp 0.6s ease-out forwards' : 'none',
            }}
          >
            {/* Cover Photo - Larger height for better visual impact */}
            <div className="relative h-56 md:h-72 bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500">
              {profile.coverPhotoUrl ? (
                <Image
                  src={profile.coverPhotoUrl}
                  alt="Cover"
                  fill
                  className="object-cover"
                />
              ) : (
                /* Decorative pattern overlay for default cover */
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full border-2 border-white/30" />
                  <div className="absolute top-1/3 right-1/4 w-24 h-24 rounded-full border-2 border-white/20" />
                  <div className="absolute bottom-1/4 left-1/3 w-16 h-16 rounded-full border-2 border-white/25" />
                </div>
              )}
              {/* Edit cover button */}
              {profile.isOwnProfile && (
                <Link 
                  href={`/${locale}/profile/me/edit`}
                  className="absolute top-4 right-4 p-2.5 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all hover:scale-105 group"
                >
                  <Edit3 className="w-4 h-4 text-gray-700 group-hover:text-amber-600" />
                </Link>
              )}
              {/* Cover gradient overlay */}
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 to-transparent" />
            </div>

            {/* Profile Content */}
            <div className="px-6 pb-6">
              {/* Avatar - Overlapping cover with larger size */}
              <div className="relative -mt-20 md:-mt-24 mb-4">
                <div className="relative inline-block group">
                  <div className="w-36 h-36 md:w-44 md:h-44 rounded-full border-4 border-white dark:border-gray-800 overflow-hidden bg-gradient-to-br from-amber-400 to-orange-400 shadow-xl ring-4 ring-amber-100/50">
                    {profile.profilePictureUrl ? (
                      <Image
                        src={profile.profilePictureUrl}
                        alt={`${profile.firstName} ${profile.lastName}`}
                        width={176}
                        height={176}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-5xl font-bold">
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
                        <span className="text-xs font-medium">Edit</span>
                      </div>
                    </Link>
                  )}
                  {/* Open to Learn badge ring */}
                  {profile.isOpenToOpportunities && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gradient-to-r from-sky-400 to-blue-500 text-white text-[10px] font-semibold px-3 py-1 rounded-full whitespace-nowrap shadow-md">
                      #OPENTOLEARN
                    </div>
                  )}
                </div>
              </div>

              {/* Name and Info Row */}
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div className="flex-1">
                  {/* Name */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                      {profile.firstName} {profile.lastName}
                    </h1>
                    {profile.isVerified && (
                      <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Verified
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
                        Level {profile.level}
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
                        <span className="text-xs text-amber-600 font-medium">+{achievements.length - 4} more</span>
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
                    <span className="text-amber-600 hover:text-amber-700 hover:underline cursor-pointer transition-colors">Contact info</span>
                  </p>

                  {/* Connections */}
                  <Link 
                    href={`/${locale}/profile/${userId}/connections`}
                    className="text-amber-600 hover:text-amber-700 hover:underline text-sm font-semibold mt-2 inline-block transition-colors"
                  >
                    {profile.stats.followers + profile.stats.following} connections
                  </Link>
                </div>

                {/* School/Organization Logo */}
                {profile.school && (
                  <div className="flex items-center gap-3 text-sm bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-2.5 rounded-xl border border-amber-100">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-400 rounded-lg flex items-center justify-center shadow-sm">
                      <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-gray-800 dark:text-gray-200 font-semibold">{profile.school.name}</span>
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
                      Learning Goals
                    </Link>
                    <Link
                      href={`/${locale}/profile/${profile.id}/edit`}
                      className="px-5 py-2 border-2 border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-full text-sm font-semibold transition-all"
                    >
                      Add profile section
                    </Link>
                    <Link
                      href={`/${locale}/profile/${profile.id}/edit`}
                      className="px-5 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 rounded-full text-sm font-medium transition-all"
                    >
                      Enhance profile
                    </Link>
                    <button className="px-5 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 rounded-full text-sm font-medium transition-all">
                      Resources
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleFollow}
                      className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                        following
                          ? 'border-2 border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400'
                          : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md hover:shadow-lg'
                      }`}
                    >
                      {following ? 'Following' : 'Connect'}
                    </button>
                    <Link
                      href={`/${locale}/messages?startWith=${profile.id}`}
                      className="px-5 py-2 border-2 border-amber-500 text-amber-600 hover:bg-amber-50 rounded-full text-sm font-semibold transition-all"
                    >
                      Message
                    </Link>
                    <button className="px-5 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 rounded-full text-sm font-medium transition-all">
                      More
                    </button>
                  </>
                )}
              </div>

              {/* Open to Learn Card - For own profile */}
              {profile.isOwnProfile && profile.isOpenToOpportunities && (
                <div className="mt-5 p-4 border border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 rounded-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Open to learn</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Study groups, Mentorship, Tutoring</p>
                      <button className="text-amber-600 hover:text-amber-700 hover:underline text-sm font-medium mt-1.5 transition-colors">Show details</button>
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
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mt-3 overflow-x-auto"
            style={{
              animation: pageReady ? 'slideInUp 0.6s ease-out 0.1s forwards' : 'none',
              opacity: pageReady ? 1 : 0,
            }}
          >
            <div className="flex p-1">
              {([
                { key: 'about', label: 'About', icon: BookOpen },
                { key: 'activity', label: 'Activity', icon: TrendingUp },
                { key: 'skills', label: 'Skills', icon: Star },
                { key: 'experience', label: 'Experience', icon: Briefcase },
                { key: 'education', label: 'Education', icon: GraduationCap },
                { key: 'certifications', label: 'Certifications', icon: Award },
                { key: 'projects', label: 'Projects', icon: Code },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm whitespace-nowrap transition-all rounded-lg ${
                    activeTab === tab.key
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content Grid - Education Style */}
          <div className="grid md:grid-cols-3 gap-3 mt-3">
            {/* Main Content - Left/Center */}
            <div className="md:col-span-2 space-y-3">
              {/* About Section */}
              {activeTab === 'about' && (
                <div 
                  className="space-y-3"
                  style={{
                    animation: 'fadeInUpContent 0.5s ease-out forwards',
                  }}
                >
                  {/* About Card - Always show */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">About</h3>
                      {profile.isOwnProfile && (
                        <Link
                          href={`/${locale}/profile/${userId}/edit?section=about`}
                          className="p-2 hover:bg-amber-50 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                        >
                          <Edit3 className="w-5 h-5 text-gray-400 group-hover:text-amber-500 transition-colors" />
                        </Link>
                      )}
                    </div>
                    <div className="p-6">
                      {profile.bio ? (
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-gray-500 dark:text-gray-400 text-sm">
                            {profile.isOwnProfile ? 'Tell visitors about yourself, your background, and what you do.' : 'No bio added yet.'}
                          </p>
                          {profile.isOwnProfile && (
                            <Link
                              href={`/${locale}/profile/${userId}/edit?section=about`}
                              className="inline-flex items-center gap-1 mt-3 text-amber-600 hover:text-amber-700 text-sm font-semibold transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                              Add a summary
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Activity Snapshot Card */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Activity</h3>
                      <button 
                        onClick={() => setActiveTab('activity')}
                        className="text-amber-600 hover:text-amber-700 text-sm font-semibold transition-colors"
                      >
                        See all activity →
                      </button>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-semibold text-gray-900 dark:text-white">{profile.stats.posts} posts</span>
                        <span>·</span>
                        <span>{profile.stats.followers} followers</span>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                        {profile.firstName} hasn&apos;t posted lately
                      </p>
                    </div>
                  </div>

                  {/* Experience Snapshot */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Experience</h3>
                      <div className="flex items-center gap-2">
                        {profile.isOwnProfile && (
                          <Link
                            href={`/${locale}/profile/${userId}/edit?section=experience`}
                            className="p-2 hover:bg-amber-50 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                          >
                            <Plus className="w-5 h-5 text-gray-400 group-hover:text-amber-500 transition-colors" />
                          </Link>
                        )}
                        <button 
                          onClick={() => setActiveTab('experience')}
                          className="text-amber-600 hover:text-amber-700 text-sm font-semibold transition-colors"
                        >
                          Show all →
                        </button>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {experiences.length === 0 ? (
                        <div className="p-6 text-center">
                          <Briefcase className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                          <p className="text-gray-500 dark:text-gray-400 text-sm">No experience added yet</p>
                          {profile.isOwnProfile && (
                            <Link
                              href={`/${locale}/profile/${userId}/edit?section=experience`}
                              className="inline-block mt-2 text-amber-600 hover:text-amber-700 text-sm font-medium"
                            >
                              + Add experience
                            </Link>
                          )}
                        </div>
                      ) : (
                        experiences.slice(0, 2).map((exp) => (
                          <div key={exp.id} className="p-4 flex gap-4">
                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Briefcase className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 dark:text-white">{exp.title}</h4>
                              <p className="text-gray-600 dark:text-gray-400 text-sm">{exp.organization}</p>
                              <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">
                                {formatDate(exp.startDate)} - {exp.isCurrent ? 'Present' : exp.endDate ? formatDate(exp.endDate) : 'N/A'}
                                {exp.location && ` · ${exp.location}`}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Education Snapshot */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Education</h3>
                      <div className="flex items-center gap-2">
                        {profile.isOwnProfile && (
                          <Link
                            href={`/${locale}/profile/${userId}/edit?section=education`}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                          >
                            <Plus className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                          </Link>
                        )}
                        <button 
                          onClick={() => setActiveTab('education')}
                          className="text-amber-600 hover:text-amber-700 text-sm font-medium"
                        >
                          Show all →
                        </button>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {education.length === 0 ? (
                        <div className="p-6 text-center">
                          <GraduationCap className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                          <p className="text-gray-500 dark:text-gray-400 text-sm">No education added yet</p>
                          {profile.isOwnProfile && (
                            <Link
                              href={`/${locale}/profile/${userId}/edit?section=education`}
                              className="inline-block mt-2 text-amber-600 hover:text-amber-700 text-sm font-medium"
                            >
                              + Add education
                            </Link>
                          )}
                        </div>
                      ) : (
                        education.slice(0, 2).map((edu) => (
                          <div key={edu.id} className="p-4 flex gap-4">
                            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                              <GraduationCap className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 dark:text-white">{edu.school}</h4>
                              <p className="text-gray-600 dark:text-gray-400 text-sm">
                                {edu.degree}{edu.fieldOfStudy && `, ${edu.fieldOfStudy}`}
                              </p>
                              <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">
                                {formatDate(edu.startDate)} - {edu.isCurrent ? 'Present' : edu.endDate ? formatDate(edu.endDate) : 'N/A'}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Skills Snapshot */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Skills</h3>
                      <div className="flex items-center gap-2">
                        {profile.isOwnProfile && (
                          <Link
                            href={`/${locale}/profile/${userId}/edit?section=skills`}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                          >
                            <Plus className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                          </Link>
                        )}
                        <button 
                          onClick={() => setActiveTab('skills')}
                          className="text-amber-600 hover:text-amber-700 text-sm font-medium"
                        >
                          Show all →
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      {skills.length === 0 ? (
                        <div className="text-center">
                          <Star className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                          <p className="text-gray-500 dark:text-gray-400 text-sm">No skills added yet</p>
                          {profile.isOwnProfile && (
                            <Link
                              href={`/${locale}/profile/${userId}/edit?section=skills`}
                              className="inline-block mt-2 text-amber-600 hover:text-amber-700 text-sm font-medium"
                            >
                              + Add skills
                            </Link>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {skills.slice(0, 6).map((skill) => (
                            <span 
                              key={skill.id} 
                              className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-orange-300 rounded-full text-sm font-medium"
                            >
                              {skill.skillName}
                              {skill.endorsementCount > 0 && (
                                <span className="ml-1 text-blue-500 dark:text-blue-400">· {skill.endorsementCount}</span>
                              )}
                            </span>
                          ))}
                          {skills.length > 6 && (
                            <button 
                              onClick={() => setActiveTab('skills')}
                              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-sm"
                            >
                              +{skills.length - 6} more
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Interests & Languages */}
                  {(profile.interests.length > 0 || profile.languages.length > 0) && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow dark:border-gray-700 overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Interests & Languages</h3>
                      </div>
                      <div className="p-6 space-y-4">
                        {profile.interests.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Interests</p>
                            <div className="flex flex-wrap gap-2">
                              {profile.interests.map((interest, i) => (
                                <span key={i} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                                  {interest}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {profile.languages.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Languages</p>
                            <div className="flex flex-wrap gap-2">
                              {profile.languages.map((lang, i) => (
                                <span key={i} className="px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm">
                                  {lang}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Skills Section */}
              {activeTab === 'skills' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Skills</h3>
                    {profile.isOwnProfile && (
                      <Link
                        href={`/${locale}/profile/${userId}/edit?section=skills`}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                      >
                        <Plus className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      </Link>
                    )}
                  </div>
                  
                  {skills.length === 0 ? (
                    <div className="p-12 text-center">
                      <Star className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">No skills added yet</p>
                      {profile.isOwnProfile && (
                        <Link
                          href={`/${locale}/profile/${userId}/edit?section=skills`}
                          className="inline-block mt-3 text-amber-600 hover:text-amber-700 font-medium"
                        >
                          + Add your skills
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {skills.map(skill => {
                        const CategoryIcon = categoryIcons[skill.category] || Star;
                        return (
                          <div key={skill.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <CategoryIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900 dark:text-white">{skill.skillName}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${skillLevelColors[skill.level]}`}>
                                      {skill.level}
                                    </span>
                                    {skill.yearsOfExp && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        · {skill.yearsOfExp} years experience
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {skill.endorsementCount > 0 && (
                                  <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    {skill.endorsementCount} endorsement{skill.endorsementCount !== 1 ? 's' : ''}
                                  </span>
                                )}
                                {!profile.isOwnProfile && (
                                  <button className="px-3 py-1 border border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-full text-sm font-medium transition-colors">
                                    Endorse
                                  </button>
                                )}
                              </div>
                            </div>
                            {/* Endorsers avatars */}
                            {skill.endorsements.length > 0 && (
                              <div className="flex items-center gap-2 mt-3 ml-13">
                                <div className="flex -space-x-2">
                                  {skill.endorsements.slice(0, 3).map(e => (
                                    <div
                                      key={e.id}
                                      className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-700 overflow-hidden"
                                      title={`${e.endorser.firstName} ${e.endorser.lastName}`}
                                    >
                                      {e.endorser.profilePictureUrl ? (
                                        <Image src={e.endorser.profilePictureUrl} alt="" width={24} height={24} className="object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                                          {e.endorser.firstName[0]}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  Endorsed by {skill.endorsements[0]?.endorser.firstName}
                                  {skill.endorsementCount > 1 && ` and ${skill.endorsementCount - 1} other${skill.endorsementCount > 2 ? 's' : ''}`}
                                </span>
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
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Experience</h3>
                    {profile.isOwnProfile && (
                      <Link
                        href={`/${locale}/profile/${userId}/edit?section=experience`}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                      >
                        <Plus className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      </Link>
                    )}
                  </div>

                  {experiences.length === 0 ? (
                    <div className="p-12 text-center">
                      <Briefcase className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">No experience added yet</p>
                      {profile.isOwnProfile && (
                        <Link
                          href={`/${locale}/profile/${userId}/edit?section=experience`}
                          className="inline-block mt-3 text-amber-600 hover:text-amber-700 font-medium"
                        >
                          + Add your experience
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {experiences.map((exp) => (
                        <div key={exp.id} className="p-4 flex gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Briefcase className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white">{exp.title}</h4>
                                <p className="text-gray-600 dark:text-gray-400">{exp.organization}</p>
                                <p className="text-gray-500 dark:text-gray-500 text-sm mt-0.5">
                                  {formatDate(exp.startDate)} - {exp.isCurrent ? 'Present' : exp.endDate ? formatDate(exp.endDate) : 'N/A'}
                                  {exp.location && ` · ${exp.location}`}
                                </p>
                              </div>
                              {exp.isCurrent && (
                                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                                  Current
                                </span>
                              )}
                            </div>
                            {exp.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-3">{exp.description}</p>
                            )}
                            {exp.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {exp.skills.slice(0, 4).map((skill, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium">
                                    {skill}
                                  </span>
                                ))}
                                {exp.skills.length > 4 && (
                                  <span className="text-xs text-gray-500">+{exp.skills.length - 4} more</span>
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

              {/* Education Section */}
              {activeTab === 'education' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Education</h3>
                    {profile.isOwnProfile && (
                      <Link
                        href={`/${locale}/profile/${userId}/edit?section=education`}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                      >
                        <Plus className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      </Link>
                    )}
                  </div>

                  {education.length === 0 ? (
                    <div className="p-12 text-center">
                      <GraduationCap className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">No education added yet</p>
                      {profile.isOwnProfile && (
                        <Link
                          href={`/${locale}/profile/${userId}/edit?section=education`}
                          className="inline-block mt-3 text-amber-600 hover:text-amber-700 font-medium"
                        >
                          + Add your education
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {education.map((edu) => (
                        <div key={edu.id} className="p-4 flex gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <GraduationCap className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white">{edu.school}</h4>
                                {(edu.degree || edu.fieldOfStudy) && (
                                  <p className="text-gray-600 dark:text-gray-400">
                                    {edu.degree}{edu.fieldOfStudy && `, ${edu.fieldOfStudy}`}
                                  </p>
                                )}
                                <p className="text-gray-500 dark:text-gray-500 text-sm mt-0.5">
                                  {formatDate(edu.startDate)} - {edu.isCurrent ? 'Present' : edu.endDate ? formatDate(edu.endDate) : 'N/A'}
                                  {edu.grade && ` · Grade: ${edu.grade}`}
                                </p>
                              </div>
                              {edu.isCurrent && (
                                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full">
                                  Current
                                </span>
                              )}
                            </div>
                            {edu.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{edu.description}</p>
                            )}
                            {edu.activities.length > 0 && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                <span className="font-medium">Activities:</span> {edu.activities.join(', ')}
                              </p>
                            )}
                            {edu.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {edu.skills.slice(0, 4).map((skill, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium">
                                    {skill}
                                  </span>
                                ))}
                                {edu.skills.length > 4 && (
                                  <span className="text-xs text-gray-500">+{edu.skills.length - 4} more</span>
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

              {/* Certifications Section */}
              {activeTab === 'certifications' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Licenses & Certifications</h3>
                    {profile.isOwnProfile && (
                      <Link
                        href={`/${locale}/profile/${userId}/edit?section=certifications`}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                      >
                        <Plus className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      </Link>
                    )}
                  </div>

                  {certifications.length === 0 ? (
                    <div className="p-12 text-center">
                      <Award className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">No certifications added yet</p>
                      {profile.isOwnProfile && (
                        <Link
                          href={`/${locale}/profile/${userId}/edit?section=certifications`}
                          className="inline-block mt-3 text-amber-600 hover:text-amber-700 font-medium"
                        >
                          + Add your first certification
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {certifications.map((cert) => {
                        const isExpired = cert.expiryDate && new Date(cert.expiryDate) < new Date();
                        const expiresSoon = cert.expiryDate && !isExpired && 
                          new Date(cert.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
                        
                        return (
                          <div key={cert.id} className="p-4 flex gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isExpired 
                                ? 'bg-red-50 dark:bg-red-900/30' 
                                : 'bg-amber-50 dark:bg-amber-900/30'
                            }`}>
                              <Award className={`w-6 h-6 ${isExpired ? 'text-red-500' : 'text-amber-600 dark:text-amber-400'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className="font-semibold text-gray-900 dark:text-white">{cert.name}</h4>
                                  <p className="text-gray-600 dark:text-gray-400 text-sm">{cert.issuingOrg}</p>
                                  <p className="text-gray-500 dark:text-gray-500 text-sm mt-0.5">
                                    Issued {formatDate(cert.issueDate)}
                                    {cert.expiryDate && ` · ${isExpired ? 'Expired' : 'Expires'} ${formatDate(cert.expiryDate)}`}
                                  </p>
                                </div>
                                {isExpired ? (
                                  <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium rounded-full">
                                    Expired
                                  </span>
                                ) : expiresSoon ? (
                                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-medium rounded-full">
                                    Expires Soon
                                  </span>
                                ) : null}
                              </div>
                              {cert.credentialId && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                  Credential ID: {cert.credentialId}
                                </p>
                              )}
                              {cert.credentialUrl && (
                                <a
                                  href={cert.credentialUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 text-sm font-medium mt-2"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  Show credential
                                </a>
                              )}
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
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Projects</h3>
                    {profile.isOwnProfile && (
                      <Link
                        href={`/${locale}/profile/${userId}/edit?section=projects`}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                      >
                        <Plus className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      </Link>
                    )}
                  </div>

                  {projects.length === 0 ? (
                    <div className="p-12 text-center">
                      <Code className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">No projects added yet</p>
                      {profile.isOwnProfile && (
                        <Link
                          href={`/${locale}/profile/${userId}/edit?section=projects`}
                          className="inline-block mt-3 text-amber-600 hover:text-amber-700 font-medium"
                        >
                          + Add your first project
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {projects.map(project => (
                        <div key={project.id} className="p-4 flex gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          {project.mediaUrls.length > 0 ? (
                            <div className="w-24 h-24 relative bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                              <Image src={project.mediaUrls[0]} alt={project.title} fill className="object-cover" />
                            </div>
                          ) : (
                            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Code className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                  {project.title}
                                  {project.isFeatured && (
                                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                  )}
                                </h4>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                  {project.category} · {project.status}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                {project.projectUrl && (
                                  <a href={project.projectUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors">
                                    <ExternalLink className="w-4 h-4 text-gray-500" />
                                  </a>
                                )}
                                {project.githubUrl && (
                                  <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors">
                                    <Code className="w-4 h-4 text-gray-500" />
                                  </a>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{project.description}</p>
                            {project.technologies.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {project.technologies.slice(0, 4).map((tech, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs">
                                    {tech}
                                  </span>
                                ))}
                                {project.technologies.length > 4 && (
                                  <span className="text-xs text-gray-500">+{project.technologies.length - 4}</span>
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
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activity</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{profile.stats.followers} followers</p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{profile.stats.postsThisMonth}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Posts this month</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{profile.stats.totalLikes}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Total likes</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{profile.stats.totalViews}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Total views</div>
                      </div>
                    </div>
                    <Link
                      href={`/${locale}/feed?author=${profile.id}`}
                      className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 font-medium"
                    >
                      See all activity
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar - Right */}
            <div className="space-y-4">
              {/* Achievements Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    Achievements
                  </h3>
                </div>
                <div className="p-4">
                  {achievements.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No achievements yet</p>
                  ) : (
                    <div className="space-y-2">
                      {achievements.slice(0, 3).map(achievement => (
                        <div key={achievement.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${rarityColors[achievement.rarity]} flex items-center justify-center flex-shrink-0`}>
                            {achievement.badgeUrl ? (
                              <Image src={achievement.badgeUrl} alt="" width={20} height={20} />
                            ) : (
                              <Award className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">{achievement.title}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{achievement.points} pts</p>
                          </div>
                        </div>
                      ))}
                      {achievements.length > 3 && (
                        <button className="text-amber-600 hover:text-amber-700 text-sm w-full text-center pt-2">
                          Show all {achievements.length}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Recommendations Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Star className="w-4 h-4 text-purple-500" />
                    Recommendations
                  </h3>
                </div>
                <div className="p-4">
                  {recommendations.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No recommendations yet</p>
                  ) : (
                    <div className="space-y-4">
                      {recommendations.slice(0, 2).map(rec => (
                        <div key={rec.id} className="pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                              {rec.author.profilePictureUrl ? (
                                <Image src={rec.author.profilePictureUrl} alt="" width={32} height={32} className="object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
                                  {rec.author.firstName[0]}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {rec.author.firstName} {rec.author.lastName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{rec.relationship}</p>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">&ldquo;{rec.content}&rdquo;</p>
                        </div>
                      ))}
                      {recommendations.length > 2 && (
                        <button className="text-amber-600 hover:text-amber-700 text-sm w-full text-center font-medium">
                          Show all {recommendations.length}
                        </button>
                      )}
                    </div>
                  )}
                  {!profile.isOwnProfile && (
                    <button className="mt-4 w-full py-2.5 border-2 border-amber-500 text-amber-600 rounded-full text-sm font-semibold hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all">
                      Recommend {profile.firstName}
                    </button>
                  )}
                </div>
              </div>

              {/* Profile Stats Card */}
              <div 
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
                style={{
                  animation: pageReady ? 'fadeInUpContent 0.5s ease-out 0.4s forwards' : 'none',
                  opacity: 0,
                }}
              >
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-500" />
                    Profile Stats
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400 text-sm">Level</span>
                    <span className="font-bold text-gray-900 dark:text-white">{profile.level}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400 text-sm">Total Points</span>
                    <span className="font-bold text-gray-900 dark:text-white">{profile.totalPoints.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400 text-sm">Learning Hours</span>
                    <span className="font-bold text-gray-900 dark:text-white">{profile.totalLearningHours}h</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400 text-sm">Longest Streak</span>
                    <span className="font-bold text-gray-900 dark:text-white">{profile.longestStreak} days</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Profile Completeness</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{profile.profileCompleteness}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
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
