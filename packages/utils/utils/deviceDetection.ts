"use client";

import { useState, useEffect } from "react";

export type DeviceType = "mobile" | "tablet" | "desktop";

// Breakpoints (matching Tailwind)
export const BREAKPOINTS = {
  mobile: 768, // md - mobile/tablet breakpoint
  tablet: 1024, // lg
  desktop: 1280, // xl
} as const;

/**
 * React hook for detecting device type based on window width
 * Returns 'mobile' (<768px), 'tablet' (768-1280px), or 'desktop' (>1280px)
 */
export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>(() => {
    if (typeof window === "undefined") return "desktop";

    const width = window.innerWidth;
    if (width < BREAKPOINTS.mobile) return "mobile";
    if (width < BREAKPOINTS.desktop) return "tablet";
    return "desktop";
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < BREAKPOINTS.mobile) {
        setDeviceType("mobile");
      } else if (width < BREAKPOINTS.desktop) {
        setDeviceType("tablet");
      } else {
        setDeviceType("desktop");
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return deviceType;
}

/**
 * Check if current device is mobile
 */
export const isMobile = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.innerWidth < BREAKPOINTS.mobile;
};

/**
 * Check if current device is tablet
 */
export const isTablet = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    window.innerWidth >= BREAKPOINTS.mobile &&
    window.innerWidth < BREAKPOINTS.desktop
  );
};

/**
 * Check if current device is desktop
 */
export const isDesktop = (): boolean => {
  if (typeof window === "undefined") return true;
  return window.innerWidth >= BREAKPOINTS.desktop;
};

/**
 * Check if device supports touch
 */
export const isTouchDevice = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - for older browsers
    navigator.msMaxTouchPoints > 0
  );
};

/**
 * Get current device type (synchronous, for server-side)
 */
export const getDeviceType = (userAgent?: string): DeviceType => {
  if (!userAgent && typeof navigator !== "undefined") {
    userAgent = navigator.userAgent;
  }

  if (!userAgent) return "desktop";

  const ua = userAgent.toLowerCase();

  // Mobile devices
  if (
    /(android|webos|iphone|ipod|blackberry|iemobile|opera mini)/i.test(ua)
  ) {
    return "mobile";
  }

  // Tablets
  if (/(ipad|tablet|playbook|silk)|(android(?!.*mobile))/i.test(ua)) {
    return "tablet";
  }

  return "desktop";
};
