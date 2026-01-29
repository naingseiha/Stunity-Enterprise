"use client";

import { motion } from "framer-motion";
import { 
  BookOpen, 
  Users, 
  FileText, 
  Award,
  Code,
  GraduationCap,
  Trophy,
  Target,
  Flame,
  Clock,
  TrendingUp,
  Star
} from "lucide-react";
import StatCard from "./shared/StatCard";

interface Stats {
  followers: number;
  following: number;
  posts: number;
  projects: number;
  certifications: number;
  skills: number;
  achievements: number;
}

interface RoleBasedStatsProps {
  stats: Stats;
  role: "student" | "teacher";
  additionalStats?: {
    studyHours?: number;
    coursesCompleted?: number;
    averageGrade?: number;
    studentsTaught?: number;
    coursesCreated?: number;
    averageRating?: number;
    teachingHours?: number;
  };
}

export default function RoleBasedStats({ stats, role, additionalStats = {} }: RoleBasedStatsProps) {
  return (
    <div className="space-y-6">
      {/* Primary Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatCard
          icon={FileText}
          label="Posts"
          value={stats.posts}
          color="purple"
          delay={0}
        />
        <StatCard
          icon={Users}
          label="Followers"
          value={stats.followers}
          color="blue"
          delay={0.1}
        />
        <StatCard
          icon={Code}
          label="Projects"
          value={stats.projects}
          color="green"
          delay={0.2}
        />
        <StatCard
          icon={Award}
          label="Achievements"
          value={stats.achievements}
          color="yellow"
          delay={0.3}
        />
      </motion.div>

      {/* Secondary Stats - Role Specific */}
      {role === "student" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-md">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Learning Performance
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Target}
              label="Skills"
              value={stats.skills}
              color="purple"
              delay={0.3}
            />
            <StatCard
              icon={Trophy}
              label="Certifications"
              value={stats.certifications}
              color="blue"
              delay={0.4}
            />
            {additionalStats.studyHours !== undefined && (
              <StatCard
                icon={Clock}
                label="Study Hours"
                value={additionalStats.studyHours}
                suffix="h"
                color="green"
                delay={0.5}
              />
            )}
            {additionalStats.coursesCompleted !== undefined && (
              <StatCard
                icon={BookOpen}
                label="Courses Done"
                value={additionalStats.coursesCompleted}
                color="orange"
                delay={0.6}
              />
            )}
          </div>

          {/* Average Grade Card */}
          {additionalStats.averageGrade !== undefined && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.7 }}
              className="mt-4"
            >
              <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold opacity-90 mb-2 uppercase tracking-wider">Overall Performance</p>
                    <p className="text-5xl font-black mb-1">
                      {additionalStats.averageGrade.toFixed(1)}%
                    </p>
                    <p className="text-sm opacity-90 font-medium">Average Grade</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-md p-5 rounded-2xl shadow-lg">
                    <TrendingUp className="w-10 h-10" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {role === "teacher" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg shadow-md">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Teaching Excellence
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {additionalStats.studentsTaught !== undefined && (
              <StatCard
                icon={Users}
                label="Students Taught"
                value={additionalStats.studentsTaught}
                color="purple"
                delay={0.3}
                trend={{ value: 12, isPositive: true }}
              />
            )}
            {additionalStats.coursesCreated !== undefined && (
              <StatCard
                icon={BookOpen}
                label="Courses Created"
                value={additionalStats.coursesCreated}
                color="blue"
                delay={0.4}
              />
            )}
            {additionalStats.teachingHours !== undefined && (
              <StatCard
                icon={Clock}
                label="Teaching Hours"
                value={additionalStats.teachingHours}
                suffix="h"
                color="green"
                delay={0.5}
              />
            )}
            <StatCard
              icon={Target}
              label="Skills"
              value={stats.skills}
              color="orange"
              delay={0.6}
            />
          </div>

          {/* Average Rating Card */}
          {additionalStats.averageRating !== undefined && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.7 }}
              className="mt-4"
            >
              <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 rounded-2xl p-8 text-white shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold opacity-90 mb-2 uppercase tracking-wider">Student Satisfaction</p>
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-5xl font-black">
                        {additionalStats.averageRating.toFixed(1)}
                      </p>
                      <Star className="w-10 h-10 fill-white" />
                    </div>
                    <p className="text-sm opacity-90 font-medium">Average Rating</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-md p-5 rounded-2xl shadow-lg">
                    <Trophy className="w-10 h-10" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
