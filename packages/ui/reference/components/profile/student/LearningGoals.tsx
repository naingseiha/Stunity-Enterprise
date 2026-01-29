"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Target, Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import GlassCard from "../shared/GlassCard";
import ProgressBar from "../shared/ProgressBar";

interface Goal {
  id: string;
  title: string;
  description?: string;
  progress: number;
  target: number;
  unit: string;
  dueDate?: string;
  completed: boolean;
  createdAt: string;
}

interface LearningGoalsProps {
  userId: string;
  isOwnProfile: boolean;
}

export default function LearningGoals({ userId, isOwnProfile }: LearningGoalsProps) {
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: "1",
      title: "Complete React Advanced Course",
      description: "Master advanced React patterns and hooks",
      progress: 75,
      target: 100,
      unit: "%",
      dueDate: "2024-06-15",
      completed: false,
      createdAt: "2024-01-01"
    },
    {
      id: "2",
      title: "Build 3 Full-Stack Projects",
      description: "Create portfolio-ready projects",
      progress: 2,
      target: 3,
      unit: "projects",
      dueDate: "2024-07-01",
      completed: false,
      createdAt: "2024-01-15"
    },
    {
      id: "3",
      title: "Master TypeScript",
      description: "Complete TypeScript certification",
      progress: 100,
      target: 100,
      unit: "%",
      completed: true,
      createdAt: "2023-12-01"
    },
    {
      id: "4",
      title: "Study 100 Hours This Semester",
      description: "Maintain consistent study habits",
      progress: 67,
      target: 100,
      unit: "hours",
      dueDate: "2024-06-30",
      completed: false,
      createdAt: "2024-01-01"
    }
  ]);

  const [showAddModal, setShowAddModal] = useState(false);

  const activeGoals = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);

  const handleToggleComplete = (goalId: string) => {
    setGoals(goals.map(g => 
      g.id === goalId 
        ? { ...g, completed: !g.completed, progress: g.completed ? g.progress : g.target }
        : g
    ));
  };

  const handleDelete = (goalId: string) => {
    setGoals(goals.filter(g => g.id !== goalId));
  };

  const getDaysLeft = (dueDate?: string) => {
    if (!dueDate) return null;
    const days = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-purple-600" />
            Learning Goals
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Track your learning objectives and progress
          </p>
        </div>
        {isOwnProfile && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Goal
          </motion.button>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard hover={false} className="p-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {activeGoals.length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Active Goals</p>
          </div>
        </GlassCard>
        <GlassCard hover={false} className="p-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {completedGoals.length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
          </div>
        </GlassCard>
        <GlassCard hover={false} className="p-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {Math.round((completedGoals.length / goals.length) * 100)}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
          </div>
        </GlassCard>
      </div>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            In Progress
          </h3>
          <div className="space-y-4">
            {activeGoals.map((goal, index) => {
              const progressPercent = (goal.progress / goal.target) * 100;
              const daysLeft = getDaysLeft(goal.dueDate);
              
              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <GlassCard hover={false} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                            {goal.title}
                          </h4>
                          {daysLeft !== null && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              daysLeft < 7
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : daysLeft < 30
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            }`}>
                              {daysLeft} days left
                            </span>
                          )}
                        </div>
                        {goal.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {goal.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                          <span>
                            Progress: <strong className="text-gray-900 dark:text-white">
                              {goal.progress} / {goal.target} {goal.unit}
                            </strong>
                          </span>
                        </div>
                        <ProgressBar
                          value={progressPercent}
                          color={progressPercent >= 75 ? "green" : progressPercent >= 50 ? "blue" : "orange"}
                          showPercentage={false}
                        />
                      </div>
                      
                      {isOwnProfile && (
                        <div className="flex items-center gap-2 ml-4">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleToggleComplete(goal.id)}
                            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title="Mark as complete"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDelete(goal.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete goal"
                          >
                            <Trash2 className="w-5 h-5" />
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Completed Goals
          </h3>
          <div className="space-y-3">
            {completedGoals.map((goal, index) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {goal.title}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {goal.target} {goal.unit} achieved
                      </p>
                    </div>
                  </div>
                  {isOwnProfile && (
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleToggleComplete(goal.id)}
                        className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-sm"
                      >
                        Undo
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDelete(goal.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
