"use client";

import { motion } from "framer-motion";

interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  color?: string;
  height?: string;
  showPercentage?: boolean;
  animated?: boolean;
  delay?: number;
}

export default function ProgressBar({ 
  value, 
  label, 
  color = "purple",
  height = "h-3",
  showPercentage = true,
  animated = true,
  delay = 0
}: ProgressBarProps) {
  const colorClasses = {
    purple: "from-purple-500 to-pink-500",
    blue: "from-blue-500 to-cyan-500",
    green: "from-green-500 to-emerald-500",
    orange: "from-orange-500 to-red-500",
    yellow: "from-yellow-500 to-orange-500",
  }[color] || "from-purple-500 to-pink-500";

  const percentage = Math.min(100, Math.max(0, value));

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </span>
          {showPercentage && (
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {percentage}%
            </span>
          )}
        </div>
      )}
      
      <div className={`relative ${height} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden`}>
        <motion.div
          initial={animated ? { width: 0 } : { width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{ 
            duration: 1,
            delay,
            ease: "easeOut"
          }}
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${colorClasses} rounded-full shadow-lg`}
        >
          {/* Shimmer effect */}
          <motion.div
            animate={{
              x: ['-100%', '100%']
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          />
        </motion.div>
      </div>
    </div>
  );
}
