'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface DrawingSplashScreenProps {
  onComplete?: () => void;
  duration?: number;
}

export default function DrawingSplashScreen({ 
  onComplete, 
  duration = 2500 
}: DrawingSplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);

  useEffect(() => {
    // Start fade out animation before hiding
    const fadeTimer = setTimeout(() => {
      setIsAnimatingOut(true);
    }, duration - 400);

    // Hide splash screen
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-400 ease-out ${
        isAnimatingOut ? 'opacity-0 scale-110' : 'opacity-100 scale-100'
      }`}
      style={{
        background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fef3c7 100%)',
      }}
    >
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-[10%] left-[10%] w-32 h-32 rounded-full blur-3xl"
          style={{
            background: 'rgba(251, 146, 60, 0.2)',
            animation: 'floatBubble 6s ease-in-out infinite',
          }}
        />
        <div 
          className="absolute top-[30%] right-[15%] w-40 h-40 rounded-full blur-3xl"
          style={{
            background: 'rgba(249, 115, 22, 0.15)',
            animation: 'floatBubble 8s ease-in-out infinite 1s',
          }}
        />
        <div 
          className="absolute bottom-[20%] left-[20%] w-36 h-36 rounded-full blur-3xl"
          style={{
            background: 'rgba(253, 186, 116, 0.2)',
            animation: 'floatBubble 7s ease-in-out infinite 0.5s',
          }}
        />
        <div 
          className="absolute bottom-[30%] right-[25%] w-28 h-28 rounded-full blur-3xl"
          style={{
            background: 'rgba(251, 146, 60, 0.15)',
            animation: 'floatBubble 5s ease-in-out infinite 1.5s',
          }}
        />
      </div>

      {/* Logo Container */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Glow effect behind logo */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] blur-3xl rounded-full pointer-events-none"
          style={{
            background: 'rgba(251, 146, 60, 0.25)',
            animation: 'pulseGlow 2s ease-in-out infinite',
          }}
        />

        {/* Original Logo with beautiful entrance animation */}
        <div 
          className={`relative transition-all duration-700 ease-out ${
            logoLoaded ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4'
          }`}
          style={{
            animation: logoLoaded ? 'logoEntrance 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
          }}
        >
          <Image
            src="/Stunity.png"
            alt="Stunity"
            width={320}
            height={100}
            priority
            onLoad={() => setLogoLoaded(true)}
            className="drop-shadow-2xl object-contain"
            style={{
              filter: 'drop-shadow(0 10px 30px rgba(251, 146, 60, 0.3))',
            }}
          />
        </div>

        {/* Loading indicator */}
        <div 
          className={`flex gap-2 transition-all duration-500 ${
            logoLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
          style={{
            transitionDelay: '0.3s',
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg"
              style={{
                animation: `bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
                boxShadow: '0 4px 12px rgba(251, 146, 60, 0.4)',
              }}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes logoEntrance {
          0% {
            opacity: 0;
            transform: scale(0.8) translateY(20px);
            filter: blur(10px);
          }
          50% {
            filter: blur(0px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
            filter: blur(0px);
          }
        }

        @keyframes bounce {
          0%, 60%, 100% {
            transform: translateY(0) scale(1);
          }
          30% {
            transform: translateY(-8px) scale(1.1);
          }
        }

        @keyframes floatBubble {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(20px, -20px) scale(1.1);
          }
          66% {
            transform: translate(-15px, 15px) scale(0.95);
          }
        }

        @keyframes pulseGlow {
          0%, 100% {
            opacity: 0.25;
            transform: translate(-50%, -50%) scale(0.95);
          }
          50% {
            opacity: 0.4;
            transform: translate(-50%, -50%) scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}
