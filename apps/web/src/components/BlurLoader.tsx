'use client';

import { ReactNode } from 'react';

interface BlurLoaderProps {
  isLoading: boolean;
  children: ReactNode;
  className?: string;
  skeleton?: ReactNode;
  blur?: boolean;
  showSpinner?: boolean; // Whether to show spinner fallback when no skeleton is provided
}

/**
 * BlurLoader Component
 *
 * Provides a smooth loading experience with blur effect
 * - Shows skeleton while loading
 * - Blurs content during loading
 * - Smooth fade-in when loaded
 */
export default function BlurLoader({
  isLoading,
  children,
  className = '',
  skeleton,
  blur = true,
  showSpinner = true,
}: BlurLoaderProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Content with blur effect */}
      <div
        className={`
          transition-all duration-300 ease-in-out
          ${isLoading ? (blur ? 'blur-sm opacity-50 pointer-events-none select-none' : 'opacity-0') : 'blur-0 opacity-100'}
        `}
      >
        {children}
      </div>

      {/* Loading skeleton overlay */}
      {isLoading && skeleton && (
        <div className="absolute inset-0 animate-in fade-in duration-200">
          {skeleton}
        </div>
      )}

      {/* Loading spinner overlay (fallback if no skeleton and showSpinner is true) */}
      {isLoading && !skeleton && showSpinner && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-600 font-medium">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Page Loader Component
 *
 * Full-page loading overlay with blur effect
 */
export function PageLoader({ isLoading, message = 'Loading...' }: { isLoading: boolean; message?: string }) {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 animate-in slide-in-from-bottom-4 duration-500">
        <div className="relative">
          {/* Outer ring */}
          <div className="w-16 h-16 border-4 border-gray-200 rounded-full" />
          {/* Spinning ring */}
          <div className="absolute inset-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-gray-700 font-medium">{message}</p>
      </div>
    </div>
  );
}

/**
 * Inline Loader Component
 *
 * Small inline loader for buttons, cards, etc.
 */
export function InlineLoader({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  };

  return (
    <div className={`inline-block ${sizeClasses[size]} border-current border-t-transparent rounded-full animate-spin ${className}`} />
  );
}
