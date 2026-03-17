import { feedApi } from './client';

export type RSVPStatus = 'GOING' | 'MAYBE' | 'NOT_GOING';

export interface CalendarUserSummary {
  id: string;
  firstName: string;
  lastName: string;
  profilePictureUrl?: string | null;
  headline?: string | null;
}

export interface CalendarAttendee {
  id: string;
  status: RSVPStatus;
  respondedAt?: string | null;
  user: CalendarUserSummary;
}

export interface CalendarEvent {
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
  creator: CalendarUserSummary;
  attendees: CalendarAttendee[];
  _count: {
    attendees: number;
  };
  userRSVPStatus?: RSVPStatus | null;
  isCreator?: boolean;
  attendeesByStatus?: {
    going: CalendarAttendee[];
    maybe: CalendarAttendee[];
    notGoing: CalendarAttendee[];
  };
}

interface ListCalendarEventsResponse {
  events: CalendarEvent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ListCalendarEventsParams {
  page?: number;
  limit?: number;
  eventType?: string;
  search?: string;
  myEvents?: boolean;
  startAfter?: string;
}

export const listCalendarEvents = async (params: ListCalendarEventsParams = {}) => {
  const { data } = await feedApi.get<ListCalendarEventsResponse>('/calendar', {
    params: {
      ...params,
      myEvents: params.myEvents ? 'true' : undefined,
    },
  });

  return data;
};

export const getUpcomingCalendarEvents = async (limit = 5) => {
  const { data } = await feedApi.get<CalendarEvent[]>('/calendar/upcoming', {
    params: { limit },
  });

  return data;
};

export const getCalendarEvent = async (eventId: string) => {
  const { data } = await feedApi.get<CalendarEvent>(`/calendar/${eventId}`);
  return data;
};

export const rsvpCalendarEvent = async (eventId: string, status: RSVPStatus) => {
  const { data } = await feedApi.post<CalendarAttendee>(`/calendar/${eventId}/rsvp`, { status });
  return data;
};
