"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import CountUp from "react-countup";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  suffix?: string;
  color?: string;
  delay?: number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export default function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  suffix = "", 
  color = "purple", 
  delay = 0,
  trend
}: StatCardProps) {
  const colorClasses = {
    purple: "from-purple-500 to-pink-500",
    blue: "from-blue-500 to-cyan-500",
    green: "from-green-500 to-emerald-500",
    orange: "from-orange-500 to-red-500",
    yellow: "from-yellow-500 to-orange-500",
  }[color] || "from-purple-500 to-pink-500";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        duration: 0.4, 
        delay,
        type: "spring",
        stiffness: 100
      }}
      whileHover={{ scale: 1.05, y: -4 }}
      className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden group"
    >
      {/* Gradient background on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses} shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {trend && (
            <span className={`text-sm font-medium ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
          )}
        </div>
        
        <div className="space-y-1">
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            <CountUp end={value} duration={2} delay={delay} />
            {suffix && <span className="text-xl ml-1">{suffix}</span>}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            {label}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
