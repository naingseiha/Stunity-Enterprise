"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Settings,
  Share2,
  MessageCircle,
  QrCode,
  Edit3,
  CheckCircle,
  MapPin,
  GraduationCap,
  Briefcase,
  BarChart2,
  Send,
  BookOpen,
  Flame,
  Trophy,
  Award,
  RefreshCw,
  Star,
  Plus,
} from "lucide-react";
import { TokenManager } from "@/lib/api/auth";
import { FEED_SERVICE_URL } from "@/lib/api/config";
import { PerformanceTab, ActivityTab } from "@/components/profile";
import PostCard, { type PostData } from "@/components/feed/PostCard";
import { FeedSkeletonList } from "@/components/feed/FeedPostSkeleton";

const ROLE_GRADIENT: Record<string, string> = {
  TEACHER: "from-indigo-500 to-violet-500",
  ADMIN: "from-red-600 to-red-700",
  SUPER_ADMIN: "from-red-600 to-red-800",
  SCHOOL_ADMIN: "from-amber-600 to-amber-700",
  PARENT: "from-emerald-600 to-emerald-700",
  STAFF: "from-violet-600 to-violet-700",
  STUDENT: "from-sky-500 to-cyan-600",
};

type ProfileTab = "performance" | "posts" | "about" | "activity";

interface ProfileVisitor {
  id: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string | null;
  viewedAt?: string;
}

interface ProfileMobileProps {
  locale: string;
  userId: string;
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    englishFirstName?: string;
    englishLastName?: string;
    role: string;
    profilePictureUrl?: string;
    coverPhotoUrl?: string;
    bio?: string;
    headline?: string;
    professionalTitle?: string;
    location?: string;
    isVerified: boolean;
    isOwnProfile: boolean;
    isOpenToOpportunities?: boolean;
    profileCompleteness: number;
    currentStreak: number;
    school?: { id: string; name: string };
    stats: {
      posts: number;
      followers: number;
      following: number;
      postsThisMonth?: number;
      totalLikes?: number;
      totalViews?: number;
    };
  };
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  statsSummary: any | null;
  achievements: Array<{ id: string; title: string; rarity: string; badgeUrl?: string }>;
  projectsCount: number;
  posts: PostData[];
  skills: Array<{ id: string; skillName: string; endorsementCount?: number }>;
  education: Array<{ id: string; school: string; degree?: string; fieldOfStudy?: string }>;
  experiences: Array<{ id: string; title: string; organization: string; isCurrent?: boolean }>;
  certifications: Array<{ id: string; name: string; issuingOrg: string }>;
  following: boolean;
  shareCopied: boolean;
  revalidating: boolean;
  currentUserId?: string;
  roleLabel: (role: string) => string;
  labels: {
    posts: string;
    followers: string;
    following: string;
    editProfile: string;
    shareProfile: string;
    linkCopied: string;
    follow: string;
    followingBtn: string;
    message: string;
    performance: string;
    about: string;
    activity: string;
    noPosts: string;
    openToOpportunities?: string;
  };
  onFollow: () => void;
  onShare: () => void;
  onRefresh: () => void;
  onLike: (postId: string) => void;
  onReact: (postId: string, type: string) => void;
  onValue: (postId: string) => void;
  onComment: (postId: string, content: string, parentId?: string) => void;
  onDeletePost: (postId: string) => void;
  onStatsPatch?: (patch: Record<string, unknown>) => void;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function ProfileMobile({
  locale,
  userId,
  profile,
  activeTab,
  onTabChange,
  statsSummary,
  achievements,
  projectsCount,
  posts,
  skills,
  education,
  experiences,
  certifications,
  following,
  shareCopied,
  revalidating,
  currentUserId,
  roleLabel,
  labels,
  onFollow,
  onShare,
  onRefresh,
  onLike,
  onReact,
  onValue,
  onComment,
  onDeletePost,
  onStatsPatch,
}: ProfileMobileProps) {
  const isKm = locale === "km";
  const [visitors, setVisitors] = useState<ProfileVisitor[]>([]);
  const [visitorsLoading, setVisitorsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadVisitors = useCallback(async () => {
    if (!profile.isOwnProfile) return;
    setVisitorsLoading(true);
    try {
      const token = TokenManager.getAccessToken();
      if (!token) return;
      const res = await fetch(`${FEED_SERVICE_URL}/users/me/profile/visitors/preview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setVisitors(data?.visitors || data?.data?.visitors || []);
    } catch {
      /* non-fatal */
    } finally {
      setVisitorsLoading(false);
    }
  }, [profile.isOwnProfile]);

  useEffect(() => {
    if (profile.isOwnProfile && activeTab === "performance") {
      void loadVisitors();
    }
  }, [profile.isOwnProfile, activeTab, loadVisitors]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    if (profile.isOwnProfile) await loadVisitors();
    setRefreshing(false);
  };

  const tabs: { key: ProfileTab; label: string; icon: typeof BarChart2 }[] = [
    { key: "performance", label: labels.performance, icon: BarChart2 },
    { key: "posts", label: labels.posts, icon: Send },
    { key: "about", label: labels.about, icon: BookOpen },
    { key: "activity", label: labels.activity, icon: Flame },
  ];

  return (
    <div
      className="min-h-screen bg-[#F0F4F8] dark:bg-gray-950 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px)+8px)]"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      {revalidating ? (
        <div className="h-0.5 w-full overflow-hidden bg-transparent fixed top-[env(safe-area-inset-top,0px)] left-0 right-0 z-40">
          <div className="h-full w-1/3 bg-gradient-to-r from-[#09CFF7] to-[#00B8DB] animate-[profileProgress_1.1s_ease-in-out_infinite]" />
        </div>
      ) : null}

      {/* Hero — native full-bleed cover */}
      <div className="relative w-full h-[220px] bg-gradient-to-br from-[#F0F9FF] via-[#E0F2FE] to-[#BAE6FD] dark:from-gray-800 dark:via-gray-850 dark:to-gray-900 overflow-hidden">
        {profile.coverPhotoUrl ? (
          <>
            <Image src={profile.coverPhotoUrl} alt="" fill aria-hidden className="object-cover scale-110 blur-xl opacity-35" priority />
            <Image src={profile.coverPhotoUrl} alt="" fill className="object-cover object-center" sizes="100vw" priority />
          </>
        ) : (
          <div className="absolute inset-0 opacity-40">
            <div className="absolute top-1/4 left-1/4 w-28 h-28 rounded-full border-2 border-[#09CFF7]/40" />
            <div className="absolute top-1/3 right-1/4 w-20 h-20 rounded-full border-2 border-[#00B8DB]/30" />
          </div>
        )}

        {/* Header actions — native parity */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          {!profile.isOwnProfile ? (
            <Link
              href={`/${locale}/feed`}
              className="w-9 h-9 rounded-full bg-black/25 backdrop-blur-md flex items-center justify-center text-white text-sm font-bold"
            >
              ←
            </Link>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {profile.isOwnProfile ? (
              <>
                <Link
                  href={`/${locale}/profile/qr`}
                  className="w-9 h-9 rounded-full bg-white/90 dark:bg-slate-900/90 shadow-sm flex items-center justify-center text-sky-600"
                  aria-label="QR"
                >
                  <QrCode className="w-4 h-4" />
                </Link>
                <Link
                  href={`/${locale}/messages`}
                  className="w-9 h-9 rounded-full bg-white/90 dark:bg-slate-900/90 shadow-sm flex items-center justify-center text-sky-600"
                  aria-label="Messages"
                >
                  <MessageCircle className="w-4 h-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => void onShare()}
                  className="w-9 h-9 rounded-full bg-white/90 dark:bg-slate-900/90 shadow-sm flex items-center justify-center text-sky-600"
                  aria-label="Share"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <Link
                  href={`/${locale}/profile/settings`}
                  className="w-9 h-9 rounded-full bg-white/90 dark:bg-slate-900/90 shadow-sm flex items-center justify-center text-sky-600"
                  aria-label="Settings"
                >
                  <Settings className="w-4 h-4" />
                </Link>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void onShare()}
                className="w-9 h-9 rounded-full bg-white/90 dark:bg-slate-900/90 shadow-sm flex items-center justify-center text-sky-600"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Identity card */}
      <div className="relative px-4 -mt-[88px]">
        <div className="flex items-end justify-between gap-3">
          <div className="relative shrink-0">
            <div className="w-[152px] h-[152px] rounded-full border-[5px] border-[#F0F4F8] dark:border-gray-950 overflow-hidden bg-gradient-to-br from-sky-200 to-cyan-200 shadow-lg ring-[3px] ring-sky-400/30">
              {profile.profilePictureUrl ? (
                <Image
                  src={profile.profilePictureUrl}
                  alt=""
                  width={152}
                  height={152}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#0284C7] text-3xl font-bold">
                  {profile.firstName[0]}
                  {profile.lastName[0]}
                </div>
              )}
            </div>
            {profile.isOwnProfile ? (
              <Link
                href={`/${locale}/profile/${profile.id}/edit`}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white dark:bg-gray-900 shadow-md flex items-center justify-center border border-slate-200 dark:border-gray-700"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#09CFF7]" />
              </Link>
            ) : null}
          </div>

          {profile.isOwnProfile ? (
            <Link
              href={`/${locale}/profile/card`}
              className="mb-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#78350F] text-xs font-bold shadow-md"
            >
              <QrCode className="w-4 h-4" />
              {isKm ? "កាតអប់រំ" : "My Card"}
            </Link>
          ) : null}
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              {profile.lastName} {profile.firstName}
            </h1>
            {profile.isVerified ? <CheckCircle className="w-5 h-5 text-blue-500 shrink-0" /> : null}
          </div>

          {(profile.englishFirstName || profile.englishLastName) && (
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-0.5">
              {profile.englishLastName} {profile.englishFirstName}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold text-white bg-gradient-to-r ${ROLE_GRADIENT[profile.role] || ROLE_GRADIENT.STUDENT}`}
            >
              {roleLabel(profile.role)}
            </span>
            {profile.isOpenToOpportunities ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600">
                <Briefcase className="w-3 h-3" />
                {labels.openToOpportunities || "Open to work"}
              </span>
            ) : null}
          </div>

          <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm leading-snug">
            {profile.headline ||
              profile.professionalTitle ||
              `${roleLabel(profile.role)}${profile.school?.name ? ` · ${profile.school.name}` : ""}`}
          </p>

          {profile.bio ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-3 leading-relaxed">{profile.bio}</p>
          ) : null}

          {profile.location ? (
            <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-300 border border-slate-200/80 dark:border-gray-700">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              {profile.location}
            </span>
          ) : null}

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-4 py-3 px-1">
            <div className="text-center min-w-[52px]">
              <div className="text-lg font-extrabold text-gray-900 dark:text-white tabular-nums">{profile.stats.posts}</div>
              <div className="text-[11px] font-semibold text-gray-500">{labels.posts}</div>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-gray-700" />
            <Link href={`/${locale}/profile/${userId}/connections`} className="text-center min-w-[52px]">
              <div className="text-lg font-extrabold text-gray-900 dark:text-white tabular-nums">{profile.stats.followers}</div>
              <div className="text-[11px] font-semibold text-gray-500">{labels.followers}</div>
            </Link>
            <div className="w-px h-8 bg-slate-200 dark:bg-gray-700" />
            <Link href={`/${locale}/profile/${userId}/connections`} className="text-center min-w-[52px]">
              <div className="text-lg font-extrabold text-gray-900 dark:text-white tabular-nums">{profile.stats.following}</div>
              <div className="text-[11px] font-semibold text-gray-500">{labels.following}</div>
            </Link>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-2 pb-1">
            {profile.isOwnProfile ? (
              <>
                <Link
                  href={`/${locale}/profile/${profile.id}/edit`}
                  className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#09CFF7] to-[#00B8DB] text-white rounded-full text-sm font-bold shadow-md shadow-cyan-500/20"
                >
                  <Edit3 className="w-4 h-4" />
                  {labels.editProfile}
                </Link>
                <Link
                  href={`/${locale}/profile/card`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#FFC53D] to-[#FFA600] text-[#78350F] rounded-full text-sm font-bold shadow-md"
                >
                  <QrCode className="w-4 h-4" />
                  {isKm ? "កាតអប់រំ" : "Education Card"}
                </Link>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onFollow}
                  className={`flex-1 min-w-[120px] inline-flex items-center justify-center px-4 py-2.5 rounded-full text-sm font-bold ${
                    following
                      ? "border-2 border-[#09CFF7] text-[#00B8DB] bg-white dark:bg-gray-800"
                      : "bg-gradient-to-r from-[#09CFF7] to-[#00B8DB] text-white shadow-md"
                  }`}
                >
                  {following ? labels.followingBtn : labels.follow}
                </button>
                <Link
                  href={`/${locale}/messages?startWith=${profile.id}`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#FFC53D] to-[#FFA600] text-[#78350F] rounded-full text-sm font-bold"
                >
                  <MessageCircle className="w-4 h-4" />
                  {labels.message}
                </Link>
              </>
            )}
          </div>

          {profile.school ? (
            <div className="mt-3 flex items-center gap-3 text-sm bg-white dark:bg-gray-900 px-3 py-2.5 rounded-xl border border-sky-100 dark:border-sky-900/40">
              <div className="w-9 h-9 bg-gradient-to-br from-[#09CFF7] to-[#00B8DB] rounded-lg flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="text-gray-800 dark:text-gray-100 font-semibold truncate">{profile.school.name}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Pull refresh hint */}
      <div className="px-4 mt-2 flex justify-end">
        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00B8DB] disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {isKm ? "ផ្ទុកឡើងវិញ" : "Refresh"}
        </button>
      </div>

      {/* Sticky tabs */}
      <div className="sticky top-[env(safe-area-inset-top,0px)] z-30 mt-3 bg-[#F0F4F8]/95 dark:bg-gray-950/95 backdrop-blur-md border-y border-slate-200/80 dark:border-gray-800">
        <div className="flex overflow-x-auto px-2 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange(tab.key)}
                className={`relative flex items-center gap-1.5 px-4 py-3 font-semibold text-sm whitespace-nowrap shrink-0 ${
                  active ? "text-[#09CFF7]" : "text-gray-400"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {active ? (
                  <span className="absolute bottom-0 left-2 right-2 h-[3px] rounded-full bg-[#09CFF7]" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-0 sm:px-4 pt-3 space-y-3">
        {activeTab === "performance" ? (
          <div className="space-y-3 px-0 sm:px-0">
            <PerformanceTab
              statsSummary={statsSummary}
              achievements={achievements}
              projectsCount={projectsCount}
              profile={profile}
              locale={locale}
              visitors={visitors}
              visitorsLoading={visitorsLoading}
              currentUserId={currentUserId}
              onStatsPatch={onStatsPatch}
            />
          </div>
        ) : null}

        {activeTab === "posts" ? (
          <div className="space-y-0">
            {posts.length > 0 ? (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={onLike}
                  onReact={onReact}
                  onValue={onValue}
                  onComment={onComment}
                  onDelete={onDeletePost}
                  currentUserId={currentUserId}
                />
              ))
            ) : revalidating ? (
              <div className="px-4">
                <FeedSkeletonList count={2} />
              </div>
            ) : (
              <div className="mx-4 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 p-10 text-center">
                <Send className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <h3 className="font-bold text-gray-900 dark:text-white">{labels.noPosts}</h3>
              </div>
            )}
          </div>
        ) : null}

        {activeTab === "about" ? (
          <div className="mx-4 space-y-3 pb-4">
            {profile.isOwnProfile && profile.profileCompleteness < 100 ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 p-4 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {isKm ? "ភាពពេញលេញ" : "Completeness"}
                  </span>
                  <span className="text-sm font-extrabold text-sky-600">{profile.profileCompleteness}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all"
                    style={{ width: `${profile.profileCompleteness}%` }}
                  />
                </div>
                <Link
                  href={`/${locale}/profile/${profile.id}/edit`}
                  className="block text-center text-xs text-sky-600 font-bold mt-3"
                >
                  {isKm ? "បំពេញគណនី" : "Complete your profile"}
                </Link>
              </div>
            ) : null}

            {profile.bio ? (
              <section className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 p-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">{isKm ? "អំពី" : "About"}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{profile.bio}</p>
              </section>
            ) : null}

            <section className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-gray-800 flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-sky-500" />
                  {isKm ? "ការអប់រំ" : "Education"}
                </h3>
                {profile.isOwnProfile ? (
                  <Link href={`/${locale}/profile/${profile.id}/edit?section=education`} className="p-1.5">
                    <Plus className="w-4 h-4 text-gray-400" />
                  </Link>
                ) : null}
              </div>
              {education.length === 0 ? (
                <p className="p-4 text-xs text-gray-500 text-center">{isKm ? "មិនទាន់មាន" : "Nothing added yet."}</p>
              ) : (
                education.map((edu) => (
                  <div key={edu.id} className="px-4 py-3 border-b border-slate-50 dark:border-gray-850 last:border-0">
                    <p className="font-bold text-sm text-gray-900 dark:text-white">{edu.school}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                ))
              )}
            </section>

            <section className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-gray-800 flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-500" />
                  {isKm ? "បទពិសោធន៍" : "Experience"}
                </h3>
                {profile.isOwnProfile ? (
                  <Link href={`/${locale}/profile/${profile.id}/edit?section=experience`} className="p-1.5">
                    <Plus className="w-4 h-4 text-gray-400" />
                  </Link>
                ) : null}
              </div>
              {experiences.length === 0 ? (
                <p className="p-4 text-xs text-gray-500 text-center">{isKm ? "មិនទាន់មាន" : "Nothing added yet."}</p>
              ) : (
                experiences.map((exp) => (
                  <div key={exp.id} className="px-4 py-3 border-b border-slate-50 dark:border-gray-850 last:border-0">
                    <p className="font-bold text-sm text-gray-900 dark:text-white">{exp.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {exp.organization}
                      {exp.isCurrent ? " · Current" : ""}
                    </p>
                  </div>
                ))
              )}
            </section>

            <section className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  Skills
                </h3>
                {profile.isOwnProfile ? (
                  <Link href={`/${locale}/profile/${profile.id}/edit?section=skills`}>
                    <Plus className="w-4 h-4 text-gray-400" />
                  </Link>
                ) : null}
              </div>
              {skills.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-2">{isKm ? "មិនទាន់មាន" : "No skills yet."}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span
                      key={skill.id}
                      className="px-3 py-1.5 bg-sky-50 dark:bg-sky-950/30 text-sky-800 dark:text-sky-300 rounded-full text-xs font-bold border border-sky-100 dark:border-sky-900/40"
                    >
                      {skill.skillName}
                      {(skill.endorsementCount || 0) > 0 ? ` · ${skill.endorsementCount}` : ""}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {certifications.length > 0 ? (
              <section className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-gray-800">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    Certifications
                  </h3>
                </div>
                {certifications.map((cert) => (
                  <div key={cert.id} className="px-4 py-3 border-b border-slate-50 dark:border-gray-850 last:border-0">
                    <p className="font-bold text-sm text-gray-900 dark:text-white">{cert.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{cert.issuingOrg}</p>
                  </div>
                ))}
              </section>
            ) : null}

            {achievements.length > 0 ? (
              <section className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 p-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Achievements
                </h3>
                <div className="space-y-2">
                  {achievements.slice(0, 5).map((a) => (
                    <div key={a.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm">🏆</div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{a.title}</p>
                        <p className="text-[10px] text-gray-400 uppercase">{a.rarity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}

        {activeTab === "activity" ? (
          <div className="px-4 pb-4">
            <ActivityTab
              locale={locale}
              profileId={profile.id}
              posts={posts}
              achievements={achievements}
              currentStreak={statsSummary?.currentStreak ?? profile.currentStreak}
              stats={{
                posts: profile.stats.posts,
                followers: profile.stats.followers,
                postsThisMonth: profile.stats.postsThisMonth || 0,
                totalLikes: profile.stats.totalLikes || 0,
                totalViews: profile.stats.totalViews || 0,
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
