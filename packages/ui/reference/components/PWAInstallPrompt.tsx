"use client";

import { useEffect, useState } from "react";
import { Download, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isInStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(isInStandaloneMode);

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if user has dismissed the prompt before
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    const dismissedDate = dismissed ? new Date(dismissed) : null;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Show prompt if not installed and not recently dismissed
    if (!isInStandaloneMode && (!dismissedDate || dismissedDate < sevenDaysAgo)) {
      if (iOS) {
        // Show iOS prompt after 3 seconds
        setTimeout(() => setShowPrompt(true), 3000);
      }
    }

    // Listen for beforeinstallprompt event (Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const beforeInstallEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(beforeInstallEvent);

      // Show prompt after 3 seconds if not recently dismissed
      if (!dismissed || (dismissedDate && dismissedDate < sevenDaysAgo)) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for app installed event
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.removeItem("pwa-install-dismissed");
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        console.log("User accepted the install prompt");
      } else {
        console.log("User dismissed the install prompt");
      }

      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error("Error showing install prompt:", error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", new Date().toISOString());
  };

  // Don't show if already installed
  if (isStandalone || !showPrompt) return null;

  // iOS Install Instructions
  if (isIOS) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-indigo-500 shadow-2xl z-50 animate-slide-up">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-start gap-4">
            <div className="bg-indigo-100 rounded-full p-3 flex-shrink-0">
              <Smartphone className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-lg mb-1">
                Install School Management App
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Add this app to your home screen for a better experience!
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                <p className="font-semibold text-gray-800 mb-2">
                  How to install:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-gray-700">
                  <li>
                    Tap the <strong>Share</strong> button{" "}
                    <span className="inline-block bg-blue-500 text-white rounded px-1 py-0.5 text-xs">
                      ⎋
                    </span>{" "}
                    in Safari
                  </li>
                  <li>
                    Scroll down and tap{" "}
                    <strong>&quot;Add to Home Screen&quot;</strong>
                  </li>
                  <li>
                    Tap <strong>&quot;Add&quot;</strong> in the top right
                  </li>
                </ol>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Android/Desktop Install Prompt
  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md bg-white rounded-lg shadow-2xl border-2 border-indigo-500 z-50 animate-slide-up">
      <div className="p-4">
        <div className="flex items-start gap-4">
          <div className="bg-indigo-100 rounded-full p-3 flex-shrink-0">
            <Download className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-lg mb-1">
              Install School Management App
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Install this app on your device for quick access and a better
              experience!
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  );
}
