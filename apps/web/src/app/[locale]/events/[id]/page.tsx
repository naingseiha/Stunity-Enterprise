'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  ArrowLeft,
  MapPin,
  Clock,
  Users,
  Edit2,
  Trash2,
  Share2,
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
  ExternalLink,
  User,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import { FEED_SERVICE_URL } from '@/lib/api/config';

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

interface Attendee {
  id: string;
  status: string;
  respondedAt: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl: string | null;
  };
}

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
  creatorId: string;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl: string | null;
    headline: string | null;
  };
  attendees: Attendee[];
  _count: {
    attendees: number;
  };
  userRSVPStatus: string | null;
  isCreator: boolean;
  attendeesByStatus: {
    going: Attendee[];
    maybe: Attendee[];
    notGoing: Attendee[];
  };
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'going' | 'maybe' | 'notGoing'>('going');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchEvent = useCallback(async () => {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) return;

      const response = await fetch(`${FEED_SERVICE_URL}/calendar/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setEvent(data);
      } else if (response.status === 404) {
        router.push('/en/events');
      }
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId, router]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const handleRSVP = async (status: string) => {
    if (!event) return;
    setRsvpLoading(status);

    try {
      const token = TokenManager.getAccessToken();
      if (!token) return;

      const response = await fetch(`${FEED_SERVICE_URL}/calendar/${eventId}/rsvp`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        fetchEvent(); // Refresh event data
      }
    } catch (error) {
      console.error('Error RSVPing:', error);
    } finally {
      setRsvpLoading(null);
    }
  };

  const handleDelete = async () => {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) return;

      const response = await fetch(`${FEED_SERVICE_URL}/calendar/${eventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        router.push('/en/events');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const formatEventDate = (startDate: string, endDate: string | null, allDay: boolean) => {
    const start = new Date(startDate);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };

    if (allDay) {
      if (endDate) {
        const end = new Date(endDate);
        if (start.toDateString() === end.toDateString()) {
          return start.toLocaleDateString('en-US', options);
        }
        return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
      }
      return start.toLocaleDateString('en-US', options);
    }

    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };

    if (endDate) {
      const end = new Date(endDate);
      return `${start.toLocaleDateString('en-US', options)} · ${start.toLocaleTimeString('en-US', timeOptions)} - ${end.toLocaleTimeString('en-US', timeOptions)}`;
    }

    return `${start.toLocaleDateString('en-US', options)} at ${start.toLocaleTimeString('en-US', timeOptions)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl mb-6" />
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
              <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  const config = EVENT_TYPE_CONFIG[event.eventType] || EVENT_TYPE_CONFIG.GENERAL;
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back Button */}
        <Link
          href="/en/events"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Events
        </Link>

        {/* Cover Image */}
        <div className="relative rounded-2xl overflow-hidden mb-6">
          {event.coverImage ? (
            <div
              className="h-64 md:h-80 bg-cover bg-center"
              style={{ backgroundImage: `url(${event.coverImage})` }}
            />
          ) : (
            <div className={`h-48 md:h-64 bg-gradient-to-br ${config.bgColor} dark:bg-opacity-20 flex items-center justify-center`}>
              <Icon className={`w-24 h-24 ${config.color} opacity-30 dark:opacity-40`} />
            </div>
          )}

          {/* Event Type Badge */}
          <div className="absolute top-4 left-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-sm ${config.color}`}>
              <Icon className="w-4 h-4" />
              {event.eventType.replace('_', ' ')}
            </span>
          </div>

          {/* Privacy Badge */}
          <div className="absolute top-4 right-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-sm text-gray-700 dark:text-gray-200">
              <Globe className="w-4 h-4" />
              {event.privacy.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title & Host */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">{event.title}</h1>

              {/* Host */}
              <div className="flex items-center gap-3">
                <Link href={`/en/profile/${event.creator.id}`} className="flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center">
                    {event.creator.profilePictureUrl ? (
                      <img
                        src={event.creator.profilePictureUrl}
                        alt=""
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-medium">
                        {event.creator.firstName[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {event.creator.firstName} {event.creator.lastName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {event.creator.headline || 'Event Organizer'}
                    </p>
                  </div>
                </Link>
              </div>

              {/* Description */}
              {event.description && (
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                  <h2 className="font-semibold text-gray-900 dark:text-white mb-3">About this event</h2>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{event.description}</p>
                </div>
              )}
            </div>

            {/* Attendees */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                Attendees ({event._count.attendees})
              </h2>

              {/* Status Tabs */}
              <div className="flex gap-2 mb-4">
                {[
                  { id: 'going', label: 'Going', count: event.attendeesByStatus.going.length, color: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
                  { id: 'maybe', label: 'Maybe', count: event.attendeesByStatus.maybe.length, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' },
                  { id: 'notGoing', label: "Can't Go", count: event.attendeesByStatus.notGoing.length, color: 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      activeTab === tab.id
                        ? tab.color
                        : 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              {/* Attendee List */}
              <div className="space-y-2">
                {event.attendeesByStatus[activeTab].length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No attendees with this status</p>
                ) : (
                  event.attendeesByStatus[activeTab].map((attendee) => (
                    <Link
                      key={attendee.id}
                      href={`/en/profile/${attendee.user.id}`}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center">
                        {attendee.user.profilePictureUrl ? (
                          <img
                            src={attendee.user.profilePictureUrl}
                            alt=""
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-medium text-sm">
                            {attendee.user.firstName[0]}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {attendee.user.firstName} {attendee.user.lastName}
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* RSVP Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sticky top-20">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Your Response</h3>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { status: 'GOING', icon: CheckCircle2, label: 'Going', color: 'text-green-600 dark:text-green-400', bgActive: 'bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-500 ring-2 ring-green-200 dark:ring-green-900/30' },
                  { status: 'MAYBE', icon: HelpCircle, label: 'Maybe', color: 'text-amber-600 dark:text-amber-400', bgActive: 'bg-amber-50 dark:bg-amber-900/20 border-amber-400 dark:border-amber-500 ring-2 ring-amber-200 dark:ring-amber-900/30' },
                  { status: 'NOT_GOING', icon: XCircle, label: "Can't Go", color: 'text-gray-500 dark:text-gray-400', bgActive: 'bg-gray-100 dark:bg-gray-700 border-gray-400 dark:border-gray-500 ring-2 ring-gray-200 dark:ring-gray-900/30' },
                ].map((option) => (
                  <button
                    key={option.status}
                    onClick={() => handleRSVP(option.status)}
                    disabled={rsvpLoading !== null}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                      event.userRSVPStatus === option.status
                        ? option.bgActive
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <option.icon className={`w-6 h-6 mx-auto mb-1 ${option.color}`} />
                    <span className={`text-xs font-medium ${option.color}`}>
                      {rsvpLoading === option.status ? '...' : option.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Event Details */}
              <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                {/* Date & Time */}
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {formatEventDate(event.startDate, event.endDate, event.allDay)}
                    </p>
                    {event.allDay && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">All day</p>
                    )}
                  </div>
                </div>

                {/* Location */}
                {event.location && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <MapPin className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{event.location}</p>
                    </div>
                  </div>
                )}

                {/* Virtual Link */}
                {event.virtualLink && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Video className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white text-sm mb-1">Online Event</p>
                      <a
                        href={event.virtualLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        Join Meeting
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Attendees Count */}
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {event.attendeesByStatus.going.length} going
                    </p>
                    {event.maxAttendees && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {event.maxAttendees - event.attendeesByStatus.going.length} spots left
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Creator Actions */}
              {event.isCreator && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
                  <Link
                    href={`/en/events/${event.id}/edit`}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Event
                  </Link>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Event
                  </button>
                </div>
              )}

              {/* Share Button */}
              <button className="flex items-center justify-center gap-2 w-full mt-4 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Share2 className="w-4 h-4" />
                Share Event
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-white/10 w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Event</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete "{event.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
