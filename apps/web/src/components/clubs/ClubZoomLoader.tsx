'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Users } from 'lucide-react';

interface ClubZoomLoaderProps {
  isLoading: boolean;
  onAnimationComplete?: () => void;
  minimumDuration?: number;
  clubName?: string;
}

/**
 * ClubZoomLoader - Stunity-style smooth zoom loading animation for club pages
 * 
 * Features:
 * - Logo with club icon starts centered, then zooms out smoothly when content loads
 * - Education-themed pulse glow effect with orange/amber colors
 * - Smooth fade transition to content
 * - Club-specific visual elements
 */
export default function ClubZoomLoader({
  isLoading,
  onAnimationComplete,
  minimumDuration = 800,
  clubName,
}: ClubZoomLoaderProps) {
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
      setIsAnimatingOut(true);
      
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
      {/* Animated background glow - Club themed */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(251, 146, 60, 0.3) 0%, rgba(245, 158, 11, 0.15) 50%, transparent 70%)',
            animation: isAnimatingOut 
              ? 'none' 
              : 'pulseGlowClub 2s ease-in-out infinite',
          }}
        />
        {/* Secondary glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-2xl"
          style={{
            background: 'radial-gradient(circle, rgba(249, 115, 22, 0.25) 0%, transparent 60%)',
            animation: isAnimatingOut 
              ? 'none' 
              : 'pulseGlowClub 2s ease-in-out infinite 0.5s',
          }}
        />
        {/* Floating club icons */}
        <div
          className="absolute top-1/4 left-1/5 w-10 h-10 rounded-xl bg-orange-400/20 flex items-center justify-center"
          style={{
            animation: isAnimatingOut ? 'none' : 'floatClubIcon 4s ease-in-out infinite',
          }}
        >
          <Users className="w-5 h-5 text-orange-400/60" />
        </div>
        <div
          className="absolute top-2/3 right-1/5 w-8 h-8 rounded-lg bg-amber-400/20 flex items-center justify-center"
          style={{
            animation: isAnimatingOut ? 'none' : 'floatClubIcon 4s ease-in-out infinite 1s',
          }}
        >
          <Users className="w-4 h-4 text-amber-400/60" />
        </div>
        <div
          className="absolute top-1/2 right-1/4 w-6 h-6 rounded-md bg-orange-300/30 flex items-center justify-center"
          style={{
            animation: isAnimatingOut ? 'none' : 'floatClubIcon 4s ease-in-out infinite 0.5s',
          }}
        >
          <Users className="w-3 h-3 text-orange-300/70" />
        </div>
      </div>

      {/* Logo Container - Zoom animation */}
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
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[110px] blur-2xl rounded-full pointer-events-none"
          style={{
            background: 'rgba(251, 146, 60, 0.35)',
            animation: isAnimatingOut ? 'none' : 'breatheClub 2s ease-in-out infinite',
          }}
        />
        
        {/* Logo */}
        <Image
          src="/Stunity.png"
          alt="Stunity"
          width={180}
          height={56}
          priority
          onLoad={() => setLogoLoaded(true)}
          className="relative z-10 drop-shadow-lg object-contain"
          style={{
            filter: 'drop-shadow(0 4px 24px rgba(251, 146, 60, 0.5))',
          }}
        />
        
        {/* Club badge */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg">
          <Users className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-gray-700">Study Club</span>
        </div>
      </div>

      {/* Loading indicator - Club themed */}
      {!isAnimatingOut && logoLoaded && (
        <div className="absolute bottom-1/3 flex flex-col items-center gap-4">
          {/* Loading dots */}
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-orange-400 to-amber-500"
                style={{
                  animation: `dotPulseClub 1.2s ease-in-out ${i * 0.15}s infinite`,
                  boxShadow: '0 2px 10px rgba(251, 146, 60, 0.5)',
                }}
              />
            ))}
          </div>
          {/* Loading text */}
          <p 
            className="text-orange-600/70 text-sm font-medium"
            style={{
              animation: 'fadeInOutClub 2s ease-in-out infinite',
            }}
          >
            {clubName ? `Loading ${clubName}...` : 'Loading club...'}
          </p>
        </div>
      )}

      <style jsx>{`
        @keyframes pulseGlowClub {
          0%, 100% {
            opacity: 0.3;
            transform: translate(-50%, -50%) scale(0.9);
          }
          50% {
            opacity: 0.5;
            transform: translate(-50%, -50%) scale(1.15);
          }
        }

        @keyframes breatheClub {
          0%, 100% {
            opacity: 0.35;
            transform: translate(-50%, -50%) scale(0.95);
          }
          50% {
            opacity: 0.55;
            transform: translate(-50%, -50%) scale(1.08);
          }
        }

        @keyframes dotPulseClub {
          0%, 60%, 100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          30% {
            transform: translateY(-8px) scale(1.2);
            opacity: 0.8;
          }
        }

        @keyframes floatClubIcon {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-15px) rotate(10deg);
            opacity: 0.7;
          }
        }

        @keyframes fadeInOutClub {
          0%, 100% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
