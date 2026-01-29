"use client";

import React, { Suspense, lazy, ComponentType } from "react";
import { Loader2 } from "lucide-react";

interface LazyLoadProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Lazy loading wrapper with suspense
 */
export const LazyLoad: React.FC<LazyLoadProps> = ({
  fallback = (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
    </div>
  ),
  children,
}) => {
  return <Suspense fallback={fallback}>{children}</Suspense>;
};

/**
 * Create a lazy-loaded component with custom loading state
 */
export function createLazyComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFn);

  return (props: P) => (
    <LazyLoad fallback={fallback}>
      <LazyComponent {...props} />
    </LazyLoad>
  );
}

/**
 * Minimal loading spinner
 */
export const LoadingSpinner: React.FC<{ size?: "sm" | "md" | "lg" }> = ({
  size = "md",
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className="flex items-center justify-center p-4">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-indigo-600`} />
    </div>
  );
};

/**
 * Component loading placeholder
 */
export const ComponentPlaceholder: React.FC<{
  height?: string;
  message?: string;
}> = ({ height = "200px", message = "Loading..." }) => {
  return (
    <div
      className="flex flex-col items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
      style={{ minHeight: height }}
    >
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  );
};

/**
 * Intersection Observer based lazy loader
 * Only loads component when it's visible in viewport
 */
export const LazyLoadOnView: React.FC<{
  children: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
  fallback?: React.ReactNode;
}> = ({
  children,
  rootMargin = "50px",
  threshold = 0.01,
  fallback = <ComponentPlaceholder />,
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold,
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, threshold]);

  return (
    <div ref={ref} className="w-full">
      {isVisible ? children : fallback}
    </div>
  );
};
