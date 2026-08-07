"use client";

/**
 * PWA launch entry (`/{locale}/app`).
 * Installed PWAs open here so we can send users to Feed (or login),
 * mirroring the native app cold start → Main Feed.
 */
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { TokenManager } from "@/lib/api/auth";
import { getAuthRedirectPath } from "@/lib/auth/redirect";

function AppLauncherInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = (params?.locale as string) || "km";

  useEffect(() => {
    const tab = searchParams.get("tab");
    const token = TokenManager.getAccessToken();

    if (!token) {
      router.replace(`/${locale}/auth/login`);
      return;
    }

    const { user, school } = TokenManager.getUserData();
    if (!user) {
      router.replace(`/${locale}/auth/login`);
      return;
    }

    if (user.role === "PARENT") {
      router.replace(`/${locale}/parent`);
      return;
    }

    if (tab === "learn") {
      router.replace(`/${locale}/learn`);
      return;
    }
    if (tab === "messages") {
      router.replace(`/${locale}/messages`);
      return;
    }
    if (tab === "reels") {
      router.replace(`/${locale}/reels`);
      return;
    }
    if (tab === "clubs" || tab === "classes") {
      router.replace(`/${locale}/clubs`);
      return;
    }

    const destination = getAuthRedirectPath(locale, user, school);
    if (
      destination.includes("/feed") ||
      destination.includes("/super-admin") ||
      destination.includes("/onboarding")
    ) {
      router.replace(destination);
    } else {
      router.replace(`/${locale}/feed`);
    }
  }, [router, searchParams, locale]);

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center bg-slate-950 text-white">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-400 animate-pulse mb-4" />
      <p className="text-sm text-slate-400">Loading Stunity…</p>
    </div>
  );
}

export default function AppLauncherPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-slate-950 text-slate-400 text-sm">
          Loading…
        </div>
      }
    >
      <AppLauncherInner />
    </Suspense>
  );
}
