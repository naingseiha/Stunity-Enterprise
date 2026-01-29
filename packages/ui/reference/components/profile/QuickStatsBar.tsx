"use client";

import { motion } from "framer-motion";
import { 
  Users, 
  BookOpen, 
  Star, 
  Flame, 
  TrendingUp, 
  Clock,
  Award,
  Target
} from "lucide-react";

interface QuickStatsBarProps {
  role: "student" | "teacher" | "educator" | "researcher" | "learner";
  stats: {
    // Common stats
    followers?: number;
    following?: number;
    posts?: number;
    
    // Student stats
    coursesCompleted?: number;
    averageGrade?: number;
    studyHours?: number;
    currentStreak?: number;
    
    // Teacher stats
    studentsTaught?: number;
    coursesCreated?: number;
    averageRating?: number;
    teachingHours?: number;
    successRate?: number;
    
    // General educator/researcher stats
    publications?: number;
    projects?: number;
    certifications?: number;
  };
}

interface StatItemProps {
  icon: React.ElementType;
  value: string | number;
  label: string;
  color: string;
  delay: number;
}

function StatItem({ icon: Icon, value, label, color, delay }: StatItemProps) {
  const colorClasses = {
    purple: "from-purple-500 to-purple-600 text-purple-600",
    blue: "from-blue-500 to-blue-600 text-blue-600",
    green: "from-green-500 to-green-600 text-green-600",
    orange: "from-orange-500 to-orange-600 text-orange-600",
    pink: "from-pink-500 to-pink-600 text-pink-600",
    yellow: "from-yellow-500 to-yellow-600 text-yellow-600",
    red: "from-red-500 to-red-600 text-red-600",
    teal: "from-teal-500 to-teal-600 text-teal-600"
  };

  const gradientClass = colorClasses[color as keyof typeof colorClasses] || colorClasses.purple;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ scale: 1.05, y: -2 }}
      className="flex-shrink-0 bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all border border-gray-100"
      style={{ minWidth: '140px' }}
    >
      <div className="flex flex-col items-center gap-2">
        <div className={`p-2.5 rounded-lg bg-gradient-to-br ${gradientClass.split(' ')[0]} ${gradientClass.split(' ')[1]} bg-opacity-10`}>
          <Icon className={`w-5 h-5 ${gradientClass.split(' ').slice(2).join(' ')}`} />
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {typeof value === 'number' && value >= 1000 
              ? `${(value / 1000).toFixed(1)}K` 
              : value}
          </div>
          <div className="text-xs text-gray-600 font-medium mt-0.5">
            {label}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function QuickStatsBar({ role, stats }: QuickStatsBarProps) {
  const renderStudentStats = () => (
    <>
      <StatItem 
        icon={BookOpen} 
        value={stats.coursesCompleted || 0} 
        label="Courses" 
        color="purple" 
        delay={0} 
      />
      <StatItem 
        icon={TrendingUp} 
        value={stats.averageGrade ? `${stats.averageGrade}%` : "N/A"} 
        label="Average Grade" 
        color="green" 
        delay={0.1} 
      />
      <StatItem 
        icon={Clock} 
        value={stats.studyHours || 0} 
        label="Study Hours" 
        color="blue" 
        delay={0.2} 
      />
      <StatItem 
        icon={Flame} 
        value={stats.currentStreak || 0} 
        label="Day Streak" 
        color="orange" 
        delay={0.3} 
      />
      <StatItem 
        icon={Users} 
        value={stats.followers || 0} 
        label="Followers" 
        color="pink" 
        delay={0.4} 
      />
      <StatItem 
        icon={Target} 
        value={stats.posts || 0} 
        label="Posts" 
        color="teal" 
        delay={0.5} 
      />
    </>
  );

  const renderTeacherStats = () => (
    <>
      <StatItem 
        icon={Users} 
        value={stats.studentsTaught || 0} 
        label="Students" 
        color="purple" 
        delay={0} 
      />
      <StatItem 
        icon={BookOpen} 
        value={stats.coursesCreated || 0} 
        label="Courses" 
        color="blue" 
        delay={0.1} 
      />
      <StatItem 
        icon={Star} 
        value={stats.averageRating ? `${stats.averageRating}/5` : "N/A"} 
        label="Rating" 
        color="yellow" 
        delay={0.2} 
      />
      <StatItem 
        icon={TrendingUp} 
        value={stats.successRate ? `${stats.successRate}%` : "N/A"} 
        label="Success Rate" 
        color="green" 
        delay={0.3} 
      />
      <StatItem 
        icon={Clock} 
        value={stats.teachingHours || 0} 
        label="Teaching Hrs" 
        color="orange" 
        delay={0.4} 
      />
      <StatItem 
        icon={Award} 
        value={stats.certifications || 0} 
        label="Certifications" 
        color="pink" 
        delay={0.5} 
      />
    </>
  );

  const renderResearcherStats = () => (
    <>
      <StatItem 
        icon={BookOpen} 
        value={stats.publications || 0} 
        label="Publications" 
        color="purple" 
        delay={0} 
      />
      <StatItem 
        icon={Target} 
        value={stats.projects || 0} 
        label="Projects" 
        color="blue" 
        delay={0.1} 
      />
      <StatItem 
        icon={Award} 
        value={stats.certifications || 0} 
        label="Certifications" 
        color="green" 
        delay={0.2} 
      />
      <StatItem 
        icon={Users} 
        value={stats.followers || 0} 
        label="Followers" 
        color="pink" 
        delay={0.3} 
      />
      <StatItem 
        icon={Star} 
        value={stats.posts || 0} 
        label="Contributions" 
        color="yellow" 
        delay={0.4} 
      />
    </>
  );

  const renderLearnerStats = () => (
    <>
      <StatItem 
        icon={BookOpen} 
        value={stats.coursesCompleted || 0} 
        label="Courses" 
        color="purple" 
        delay={0} 
      />
      <StatItem 
        icon={Target} 
        value={stats.projects || 0} 
        label="Projects" 
        color="blue" 
        delay={0.1} 
      />
      <StatItem 
        icon={Flame} 
        value={stats.currentStreak || 0} 
        label="Day Streak" 
        color="orange" 
        delay={0.2} 
      />
      <StatItem 
        icon={Clock} 
        value={stats.studyHours || 0} 
        label="Study Hours" 
        color="green" 
        delay={0.3} 
      />
      <StatItem 
        icon={Users} 
        value={stats.followers || 0} 
        label="Followers" 
        color="pink" 
        delay={0.4} 
      />
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="w-full bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 dark:from-purple-900/10 dark:via-pink-900/10 dark:to-blue-900/10 rounded-2xl p-4 shadow-sm border border-purple-100 dark:border-purple-800/30"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">
          Performance Highlights
        </h3>
      </div>
      
      {/* Horizontal scrollable stats */}
      <div className="overflow-x-auto scrollbar-hide -mx-2 px-2">
        <div className="flex gap-3 pb-2">
          {role === "student" && renderStudentStats()}
          {role === "teacher" && renderTeacherStats()}
          {role === "educator" && renderTeacherStats()}
          {role === "researcher" && renderResearcherStats()}
          {role === "learner" && renderLearnerStats()}
        </div>
      </div>
    </motion.div>
  );
}
