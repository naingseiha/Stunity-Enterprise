"use client";

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PWAState {
  isStandalone: boolean;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  canInstall: boolean;
  isInstalled: boolean;
  updateAvailable: boolean;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
    document.referrer.includes("android-app://")
  );
}

export function usePWA(): PWAState & {
  promptInstall: () => Promise<boolean>;
  applyUpdate: () => void;
} {
  const [state, setState] = useState<PWAState>({
    isStandalone: false,
    isMobile: false,
    isIOS: false,
    isAndroid: false,
    canInstall: false,
    isInstalled: false,
    updateAvailable: false,
  });

  const applyUpdate = useCallback(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      }
      window.location.reload();
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isAndroid = /android/i.test(ua);
    const isMobile =
      isIOS ||
      isAndroid ||
      window.matchMedia("(max-width: 767px)").matches ||
      window.innerWidth < 768;

    const isStandalone = detectStandalone();

    setState((prev) => ({
      ...prev,
      isStandalone,
      isMobile,
      isIOS,
      isAndroid,
      isInstalled: isStandalone,
      canInstall: !!deferredPrompt,
    }));

    // Mark document for CSS (safe-area, hide browser chrome affordances)
    document.documentElement.classList.toggle("pwa-standalone", isStandalone);
    document.documentElement.classList.toggle("pwa-mobile", isMobile);

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      setState((prev) => ({ ...prev, canInstall: true }));
    };

    window.addEventListener("beforeinstallprompt", handler);

    const mql = window.matchMedia("(display-mode: standalone)");
    const mqlHandler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle("pwa-standalone", e.matches);
      setState((prev) => ({
        ...prev,
        isStandalone: e.matches,
        isInstalled: e.matches,
      }));
    };
    mql.addEventListener("change", mqlHandler);

    // Service worker update detection
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;
        if (reg.waiting) {
          setState((prev) => ({ ...prev, updateAvailable: true }));
        }
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              setState((prev) => ({ ...prev, updateAvailable: true }));
            }
          });
        });
      });

      const onMessage = (event: MessageEvent) => {
        if (event.data?.type === "SW_ACTIVATED") {
          setState((prev) => ({ ...prev, updateAvailable: false }));
        }
      };
      navigator.serviceWorker.addEventListener("message", onMessage);

      return () => {
        window.removeEventListener("beforeinstallprompt", handler);
        mql.removeEventListener("change", mqlHandler);
        navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
        navigator.serviceWorker.removeEventListener("message", onMessage);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      mql.removeEventListener("change", mqlHandler);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    setState((prev) => ({
      ...prev,
      canInstall: false,
      isInstalled: outcome === "accepted",
    }));
    return outcome === "accepted";
  };

  return { ...state, promptInstall, applyUpdate };
}
