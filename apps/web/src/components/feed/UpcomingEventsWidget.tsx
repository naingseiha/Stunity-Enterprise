'use client';

import { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Video,
  ChevronRight,
  Plus,
  Users,
  Bell,
} from 'lucide-react';

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location?: string;
  isVirtual: boolean;
  attendees: number;
  type: 'class' | 'exam' | 'meeting' | 'event';
  isToday?: boolean;
  isReminded?: boolean;
}

// Mock data
const UPCOMING_EVENTS: Event[] = [
  {
    id: '1',
    title: 'Physics Mid-term Exam',
    date: 'Today',
    time: '09:00 AM',
    location: 'Room 204',
    isVirtual: false,
    attendees: 32,
    type: 'exam',
    isToday: true,
  },
  {
    id: '2',
    title: 'Parent-Teacher Meeting',
    date: 'Tomorrow',
    time: '02:00 PM',
    isVirtual: true,
    attendees: 156,
    type: 'meeting',
    isReminded: true,
  },
  {
    id: '3',
    title: 'Science Fair Project Due',
    date: 'Feb 8',
    time: '11:59 PM',
    location: 'Submission Portal',
    isVirtual: true,
    attendees: 89,
    type: 'event',
  },
];

const TYPE_STYLES = {
  class: { bg: 'from-teal-400 to-cyan-500', text: 'teal' },
  exam: { bg: 'from-rose-400 to-pink-500', text: 'rose' },
  meeting: { bg: 'from-violet-400 to-purple-500', text: 'violet' },
  event: { bg: 'from-[#F9A825] to-[#FFB74D]', text: 'emerald' },
};

export default function UpcomingEventsWidget() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center justify-between border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 text-sm">Upcoming Events</h3>
        <button className="text-xs text-[#F9A825] hover:underline">+ Add</button>
      </div>

      {/* Events List */}
      <div className="divide-y divide-gray-50">
        {UPCOMING_EVENTS.map((event) => {
          const styles = TYPE_STYLES[event.type];
          
          return (
            <div
              key={event.id}
              className="px-3 py-2 flex items-start gap-2 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              {/* Date Badge */}
              <div className={`w-10 h-10 rounded-full flex flex-col items-center justify-center flex-shrink-0 bg-gradient-to-br ${styles.bg} text-white`}>
                <span className="text-[8px] font-medium leading-none">{event.date === 'Today' ? 'TODAY' : event.date.split(' ')[0]?.toUpperCase()}</span>
                <span className="text-xs font-bold leading-tight">{event.date.split(' ')[1] || '•'}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 text-xs truncate">{event.title}</h4>
                <p className="text-[11px] text-gray-400">{event.time} • {event.isVirtual ? 'Virtual' : event.location}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-gray-100">
        <button className="text-xs text-gray-500 hover:text-[#F9A825] transition-colors">
          View calendar →
        </button>
      </div>
    </div>
  );
}
