import express from 'express';
import { PrismaClient, CalendarEventType, EventPrivacy, RSVPStatus } from '@prisma/client';
import { authMiddleware } from './middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get event type definitions
const EVENT_TYPE_INFO = {
  GENERAL: { label: 'General', icon: 'Calendar', color: '#6B7280' },
  ACADEMIC: { label: 'Academic', icon: 'BookOpen', color: '#3B82F6' },
  SPORTS: { label: 'Sports', icon: 'Trophy', color: '#10B981' },
  CULTURAL: { label: 'Cultural', icon: 'Sparkles', color: '#EC4899' },
  CLUB: { label: 'Club Event', icon: 'Users', color: '#8B5CF6' },
  WORKSHOP: { label: 'Workshop', icon: 'Wrench', color: '#F59E0B' },
  MEETING: { label: 'Meeting', icon: 'MessageCircle', color: '#14B8A6' },
  HOLIDAY: { label: 'Holiday', icon: 'Sun', color: '#EF4444' },
  DEADLINE: { label: 'Deadline', icon: 'Clock', color: '#DC2626' },
  COMPETITION: { label: 'Competition', icon: 'Award', color: '#7C3AED' },
};

// GET /calendar/types - Get event type definitions
router.get('/types', async (req, res) => {
  try {
    const types = Object.entries(EVENT_TYPE_INFO).map(([key, value]) => ({
      type: key,
      ...value,
    }));
    res.json(types);
  } catch (error) {
    console.error('Error fetching event types:', error);
    res.status(500).json({ error: 'Failed to fetch event types' });
  }
});

// GET /calendar/upcoming - Get upcoming events
router.get('/upcoming', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const now = new Date();
    const limit = parseInt(req.query.limit as string) || 10;

    const events = await prisma.event.findMany({
      where: {
        isActive: true,
        startDate: { gte: now },
        OR: [
          { privacy: 'PUBLIC' },
          { creatorId: userId },
          {
            attendees: {
              some: { userId },
            },
          },
        ],
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
          },
        },
        attendees: {
          where: { status: 'GOING' },
          take: 5,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePictureUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            attendees: true,
          },
        },
      },
      orderBy: { startDate: 'asc' },
      take: limit,
    });

    // Get user's RSVP status for each event
    const eventsWithRSVP = await Promise.all(
      events.map(async (event) => {
        const userRSVP = await prisma.eventAttendee.findUnique({
          where: {
            eventId_userId: {
              eventId: event.id,
              userId,
            },
          },
        });
        return {
          ...event,
          userRSVPStatus: userRSVP?.status || null,
        };
      })
    );

    res.json(eventsWithRSVP);
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
});

// GET /calendar/month/:year/:month - Get events for calendar view
router.get('/month/:year/:month', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month) - 1; // JavaScript months are 0-indexed

    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

    const events = await prisma.event.findMany({
      where: {
        isActive: true,
        OR: [
          // Events starting in this month
          {
            startDate: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          // Events spanning across this month
          {
            AND: [
              { startDate: { lte: startOfMonth } },
              { endDate: { gte: startOfMonth } },
            ],
          },
        ],
        AND: [
          {
            OR: [
              { privacy: 'PUBLIC' },
              { creatorId: userId },
              {
                attendees: {
                  some: { userId },
                },
              },
            ],
          },
        ],
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
          },
        },
        _count: {
          select: {
            attendees: true,
          },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    // Group events by date
    const eventsByDate: Record<string, typeof events> = {};
    events.forEach((event) => {
      const dateKey = event.startDate.toISOString().split('T')[0];
      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
      }
      eventsByDate[dateKey].push(event);
    });

    res.json({
      year,
      month: month + 1,
      events,
      eventsByDate,
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

// POST /calendar - Create a new event
router.post('/', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const {
      title,
      description,
      startDate,
      endDate,
      allDay,
      location,
      virtualLink,
      coverImage,
      eventType,
      privacy,
      maxAttendees,
      schoolId,
      studyClubId,
    } = req.body;

    if (!title || !startDate) {
      return res.status(400).json({ error: 'Title and start date are required' });
    }

    // Validate event type
    if (eventType && !Object.keys(EVENT_TYPE_INFO).includes(eventType)) {
      return res.status(400).json({ error: 'Invalid event type' });
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        allDay: allDay || false,
        location,
        virtualLink,
        coverImage,
        eventType: (eventType as CalendarEventType) || 'GENERAL',
        privacy: (privacy as EventPrivacy) || 'PUBLIC',
        maxAttendees,
        creatorId: userId,
        schoolId,
        studyClubId,
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
          },
        },
      },
    });

    // Auto-add creator as GOING
    await prisma.eventAttendee.create({
      data: {
        eventId: event.id,
        userId,
        status: 'GOING',
        respondedAt: new Date(),
      },
    });

    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// GET /calendar - List events with filters
router.get('/', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const {
      eventType,
      privacy,
      schoolId,
      studyClubId,
      startAfter,
      startBefore,
      search,
      myEvents,
    } = req.query;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      isActive: true,
    };

    // Filter by event type
    if (eventType) {
      whereClause.eventType = eventType as CalendarEventType;
    }

    // Filter by privacy
    if (privacy) {
      whereClause.privacy = privacy as EventPrivacy;
    }

    // Filter by school
    if (schoolId) {
      whereClause.schoolId = schoolId;
    }

    // Filter by study club
    if (studyClubId) {
      whereClause.studyClubId = studyClubId;
    }

    // Date range filters
    if (startAfter) {
      whereClause.startDate = { gte: new Date(startAfter as string) };
    }
    if (startBefore) {
      whereClause.startDate = {
        ...whereClause.startDate,
        lte: new Date(startBefore as string),
      };
    }

    // Search filter
    if (search) {
      whereClause.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { location: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // My events filter
    if (myEvents === 'true') {
      whereClause.OR = [
        { creatorId: userId },
        { attendees: { some: { userId } } },
      ];
    } else {
      // Public visibility
      whereClause.AND = [
        {
          OR: [
            { privacy: 'PUBLIC' },
            { creatorId: userId },
            { attendees: { some: { userId } } },
          ],
        },
      ];
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where: whereClause,
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePictureUrl: true,
            },
          },
          attendees: {
            where: { status: 'GOING' },
            take: 5,
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  profilePictureUrl: true,
                },
              },
            },
          },
          _count: {
            select: {
              attendees: true,
            },
          },
        },
        orderBy: { startDate: 'asc' },
        skip,
        take: limit,
      }),
      prisma.event.count({ where: whereClause }),
    ]);

    // Get user's RSVP status for each event
    const eventsWithRSVP = await Promise.all(
      events.map(async (event) => {
        const userRSVP = await prisma.eventAttendee.findUnique({
          where: {
            eventId_userId: {
              eventId: event.id,
              userId,
            },
          },
        });
        return {
          ...event,
          userRSVPStatus: userRSVP?.status || null,
        };
      })
    );

    res.json({
      events: eventsWithRSVP,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error listing events:', error);
    res.status(500).json({ error: 'Failed to list events' });
  }
});

// GET /calendar/:id - Get event details
router.get('/:id', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
            headline: true,
          },
        },
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePictureUrl: true,
              },
            },
          },
          orderBy: [
            { status: 'asc' },
            { respondedAt: 'desc' },
          ],
        },
        _count: {
          select: {
            attendees: true,
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get user's RSVP status
    const userRSVP = await prisma.eventAttendee.findUnique({
      where: {
        eventId_userId: {
          eventId: id,
          userId,
        },
      },
    });

    // Group attendees by status
    const attendeesByStatus = {
      going: event.attendees.filter((a) => a.status === 'GOING'),
      maybe: event.attendees.filter((a) => a.status === 'MAYBE'),
      notGoing: event.attendees.filter((a) => a.status === 'NOT_GOING'),
    };

    res.json({
      ...event,
      userRSVPStatus: userRSVP?.status || null,
      isCreator: event.creatorId === userId,
      attendeesByStatus,
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// PUT /calendar/:id - Update event
router.put('/:id', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    // Check ownership
    const event = await prisma.event.findUnique({
      where: { id },
      select: { creatorId: true },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.creatorId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this event' });
    }

    const {
      title,
      description,
      startDate,
      endDate,
      allDay,
      location,
      virtualLink,
      coverImage,
      eventType,
      privacy,
      maxAttendees,
    } = req.body;

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        title,
        description,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        allDay,
        location,
        virtualLink,
        coverImage,
        eventType: eventType as CalendarEventType,
        privacy: privacy as EventPrivacy,
        maxAttendees,
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
          },
        },
        _count: {
          select: {
            attendees: true,
          },
        },
      },
    });

    res.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// DELETE /calendar/:id - Delete event
router.delete('/:id', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    // Check ownership
    const event = await prisma.event.findUnique({
      where: { id },
      select: { creatorId: true },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.creatorId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this event' });
    }

    await prisma.event.delete({ where: { id } });

    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// POST /calendar/:id/rsvp - RSVP to an event
router.post('/:id/rsvp', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['GOING', 'MAYBE', 'NOT_GOING'].includes(status)) {
      return res.status(400).json({ error: 'Invalid RSVP status' });
    }

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id },
      select: { id: true, maxAttendees: true },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check capacity if going
    if (status === 'GOING' && event.maxAttendees) {
      const currentAttendees = await prisma.eventAttendee.count({
        where: { eventId: id, status: 'GOING' },
      });
      if (currentAttendees >= event.maxAttendees) {
        return res.status(400).json({ error: 'Event is at full capacity' });
      }
    }

    // Upsert RSVP
    const rsvp = await prisma.eventAttendee.upsert({
      where: {
        eventId_userId: {
          eventId: id,
          userId,
        },
      },
      update: {
        status: status as RSVPStatus,
        respondedAt: new Date(),
      },
      create: {
        eventId: id,
        userId,
        status: status as RSVPStatus,
        respondedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
          },
        },
      },
    });

    res.json(rsvp);
  } catch (error) {
    console.error('Error RSVPing to event:', error);
    res.status(500).json({ error: 'Failed to RSVP' });
  }
});

// GET /calendar/:id/attendees - List event attendees
router.get('/:id/attendees', async (req, res) => {
  try {
    const { id } = req.params;
    const status = req.query.status as RSVPStatus | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const whereClause: any = { eventId: id };
    if (status) {
      whereClause.status = status;
    }

    const [attendees, total] = await Promise.all([
      prisma.eventAttendee.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePictureUrl: true,
              headline: true,
            },
          },
        },
        orderBy: [
          { status: 'asc' },
          { respondedAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.eventAttendee.count({ where: whereClause }),
    ]);

    res.json({
      attendees,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error listing attendees:', error);
    res.status(500).json({ error: 'Failed to list attendees' });
  }
});

export default router;
