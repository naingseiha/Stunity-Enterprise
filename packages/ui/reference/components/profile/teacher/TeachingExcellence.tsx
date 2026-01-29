"use client";

import { motion } from "framer-motion";
import { Users, BookOpen, Star, TrendingUp, Award, Clock, Target, Trophy } from "lucide-react";
import GlassCard from "../shared/GlassCard";
import ProgressBar from "../shared/ProgressBar";

interface Course {
  id: string;
  name: string;
  students: number;
  rating: number;
  completionRate: number;
}

interface TeachingExcellenceProps {
  teachingSince: number; // Year
  studentsTaught: number;
  coursesCreated: number;
  teachingHours: number;
  successRate: number;
  averageRating: number;
  activeCourses: Course[];
  achievements: string[];
}

export default function TeachingExcellence({
  teachingSince,
  studentsTaught,
  coursesCreated,
  teachingHours,
  successRate,
  averageRating,
  activeCourses,
  achievements
}: TeachingExcellenceProps) {
  const yearsTeaching = new Date().getFullYear() - teachingSince;

  return (
    <div className="space-y-6">
      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard hover={false} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">
                Teaching Since
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {teachingSince}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {yearsTeaching} years experience
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-xl">
              <Award className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>

        <GlassCard hover={false} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">
                Students Taught
              </p>
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="text-3xl font-bold text-gray-900 dark:text-white"
              >
                {studentsTaught.toLocaleString()}
              </motion.p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +12% this year
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-3 rounded-xl">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>

        <GlassCard hover={false} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">
                Courses Created
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {coursesCreated}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                All time
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-3 rounded-xl">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>

        <GlassCard hover={false} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">
                Teaching Hours
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {teachingHours.toLocaleString()}h
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Total logged
              </p>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-red-500 p-3 rounded-xl">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-6 text-white shadow-xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium opacity-90 mb-2">Student Success Rate</p>
              <p className="text-5xl font-bold mb-3">{successRate}%</p>
              <ProgressBar
                value={successRate}
                color="green"
                height="h-2"
                showPercentage={false}
                delay={0.2}
              />
              <p className="text-xs opacity-90 mt-2">
                96% of students pass with excellent grades
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl ml-4">
              <Target className="w-8 h-8" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 text-white shadow-xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90 mb-2">Average Rating</p>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-5xl font-bold">{averageRating.toFixed(1)}</p>
                <div className="flex flex-col">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(averageRating)
                            ? 'fill-white text-white'
                            : 'text-white/40'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs opacity-90">out of 5.0</p>
                </div>
              </div>
              <p className="text-xs opacity-90">
                Based on {(studentsTaught * 0.75).toFixed(0)} reviews
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl">
              <Trophy className="w-8 h-8" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Active Courses */}
      <GlassCard hover={false} className="p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          Active Courses ({new Date().getFullYear()})
        </h3>
        <div className="space-y-4">
          {activeCourses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">
                    {course.name}
                  </h4>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {course.students} students
                    </span>
                    <span className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-600 dark:fill-yellow-400" />
                      {course.rating.toFixed(1)}
                    </span>
                  </div>
                </div>
                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm font-medium">
                  {course.completionRate}% complete
                </span>
              </div>
              <ProgressBar
                value={course.completionRate}
                color="blue"
                showPercentage={false}
                delay={index * 0.1 + 0.3}
              />
            </motion.div>
          ))}
        </div>
      </GlassCard>

      {/* Student Impact */}
      <GlassCard hover={false} className="p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          Student Impact
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">+23%</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Avg. Grade Improvement
            </p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">88%</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Student Engagement
            </p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">&lt;2h</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Response Time
            </p>
          </div>
        </div>

        {/* Top Achievements */}
        {achievements.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Top Achievements:
            </p>
            <ul className="space-y-2">
              {achievements.map((achievement, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                >
                  <span className="text-green-600 dark:text-green-400">✓</span>
                  {achievement}
                </motion.li>
              ))}
            </ul>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
