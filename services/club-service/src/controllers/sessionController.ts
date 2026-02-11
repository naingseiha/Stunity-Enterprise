import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

// Create attendance session
export const createSession = async (req: AuthRequest, res: Response) => {
  try {
    const { clubId } = req.params;
    const { title, sessionDate, startTime, endTime, duration, location, meetingUrl, topics, description } = req.body;

    // Check if user is instructor or owner
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId,
        userId: req.user!.userId,
        role: { in: ['OWNER', 'INSTRUCTOR', 'TEACHING_ASSISTANT'] }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Only instructors can create sessions' });
    }

    // Create the session
    const session = await prisma.clubSession.create({
      data: {
        clubId,
        title,
        sessionDate: sessionDate ? new Date(sessionDate) : new Date(),
        startTime: startTime || "09:00",
        endTime: endTime || "10:00",
        duration: duration || 60,
        location,
        meetingUrl,
        topics: topics || [],
        materials: [],
        description,
        createdById: req.user!.userId
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Get all active students in the club
    const students = await prisma.clubMember.findMany({
      where: {
        clubId,
        role: 'STUDENT',
        isActive: true
      }
    });

    // Create attendance records for all students (default: PRESENT)
    const attendanceRecords = students.map(student => ({
      sessionId: session.id,
      memberId: student.id,
      status: 'PRESENT' as any,
      markedById: req.user!.userId
    }));

    if (attendanceRecords.length > 0) {
      await prisma.clubAttendance.createMany({
        data: attendanceRecords
      });
    }

    // Fetch created records
    const attendance = await prisma.clubAttendance.findMany({
      where: { sessionId: session.id },
      include: {
        member: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profilePictureUrl: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      session,
      attendance,
      message: `Session created with ${students.length} students`
    });
  } catch (error: any) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session', details: error.message });
  }
};

// Get all sessions for a club
export const getSessions = async (req: AuthRequest, res: Response) => {
  try {
    const { clubId } = req.params;
    const { startDate, endDate } = req.query;

    // Check if user is a member
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId,
        userId: req.user!.userId
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'You must be a club member to view sessions' });
    }

    const where: any = { clubId };

    if (startDate || endDate) {
      where.sessionDate = {};
      if (startDate) where.sessionDate.gte = new Date(startDate as string);
      if (endDate) where.sessionDate.lte = new Date(endDate as string);
    }

    const sessions = await prisma.clubSession.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            attendances: true
          }
        }
      },
      orderBy: { sessionDate: 'desc' }
    });

    res.json(sessions);
  } catch (error: any) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions', details: error.message });
  }
};

// Get session by ID with attendance
export const getSessionById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const session = await prisma.clubSession.findUnique({
      where: { id },
      include: {
        club: {
          select: {
            id: true,
            name: true
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        attendances: {
          include: {
            member: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    profilePictureUrl: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if user is a member
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId: session.clubId,
        userId: req.user!.userId
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'You must be a club member to view this session' });
    }

    res.json(session);
  } catch (error: any) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session', details: error.message });
  }
};

// Update session
export const updateSession = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const session = await prisma.clubSession.findUnique({
      where: { id }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if user is instructor or owner
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId: session.clubId,
        userId: req.user!.userId,
        role: { in: ['OWNER', 'INSTRUCTOR', 'TEACHING_ASSISTANT'] }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Only instructors can update sessions' });
    }

    // Prepare update data
    const data: any = { ...updateData };
    if (data.sessionDate) data.sessionDate = new Date(data.sessionDate);

    const updatedSession = await prisma.clubSession.update({
      where: { id },
      data,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json(updatedSession);
  } catch (error: any) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: 'Failed to update session', details: error.message });
  }
};

// Delete session
export const deleteSession = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const session = await prisma.clubSession.findUnique({
      where: { id }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if user is instructor or owner
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId: session.clubId,
        userId: req.user!.userId,
        role: { in: ['OWNER', 'INSTRUCTOR'] }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Only owners and instructors can delete sessions' });
    }

    // This will cascade delete all attendance records
    await prisma.clubSession.delete({
      where: { id }
    });

    res.json({ message: 'Session deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session', details: error.message });
  }
};
