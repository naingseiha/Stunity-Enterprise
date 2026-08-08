"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home,
  BookOpen,
  PlayCircle,
  User,
  GraduationCap,
  BarChart3,
  School,
} from "lucide-react";
import { useCallback, useMemo } from "react";
import { TokenManager } from "@/lib/api/auth";
import { prefetchLearnHome } from "@/lib/learn-home-cache";
import { prefetchClassesHub } from "@/lib/classes-hub-cache";
import { prefetchReelsFeed } from "@/lib/reels-cache";
import { prefetchProfile } from "@/lib/profile-cache";
import { FEED_SERVICE_URL } from "@/lib/api/config";
import { useAcademicYear } from "@/contexts/AcademicYearContext";

interface MobileBottomNavProps {
  locale: string;
  user?: {
    id?: string;
    role?: string;
    isSuperAdmin?: boolean;
    firstName?: string;
    lastName?: string;
    profilePictureUrl?: string;
  } | null;
  school?: { id?: string } | null;
  unreadMessages?: number;
  unreadNotifications?: number;
}

interface NavTab {
  key: string;
  label: string;
  labelKm: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: number;
  matchPaths?: string[];
  isProfile?: boolean;
}

/**
 * Bottom tabs mirrored from native MainNavigator:
 * Feed → Reels → Learn → Classes (ClubsTab) → Profile
 */
export default function MobileBottomNav({
  locale,
  user,
  school,
  unreadMessages = 0,
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const isKm = locale === "km";
  const { selectedYear } = useAcademicYear();

  const isSchoolContext =
    pathname.includes("/dashboard") ||
    pathname.includes("/students") ||
    pathname.includes("/teachers") ||
    pathname.includes("/attendance") ||
    pathname.includes("/grades") ||
    pathname.includes("/timetable") ||
    pathname.includes("/reports") ||
    pathname.includes("/admissions");

  const tabs = useMemo<NavTab[]>(() => {
    const baseTabs: NavTab[] = [
      {
        key: "feed",
        label: "Home",
        labelKm: "ទំព័រដើម",
        icon: Home,
        path: `/${locale}/feed`,
        matchPaths: [`/${locale}/feed`],
      },
      {
        key: "reel",
        label: "Reels",
        labelKm: "Reels",
        icon: PlayCircle,
        path: `/${locale}/reels`,
        matchPaths: [`/${locale}/reels`],
      },
      {
        key: "learn",
        label: "Learn",
        labelKm: "សិក្សា",
        icon: BookOpen,
        path: `/${locale}/learn`,
        matchPaths: [`/${locale}/learn`],
      },
      {
        key: "clubs",
        label: "Classes",
        labelKm: "ថ្នាក់",
        icon: School,
        path: `/${locale}/clubs`,
        matchPaths: [`/${locale}/clubs`, `/${locale}/classes`],
      },
    ];

    // School staff: swap Clubs for School dashboard (web-only affordance)
    if (school?.id && user?.role && ["ADMIN", "STAFF", "TEACHER"].includes(user.role) && isSchoolContext) {
      baseTabs[3] = {
        key: "school",
        label: "School",
        labelKm: "សាលា",
        icon: BarChart3,
        path: `/${locale}/dashboard`,
        matchPaths: [
          `/${locale}/dashboard`,
          `/${locale}/students`,
          `/${locale}/teachers`,
          `/${locale}/attendance`,
          `/${locale}/grades`,
        ],
      };
    } else if (school?.id && user?.role && ["ADMIN", "STAFF"].includes(user.role)) {
      // Keep Classes as primary; staff can reach dashboard from profile/menus
      baseTabs[3] = {
        key: "clubs",
        label: "Classes",
        labelKm: "ថ្នាក់",
        icon: GraduationCap,
        path: `/${locale}/clubs`,
        matchPaths: [`/${locale}/clubs`, `/${locale}/classes`],
      };
    }

    baseTabs.push({
      key: "profile",
      label: "Profile",
      labelKm: "គណនី",
      icon: User,
      path: `/${locale}/profile`,
      matchPaths: [
        `/${locale}/profile`,
        `/${locale}/profile/settings`,
        `/${locale}/profile/qr`,
        `/${locale}/profile/card`,
      ],
      badge: unreadMessages > 0 ? unreadMessages : undefined,
      isProfile: true,
    });

    return baseTabs;
  }, [locale, school, user, unreadMessages, isSchoolContext]);

  function isTabActive(tab: NavTab): boolean {
    if (tab.matchPaths) {
      return tab.matchPaths.some((p) => pathname.startsWith(p));
    }
    return pathname.startsWith(tab.path);
  }

  const warmTabData = useCallback(
    (key: string) => {
      const uid = user?.id || TokenManager.getUserData()?.user?.id;
      if (!uid) return;
      if (key === "learn") prefetchLearnHome(uid);
      if (key === "clubs") prefetchClassesHub(uid, user?.role, selectedYear?.id);
      if (key === "reel") prefetchReelsFeed(uid);
      if (key === "profile") {
        const token = TokenManager.getAccessToken();
        prefetchProfile("me", { token, feedBaseUrl: FEED_SERVICE_URL });
      }
    },
    [selectedYear?.id, user?.id, user?.role]
  );

  const isReelsTab = pathname.includes("/reels");

  // Hide bottom nav on immersive/auth-like deep screens (mirrors native tabBarStyle: display none)
  const hideNav =
    pathname.includes("/auth/") ||
    pathname.includes("/live-quiz/") ||
    pathname.includes("/create") ||
    pathname.includes("/learn/path/") ||
    /\/posts\/[^/]+/.test(pathname);

  if (hideNav) return null;

  return (
    <nav
      className={`mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 md:hidden ${
        isReelsTab ? "bg-black border-t border-white/10" : ""
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Main"
    >
      <div className={`mobile-bottom-nav-inner ${isReelsTab ? "!bg-black/95 !backdrop-blur-xl !border-white/10" : ""}`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isTabActive(tab);
          const label = isKm ? tab.labelKm : tab.label;

          return (
            <Link
              key={tab.key}
              href={tab.path}
              className={`mobile-tab-item ${active ? "mobile-tab-item--active" : ""}`}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              onPointerEnter={() => warmTabData(tab.key)}
              onTouchStart={() => warmTabData(tab.key)}
              onFocus={() => warmTabData(tab.key)}
            >
              <span className="mobile-tab-icon-wrap">
                {tab.isProfile && user?.profilePictureUrl ? (
                  <span
                    className={`mobile-tab-avatar ${active ? "mobile-tab-avatar--active" : ""} ${
                      isReelsTab ? "mobile-tab-avatar--reels" : ""
                    }`}
                  >
                    <Image
                      src={user.profilePictureUrl}
                      alt=""
                      width={24}
                      height={24}
                      className="w-full h-full object-cover rounded-full"
                    />
                  </span>
                ) : (
                  <Icon
                    className={`mobile-tab-icon ${active ? "mobile-tab-icon--active" : ""} ${
                      isReelsTab && !active ? "!text-white/60" : ""
                    } ${isReelsTab && active ? "!text-white" : ""}`}
                  />
                )}
                {tab.badge && tab.badge > 0 ? (
                  <span className="mobile-tab-badge">{tab.badge > 99 ? "99+" : tab.badge}</span>
                ) : null}
                {active && (
                  <span className={`mobile-tab-active-dot ${isReelsTab ? "!bg-white" : ""}`} />
                )}
              </span>
              <span
                className={`mobile-tab-label ${active ? "mobile-tab-label--active" : ""} ${
                  isReelsTab && !active ? "!text-white/60" : ""
                } ${isReelsTab && active ? "!text-white font-bold" : ""}`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
