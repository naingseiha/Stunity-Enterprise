"use client";

import { motion } from "framer-motion";
import { Flame, TrendingUp, Target, BookOpen, Award, Clock } from "lucide-react";
import GlassCard from "../shared/GlassCard";
import ProgressBar from "../shared/ProgressBar";

interface Course {
  id: string;
  name: string;
  progress: number;
  grade?: number;
}

interface LearningPerformanceProps {
  currentStreak: number;
  longestStreak: number;
  weeklyHours: number[];
  courses: Course[];
  totalStudyHours: number;
  averageGrade: number;
}

export default function LearningPerformance({
  currentStreak,
  longestStreak,
  weeklyHours,
  courses,
  totalStudyHours,
  averageGrade
}: LearningPerformanceProps) {
  const maxWeeklyHour = Math.max(...weeklyHours, 5);
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-6">
      {/* Streak Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard hover={false} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">
                Current Streak
              </p>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="flex items-center gap-2"
              >
                <motion.span
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, -10, 10, 0]
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    repeatDelay: 2
                  }}
                  className="text-3xl"
                >
                  🔥
                </motion.span>
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {currentStreak}
                </span>
                <span className="text-lg text-gray-600 dark:text-gray-400">
                  days
                </span>
              </motion.div>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-red-500 p-4 rounded-xl">
              <Flame className="w-8 h-8 text-white" />
            </div>
          </div>
        </GlassCard>

        <GlassCard hover={false} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">
                Longest Streak
              </p>
              <div className="flex items-center gap-2">
                <span className="text-3xl">🏆</span>
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {longestStreak}
                </span>
                <span className="text-lg text-gray-600 dark:text-gray-400">
                  days
                </span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-4 rounded-xl">
              <Award className="w-8 h-8 text-white" />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Weekly Study Hours */}
      <GlassCard hover={false} className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              This Week's Study Time
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Total: <span className="font-bold text-blue-600">{weeklyHours.reduce((a, b) => a + b, 0).toFixed(1)}h</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {(weeklyHours.reduce((a, b) => a + b, 0) / 7).toFixed(1)}h
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              daily average
            </p>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="flex items-end justify-between gap-2 h-32">
          {weeklyHours.map((hours, index) => (
            <motion.div
              key={index}
              initial={{ height: 0 }}
              animate={{ height: `${(hours / maxWeeklyHour) * 100}%` }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="flex-1 flex flex-col items-center gap-2"
            >
              <div className="relative flex-1 w-full flex items-end">
                <div className="w-full bg-gradient-to-t from-blue-500 to-cyan-500 rounded-t-lg relative group">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {hours.toFixed(1)}h
                  </div>
                </div>
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                {weekDays[index]}
              </span>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      {/* Course Progress */}
      <GlassCard hover={false} className="p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-purple-600" />
          Course Progress
        </h3>
        <div className="space-y-4">
          {courses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {course.name}
                  </p>
                  {course.grade !== undefined && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Current Grade: <span className="font-bold text-green-600">{course.grade}%</span>
                    </p>
                  )}
                </div>
                <span className="text-sm font-bold text-purple-600">
                  {course.progress}%
                </span>
              </div>
              <ProgressBar
                value={course.progress}
                color="purple"
                showPercentage={false}
                delay={index * 0.1 + 0.3}
              />
            </motion.div>
          ))}
        </div>
      </GlassCard>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90 mb-1">Total Study Time</p>
              <p className="text-4xl font-bold">{totalStudyHours}h</p>
              <p className="text-sm opacity-90 mt-1">All time</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl">
              <Clock className="w-8 h-8" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-6 text-white shadow-xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90 mb-1">Average Performance</p>
              <p className="text-4xl font-bold">{averageGrade}%</p>
              <p className="text-sm opacity-90 mt-1">Overall grade</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl">
              <TrendingUp className="w-8 h-8" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
