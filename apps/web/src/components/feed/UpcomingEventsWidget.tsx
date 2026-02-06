'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Video,
  Plus,
  Users,
  CheckCircle2,
  HelpCircle,
  XCircle,
  Loader2,
  BookOpen,
  Trophy,
  Sparkles,
  Wrench,
  MessageCircle,
  Sun,
  Award,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';

interface Event {
  id: string;
  title: string;
  startDate: string;
  endDate: string | null;
  allDay: boolean;
  location: string | null;
  isVirtual: boolean;
  eventType: string;
  userRSVPStatus: string | null;
  _count?: {
    rsvps: number;
  };
}

const EVENT_TYPE_CONFIG: Record<string, { color: string; icon: any }> = {
  GENERAL: { color: 'from-gray-400 to-gray-500', icon: Calendar },
  ACADEMIC: { color: 'from-blue-400 to-indigo-500', icon: BookOpen },
  SPORTS: { color: 'from-green-400 to-emerald-500', icon: Trophy },
  CULTURAL: { color: 'from-pink-400 to-rose-500', icon: Sparkles },
  CLUB: { color: 'from-purple-400 to-violet-500', icon: Users },
  WORKSHOP: { color: 'from-amber-400 to-orange-500', icon: Wrench },
  MEETING: { color: 'from-teal-400 to-cyan-500', icon: MessageCircle },
  HOLIDAY: { color: 'from-red-400 to-rose-500', icon: Sun },
  COMPETITION: { color: 'from-violet-400 to-purple-500', icon: Award },
};

export default function UpcomingEventsWidget() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) return;

      const response = await fetch('http://localhost:3010/calendar/upcoming?limit=4', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data.slice(0, 4));
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async (eventId: string, status: string) => {
    try {
      const token = TokenManager.getAccessToken();
      await fetch(`http://localhost:3010/calendar/${eventId}/rsvp`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      fetchEvents();
    } catch (error) {
      console.error('Error RSVPing:', error);
    }
  };

  const formatEventDate = (startDate: string, allDay: boolean) => {
    const date = new Date(startDate);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isToday) return { day: 'Today', time: allDay ? 'All Day' : date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) };
    if (isTomorrow) return { day: 'Tomorrow', time: allDay ? 'All Day' : date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) };
    
    return { 
      day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      time: allDay ? 'All Day' : date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    };
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-rose-50/50 to-orange-50/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-orange-500 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold text-gray-900">Upcoming Events</h3>
        </div>
        <Link 
          href="/en/events"
          className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </Link>
      </div>

      {/* Events List */}
      <div className="divide-y divide-gray-50">
        {loading ? (
          <div className="px-4 py-6 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-rose-500 animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-100 to-orange-100 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-rose-500" />
            </div>
            <p className="text-sm text-gray-500 mb-3">No upcoming events</p>
            <Link
              href="/en/events"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-lg text-xs font-medium hover:from-rose-600 hover:to-orange-600 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Browse Events
            </Link>
          </div>
        ) : (
          events.map((event) => {
            const config = EVENT_TYPE_CONFIG[event.eventType] || EVENT_TYPE_CONFIG.GENERAL;
            const Icon = config.icon;
            const dateInfo = formatEventDate(event.startDate, event.allDay);
            
            return (
              <Link
                key={event.id}
                href={`/en/events/${event.id}`}
                className="px-4 py-3 flex items-start gap-3 hover:bg-rose-50/50 transition-colors"
              >
                {/* Date Badge */}
                <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center flex-shrink-0 bg-gradient-to-br ${config.color} text-white`}>
                  <Icon className="w-4 h-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 text-sm truncate">{event.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {dateInfo.day} • {dateInfo.time}
                    </span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                      {event.isVirtual ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                      <span className="truncate">{event.isVirtual ? 'Virtual' : event.location}</span>
                    </div>
                  )}
                </div>

                {/* RSVP Status */}
                {event.userRSVPStatus && (
                  <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    event.userRSVPStatus === 'GOING' ? 'bg-green-100 text-green-700' :
                    event.userRSVPStatus === 'MAYBE' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {event.userRSVPStatus === 'GOING' ? '✓' : event.userRSVPStatus === 'MAYBE' ? '?' : '✗'}
                  </div>
                )}
              </Link>
            );
          })
        )}
      </div>

      {/* Footer */}
      {events.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
          <Link 
            href="/en/events"
            className="text-xs text-gray-600 hover:text-rose-600 transition-colors font-medium flex items-center justify-center gap-1"
          >
            View calendar
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
