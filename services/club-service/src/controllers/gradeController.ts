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

// Create grade entry
export const createGrade = async (req: AuthRequest, res: Response) => {
  try {
    const { clubId } = req.params;
    const {
      memberId,
      subjectId,
      assessmentType,
      assessmentName,
      score,
      maxScore,
      remarks,
      term
    } = req.body;

    // Check if user is instructor or owner
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId,
        userId: req.user!.userId,
        role: { in: ['OWNER', 'INSTRUCTOR', 'TEACHING_ASSISTANT'] }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Only instructors can create grades' });
    }

    // Verify member exists
    const studentMember = await prisma.clubMember.findUnique({
      where: { id: memberId }
    });

    if (!studentMember || studentMember.clubId !== clubId) {
      return res.status(400).json({ error: 'Member not found in this club' });
    }

    // Verify subject belongs to club
    const subject = await prisma.clubSubject.findFirst({
      where: {
        id: subjectId,
        clubId
      }
    });

    if (!subject) {
      return res.status(400).json({ error: 'Subject not found in this club' });
    }

    const percentage = (score / maxScore) * 100;
    const weightedScore = (score / maxScore) * subject.weight * 100;

    const grade = await prisma.clubGrade.create({
      data: {
        clubId,
        memberId,
        subjectId,
        assessmentType: assessmentType || 'QUIZ',
        assessmentName,
        score,
        maxScore: maxScore || 100,
        percentage,
        weightedScore,
        term,
        remarks,
        gradedById: req.user!.userId
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
        },
        subject: true,
        gradedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json(grade);
  } catch (error: any) {
    console.error('Error creating grade:', error);
    res.status(500).json({ error: 'Failed to create grade', details: error.message });
  }
};

// Get all grades for a club
export const getClubGrades = async (req: AuthRequest, res: Response) => {
  try {
    const { clubId } = req.params;
    const { memberId, subjectId, assessmentType } = req.query;

    // Check if user is a member
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId,
        userId: req.user!.userId
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'You must be a club member to view grades' });
    }

    // Students can only see their own grades
    const where: any = { clubId };
    if (membership.role === 'STUDENT') {
      where.memberId = membership.id;
    } else {
      if (memberId) where.memberId = memberId as string;
    }

    if (subjectId) where.subjectId = subjectId as string;
    if (assessmentType) where.assessmentType = assessmentType as string;

    const grades = await prisma.clubGrade.findMany({
      where,
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
        subject: true,
        gradedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { gradedDate: 'desc' }
    });

    res.json(grades);
  } catch (error: any) {
    console.error('Error fetching grades:', error);
    res.status(500).json({ error: 'Failed to fetch grades', details: error.message });
  }
};

// Get student grade summary  
export const getStudentGradeSummary = async (req: AuthRequest, res: Response) => {
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
      return res.status(403).json({ error: 'Students can only view their own grades' });
    }

    // Get all grades for the member
    const grades = await prisma.clubGrade.findMany({
      where: {
        clubId,
        memberId
      },
      include: {
        subject: true
      }
    });

    // Group grades by subject
    const gradesBySubject = grades.reduce((acc: any, grade) => {
      const subjectId = grade.subjectId;
      if (!acc[subjectId]) {
        acc[subjectId] = {
          subject: grade.subject,
          grades: [],
          totalWeightedScore: 0,
          totalWeight: 0,
          average: 0
        };
      }
      acc[subjectId].grades.push(grade);
      
      // Use weighted scores
      if (grade.weightedScore && grade.subject.weight) {
        acc[subjectId].totalWeightedScore += grade.weightedScore;
        acc[subjectId].totalWeight += grade.subject.weight;
      }
      
      return acc;
    }, {});

    // Calculate averages
    Object.keys(gradesBySubject).forEach(subjectId => {
      const subjectData = gradesBySubject[subjectId];
      if (subjectData.totalWeight > 0) {
        subjectData.average = subjectData.totalWeightedScore / subjectData.totalWeight;
      }
    });

    // Calculate overall GPA (assuming 4.0 scale)
    const subjectAverages = Object.values(gradesBySubject).map((s: any) => s.average);
    const overallAverage = subjectAverages.length > 0
      ? subjectAverages.reduce((sum: number, avg: number) => sum + avg, 0) / subjectAverages.length
      : 0;
    
    const gpa = (overallAverage / 100) * 4.0;

    res.json({
      memberId,
      gradesBySubject: Object.values(gradesBySubject),
      overallAverage: parseFloat(overallAverage.toFixed(2)),
      gpa: parseFloat(gpa.toFixed(2)),
      totalGrades: grades.length
    });
  } catch (error: any) {
    console.error('Error fetching student grade summary:', error);
    res.status(500).json({ error: 'Failed to fetch grade summary', details: error.message });
  }
};

// Update grade
export const updateGrade = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const grade = await prisma.clubGrade.findUnique({
      where: { id },
      include: { club: true, subject: true }
    });

    if (!grade) {
      return res.status(404).json({ error: 'Grade not found' });
    }

    // Check if user is instructor or owner
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId: grade.clubId,
        userId: req.user!.userId,
        role: { in: ['OWNER', 'INSTRUCTOR', 'TEACHING_ASSISTANT'] }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Only instructors can update grades' });
    }

    // Recalculate percentage and weighted score if score/maxScore changed
    const data: any = { ...updateData };
    if (data.score !== undefined || data.maxScore !== undefined) {
      const newScore = data.score !== undefined ? data.score : grade.score;
      const newMaxScore = data.maxScore !== undefined ? data.maxScore : grade.maxScore;
      data.percentage = (newScore / newMaxScore) * 100;
      data.weightedScore = (newScore / newMaxScore) * grade.subject.weight * 100;
    }

    const updatedGrade = await prisma.clubGrade.update({
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
        },
        subject: true
      }
    });

    res.json(updatedGrade);
  } catch (error: any) {
    console.error('Error updating grade:', error);
    res.status(500).json({ error: 'Failed to update grade', details: error.message });
  }
};

// Delete grade
export const deleteGrade = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const grade = await prisma.clubGrade.findUnique({
      where: { id }
    });

    if (!grade) {
      return res.status(404).json({ error: 'Grade not found' });
    }

    // Check if user is instructor or owner
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId: grade.clubId,
        userId: req.user!.userId,
        role: { in: ['OWNER', 'INSTRUCTOR'] }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Only instructors can delete grades' });
    }

    await prisma.clubGrade.delete({
      where: { id }
    });

    res.json({ message: 'Grade deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting grade:', error);
    res.status(500).json({ error: 'Failed to delete grade', details: error.message });
  }
};

// Get grade statistics for a club
export const getGradeStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const { clubId } = req.params;
    const { subjectId } = req.query;

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

    const where: any = { clubId };
    if (subjectId) where.subjectId = subjectId as string;

    const grades = await prisma.clubGrade.findMany({
      where,
      include: {
        subject: true
      }
    });

    if (grades.length === 0) {
      return res.json({
        totalGrades: 0,
        averagePercentage: 0,
        highestPercentage: 0,
        lowestPercentage: 0,
        passingRate: 0
      });
    }

    // Calculate statistics using percentages
    const percentages = grades.map(g => g.percentage || 0);
    const averagePercentage = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
    const highestPercentage = Math.max(...percentages);
    const lowestPercentage = Math.min(...percentages);
    const passingGrades = percentages.filter(p => p >= 60).length;
    const passingRate = (passingGrades / percentages.length) * 100;

    // Group by assessment type
    const byAssessmentType = grades.reduce((acc: any, grade) => {
      const type = grade.assessmentType;
      if (!acc[type]) {
        acc[type] = {
          count: 0,
          averagePercentage: 0,
          totalPercentage: 0
        };
      }
      acc[type].count++;
      acc[type].totalPercentage += grade.percentage || 0;
      return acc;
    }, {});

    Object.keys(byAssessmentType).forEach(type => {
      const data = byAssessmentType[type];
      data.averagePercentage = data.totalPercentage / data.count;
      delete data.totalPercentage;
    });

    res.json({
      totalGrades: grades.length,
      averagePercentage: parseFloat(averagePercentage.toFixed(2)),
      highestPercentage: parseFloat(highestPercentage.toFixed(2)),
      lowestPercentage: parseFloat(lowestPercentage.toFixed(2)),
      passingRate: parseFloat(passingRate.toFixed(2)),
      byAssessmentType
    });
  } catch (error: any) {
    console.error('Error fetching grade statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics', details: error.message });
  }
};
