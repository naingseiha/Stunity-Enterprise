'use client';

import { useState } from 'react';
import { 
  Users, 
  MessageCircle, 
  Lock, 
  Globe,
  ChevronRight,
  Plus,
  Sparkles,
} from 'lucide-react';

interface StudyGroup {
  id: string;
  name: string;
  membersCount: number;
  isPrivate: boolean;
  lastActive: string;
  category: string;
  color: string;
  unreadMessages?: number;
}

// Mock data - would come from API
const STUDY_GROUPS: StudyGroup[] = [
  {
    id: '1',
    name: 'Grade 12 Science',
    membersCount: 45,
    isPrivate: false,
    lastActive: '2m ago',
    category: 'Science',
    color: 'from-teal-400 to-cyan-400',
    unreadMessages: 3,
  },
  {
    id: '2',
    name: 'Math Olympiad Team',
    membersCount: 12,
    isPrivate: true,
    lastActive: '15m ago',
    category: 'Mathematics',
    color: 'from-violet-400 to-purple-400',
  },
  {
    id: '3',
    name: 'English Literature',
    membersCount: 28,
    isPrivate: false,
    lastActive: '1h ago',
    category: 'Languages',
    color: 'from-[#F9A825] to-[#FFB74D]',
    unreadMessages: 1,
  },
];

export default function StudyGroupsWidget() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center justify-between border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 text-sm">Study Groups</h3>
        <button className="text-xs text-[#F9A825] hover:underline">+ New</button>
      </div>

      {/* Groups List */}
      <div className="divide-y divide-gray-50">
        {STUDY_GROUPS.map((group) => (
          <div
            key={group.id}
            className="px-3 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            {/* Group Icon */}
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${group.color}`}>
              <span className="text-white font-semibold text-sm">{group.name.charAt(0)}</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 text-xs truncate">{group.name}</h4>
              <p className="text-[11px] text-gray-400">{group.membersCount} members</p>
            </div>

            {/* Unread Badge */}
            {group.unreadMessages && (
              <div className="w-4 h-4 rounded-full bg-[#F9A825] flex items-center justify-center text-white text-[10px] font-bold">
                {group.unreadMessages}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-gray-100">
        <button className="text-xs text-gray-500 hover:text-[#F9A825] transition-colors">
          See all groups →
        </button>
      </div>
    </div>
  );
}
