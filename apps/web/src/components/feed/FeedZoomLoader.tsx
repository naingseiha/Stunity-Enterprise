'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface FeedZoomLoaderProps {
  isLoading: boolean;
  onAnimationComplete?: () => void;
  minimumDuration?: number;
}

/**
 * FeedZoomLoader - Twitter-style smooth zoom loading animation
 * 
 * Features:
 * - Logo starts centered, then zooms out smoothly when content loads
 * - Beautiful pulse glow effect behind logo
 * - Smooth fade transition to content
 * - Uses Stunity.png logo for brand consistency
 */
export default function FeedZoomLoader({
  isLoading,
  onAnimationComplete,
  minimumDuration = 800,
}: FeedZoomLoaderProps) {
  const [showLoader, setShowLoader] = useState(true);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [hasMinDurationPassed, setHasMinDurationPassed] = useState(false);

  // Track minimum duration
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasMinDurationPassed(true);
    }, minimumDuration);
    return () => clearTimeout(timer);
  }, [minimumDuration]);

  // Start exit animation when loading completes
  useEffect(() => {
    if (!isLoading && hasMinDurationPassed && logoLoaded) {
      // Start zoom-out animation
      setIsAnimatingOut(true);
      
      // Complete after animation finishes
      const timer = setTimeout(() => {
        setShowLoader(false);
        onAnimationComplete?.();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, hasMinDurationPassed, logoLoaded, onAnimationComplete]);

  if (!showLoader) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-500 ease-out ${
        isAnimatingOut 
          ? 'opacity-0 scale-150' 
          : 'opacity-100 scale-100'
      }`}
      style={{
        background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fef3c7 100%)',
      }}
    >
      {/* Animated background glow particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl"
          style={{
            background: 'rgba(251, 146, 60, 0.25)',
            animation: isAnimatingOut 
              ? 'none' 
              : 'pulseGlow 1.5s ease-in-out infinite',
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-2xl"
          style={{
            background: 'rgba(249, 115, 22, 0.2)',
            animation: isAnimatingOut 
              ? 'none' 
              : 'pulseGlow 1.5s ease-in-out infinite 0.3s',
          }}
        />
      </div>

      {/* Logo Container - Twitter-style zoom animation */}
      <div
        className={`relative z-10 transition-all duration-500 ease-out ${
          isAnimatingOut
            ? 'scale-[3] opacity-0'
            : logoLoaded 
              ? 'scale-100 opacity-100' 
              : 'scale-75 opacity-0'
        }`}
      >
        {/* Glow effect behind logo */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[100px] blur-2xl rounded-full pointer-events-none"
          style={{
            background: 'rgba(251, 146, 60, 0.3)',
            animation: isAnimatingOut ? 'none' : 'breathe 2s ease-in-out infinite',
          }}
        />
        
        {/* Logo */}
        <Image
          src="/Stunity.png"
          alt="Stunity"
          width={160}
          height={50}
          priority
          onLoad={() => setLogoLoaded(true)}
          className="relative z-10 drop-shadow-lg object-contain"
          style={{
            filter: 'drop-shadow(0 4px 20px rgba(251, 146, 60, 0.4))',
          }}
        />
      </div>

      {/* Loading dots - only show while loading */}
      {!isAnimatingOut && logoLoaded && (
        <div className="absolute bottom-1/3 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-gradient-to-br from-orange-400 to-orange-600"
              style={{
                animation: `dotPulse 1s ease-in-out ${i * 0.15}s infinite`,
                boxShadow: '0 2px 8px rgba(251, 146, 60, 0.4)',
              }}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes pulseGlow {
          0%, 100% {
            opacity: 0.25;
            transform: translate(-50%, -50%) scale(0.9);
          }
          50% {
            opacity: 0.4;
            transform: translate(-50%, -50%) scale(1.1);
          }
        }

        @keyframes breathe {
          0%, 100% {
            opacity: 0.3;
            transform: translate(-50%, -50%) scale(0.95);
          }
          50% {
            opacity: 0.5;
            transform: translate(-50%, -50%) scale(1.05);
          }
        }

        @keyframes dotPulse {
          0%, 60%, 100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          30% {
            transform: translateY(-6px) scale(1.15);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * FeedInlineLoader - For use within the feed content area
 * Smaller version that doesn't take over the full screen
 */
export function FeedInlineLoader({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeConfig = {
    sm: { logo: 80, container: 'h-32' },
    md: { logo: 120, container: 'h-48' },
    lg: { logo: 160, container: 'h-64' },
  };

  const config = sizeConfig[size];

  return (
    <div className={`flex flex-col items-center justify-center ${config.container} w-full`}>
      <div className="relative">
        {/* Glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 blur-xl rounded-full pointer-events-none"
          style={{
            width: config.logo * 1.5,
            height: config.logo * 0.75,
            background: 'rgba(251, 146, 60, 0.2)',
            animation: 'breatheInline 2s ease-in-out infinite',
          }}
        />
        
        {/* Logo with pulse animation */}
        <Image
          src="/Stunity.png"
          alt="Loading..."
          width={config.logo}
          height={config.logo * 0.3}
          className="relative z-10"
          style={{
            animation: 'logoPulse 2s ease-in-out infinite',
            filter: 'drop-shadow(0 2px 12px rgba(251, 146, 60, 0.3))',
          }}
        />
      </div>

      {/* Loading dots */}
      <div className="flex gap-1.5 mt-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-orange-400 to-orange-600"
            style={{
              animation: `dotPulseInline 1s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes breatheInline {
          0%, 100% {
            opacity: 0.2;
            transform: translate(-50%, -50%) scale(0.9);
          }
          50% {
            opacity: 0.35;
            transform: translate(-50%, -50%) scale(1.1);
          }
        }

        @keyframes logoPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.02);
            opacity: 0.9;
          }
        }

        @keyframes dotPulseInline {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 1;
          }
          30% {
            transform: translateY(-4px);
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}
