'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  Plus,
  Search,
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
  Loader2,
  Compass,
  X,
  TrendingUp,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import FeedZoomLoader from '@/components/feed/FeedZoomLoader';
import UnifiedNavigation from '@/components/UnifiedNavigation';

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
  GOING: { icon: CheckCircle2, label: 'Going', color: 'text-green-600', bgColor: 'bg-green-50' },
  MAYBE: { icon: HelpCircle, label: 'Maybe', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  NOT_GOING: { icon: XCircle, label: "Can't Go", color: 'text-gray-500', bgColor: 'bg-gray-50' },
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
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  
  const [events, setEvents] = useState<Event[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [activeTab, setActiveTab] = useState<'upcoming' | 'my-events' | 'discover'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarEvents, setCalendarEvents] = useState<Record<string, Event[]>>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      const schoolStr = localStorage.getItem('school');
      if (userStr) setCurrentUser(JSON.parse(userStr));
      if (schoolStr) setSchool(JSON.parse(schoolStr));
    }
  }, []);

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/login`);
  };

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

  const formatEventDate = (startDate: string, allDay: boolean) => {
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

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    for (let i = 0; i < startPadding; i++) {
      days.push(<div key={`pad-${i}`} className="h-20 bg-gray-50" />);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = calendarEvents[dateKey] || [];
      const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

      days.push(
        <div
          key={day}
          className={`h-20 border border-gray-100 p-1 overflow-hidden ${
            isToday ? 'bg-amber-50 ring-1 ring-amber-400' : 'bg-white hover:bg-gray-50'
          }`}
        >
          <div className={`text-xs font-medium ${isToday ? 'text-amber-600' : 'text-gray-700'}`}>
            {day}
          </div>
          <div className="space-y-0.5 mt-0.5">
            {dayEvents.slice(0, 2).map((event) => {
              const config = EVENT_TYPE_CONFIG[event.eventType] || EVENT_TYPE_CONFIG.GENERAL;
              return (
                <Link
                  key={event.id}
                  href={`/${locale}/events/${event.id}`}
                  className={`block text-[10px] px-1 py-0.5 rounded truncate ${config.bgColor} ${config.color} hover:opacity-80`}
                >
                  {event.title}
                </Link>
              );
            })}
            {dayEvents.length > 2 && (
              <div className="text-[10px] text-gray-500 px-1">+{dayEvents.length - 2} more</div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-gray-100">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-sm font-semibold text-gray-900">
            {monthNames[month]} {year}
          </h3>
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 bg-gray-50">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className="py-1.5 text-center text-xs font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">{days}</div>
      </div>
    );
  };

  // Clean event card design
  const EventCard = ({ event }: { event: Event }) => {
    const config = EVENT_TYPE_CONFIG[event.eventType] || EVENT_TYPE_CONFIG.GENERAL;
    const Icon = config.icon;
    const rsvpConfig = event.userRSVPStatus ? RSVP_CONFIG[event.userRSVPStatus as keyof typeof RSVP_CONFIG] : null;

    return (
      <Link 
        href={`/${locale}/events/${event.id}`}
        className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-amber-200 transition-all group"
      >
        <div className="flex items-start gap-4">
          {/* Event Icon */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bgColor}`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          
          {/* Event Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 truncate group-hover:text-amber-600 transition-colors">
                {event.title}
              </h3>
              {event.virtualLink && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 flex-shrink-0">
                  <Video className="w-3 h-3" />
                  Online
                </span>
              )}
            </div>
            
            {/* Date & Location */}
            <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                {formatEventDate(event.startDate, event.allDay)}
              </span>
              {event.location && (
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <span className="truncate">{event.location}</span>
                </span>
              )}
            </div>
            
            {/* Meta info */}
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
                {event.eventType.replace('_', ' ')}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {event._count.attendees}
              </span>
              {rsvpConfig && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${rsvpConfig.bgColor} ${rsvpConfig.color}`}>
                  <rsvpConfig.icon className="w-3 h-3" />
                  {rsvpConfig.label}
                </span>
              )}
            </div>
          </div>
          
          {/* Arrow */}
          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
        </div>
      </Link>
    );
  };

  return (
    <>
      <FeedZoomLoader 
        isLoading={loading} 
        onAnimationComplete={() => setShowContent(true)}
        minimumDuration={600}
      />
      
      {showContent && (
        <div className="min-h-screen bg-gray-50">
          <UnifiedNavigation user={currentUser} school={school} onLogout={handleLogout} />
          
          {/* LinkedIn-style 3-column layout */}
          <div className="max-w-6xl mx-auto px-4 py-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Left Sidebar */}
              <aside className="hidden lg:block lg:col-span-3">
                <div className="sticky top-20 space-y-3">
                  {/* Overview Card */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="h-16 bg-gradient-to-r from-amber-500 to-rose-500 relative">
                      <Calendar className="absolute bottom-2 right-3 w-6 h-6 text-white/30" />
                    </div>
                    <div className="p-4">
                      <h2 className="font-bold text-gray-900">Events</h2>
                      <p className="text-xs text-gray-500 mt-0.5">Discover and join events</p>
                      
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <div className="bg-amber-50 rounded-lg p-2.5 text-center">
                          <p className="text-lg font-bold text-gray-900">{upcomingEvents.length}</p>
                          <p className="text-[10px] text-gray-500">Upcoming</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                          <p className="text-lg font-bold text-gray-900">{events.length}</p>
                          <p className="text-[10px] text-gray-500">All Events</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Create Event
                    </button>
                  </div>
                  
                  {/* Event Types Filter */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <h3 className="font-semibold text-sm text-gray-900">Event Types</h3>
                    </div>
                    <nav className="py-1">
                      <button
                        onClick={() => setSelectedType('')}
                        className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                          !selectedType ? 'bg-amber-50 text-amber-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Sparkles className="w-4 h-4" />
                        All Types
                      </button>
                      {Object.entries(EVENT_TYPE_CONFIG).slice(0, 6).map(([type, config]) => {
                        const Icon = config.icon;
                        return (
                          <button
                            key={type}
                            onClick={() => setSelectedType(type)}
                            className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                              selectedType === type ? 'bg-amber-50 text-amber-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {type.replace('_', ' ')}
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                </div>
              </aside>
              
              {/* Main Content */}
              <main className="lg:col-span-6">
                {/* View Toggle & Tabs */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4">
                  <div className="flex items-center justify-between border-b border-gray-100 px-3">
                    {/* Tabs */}
                    <div className="flex">
                      {[
                        { id: 'upcoming', label: 'Upcoming', icon: Calendar },
                        { id: 'my-events', label: 'My Events', icon: Users },
                        { id: 'discover', label: 'Discover', icon: Compass },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium transition-colors ${
                            activeTab === tab.id
                              ? 'text-amber-600 border-b-2 border-amber-500'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <tab.icon className="w-4 h-4" />
                          <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                      ))}
                    </div>
                    
                    {/* View Toggle */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded-md transition-colors ${
                          viewMode === 'list'
                            ? 'bg-white text-amber-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <List className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('calendar')}
                        className={`p-1.5 rounded-md transition-colors ${
                          viewMode === 'calendar'
                            ? 'bg-white text-amber-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <CalendarDays className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Search */}
                  <div className="p-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search events..."
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Content */}
                {viewMode === 'calendar' ? (
                  renderCalendar()
                ) : (
                  <div className="space-y-3">
                    {events.length === 0 ? (
                      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                        <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                          <Calendar className="w-7 h-7 text-amber-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1">No events found</h3>
                        <p className="text-sm text-gray-500 mb-4">
                          {activeTab === 'my-events'
                            ? "You haven't joined any events yet"
                            : 'Create an event or check back later'}
                        </p>
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600"
                        >
                          Create Event
                        </button>
                      </div>
                    ) : (
                      events.map((event) => <EventCard key={event.id} event={event} />)
                    )}
                  </div>
                )}
              </main>
              
              {/* Right Sidebar */}
              <aside className="hidden lg:block lg:col-span-3">
                <div className="sticky top-20 space-y-3">
                  {/* Upcoming Events Widget */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-500" />
                      <h3 className="font-semibold text-sm text-gray-900">Coming Soon</h3>
                    </div>
                    <div className="p-3 space-y-2">
                      {upcomingEvents.slice(0, 4).map((event) => {
                        const config = EVENT_TYPE_CONFIG[event.eventType] || EVENT_TYPE_CONFIG.GENERAL;
                        const Icon = config.icon;
                        return (
                          <Link
                            key={event.id}
                            href={`/${locale}/events/${event.id}`}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bgColor}`}>
                              <Icon className={`w-4 h-4 ${config.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(event.startDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                      {upcomingEvents.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-2">No upcoming events</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Footer Links */}
                  <div className="px-4 py-3">
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
                      <Link href="#" className="hover:text-gray-600">About</Link>
                      <Link href="#" className="hover:text-gray-600">Help</Link>
                      <Link href="#" className="hover:text-gray-600">Privacy</Link>
                      <Link href="#" className="hover:text-gray-600">Terms</Link>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">© 2026 Stunity</p>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}

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
    </>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl w-full max-w-md shadow-xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Create Event</h2>
              <p className="text-xs text-gray-500">Schedule a new event</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Event Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="Give your event a name"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder="What's this event about?"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                <select
                  value={formData.eventType}
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  {Object.keys(EVENT_TYPE_CONFIG).map((type) => (
                    <option key={type} value={type}>{type.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Privacy</label>
                <select
                  value={formData.privacy}
                  onChange={(e) => setFormData({ ...formData, privacy: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  <option value="PUBLIC">Public</option>
                  <option value="SCHOOL">School Only</option>
                  <option value="INVITE_ONLY">Invite Only</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.allDay}
                onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
                className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
              />
              <span className="text-sm text-gray-700">All day event</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date *</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
              {!formData.allDay && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Time *</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required={!formData.allDay}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Add a location"
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Virtual Link</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="url"
                  value={formData.virtualLink}
                  onChange={(e) => setFormData({ ...formData, virtualLink: e.target.value })}
                  placeholder="https://zoom.us/..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 text-sm font-medium hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title || !formData.startDate}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
