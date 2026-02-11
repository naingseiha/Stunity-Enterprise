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

// Generate member report card
export const generateMemberReport = async (req: AuthRequest, res: Response) => {
  try {
    const { clubId, memberId } = req.params;

    // Check authorization
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId,
        userId: req.user!.userId
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const targetMember = await prisma.clubMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePictureUrl: true
          }
        },
        club: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });

    if (!targetMember) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Students can only view own reports
    if (membership.role === 'STUDENT' && membership.id !== memberId) {
      return res.status(403).json({ error: 'Students can only view their own reports' });
    }

    // Get grades
    const grades = await prisma.clubGrade.findMany({
      where: {
        clubId,
        memberId
      },
      include: {
        subject: true
      }
    });

    // Calculate grade summary
    const gradesBySubject = grades.reduce((acc: any, grade) => {
      const subjectId = grade.subjectId;
      if (!acc[subjectId]) {
        acc[subjectId] = {
          subject: grade.subject,
          grades: [],
          average: 0,
          totalWeightedScore: 0,
          totalWeight: 0
        };
      }
      acc[subjectId].grades.push(grade);
      if (grade.weightedScore && grade.subject.weight) {
        acc[subjectId].totalWeightedScore += grade.weightedScore;
        acc[subjectId].totalWeight += grade.subject.weight;
      }
      return acc;
    }, {});

    Object.keys(gradesBySubject).forEach(subjectId => {
      const data = gradesBySubject[subjectId];
      if (data.totalWeight > 0) {
        data.average = data.totalWeightedScore / data.totalWeight;
      }
    });

    const subjectAverages = Object.values(gradesBySubject).map((s: any) => s.average);
    const overallAverage = subjectAverages.length > 0
      ? subjectAverages.reduce((sum: number, avg: number) => sum + avg, 0) / subjectAverages.length
      : 0;
    const gpa = (overallAverage / 100) * 4.0;

    // Get attendance
    const sessions = await prisma.clubSession.findMany({
      where: { clubId },
      include: {
        attendances: {
          where: { memberId }
        }
      }
    });

    const attendanceRecords = sessions.map(s => s.attendances[0]).filter(Boolean);
    const totalSessions = sessions.length;
    const statusCounts = attendanceRecords.reduce((acc: any, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      return acc;
    }, {});

    const presentCount = statusCounts.PRESENT || 0;
    const lateCount = statusCounts.LATE || 0;
    const attendanceRate = totalSessions > 0
      ? ((presentCount + lateCount) / totalSessions) * 100
      : 0;

    // Get assignments/submissions
    const submissions = await prisma.clubAssignmentSubmission.findMany({
      where: {
        memberId,
        assignment: {
          clubId
        }
      },
      include: {
        assignment: {
          include: {
            subject: true
          }
        }
      }
    });

    const submittedCount = submissions.length;
    const gradedSubmissions = submissions.filter(s => s.status === 'GRADED');
    const averageAssignmentScore = gradedSubmissions.length > 0
      ? gradedSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) / gradedSubmissions.length
      : 0;

    // Get awards
    const awards = await prisma.clubAward.findMany({
      where: {
        clubId,
        memberId
      }
    });

    const report = {
      member: targetMember,
      reportDate: new Date(),
      academicPerformance: {
        overallGPA: parseFloat(gpa.toFixed(2)),
        overallAverage: parseFloat(overallAverage.toFixed(2)),
        gradesBySubject: Object.values(gradesBySubject),
        totalGrades: grades.length
      },
      attendance: {
        totalSessions,
        present: presentCount,
        absent: statusCounts.ABSENT || 0,
        late: lateCount,
        excused: statusCounts.EXCUSED || 0,
        attendanceRate: parseFloat(attendanceRate.toFixed(2))
      },
      assignments: {
        totalAssignments: submittedCount,
        graded: gradedSubmissions.length,
        averageScore: parseFloat(averageAssignmentScore.toFixed(2))
      },
      awards: awards.map(a => ({
        id: a.id,
        title: a.title,
        type: a.type,
        awardedAt: a.awardedAt
      })),
      summary: {
        strengths: [] as string[],
        areasForImprovement: [] as string[],
        recommendations: [] as string[]
      }
    };

    // Add automated insights
    if (gpa >= 3.5) report.summary.strengths.push('Excellent academic performance');
    if (attendanceRate >= 90) report.summary.strengths.push('Outstanding attendance');
    if (gpa < 2.5) report.summary.areasForImprovement.push('Academic performance needs improvement');
    if (attendanceRate < 75) report.summary.areasForImprovement.push('Attendance needs improvement');

    res.json(report);
  } catch (error: any) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report', details: error.message });
  }
};

// Generate club performance report
export const generateClubReport = async (req: AuthRequest, res: Response) => {
  try {
    const { clubId } = req.params;

    // Check if user is instructor
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId,
        userId: req.user!.userId,
        role: { in: ['OWNER', 'INSTRUCTOR'] }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Only instructors can view club reports' });
    }

    const club = await prisma.studyClub.findUnique({
      where: { id: clubId },
      include: {
        _count: {
          select: {
            members: true,
            subjects: true,
            sessions: true,
            assignments: true
          }
        }
      }
    });

    if (!club) {
      return res.status(404).json({ error: 'Club not found' });
    }

    // Get all grades
    const allGrades = await prisma.clubGrade.findMany({
      where: { clubId }
    });

    const percentages = allGrades.map(g => g.percentage || 0);
    const averageGrade = percentages.length > 0
      ? percentages.reduce((sum, p) => sum + p, 0) / percentages.length
      : 0;

    // Get attendance statistics
    const sessions = await prisma.clubSession.findMany({
      where: { clubId },
      include: {
        attendances: true
      }
    });

    const allAttendance = sessions.flatMap(s => s.attendances);
    const statusCounts = allAttendance.reduce((acc: any, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      return acc;
    }, {});

    const presentCount = statusCounts.PRESENT || 0;
    const lateCount = statusCounts.LATE || 0;
    const totalRecords = allAttendance.length;
    const clubAttendanceRate = totalRecords > 0
      ? ((presentCount + lateCount) / totalRecords) * 100
      : 0;

    // Get assignment statistics
    const assignments = await prisma.clubAssignment.findMany({
      where: { clubId },
      include: {
        submissions: true
      }
    });

    const totalAssignments = assignments.length;
    const publishedAssignments = assignments.filter(a => a.status === 'PUBLISHED').length;

    const report = {
      club,
      reportDate: new Date(),
      overview: {
        totalMembers: club._count.members,
        totalSubjects: club._count.subjects,
        totalSessions: club._count.sessions,
        totalAssignments
      },
      academicPerformance: {
        averageGrade: parseFloat(averageGrade.toFixed(2)),
        totalGradesEntered: allGrades.length
      },
      attendance: {
        totalSessions: sessions.length,
        clubAttendanceRate: parseFloat(clubAttendanceRate.toFixed(2)),
        totalAttendanceRecords: totalRecords
      },
      assignments: {
        total: totalAssignments,
        published: publishedAssignments,
        draft: totalAssignments - publishedAssignments
      }
    };

    res.json(report);
  } catch (error: any) {
    console.error('Error generating club report:', error);
    res.status(500).json({ error: 'Failed to generate club report', details: error.message });
  }
};

// Get member transcript
export const getMemberTranscript = async (req: AuthRequest, res: Response) => {
  try {
    const { clubId, memberId } = req.params;

    // Check authorization
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId,
        userId: req.user!.userId
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Students can only view own transcripts
    if (membership.role === 'STUDENT' && membership.id !== memberId) {
      return res.status(403).json({ error: 'Students can only view their own transcripts' });
    }

    const member = await prisma.clubMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        club: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Get all grades grouped by subject
    const grades = await prisma.clubGrade.findMany({
      where: {
        clubId,
        memberId
      },
      include: {
        subject: true
      },
      orderBy: { gradedDate: 'asc' }
    });

    const gradesBySubject = grades.reduce((acc: any, grade) => {
      const subjectId = grade.subjectId;
      if (!acc[subjectId]) {
        acc[subjectId] = {
          subject: grade.subject,
          grades: []
        };
      }
      acc[subjectId].grades.push(grade);
      return acc;
    }, {});

    // Get awards
    const awards = await prisma.clubAward.findMany({
      where: {
        clubId,
        memberId
      },
      orderBy: { awardedAt: 'asc' }
    });

    const transcript = {
      member,
      club: member.club,
      enrollmentDate: member.enrollmentDate,
      subjects: Object.values(gradesBySubject),
      awards,
      issuedDate: new Date()
    };

    res.json(transcript);
  } catch (error: any) {
    console.error('Error generating transcript:', error);
    res.status(500).json({ error: 'Failed to generate transcript', details: error.message });
  }
};
