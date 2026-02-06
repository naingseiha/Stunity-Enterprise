'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface ProfileZoomLoaderProps {
  isLoading: boolean;
  onAnimationComplete?: () => void;
  minimumDuration?: number;
}

/**
 * ProfileZoomLoader - Stunity-style smooth zoom loading animation for profile pages
 * 
 * Features:
 * - Logo starts centered, then zooms out smoothly when content loads
 * - Education-themed pulse glow effect with orange/amber colors
 * - Smooth fade transition to content
 * - Uses Stunity.svg logo for brand consistency
 */
export default function ProfileZoomLoader({
  isLoading,
  onAnimationComplete,
  minimumDuration = 800,
}: ProfileZoomLoaderProps) {
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
      {/* Animated background glow - Education themed */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(251, 146, 60, 0.3) 0%, rgba(245, 158, 11, 0.15) 50%, transparent 70%)',
            animation: isAnimatingOut 
              ? 'none' 
              : 'pulseGlowProfile 2s ease-in-out infinite',
          }}
        />
        {/* Secondary glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-2xl"
          style={{
            background: 'radial-gradient(circle, rgba(249, 115, 22, 0.25) 0%, transparent 60%)',
            animation: isAnimatingOut 
              ? 'none' 
              : 'pulseGlowProfile 2s ease-in-out infinite 0.5s',
          }}
        />
        {/* Accent particles */}
        <div
          className="absolute top-1/3 left-1/4 w-4 h-4 rounded-full bg-orange-400/40"
          style={{
            animation: isAnimatingOut ? 'none' : 'floatParticle 3s ease-in-out infinite',
          }}
        />
        <div
          className="absolute top-2/3 right-1/4 w-3 h-3 rounded-full bg-amber-400/40"
          style={{
            animation: isAnimatingOut ? 'none' : 'floatParticle 3s ease-in-out infinite 1s',
          }}
        />
        <div
          className="absolute top-1/2 right-1/3 w-2 h-2 rounded-full bg-orange-300/50"
          style={{
            animation: isAnimatingOut ? 'none' : 'floatParticle 3s ease-in-out infinite 0.5s',
          }}
        />
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
            animation: isAnimatingOut ? 'none' : 'breatheProfile 2s ease-in-out infinite',
          }}
        />
        
        {/* Logo */}
        <Image
          src="/Stunity.svg"
          alt="Stunity"
          width={180}
          height={56}
          priority
          onLoad={() => setLogoLoaded(true)}
          className="relative z-10 drop-shadow-lg"
          style={{
            filter: 'drop-shadow(0 4px 24px rgba(251, 146, 60, 0.5))',
          }}
        />
      </div>

      {/* Loading indicator - Profile themed */}
      {!isAnimatingOut && logoLoaded && (
        <div className="absolute bottom-1/3 flex flex-col items-center gap-4">
          {/* Loading dots */}
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-orange-400 to-amber-500"
                style={{
                  animation: `dotPulseProfile 1.2s ease-in-out ${i * 0.15}s infinite`,
                  boxShadow: '0 2px 10px rgba(251, 146, 60, 0.5)',
                }}
              />
            ))}
          </div>
          {/* Loading text */}
          <p 
            className="text-orange-600/70 text-sm font-medium"
            style={{
              animation: 'fadeInOutProfile 2s ease-in-out infinite',
            }}
          >
            Loading profile...
          </p>
        </div>
      )}

      <style jsx>{`
        @keyframes pulseGlowProfile {
          0%, 100% {
            opacity: 0.3;
            transform: translate(-50%, -50%) scale(0.9);
          }
          50% {
            opacity: 0.5;
            transform: translate(-50%, -50%) scale(1.15);
          }
        }

        @keyframes breatheProfile {
          0%, 100% {
            opacity: 0.35;
            transform: translate(-50%, -50%) scale(0.95);
          }
          50% {
            opacity: 0.55;
            transform: translate(-50%, -50%) scale(1.08);
          }
        }

        @keyframes dotPulseProfile {
          0%, 60%, 100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          30% {
            transform: translateY(-8px) scale(1.2);
            opacity: 0.8;
          }
        }

        @keyframes floatParticle {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
            opacity: 0.7;
          }
        }

        @keyframes fadeInOutProfile {
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
