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

// Mark attendance for a session
export const markAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { memberId, status, arrivedAt, notes } = req.body;

    // Get session to verify club membership
    const session = await prisma.clubSession.findUnique({
      where: { id: sessionId }
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
      return res.status(403).json({ error: 'Only instructors can mark attendance' });
    }

    // Check if attendance record exists
    const existingRecord = await prisma.clubAttendance.findFirst({
      where: {
        sessionId,
        memberId
      }
    });

    let attendance;

    if (existingRecord) {
      // Update existing record
      attendance = await prisma.clubAttendance.update({
        where: { id: existingRecord.id },
        data: {
          status,
          arrivedAt: arrivedAt ? new Date(arrivedAt) : null,
          notes,
          markedById: req.user!.userId
        },
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
    } else {
      // Create new record
      attendance = await prisma.clubAttendance.create({
        data: {
          sessionId,
          memberId,
          status,
          arrivedAt: arrivedAt ? new Date(arrivedAt) : null,
          notes,
          markedById: req.user!.userId
        },
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
    }

    res.json(attendance);
  } catch (error: any) {
    console.error('Error marking attendances:', error);
    res.status(500).json({ error: 'Failed to mark attendance', details: error.message });
  }
};

// Get attendance for a session
export const getSessionAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.clubSession.findUnique({
      where: { id: sessionId },
      include: { club: true }
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
      return res.status(403).json({ error: 'You must be a club member to view attendance' });
    }

    const records = await prisma.clubAttendance.findMany({
      where: { sessionId },
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
        },
        markedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json(records);
  } catch (error: any) {
    console.error('Error fetching attendances:', error);
    res.status(500).json({ error: 'Failed to fetch attendance', details: error.message });
  }
};

// Get member attendance summary
export const getMemberAttendanceSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { clubId, memberId } = req.params;

    // Check if user is authorized
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId,
        userId: req.user!.userId
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (membership.role === 'STUDENT' && membership.id !== memberId) {
      return res.status(403).json({ error: 'Students can only view their own attendance' });
    }

    // Get all sessions for the club
    const sessions = await prisma.clubSession.findMany({
      where: { clubId },
      include: {
        attendances: {
          where: { memberId }
        }
      }
    });

    const attendanceRecords = sessions.map(s => s.attendances[0]).filter(Boolean);

    // Calculate statistics
    const totalSessions = sessions.length;
    const recordedSessions = attendanceRecords.length;
    
    const statusCounts = attendanceRecords.reduce((acc: any, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      return acc;
    }, {});

    const presentCount = statusCounts.PRESENT || 0;
    const absentCount = statusCounts.ABSENT || 0;
    const lateCount = statusCounts.LATE || 0;
    const excusedCount = statusCounts.EXCUSED || 0;

    const attendanceRate = totalSessions > 0
      ? ((presentCount + lateCount) / totalSessions) * 100
      : 0;

    res.json({
      memberId,
      totalSessions,
      recordedSessions,
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      excused: excusedCount,
      attendanceRate: parseFloat(attendanceRate.toFixed(2)),
      records: attendanceRecords
    });
  } catch (error: any) {
    console.error('Error fetching attendance summary:', error);
    res.status(500).json({ error: 'Failed to fetch attendance summary', details: error.message });
  }
};

// Update attendance record
export const updateAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, arrivedAt, notes } = req.body;

    const record = await prisma.clubAttendance.findUnique({
      where: { id },
      include: {
        session: {
          include: {
            club: true
          }
        }
      }
    });

    if (!record) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    // Check if user is instructor or owner
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId: record.session.clubId,
        userId: req.user!.userId,
        role: { in: ['OWNER', 'INSTRUCTOR', 'TEACHING_ASSISTANT'] }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Only instructors can update attendance' });
    }

    const data: any = { status, notes, markedById: req.user!.userId };
    if (arrivedAt) data.arrivedAt = new Date(arrivedAt);

    const updatedRecord = await prisma.clubAttendance.update({
      where: { id },
      data,
      include: {
        member: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    res.json(updatedRecord);
  } catch (error: any) {
    console.error('Error updating attendances:', error);
    res.status(500).json({ error: 'Failed to update attendance', details: error.message });
  }
};

// Delete attendance record
export const deleteAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const record = await prisma.clubAttendance.findUnique({
      where: { id },
      include: {
        session: {
          include: {
            club: true
          }
        }
      }
    });

    if (!record) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    // Check if user is instructor or owner
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId: record.session.clubId,
        userId: req.user!.userId,
        role: { in: ['OWNER', 'INSTRUCTOR'] }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Only owners and instructors can delete attendance' });
    }

    await prisma.clubAttendance.delete({
      where: { id }
    });

    res.json({ message: 'Attendance record deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting attendances:', error);
    res.status(500).json({ error: 'Failed to delete attendance', details: error.message });
  }
};

// Get attendance statistics for a club
export const getAttendanceStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const { clubId } = req.params;

    // Check if user is a member
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId,
        userId: req.user!.userId
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get all sessions with attendance
    const sessions = await prisma.clubSession.findMany({
      where: { clubId },
      include: {
        attendances: true
      }
    });

    const allRecords = sessions.flatMap(s => s.attendances);

    const totalRecords = allRecords.length;
    const statusCounts = allRecords.reduce((acc: any, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      return acc;
    }, {});

    const presentCount = statusCounts.PRESENT || 0;
    const absentCount = statusCounts.ABSENT || 0;
    const lateCount = statusCounts.LATE || 0;
    const excusedCount = statusCounts.EXCUSED || 0;

    const overallAttendanceRate = totalRecords > 0
      ? ((presentCount + lateCount) / totalRecords) * 100
      : 0;

    res.json({
      totalSessions: sessions.length,
      totalRecords,
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      excused: excusedCount,
      attendanceRate: parseFloat(overallAttendanceRate.toFixed(2)),
      statusBreakdown: statusCounts
    });
  } catch (error: any) {
    console.error('Error fetching attendance statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics', details: error.message });
  }
};
