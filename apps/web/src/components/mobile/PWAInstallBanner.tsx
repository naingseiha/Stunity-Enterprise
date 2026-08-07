"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { usePWA } from "@/hooks/usePWA";
import { X, Download, Share, RefreshCw } from "lucide-react";

interface PWAInstallBannerProps {
  locale?: string;
}

const T = {
  en: {
    title: "Install Stunity App",
    desc: "Add to Home Screen for the full app experience",
    install: "Install",
    iosHint: 'Tap Share then "Add to Home Screen"',
    dismiss: "Not now",
    updateTitle: "Update available",
    updateDesc: "A new version of Stunity is ready",
    update: "Refresh",
  },
  km: {
    title: "ដំឡើង Stunity App",
    desc: "បន្ថែមទៅ Home Screen ដើម្បីបទពិសោធន៍ App ពេញលេញ",
    install: "ដំឡើង",
    iosHint: 'ចុច Share រួចជ្រើស "Add to Home Screen"',
    dismiss: "ពេលក្រោយ",
    updateTitle: "មានកំណែថ្មី",
    updateDesc: "Stunity មានកំណែថ្មីរួចរាល់ហើយ",
    update: "ផ្ទុកឡើងវិញ",
  },
};

export default function PWAInstallBanner({ locale = "km" }: PWAInstallBannerProps) {
  const { isMobile, isIOS, canInstall, isInstalled, promptInstall, updateAvailable, applyUpdate } =
    usePWA();
  const [dismissed, setDismissed] = useState(true);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const isKm = locale === "km";
  const t = T[isKm ? "km" : "en"];

  useEffect(() => {
    const lastDismissed = localStorage.getItem("stunity-pwa-banner-dismissed");
    if (lastDismissed) {
      const daysSince = (Date.now() - parseInt(lastDismissed, 10)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return;
    }
    if (!isInstalled && isMobile) {
      const timer = setTimeout(() => setDismissed(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [isMobile, isInstalled]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("stunity-pwa-banner-dismissed", Date.now().toString());
  };

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSHint(true);
      return;
    }
    await promptInstall();
    handleDismiss();
  };

  // Update toast takes priority
  if (updateAvailable && isMobile) {
    return (
      <div className="pwa-install-banner md:hidden">
        <div className="pwa-install-banner-inner">
          <div className="pwa-install-icon overflow-hidden p-0">
            <Image src="/icons/pwa-72x72.png" alt="" width={40} height={40} className="w-full h-full object-cover" />
          </div>
          <div className="pwa-install-text">
            <p className="pwa-install-title">{t.updateTitle}</p>
            <p className="pwa-install-desc">{t.updateDesc}</p>
          </div>
          <div className="pwa-install-actions">
            <button className="pwa-install-btn" onClick={applyUpdate} type="button">
              <RefreshCw className="w-3.5 h-3.5" />
              {t.update}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (dismissed || isInstalled || !isMobile) return null;
  if (!canInstall && !isIOS) return null;

  return (
    <div className="pwa-install-banner md:hidden">
      {showIOSHint && (
        <div className="pwa-ios-hint-overlay" onClick={() => setShowIOSHint(false)}>
          <div className="pwa-ios-hint-box" onClick={(e) => e.stopPropagation()}>
            <Share className="w-8 h-8 text-orange-500 mb-3 mx-auto" />
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{t.iosHint}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isKm ? "ចុចខាងក្រៅ ដើម្បីបិទ" : "Tap outside to close"}
            </p>
          </div>
          <div className="pwa-ios-hint-arrow" />
        </div>
      )}

      <div className="pwa-install-banner-inner">
        <div className="pwa-install-icon overflow-hidden p-0">
          <Image
            src="/icons/pwa-72x72.png"
            alt="Stunity"
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="pwa-install-text">
          <p className="pwa-install-title">{t.title}</p>
          <p className="pwa-install-desc">{t.desc}</p>
        </div>

        <div className="pwa-install-actions">
          <button className="pwa-install-btn" onClick={handleInstall} type="button">
            {isIOS ? <Share className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
            {t.install}
          </button>
          <button className="pwa-dismiss-btn" onClick={handleDismiss} aria-label={t.dismiss} type="button">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
