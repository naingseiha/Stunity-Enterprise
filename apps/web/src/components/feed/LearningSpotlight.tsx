'use client';

import { useState } from 'react';
import { 
  BookOpen, 
  Play, 
  Clock, 
  Users, 
  Star,
  ChevronRight,
  Sparkles,
  GraduationCap,
  FileText,
  Video,
} from 'lucide-react';

interface SpotlightItem {
  id: string;
  type: 'course' | 'video' | 'article' | 'quiz';
  title: string;
  description: string;
  author: string;
  duration?: string;
  participants?: number;
  rating?: number;
  isNew?: boolean;
  isFeatured?: boolean;
}

// Mock data - would come from API in production
const SPOTLIGHT_ITEMS: SpotlightItem[] = [
  {
    id: '1',
    type: 'course',
    title: 'Mathematics Fundamentals',
    description: 'Master algebra and geometry basics',
    author: 'Mr. Sok Vanna',
    duration: '2h 30m',
    participants: 156,
    rating: 4.8,
    isFeatured: true,
  },
  {
    id: '2',
    type: 'video',
    title: 'Physics: Laws of Motion',
    description: 'Interactive lesson with experiments',
    author: 'Ms. Sreymom',
    duration: '45m',
    participants: 89,
    isNew: true,
  },
  {
    id: '3',
    type: 'article',
    title: 'Essay Writing Tips',
    description: 'Improve your academic writing',
    author: 'English Department',
    duration: '10 min read',
    rating: 4.5,
  },
];

const TYPE_ICONS = {
  course: GraduationCap,
  video: Video,
  article: FileText,
  quiz: Star,
};

const TYPE_COLORS = {
  course: 'from-[#F9A825] to-[#FFB74D]',
  video: 'from-rose-400 to-pink-400',
  article: 'from-teal-400 to-cyan-400',
  quiz: 'from-violet-400 to-purple-400',
};

export default function LearningSpotlight() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 text-sm">Learning Spotlight</h3>
      </div>

      {/* Spotlight Items */}
      <div className="divide-y divide-gray-50">
        {SPOTLIGHT_ITEMS.map((item) => {
          const Icon = TYPE_ICONS[item.type];
          
          return (
            <div
              key={item.id}
              className="px-3 py-2 flex items-start gap-2 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              {/* Icon */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${TYPE_COLORS[item.type]}`}>
                <Icon className="w-4 h-4 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 text-xs truncate">{item.title}</h4>
                <p className="text-[11px] text-gray-400 truncate">{item.author}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-gray-100">
        <button className="text-xs text-gray-500 hover:text-[#F9A825] transition-colors">
          See all →
        </button>
      </div>
    </div>
  );
}
