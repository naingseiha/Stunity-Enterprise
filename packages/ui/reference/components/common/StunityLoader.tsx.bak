"use client";

import { memo } from "react";

interface StunityLoaderProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

const SIZES = {
  sm: { circle: 40, strokeWidth: 4, text: "text-sm" },
  md: { circle: 60, strokeWidth: 5, text: "text-base" },
  lg: { circle: 80, strokeWidth: 6, text: "text-lg" },
  xl: { circle: 120, strokeWidth: 8, text: "text-2xl" },
};

function StunityLoader({ 
  size = "md", 
  showText = false,
  className = "" 
}: StunityLoaderProps) {
  const { circle, strokeWidth, text } = SIZES[size];
  const radius = (circle - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      {/* Animated S Logo */}
      <div className="relative animate-pulse-slow">
        {/* Outer rotating ring */}
        <div 
          className="absolute inset-0 rounded-full animate-spin-slow"
          style={{
            background: 'conic-gradient(from 0deg, #f59e0b, #f97316, #fb923c, #f59e0b)',
            padding: '3px',
            width: `${circle}px`,
            height: `${circle}px`,
          }}
        >
          <div className="w-full h-full rounded-full bg-white" />
        </div>

        {/* SVG S Logo with draw animation */}
        <svg
          width={circle}
          height={circle}
          viewBox="0 0 100 100"
          className="relative z-10"
        >
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="url(#gradient)"
            className="animate-pulse-ring"
          />

          {/* Animated S Path */}
          <path
            d="M 50 20 C 65 20, 75 30, 75 45 C 75 55, 70 60, 60 65 L 40 75 C 35 77, 30 80, 30 85 C 30 90, 35 95, 50 95 C 60 95, 70 90, 72 82"
            stroke="white"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            className="animate-draw-s"
          />

          {/* Inner S fill that appears after draw */}
          <path
            d="M 50 25 C 62 25, 70 33, 70 43 C 70 52, 66 56, 58 60 L 42 70 C 38 72, 35 75, 35 82 C 35 87, 40 90, 50 90 C 58 90, 65 86, 67 80"
            stroke="white"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            className="animate-fade-in-delayed"
            opacity="0.6"
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#fb923c" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* StunitY Text */}
      {showText && (
        <div className="flex flex-col items-center gap-1 animate-fade-in-up">
          <h2 
            className={`font-bold tracking-wide ${text}`}
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #fb923c 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            StunitY
          </h2>
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes draw-s {
          0% {
            stroke-dashoffset: ${circumference};
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-delayed {
          0%, 60% {
            opacity: 0;
          }
          100% {
            opacity: 0.6;
          }
        }

        .animate-draw-s {
          animation: draw-s 2s ease-in-out infinite;
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }

        .animate-fade-in-delayed {
          animation: fade-in-delayed 2s ease-out infinite;
        }
      `}</style>
    </div>
  );
}

export default memo(StunityLoader);
