"use client";

import { Star, Flame, Award, TrendingUp } from "lucide-react";

interface KnowledgePointsProps {
  xp?: number;
  streak?: number;
  isVerified?: boolean;
  isTrending?: boolean;
  className?: string;
}

export default function KnowledgePoints({
  xp,
  streak,
  isVerified = false,
  isTrending = false,
  className = "",
}: KnowledgePointsProps) {
  if (!xp && !streak && !isVerified && !isTrending) return null;

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      {/* XP Points - Minimal */}
      {xp !== undefined && xp > 0 && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
          <span className="font-medium">+{xp}</span>
        </div>
      )}

      {/* Streak - Minimal */}
      {streak !== undefined && streak > 0 && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span className="text-gray-400">•</span>
          <Flame className="w-3 h-3 text-orange-500" />
          <span className="font-medium">{streak}d</span>
        </div>
      )}

      {/* Verified - Minimal */}
      {isVerified && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span className="text-gray-400">•</span>
          <Award className="w-3 h-3 text-blue-500" />
        </div>
      )}

      {/* Trending - Minimal */}
      {isTrending && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span className="text-gray-400">•</span>
          <TrendingUp className="w-3 h-3 text-purple-500" />
        </div>
      )}
    </div>
  );
}
