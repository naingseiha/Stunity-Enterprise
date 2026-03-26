'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
import { FEED_SERVICE_URL } from '@/lib/api/config';

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
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const tFeed = useTranslations('feed');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) fetchEvents();
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const fetchEvents = async () => {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) return;

      const response = await fetch(`${FEED_SERVICE_URL}/calendar/upcoming?limit=4`, {
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
      await fetch(`${FEED_SERVICE_URL}/calendar/${eventId}/rsvp`, {
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

    if (isToday) return { day: tFeed('widgets.upcomingEvents.today'), time: allDay ? tFeed('widgets.upcomingEvents.allDay') : date.toLocaleTimeString(locale === 'km' ? 'km-KH' : 'en-US', { hour: 'numeric', minute: '2-digit' }) };
    if (isTomorrow) return { day: tFeed('widgets.upcomingEvents.tomorrow'), time: allDay ? tFeed('widgets.upcomingEvents.allDay') : date.toLocaleTimeString(locale === 'km' ? 'km-KH' : 'en-US', { hour: 'numeric', minute: '2-digit' }) };
    
    return { 
      day: date.toLocaleDateString(locale === 'km' ? 'km-KH' : 'en-US', { month: 'short', day: 'numeric' }),
      time: allDay ? tFeed('widgets.upcomingEvents.allDay') : date.toLocaleTimeString(locale === 'km' ? 'km-KH' : 'en-US', { hour: 'numeric', minute: '2-digit' })
    };
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-rose-50/50 to-orange-50/50 dark:from-rose-900/10 dark:to-orange-900/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-orange-500 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{tFeed('widgets.upcomingEvents.title')}</h3>
        </div>
        <Link 
          href={`/${locale}/events`}
          className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-medium flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          {tFeed('widgets.upcomingEvents.add')}
        </Link>
      </div>

      {/* Events List */}
      <div className="divide-y divide-gray-50 dark:divide-gray-800">
        {loading ? (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
                  <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-100 dark:from-rose-900/30 to-orange-100 dark:to-orange-900/30 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-rose-500" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{tFeed('widgets.upcomingEvents.noEvents')}</p>
            <Link
              href={`/${locale}/events`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-lg text-xs font-medium hover:from-rose-600 hover:to-orange-600 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              {tFeed('widgets.upcomingEvents.browse')}
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
                href={`/${locale}/events/${event.id}`}
                className="px-4 py-3 flex items-start gap-3 hover:bg-rose-50/50 dark:hover:bg-rose-900/10 transition-colors"
              >
                {/* Date Badge */}
                <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center flex-shrink-0 bg-gradient-to-br ${config.color} text-white`}>
                  <Icon className="w-4 h-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{event.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {dateInfo.day} • {dateInfo.time}
                    </span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {event.isVirtual ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                      <span className="truncate">{event.isVirtual ? tFeed('widgets.upcomingEvents.virtual') : event.location}</span>
                    </div>
                  )}
                </div>

                {/* RSVP Status */}
                {event.userRSVPStatus && (
                  <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    event.userRSVPStatus === 'GOING' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                    event.userRSVPStatus === 'MAYBE' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                    'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
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
        <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
          <Link 
            href={`/${locale}/events`}
            className="text-xs text-gray-600 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors font-medium flex items-center justify-center gap-1"
          >
            {tFeed('widgets.upcomingEvents.viewCalendar')}
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
