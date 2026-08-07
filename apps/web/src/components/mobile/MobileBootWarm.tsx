"use client";

/**
 * Boot warm — native MainNavigator parity:
 * hydrate from disk immediately, deferred network prefetch for Learn + Classes + Reels hubs.
 */
import { useEffect } from "react";
import { TokenManager } from "@/lib/api/auth";
import { prefetchLearnHome, readLearnHomeCache } from "@/lib/learn-home-cache";
import { prefetchClassesHub, readClassesHubCache } from "@/lib/classes-hub-cache";
import { prefetchReelsFeed, readReelsCache } from "@/lib/reels-cache";
import { prefetchProfile, readProfileCache } from "@/lib/profile-cache";
import { FEED_SERVICE_URL } from "@/lib/api/config";

export default function MobileBootWarm() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const { user } = TokenManager.getUserData();
    if (!user?.id) return;

    // Sync hydrate already happens inside read*Cache (localStorage → memory).
    // Touch reads so memory is hot before first tab tap.
    readLearnHomeCache(user.id);
    readClassesHubCache(user.id);
    readReelsCache(user.id);
    readProfileCache("me");

    const sessionKey = `stunity:mobile-hub-warmed:${user.id}`;
    if (sessionStorage.getItem(sessionKey) === "true") return;
    sessionStorage.setItem(sessionKey, "true");

    const warm = () => {
      const token = TokenManager.getAccessToken();
      prefetchLearnHome(user.id);
      prefetchClassesHub(user.id, user.role);
      prefetchReelsFeed(user.id);
      prefetchProfile("me", { token, feedBaseUrl: FEED_SERVICE_URL });
    };

    // Deferred like native (~1.2s) so first route paint isn't competing.
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(warm, { timeout: 1500 });
    } else {
      timeoutId = setTimeout(warm, 1200);
    }

    return () => {
      if (idleId != null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) clearTimeout(timeoutId);
    };
  }, []);

  return null;
}
