'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  Plus,
  Search,
  Filter,
  MapPin,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
  CheckCircle2,
  HelpCircle,
  XCircle,
  BookOpen,
  Trophy,
  Sparkles,
  Wrench,
  MessageCircle,
  Sun,
  Award,
  Video,
  Globe,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';

// Event type icons and colors
const EVENT_TYPE_CONFIG: Record<string, { icon: any; color: string; bgColor: string }> = {
  GENERAL: { icon: Calendar, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  ACADEMIC: { icon: BookOpen, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  SPORTS: { icon: Trophy, color: 'text-green-600', bgColor: 'bg-green-100' },
  CULTURAL: { icon: Sparkles, color: 'text-pink-600', bgColor: 'bg-pink-100' },
  CLUB: { icon: Users, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  WORKSHOP: { icon: Wrench, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  MEETING: { icon: MessageCircle, color: 'text-teal-600', bgColor: 'bg-teal-100' },
  HOLIDAY: { icon: Sun, color: 'text-red-600', bgColor: 'bg-red-100' },
  DEADLINE: { icon: Clock, color: 'text-red-700', bgColor: 'bg-red-100' },
  COMPETITION: { icon: Award, color: 'text-violet-600', bgColor: 'bg-violet-100' },
};

const RSVP_CONFIG = {
  GOING: { icon: CheckCircle2, label: 'Going', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200' },
  MAYBE: { icon: HelpCircle, label: 'Maybe', color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200' },
  NOT_GOING: { icon: XCircle, label: "Can't Go", color: 'text-gray-500', bgColor: 'bg-gray-50 border-gray-200' },
};

interface Event {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  allDay: boolean;
  location: string | null;
  virtualLink: string | null;
  coverImage: string | null;
  eventType: string;
  privacy: string;
  maxAttendees: number | null;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl: string | null;
  };
  attendees: {
    user: {
      id: string;
      firstName: string;
      lastName: string;
      profilePictureUrl: string | null;
    };
  }[];
  _count: {
    attendees: number;
  };
  userRSVPStatus: string | null;
}

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [activeTab, setActiveTab] = useState<'upcoming' | 'my-events' | 'discover'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarEvents, setCalendarEvents] = useState<Record<string, Event[]>>({});

  const fetchEvents = useCallback(async () => {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) return;

      const params = new URLSearchParams();
      if (activeTab === 'my-events') params.append('myEvents', 'true');
      if (searchQuery) params.append('search', searchQuery);
      if (selectedType) params.append('eventType', selectedType);
      params.append('startAfter', new Date().toISOString());

      const response = await fetch(`http://localhost:3010/calendar?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, selectedType]);

  const fetchUpcomingEvents = useCallback(async () => {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) return;

      const response = await fetch('http://localhost:3010/calendar/upcoming?limit=5', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUpcomingEvents(data);
      }
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
    }
  }, []);

  const fetchCalendarEvents = useCallback(async () => {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) return;

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const response = await fetch(`http://localhost:3010/calendar/month/${year}/${month}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCalendarEvents(data.eventsByDate);
      }
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchEvents();
    fetchUpcomingEvents();
  }, [fetchEvents, fetchUpcomingEvents]);

  useEffect(() => {
    if (viewMode === 'calendar') {
      fetchCalendarEvents();
    }
  }, [viewMode, fetchCalendarEvents]);

  const handleRSVP = async (eventId: string, status: string) => {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) return;

      const response = await fetch(`http://localhost:3010/calendar/${eventId}/rsvp`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        // Update local state
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId ? { ...e, userRSVPStatus: status } : e
          )
        );
        setUpcomingEvents((prev) =>
          prev.map((e) =>
            e.id === eventId ? { ...e, userRSVPStatus: status } : e
          )
        );
      }
    } catch (error) {
      console.error('Error RSVPing:', error);
    }
  };

  const formatEventDate = (startDate: string, endDate: string | null, allDay: boolean) => {
    const start = new Date(startDate);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    };

    if (allDay) {
      return start.toLocaleDateString('en-US', options);
    }

    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };

    return `${start.toLocaleDateString('en-US', options)} at ${start.toLocaleTimeString('en-US', timeOptions)}`;
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const days = [];

    // Header
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    // Add padding days
    for (let i = 0; i < startPadding; i++) {
      days.push(<div key={`pad-${i}`} className="h-24 bg-gray-50" />);
    }

    // Add actual days
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = calendarEvents[dateKey] || [];
      const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

      days.push(
        <div
          key={day}
          className={`h-24 border border-gray-100 p-1 overflow-hidden ${
            isToday ? 'bg-amber-50 ring-2 ring-amber-400' : 'bg-white hover:bg-gray-50'
          }`}
        >
          <div className={`text-sm font-medium ${isToday ? 'text-amber-600' : 'text-gray-700'}`}>
            {day}
          </div>
          <div className="space-y-0.5 mt-1">
            {dayEvents.slice(0, 2).map((event) => {
              const config = EVENT_TYPE_CONFIG[event.eventType] || EVENT_TYPE_CONFIG.GENERAL;
              return (
                <Link
                  key={event.id}
                  href={`/en/events/${event.id}`}
                  className={`block text-xs px-1 py-0.5 rounded truncate ${config.bgColor} ${config.color} hover:opacity-80`}
                >
                  {event.title}
                </Link>
              );
            })}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-500 px-1">+{dayEvents.length - 2} more</div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-amber-50 to-orange-50">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-semibold text-gray-800">
            {monthNames[month]} {year}
          </h3>
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 bg-gray-50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="py-2 text-center text-sm font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">{days}</div>
      </div>
    );
  };

  const EventCard = ({ event }: { event: Event }) => {
    const config = EVENT_TYPE_CONFIG[event.eventType] || EVENT_TYPE_CONFIG.GENERAL;
    const Icon = config.icon;
    const rsvpConfig = event.userRSVPStatus ? RSVP_CONFIG[event.userRSVPStatus as keyof typeof RSVP_CONFIG] : null;

    return (
      <Link href={`/en/events/${event.id}`}>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200 group">
          {/* Cover Image or Gradient */}
          {event.coverImage ? (
            <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${event.coverImage})` }} />
          ) : (
            <div className={`h-24 bg-gradient-to-br ${config.bgColor} flex items-center justify-center`}>
              <Icon className={`w-12 h-12 ${config.color} opacity-50`} />
            </div>
          )}

          <div className="p-4">
            {/* Event Type Badge */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
                <Icon className="w-3 h-3" />
                {event.eventType.replace('_', ' ')}
              </span>
              {event.virtualLink && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                  <Video className="w-3 h-3" />
                  Online
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="font-semibold text-gray-900 group-hover:text-amber-600 transition-colors line-clamp-2">
              {event.title}
            </h3>

            {/* Date & Time */}
            <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-600">
              <Clock className="w-4 h-4 text-amber-500" />
              {formatEventDate(event.startDate, event.endDate, event.allDay)}
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-amber-500" />
                <span className="truncate">{event.location}</span>
              </div>
            )}

            {/* Attendees & RSVP */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                {/* Attendee avatars */}
                <div className="flex -space-x-2">
                  {event.attendees.slice(0, 3).map((attendee) => (
                    <div
                      key={attendee.user.id}
                      className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 border-2 border-white flex items-center justify-center"
                    >
                      {attendee.user.profilePictureUrl ? (
                        <img
                          src={attendee.user.profilePictureUrl}
                          alt=""
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] text-white font-medium">
                          {attendee.user.firstName[0]}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <span className="text-sm text-gray-500">
                  {event._count.attendees} {event._count.attendees === 1 ? 'attendee' : 'attendees'}
                </span>
              </div>

              {/* RSVP Status Badge */}
              {rsvpConfig && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${rsvpConfig.bgColor} ${rsvpConfig.color}`}>
                  <rsvpConfig.icon className="w-3 h-3" />
                  {rsvpConfig.label}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/40 via-white to-orange-50/30">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Events & Calendar</h1>
            <p className="text-gray-600">Discover and join school events, club meetups, and more</p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-amber-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-white text-amber-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
              </button>
            </div>

            {/* Create Event Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create Event
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Upcoming Events */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sticky top-20">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" />
                Upcoming Events
              </h2>
              <div className="space-y-3">
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No upcoming events</p>
                ) : (
                  upcomingEvents.map((event) => {
                    const config = EVENT_TYPE_CONFIG[event.eventType] || EVENT_TYPE_CONFIG.GENERAL;
                    const Icon = config.icon;
                    return (
                      <Link
                        key={event.id}
                        href={`/en/events/${event.id}`}
                        className="block p-3 rounded-xl bg-gray-50 hover:bg-amber-50 transition-colors group"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${config.bgColor}`}>
                            <Icon className={`w-4 h-4 ${config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-gray-900 truncate group-hover:text-amber-600">
                              {event.title}
                            </h4>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {new Date(event.startDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {viewMode === 'calendar' ? (
              renderCalendar()
            ) : (
              <>
                {/* Tabs & Search */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Tabs */}
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                      {[
                        { id: 'upcoming', label: 'Upcoming' },
                        { id: 'my-events', label: 'My Events' },
                        { id: 'discover', label: 'Discover' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            activeTab === tab.id
                              ? 'bg-white text-amber-600 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Search */}
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search events..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-amber-500 text-sm"
                      />
                    </div>

                    {/* Type Filter */}
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="px-3 py-2 bg-gray-50 rounded-xl border-0 text-sm focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">All Types</option>
                      {Object.keys(EVENT_TYPE_CONFIG).map((type) => (
                        <option key={type} value={type}>
                          {type.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Events Grid */}
                {loading ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
                        <div className="h-24 bg-gray-200" />
                        <div className="p-4 space-y-3">
                          <div className="h-4 bg-gray-200 rounded w-1/4" />
                          <div className="h-5 bg-gray-200 rounded w-3/4" />
                          <div className="h-4 bg-gray-200 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
                    <p className="text-gray-500 mb-4">
                      {activeTab === 'my-events'
                        ? "You haven't joined any events yet"
                        : 'Create an event or check back later'}
                    </p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600"
                    >
                      <Plus className="w-4 h-4" />
                      Create Event
                    </button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {events.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <CreateEventModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchEvents();
            fetchUpcomingEvents();
          }}
        />
      )}
    </div>
  );
}

// Create Event Modal Component
function CreateEventModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    allDay: false,
    location: '',
    virtualLink: '',
    eventType: 'GENERAL',
    privacy: 'PUBLIC',
    maxAttendees: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = TokenManager.getAccessToken();
      if (!token) return;

      // Combine date and time
      const startDateTime = formData.allDay
        ? new Date(formData.startDate).toISOString()
        : new Date(`${formData.startDate}T${formData.startTime}`).toISOString();
      
      let endDateTime = null;
      if (formData.endDate) {
        endDateTime = formData.allDay
          ? new Date(formData.endDate).toISOString()
          : new Date(`${formData.endDate}T${formData.endTime || '23:59'}`).toISOString();
      }

      const response = await fetch('http://localhost:3010/calendar', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          startDate: startDateTime,
          endDate: endDateTime,
          allDay: formData.allDay,
          location: formData.location || null,
          virtualLink: formData.virtualLink || null,
          eventType: formData.eventType,
          privacy: formData.privacy,
          maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : null,
        }),
      });

      if (response.ok) {
        onCreated();
      }
    } catch (error) {
      console.error('Error creating event:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Create Event</h2>
          <p className="text-sm text-gray-500 mt-1">Fill in the details for your new event</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="Give your event a name"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              placeholder="What's this event about?"
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
            <select
              value={formData.eventType}
              onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              {Object.keys(EVENT_TYPE_CONFIG).map((type) => (
                <option key={type} value={type}>
                  {type.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* All Day Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.allDay}
              onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
              className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
            />
            <span className="text-sm text-gray-700">All day event</span>
          </label>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            {!formData.allDay && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  required={!formData.allDay}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            {!formData.allDay && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Add a location"
              />
            </div>
          </div>

          {/* Virtual Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Virtual Meeting Link</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="url"
                value={formData.virtualLink}
                onChange={(e) => setFormData({ ...formData, virtualLink: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="https://zoom.us/..."
              />
            </div>
          </div>

          {/* Privacy */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Privacy</label>
            <select
              value={formData.privacy}
              onChange={(e) => setFormData({ ...formData, privacy: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="PUBLIC">Public - Anyone can see and RSVP</option>
              <option value="SCHOOL">School Only - Only school members</option>
              <option value="INVITE_ONLY">Invite Only - Only invited users</option>
            </select>
          </div>

          {/* Max Attendees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Attendees (optional)</label>
            <input
              type="number"
              value={formData.maxAttendees}
              onChange={(e) => setFormData({ ...formData, maxAttendees: e.target.value })}
              min="1"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="Leave empty for unlimited"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title || !formData.startDate}
              className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
