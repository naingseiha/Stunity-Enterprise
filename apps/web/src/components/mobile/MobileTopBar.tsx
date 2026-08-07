"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, ChevronLeft, MessageCircle } from "lucide-react";

interface MobileTopBarProps {
  locale: string;
  user?: {
    firstName?: string;
    lastName?: string;
    role?: string;
    profilePictureUrl?: string;
  } | null;
  school?: {
    id?: string;
    name?: string;
    logoUrl?: string;
  } | null;
  title?: string;
  showBack?: boolean;
  unreadNotifications?: number;
  unreadMessages?: number;
}

const ROUTE_TITLES: Record<string, { en: string; km: string }> = {
  "/feed": { en: "Feed", km: "ទំព័រដើម" },
  "/reels": { en: "Reels", km: "វីដេអូខ្លី" },
  "/discover": { en: "Discover", km: "ស្វែងរក" },
  "/learn": { en: "Learn", km: "សិក្សា" },
  "/classes": { en: "Classes", km: "ថ្នាក់រៀន" },
  "/clubs": { en: "Classes", km: "ថ្នាក់" },
  "/messages": { en: "Messages", km: "សារ" },
  "/notifications": { en: "Notifications", km: "ការជូនដំណឹង" },
  "/profile": { en: "Profile", km: "គណនី" },
  "/settings": { en: "Settings", km: "ការកំណត់" },
  "/events": { en: "Events", km: "ព្រឹត្តិការណ៍" },
  "/dashboard": { en: "Dashboard", km: "ផ្ទាំងគ្រប់គ្រង" },
  "/search": { en: "Search", km: "ស្វែងរក" },
};

export default function MobileTopBar({
  locale,
  title,
  showBack = false,
  unreadNotifications = 0,
  unreadMessages = 0,
}: MobileTopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isKm = locale === "km";

  const derivedTitle = (() => {
    if (title) return title;
    const segment = Object.keys(ROUTE_TITLES).find((key) => pathname.includes(key));
    if (segment) {
      const t = ROUTE_TITLES[segment];
      return isKm ? t.km : t.en;
    }
    return "Stunity";
  })();

  const isHomeFeed = pathname.includes("/feed") && !pathname.includes("/feed/post");
  const isReels = pathname.includes("/reels");
  // Native Clubs tab uses in-content chrome (avatar/streak/XP) — no duplicate title bar.
  // Also covers ?community=1 (has its own back control).
  const isClassHubHome = /\/clubs\/?$/.test(pathname);
  // Native Profile tab is immersive cover-first — hide title bar on profile home.
  const isProfileHome =
    /\/profile\/?$/.test(pathname) ||
    /\/profile\/me\/?$/.test(pathname) ||
    (/\/profile\/[^/]+\/?$/.test(pathname) &&
      !pathname.includes("/edit") &&
      !pathname.includes("/connections") &&
      !pathname.includes("/settings") &&
      !pathname.includes("/qr") &&
      !pathname.includes("/card"));
  const isNested =
    showBack ||
    (!isHomeFeed &&
      (pathname.split("/").length > 3 ||
        pathname.includes("/course/") ||
        pathname.includes("/posts/") ||
        pathname.includes("/settings/")));

  // Reels: immersive fullscreen — hide top bar (native FocusReels)
  if (isReels) return null;

  // Class hub home: ClassHubMobile owns the top chrome
  if (isClassHubHome) return null;

  // Profile home: ProfileMobile owns cover header actions
  if (isProfileHome) return null;

  // Auth / path practice sessions: no chrome (native hides tab bar)
  if (pathname.includes("/auth/") || pathname.includes("/learn/path/")) return null;

  const logo = (
    <Link href={`/${locale}/feed`} className="mobile-top-bar-logo">
      <Image
        src="/Stunity.png"
        alt="Stunity"
        width={90}
        height={22}
        priority
        className="h-[22px] w-auto object-contain dark:brightness-0 dark:invert"
      />
    </Link>
  );

  return (
    <header
      className="mobile-top-bar fixed top-0 left-0 right-0 z-50 md:hidden"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="mobile-top-bar-inner">
        <div className="mobile-top-bar-left">
          {isNested && !isHomeFeed ? (
            <button
              onClick={() => router.back()}
              className="mobile-top-bar-back"
              aria-label={isKm ? "ត្រឡប់" : "Back"}
              type="button"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : isHomeFeed ? (
            <span className="mobile-top-bar-spacer" aria-hidden />
          ) : (
            logo
          )}
        </div>

        <div className="mobile-top-bar-center">
          {isHomeFeed ? logo : <h1 className="mobile-top-bar-title">{derivedTitle}</h1>}
        </div>

        <div className="mobile-top-bar-right">
          <Link
            href={`/${locale}/search`}
            className="mobile-top-bar-icon-btn"
            aria-label={isKm ? "ស្វែងរក" : "Search"}
          >
            <Search className="w-[18px] h-[18px]" />
          </Link>

          <Link
            href={`/${locale}/messages`}
            className="mobile-top-bar-icon-btn relative"
            aria-label={isKm ? "សារ" : "Messages"}
          >
            <MessageCircle className="w-[18px] h-[18px]" />
            {unreadMessages > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center border-2 border-white dark:border-slate-900">
                {unreadMessages > 99 ? "99+" : unreadMessages}
              </span>
            )}
          </Link>

          <Link
            href={`/${locale}/notifications`}
            className="mobile-top-bar-icon-btn relative"
            aria-label={isKm ? "ការជូនដំណឹង" : "Notifications"}
          >
            <Bell className="w-[18px] h-[18px]" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
