"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  delay?: number;
}

export default function GlassCard({ children, className = "", hover = true, delay = 0 }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      whileHover={hover ? { scale: 1.02, y: -4 } : {}}
      className={`
        bg-white/80 dark:bg-gray-800/80
        backdrop-blur-xl
        rounded-2xl
        border border-white/20 dark:border-gray-700/20
        shadow-xl shadow-purple-500/10
        ${hover ? 'transition-all hover:shadow-2xl hover:shadow-purple-500/20' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}
