import React from "react";

interface StunityLoaderProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

const StunityLoader: React.FC<StunityLoaderProps> = ({
  size = "md",
  showText = false,
  className = "",
}) => {
  // Size configurations
  const sizes = {
    sm: {
      container: "48px",
      text: "text-sm",
      gap: "gap-2",
      flexDirection: "flex-row",
    },
    md: {
      container: "80px",
      text: "text-xl",
      gap: "gap-3",
      flexDirection: "flex-col",
    },
    lg: {
      container: "120px",
      text: "text-3xl",
      gap: "gap-4",
      flexDirection: "flex-col",
    },
    xl: {
      container: "180px",
      text: "text-5xl",
      gap: "gap-6",
      flexDirection: "flex-col",
    },
  };

  const { container: containerSize, text, gap, flexDirection } = sizes[size];

  return (
    <div className={`flex ${flexDirection} items-center justify-center ${gap} ${className}`}>
      {/* Animated Loader Container */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: containerSize, height: containerSize }}
      >
        {/* Pulsing Glow Effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-400 via-orange-500 to-yellow-500 opacity-40 animate-pulse-slow blur-xl" />
        
        {/* Circular Background with Gradient */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-400 via-orange-500 to-yellow-500 shadow-2xl animate-subtle-rotate" />

        {/* SVG S Letter - Arial Style with Smooth Parallel Lines */}
        <div className="absolute inset-0 flex items-center justify-center p-3">
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer S Line - Smooth Arial Style */}
            <path
              d="M 72 24 C 72 12, 62 6, 50 6 C 36 6, 24 14, 24 26 C 24 36, 32 42, 50 48 C 68 54, 76 60, 76 72 C 76 84, 64 94, 50 94 C 36 94, 24 86, 24 74"
              stroke="white"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              style={{
                strokeDasharray: "260",
                strokeDashoffset: "260",
                animation: "drawOutline 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite",
              }}
            />

            {/* Inner S Line - Parallel to Outer with More Space */}
            <path
              d="M 65 28 C 65 18, 58 13, 50 13 C 40 13, 32 20, 32 30 C 32 38, 38 43, 50 48 C 62 53, 68 58, 68 68 C 68 78, 60 87, 50 87 C 40 87, 32 80, 32 70"
              stroke="white"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              style={{
                strokeDasharray: "230",
                strokeDashoffset: "230",
                animation: "drawOutline 2.5s cubic-bezier(0.4, 0, 0.2, 1) 0.15s infinite",
              }}
            />

            {/* Solid S Fill - Fades In */}
            <path
              d="M 62 30 C 62 21, 56 16, 50 16 C 42 16, 36 22, 36 32 C 36 39, 41 43, 50 48 C 59 53, 65 57, 65 66 C 65 75, 58 84, 50 84 C 42 84, 36 78, 36 68"
              fill="white"
              style={{
                animation: "fadeInSmooth 2.5s cubic-bezier(0.4, 0, 0.2, 1) 0.3s infinite",
              }}
            />
          </svg>
        </div>
      </div>

      {/* Animated StunitY Text */}
      {showText && (
        <div className="flex flex-col items-center gap-3 animate-fade-in-up">
          <h2
            className={`font-bold tracking-wider ${text} relative`}
            style={{
              filter: "drop-shadow(0 4px 12px rgba(251, 146, 60, 0.6)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))",
              WebkitTextStroke: "1px rgba(251, 146, 60, 0.3)",
            }}
          >
            {/* Animated gradient background */}
            <span
              className="relative inline-block"
              style={{
                background:
                  "linear-gradient(135deg, #f59e0b 0%, #f97316 25%, #fb923c 50%, #f59e0b 75%, #f97316 100%)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "gradientShift 3s ease-in-out infinite",
              }}
            >
              {"Stunity".split("").map((letter, index) => (
                <span
                  key={index}
                  className="inline-block"
                  style={{
                    animation: `letterPop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) ${index * 0.1}s both`,
                  }}
                >
                  {letter}
                </span>
              ))}
            </span>
            
            {/* Dark outline layer for visibility on white backgrounds */}
            <span
              className="absolute inset-0"
              style={{
                color: "transparent",
                WebkitTextStroke: "2px rgba(234, 88, 12, 0.8)",
                zIndex: -1,
              }}
            >
              Stunity
            </span>
            
            {/* Shine effect overlay */}
            <span
              className="absolute inset-0 overflow-hidden"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.8) 50%, transparent 100%)",
                backgroundSize: "200% 100%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "shine 2.5s ease-in-out 0.5s infinite",
              }}
            >
              Stunity
            </span>
          </h2>
          
          {/* Animated dots with glow */}
          <div className="flex gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full bg-orange-600 shadow-lg shadow-orange-500/50 ring-2 ring-orange-400/50"
              style={{ 
                animation: "dotBounce 1.2s ease-in-out 0s infinite",
              }}
            />
            <div
              className="w-2.5 h-2.5 rounded-full bg-orange-600 shadow-lg shadow-orange-500/50 ring-2 ring-orange-400/50"
              style={{ 
                animation: "dotBounce 1.2s ease-in-out 0.2s infinite",
              }}
            />
            <div
              className="w-2.5 h-2.5 rounded-full bg-orange-600 shadow-lg shadow-orange-500/50 ring-2 ring-orange-400/50"
              style={{ 
                animation: "dotBounce 1.2s ease-in-out 0.4s infinite",
              }}
            />
          </div>
        </div>
      )}

      {/* Enhanced Keyframe Animations */}
      <style jsx>{`
        @keyframes drawOutline {
          0% {
            stroke-dashoffset: 280;
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          50% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            stroke-dashoffset: -280;
            opacity: 0;
          }
        }

        @keyframes fadeInSmooth {
          0% {
            opacity: 0;
            transform: scale(0.95);
          }
          40% {
            opacity: 0;
          }
          55% {
            opacity: 0.98;
            transform: scale(1);
          }
          85% {
            opacity: 0.98;
          }
          100% {
            opacity: 0;
            transform: scale(0.95);
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes letterPop {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.3) rotateZ(-10deg);
          }
          50% {
            transform: translateY(-5px) scale(1.1) rotateZ(5deg);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1) rotateZ(0deg);
          }
        }

        @keyframes gradientShift {
          0%, 100% {
            background-position: 0% center;
          }
          50% {
            background-position: 100% center;
          }
        }

        @keyframes shine {
          0% {
            background-position: -200% 0;
          }
          50%, 100% {
            background-position: 200% 0;
          }
        }

        @keyframes dotBounce {
          0%, 60%, 100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          30% {
            transform: translateY(-12px) scale(1.2);
            opacity: 0.8;
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.95);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.05);
          }
        }

        @keyframes subtle-rotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.3s both;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }

        .animate-subtle-rotate {
          animation: subtle-rotate 20s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default StunityLoader;
