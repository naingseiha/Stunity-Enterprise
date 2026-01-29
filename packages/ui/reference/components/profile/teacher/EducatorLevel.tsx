"use client";

import { motion } from "framer-motion";
import { Crown, Star, Award, TrendingUp, Users, BookOpen, Zap } from "lucide-react";
import GlassCard from "../shared/GlassCard";
import ProgressBar from "../shared/ProgressBar";

interface EducatorLevelProps {
  currentLevel: number;
  currentXP: number;
  nextLevelXP: number;
  totalStudentsTaught: number;
  averageRating: number;
  coursesCreated: number;
}

const LEVELS = [
  { level: 1, title: "New Educator", minXP: 0, color: "from-gray-400 to-gray-600", icon: Star },
  { level: 2, title: "Junior Educator", minXP: 1000, color: "from-blue-400 to-blue-600", icon: Star },
  { level: 3, title: "Educator", minXP: 3000, color: "from-green-400 to-green-600", icon: Award },
  { level: 4, title: "Senior Educator", minXP: 7000, color: "from-purple-400 to-purple-600", icon: Award },
  { level: 5, title: "Master Educator", minXP: 15000, color: "from-orange-400 to-orange-600", icon: Crown },
  { level: 6, title: "Grand Master", minXP: 30000, color: "from-yellow-400 to-orange-600", icon: Crown },
  { level: 7, title: "Legend", minXP: 50000, color: "from-pink-400 to-red-600", icon: Zap }
];

export default function EducatorLevel({
  currentLevel,
  currentXP,
  nextLevelXP,
  totalStudentsTaught,
  averageRating,
  coursesCreated
}: EducatorLevelProps) {
  const currentLevelData = LEVELS.find(l => l.level === currentLevel) || LEVELS[0];
  const nextLevelData = LEVELS.find(l => l.level === currentLevel + 1);
  const CurrentIcon = currentLevelData.icon;
  
  const progress = ((currentXP / nextLevelXP) * 100);
  const xpNeeded = nextLevelXP - currentXP;

  // Calculate milestones for next level
  const milestones = [
    {
      id: 1,
      title: "Teach 300 More Students",
      current: totalStudentsTaught % 300,
      target: 300,
      icon: Users,
      completed: false
    },
    {
      id: 2,
      title: "Maintain 4.8+ Rating",
      current: averageRating,
      target: 4.8,
      icon: Star,
      completed: averageRating >= 4.8
    },
    {
      id: 3,
      title: "Create 5 New Courses",
      current: coursesCreated % 5,
      target: 5,
      icon: BookOpen,
      completed: false
    }
  ];

  return (
    <div className="space-y-6">
      {/* Current Level Display */}
      <GlassCard hover={false} className="p-8">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-block"
          >
            <div className={`w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br ${currentLevelData.color} flex items-center justify-center shadow-2xl`}>
              <CurrentIcon className="w-16 h-16 text-white" />
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current Level</p>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Level {currentLevel}
            </h2>
            <p className={`text-2xl font-bold bg-gradient-to-r ${currentLevelData.color} bg-clip-text text-transparent`}>
              {currentLevelData.title}
            </p>
          </motion.div>
        </div>
      </GlassCard>

      {/* Progress to Next Level */}
      {nextLevelData && (
        <GlassCard hover={false} className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Progress to {nextLevelData.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {currentXP.toLocaleString()} / {nextLevelXP.toLocaleString()} XP
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {Math.round(progress)}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {xpNeeded.toLocaleString()} XP needed
              </p>
            </div>
          </div>
          
          <ProgressBar
            value={progress}
            color="purple"
            showPercentage={false}
            height="h-4"
          />

          {/* XP Breakdown */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400">Per Student</p>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">+10 XP</p>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400">Per Course</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">+500 XP</p>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400">5-Star Review</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">+50 XP</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Milestones */}
      <GlassCard hover={false} className="p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Milestones to Next Level
        </h3>
        <div className="space-y-4">
          {milestones.map((milestone, index) => {
            const Icon = milestone.icon;
            const milestoneProgress = (milestone.current / milestone.target) * 100;
            
            return (
              <motion.div
                key={milestone.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`p-4 rounded-xl border-2 ${
                  milestone.completed
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                    : 'bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className={`p-2 rounded-lg ${
                    milestone.completed
                      ? 'bg-green-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      milestone.completed ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {milestone.title}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {milestone.current} / {milestone.target}
                      {milestone.completed && " ✓ Completed"}
                    </p>
                  </div>
                </div>
                {!milestone.completed && (
                  <ProgressBar
                    value={milestoneProgress}
                    color="blue"
                    showPercentage={false}
                    delay={index * 0.1 + 0.2}
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      </GlassCard>

      {/* All Levels Preview */}
      <GlassCard hover={false} className="p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
          All Educator Levels
        </h3>
        <div className="space-y-3">
          {LEVELS.map((level, index) => {
            const Icon = level.icon;
            const isUnlocked = currentLevel >= level.level;
            const isCurrent = currentLevel === level.level;
            
            return (
              <motion.div
                key={level.level}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                  isCurrent
                    ? `bg-gradient-to-r ${level.color} text-white`
                    : isUnlocked
                    ? 'bg-gray-100 dark:bg-gray-800'
                    : 'bg-gray-50 dark:bg-gray-900 opacity-50'
                }`}
              >
                <div className={`p-3 rounded-lg ${
                  isCurrent
                    ? 'bg-white/20'
                    : isUnlocked
                    ? `bg-gradient-to-br ${level.color}`
                    : 'bg-gray-300 dark:bg-gray-700'
                }`}>
                  <Icon className={`w-6 h-6 ${
                    isCurrent || isUnlocked ? 'text-white' : 'text-gray-500'
                  }`} />
                </div>
                <div className="flex-1">
                  <p className={`font-bold ${
                    isCurrent ? 'text-white' : 'text-gray-900 dark:text-white'
                  }`}>
                    Level {level.level}: {level.title}
                  </p>
                  <p className={`text-sm ${
                    isCurrent ? 'text-white/80' : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {isUnlocked ? 'Unlocked' : `Requires ${level.minXP.toLocaleString()} XP`}
                  </p>
                </div>
                {isCurrent && (
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                    Current
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
