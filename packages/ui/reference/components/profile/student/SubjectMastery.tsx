"use client";

import { motion } from "framer-motion";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
import GlassCard from "../shared/GlassCard";

interface Subject {
  subject: string;
  score: number; // 0-100
  fullMark: number;
}

interface SubjectMasteryProps {
  subjects: Subject[];
  title?: string;
}

export default function SubjectMastery({ subjects, title = "Subject Mastery" }: SubjectMasteryProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg">
          <p className="font-medium">{payload[0].payload.subject}</p>
          <p className="text-sm text-green-400">
            Score: {payload[0].value}/100
          </p>
        </div>
      );
    }
    return null;
  };

  const averageScore = Math.round(
    subjects.reduce((acc, s) => acc + s.score, 0) / subjects.length
  );

  const topSubject = subjects.reduce((max, s) => 
    s.score > max.score ? s : max
  , subjects[0]);

  const improvementNeeded = subjects.reduce((min, s) => 
    s.score < min.score ? s : min
  , subjects[0]);

  return (
    <GlassCard hover={false} className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your performance across different subjects
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Radar Chart */}
        <div className="flex-1">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="w-full h-[400px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={subjects}>
                <PolarGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]}
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.6}
                  animationDuration={1000}
                />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Stats Sidebar */}
        <div className="lg:w-64 space-y-4">
          {/* Average Score */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-4 text-white"
          >
            <p className="text-sm opacity-90 mb-1">Average Score</p>
            <p className="text-4xl font-bold">{averageScore}%</p>
            <p className="text-xs opacity-90 mt-1">Across all subjects</p>
          </motion.div>

          {/* Top Subject */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-4 text-white"
          >
            <p className="text-sm opacity-90 mb-1">🏆 Top Subject</p>
            <p className="text-lg font-bold">{topSubject.subject}</p>
            <p className="text-2xl font-bold">{topSubject.score}%</p>
          </motion.div>

          {/* Needs Improvement */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-4 text-white"
          >
            <p className="text-sm opacity-90 mb-1">📚 Focus Area</p>
            <p className="text-lg font-bold">{improvementNeeded.subject}</p>
            <p className="text-2xl font-bold">{improvementNeeded.score}%</p>
          </motion.div>

          {/* Subject Breakdown */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
          >
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Subject Scores
            </p>
            <div className="space-y-2">
              {subjects.map((subject, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600 dark:text-gray-400">
                      {subject.subject}
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {subject.score}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${subject.score}%` }}
                      transition={{ duration: 1, delay: 0.6 + index * 0.1 }}
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </GlassCard>
  );
}
