'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import {
  ArrowLeft,
  Calendar,
  Plus,
  Trash2,
  Edit,
  CalendarDays,
  PartyPopper,
  BookOpen,
  Users,
  GraduationCap,
  Trophy,
  AlertCircle,
  CheckCircle,
  X,
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  type: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  isSchoolDay: boolean;
  isPublic: boolean;
}

interface AcademicCalendar {
  id: string;
  name: string;
  events: CalendarEvent[];
  academicYear: {
    name: string;
    startDate: string;
    endDate: string;
  } | null;
}

const EVENT_TYPES = [
  { value: 'SCHOOL_DAY', label: 'School Day', icon: BookOpen, color: 'bg-green-500' },
  { value: 'HOLIDAY', label: 'Holiday', icon: PartyPopper, color: 'bg-red-500' },
  { value: 'VACATION', label: 'Vacation', icon: Calendar, color: 'bg-orange-500' },
  { value: 'EXAM_PERIOD', label: 'Exam Period', icon: BookOpen, color: 'bg-purple-500' },
  { value: 'REGISTRATION', label: 'Registration', icon: Users, color: 'bg-blue-500' },
  { value: 'ORIENTATION', label: 'Orientation', icon: GraduationCap, color: 'bg-cyan-500' },
  { value: 'PARENT_MEETING', label: 'Parent Meeting', icon: Users, color: 'bg-yellow-500' },
  { value: 'SPORTS_DAY', label: 'Sports Day', icon: Trophy, color: 'bg-emerald-500' },
  { value: 'CULTURAL_EVENT', label: 'Cultural Event', icon: PartyPopper, color: 'bg-pink-500' },
  { value: 'SPECIAL_EVENT', label: 'Special Event', icon: CalendarDays, color: 'bg-indigo-500' },
];

export default function AcademicCalendarPage({ params }: { params: { locale: string; id: string } }) {
  const router = useRouter();
  const { id } = useParams();
  const [calendar, setCalendar] = useState<AcademicCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // New event form
  const [newEvent, setNewEvent] = useState({
    type: 'SPECIAL_EVENT',
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    isSchoolDay: true,
    isPublic: true,
  });

  const userData = TokenManager.getUserData();
  const user = userData?.user;
  const school = userData?.school;

  const handleLogout = () => {
    TokenManager.clearTokens();
    router.push(`/${params.locale}/login`);
  };

  useEffect(() => {
    loadCalendar();
  }, [id]);

  const loadCalendar = async () => {
    try {
      setLoading(true);
      setError('');

      const token = TokenManager.getAccessToken();
      const userData = TokenManager.getUserData();
      const schoolId = userData?.user?.schoolId || userData?.school?.id;

      if (!token || !schoolId) {
        router.push(`/${params.locale}/login`);
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SCHOOL_SERVICE_URL || 'http://localhost:3002'}/schools/${schoolId}/academic-years/${id}/calendar`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load calendar');
      }

      setCalendar(result.data);
    } catch (err: any) {
      console.error('Error loading calendar:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.startDate) {
      setError('Title and start date are required');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const token = TokenManager.getAccessToken();
      const userData = TokenManager.getUserData();
      const schoolId = userData?.user?.schoolId || userData?.school?.id;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SCHOOL_SERVICE_URL || 'http://localhost:3002'}/schools/${schoolId}/academic-years/${id}/calendar/events`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...newEvent,
            endDate: newEvent.endDate || newEvent.startDate,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to add event');
      }

      // Reload calendar
      await loadCalendar();
      setShowAddModal(false);
      setNewEvent({
        type: 'SPECIAL_EVENT',
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        isSchoolDay: true,
        isPublic: true,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const token = TokenManager.getAccessToken();
      const userData = TokenManager.getUserData();
      const schoolId = userData?.user?.schoolId || userData?.school?.id;

      await fetch(
        `${process.env.NEXT_PUBLIC_SCHOOL_SERVICE_URL || 'http://localhost:3002'}/schools/${schoolId}/academic-years/${id}/calendar/events/${eventId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      await loadCalendar();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getEventTypeInfo = (type: string) => {
    return EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[9];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Group events by month
  const eventsByMonth: Record<string, CalendarEvent[]> = {};
  calendar?.events.forEach(event => {
    const monthKey = new Date(event.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    if (!eventsByMonth[monthKey]) {
      eventsByMonth[monthKey] = [];
    }
    eventsByMonth[monthKey].push(event);
  });

  if (loading) {
    return (
      <>
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <div className="lg:ml-64 min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-500 mb-4"></div>
            <p className="text-gray-600">Loading calendar...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="lg:ml-64 min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-teal-500 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push(`/${params.locale}/settings/academic-years/${id}`)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <CalendarDays className="w-7 h-7" />
                    Academic Calendar
                  </h1>
                  <p className="text-green-100 mt-1">
                    {calendar?.academicYear?.name || 'Manage holidays and events'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Event
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-700">{error}</p>
              <button onClick={() => setError('')} className="ml-auto">
                <X className="w-5 h-5 text-red-600" />
              </button>
            </div>
          )}

          {/* Event Type Legend */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Types</h2>
            <div className="flex flex-wrap gap-4">
              {EVENT_TYPES.map((type) => {
                const IconComponent = type.icon;
                return (
                  <div key={type.value} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${type.color}`}></div>
                    <span className="text-sm text-gray-700">{type.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Events by Month */}
          {Object.keys(eventsByMonth).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(eventsByMonth).map(([month, events]) => (
                <div key={month} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-3 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">{month}</h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {events.map((event) => {
                      const typeInfo = getEventTypeInfo(event.type);
                      const IconComponent = typeInfo.icon;

                      return (
                        <div key={event.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50">
                          <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                            <IconComponent className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{event.title}</h4>
                            <p className="text-sm text-gray-600">
                              {formatShortDate(event.startDate)}
                              {event.endDate && event.endDate !== event.startDate && (
                                <> - {formatShortDate(event.endDate)}</>
                              )}
                            </p>
                            {event.description && (
                              <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {!event.isSchoolDay && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                                No School
                              </span>
                            )}
                            {!event.isPublic && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                Private
                              </span>
                            )}
                            <button
                              onClick={() => handleDeleteEvent(event.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <CalendarDays className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Events Yet</h3>
              <p className="text-gray-600 mb-6">Add holidays, exam periods, and other important dates.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-full hover:shadow-lg transition-shadow font-medium"
              >
                Add First Event
              </button>
            </div>
          )}
        </div>

        {/* Add Event Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Add Calendar Event</h2>
                  <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Event Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Event Type</label>
                  <select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {EVENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="Event title"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Optional description"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                    <input
                      type="date"
                      value={newEvent.startDate}
                      onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={newEvent.endDate}
                      onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                {/* Options */}
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newEvent.isSchoolDay}
                      onChange={(e) => setNewEvent({ ...newEvent, isSchoolDay: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">School Day</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newEvent.isPublic}
                      onChange={(e) => setNewEvent({ ...newEvent, isPublic: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">Visible to Parents</span>
                  </label>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEvent}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add Event'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
