'use client';

import { useState, useEffect } from 'react';
import { 
  Flame, 
  Trophy, 
  Star,
  Zap,
  Target,
  ChevronRight,
  Sparkles,
  BookOpen,
  MessageCircle,
  Heart,
} from 'lucide-react';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  weeklyActivity: boolean[];
  todayCompleted: boolean;
  xpEarned: number;
  level: number;
  nextLevelXp: number;
  achievements: string[];
}

// Mock data
const STREAK_DATA: StreakData = {
  currentStreak: 7,
  longestStreak: 14,
  weeklyActivity: [true, true, true, true, true, false, true],
  todayCompleted: true,
  xpEarned: 1250,
  level: 12,
  nextLevelXp: 1500,
  achievements: ['Early Bird', 'Helping Hand', 'Quick Learner'],
};

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const DAILY_GOALS = [
  { id: '1', label: 'Read 1 post', icon: BookOpen, completed: true, xp: 10 },
  { id: '2', label: 'Write a comment', icon: MessageCircle, completed: true, xp: 20 },
  { id: '3', label: 'Like 3 posts', icon: Heart, completed: false, xp: 15 },
  { id: '4', label: 'Share knowledge', icon: Sparkles, completed: false, xp: 30 },
];

export default function LearningStreakWidget() {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showGoals, setShowGoals] = useState(false);

  useEffect(() => {
    // Animate streak on mount
    const timer = setTimeout(() => setIsAnimating(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const progressPercent = (STREAK_DATA.xpEarned / STREAK_DATA.nextLevelXp) * 100;
  const completedGoals = DAILY_GOALS.filter(g => g.completed).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Clean Header */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Flame Icon */}
            <div className={`
              relative w-12 h-12 rounded-full bg-gradient-to-br from-[#F9A825]/10 to-[#FFB74D]/10 flex items-center justify-center
              ${isAnimating ? 'animate-bounce-subtle' : ''}
            `}>
              <Flame className="w-6 h-6 text-[#F9A825]" />
              {STREAK_DATA.currentStreak >= 7 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#FFB74D] rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow">
                  🔥
                </div>
              )}
            </div>
            
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-900">{STREAK_DATA.currentStreak}</span>
                <span className="text-gray-500 text-sm">day streak</span>
              </div>
              <p className="text-xs text-gray-400">Best: {STREAK_DATA.longestStreak} days</p>
            </div>
          </div>

          {/* Level Badge */}
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center mb-1">
              <span className="text-violet-600 font-bold">{STREAK_DATA.level}</span>
            </div>
            <span className="text-[10px] text-gray-400 uppercase">Level</span>
          </div>
        </div>

        {/* Weekly Activity */}
        <div className="flex justify-between mt-4 px-1">
          {DAYS.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-gray-400">{day}</span>
              <div className={`
                w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                transition-all duration-300
                ${STREAK_DATA.weeklyActivity[i] 
                  ? 'bg-[#F9A825] text-white' 
                  : 'bg-gray-100 text-gray-300'}
              `}>
                {STREAK_DATA.weeklyActivity[i] ? '✓' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* XP Progress */}
      <div className="px-4 py-3 border-b border-gray-50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#F9A825]" />
            <span className="text-sm font-medium text-gray-900">
              {STREAK_DATA.xpEarned} / {STREAK_DATA.nextLevelXp} XP
            </span>
          </div>
          <span className="text-xs text-gray-400">Level {STREAK_DATA.level + 1}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#F9A825] to-[#FFB74D] rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Daily Goals */}
      <div className="px-4 py-3">
        <button 
          onClick={() => setShowGoals(!showGoals)}
          className="w-full flex items-center justify-between mb-2"
        >
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-medium text-gray-900">Daily Goals</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{completedGoals}/{DAILY_GOALS.length}</span>
            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showGoals ? 'rotate-90' : ''}`} />
          </div>
        </button>

        {showGoals && (
          <div className="space-y-2 mt-2">
            {DAILY_GOALS.map((goal) => {
              const Icon = goal.icon;
              return (
                <div 
                  key={goal.id}
                  className={`
                    flex items-center gap-3 p-2 rounded-lg transition-colors
                    ${goal.completed ? 'bg-amber-50' : 'bg-gray-50'}
                  `}
                >
                  <div className={`
                    w-6 h-6 rounded-full flex items-center justify-center
                    ${goal.completed 
                      ? 'bg-[#F9A825] text-white' 
                      : 'bg-gray-200 text-gray-400'}
                  `}>
                    {goal.completed ? '✓' : <Icon className="w-3 h-3" />}
                  </div>
                  <span className={`flex-1 text-sm ${goal.completed ? 'text-[#F9A825] line-through' : 'text-gray-700'}`}>
                    {goal.label}
                  </span>
                  <span className={`text-xs font-medium ${goal.completed ? 'text-[#F9A825]' : 'text-violet-500'}`}>
                    +{goal.xp} XP
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
        
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
        
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
