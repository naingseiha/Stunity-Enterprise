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

// Create assignment
export const createAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const { clubId } = req.params;
    const {
      subjectId,
      title,
      description,
      instructions,
      type,
      maxPoints,
      weight,
      dueDate,
      lateDeadline,
      allowLateSubmission,
      latePenalty,
      requireFile,
      maxFileSize,
      attachments,
      status
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
      return res.status(403).json({ error: 'Only instructors can create assignments' });
    }

    // Verify subject belongs to club if provided
    if (subjectId) {
      const subject = await prisma.clubSubject.findFirst({
        where: { id: subjectId, clubId }
      });
      if (!subject) {
        return res.status(400).json({ error: 'Subject not found in this club' });
      }
    }

    const assignment = await prisma.clubAssignment.create({
      data: {
        clubId,
        subjectId: subjectId || null,
        title,
        description,
        instructions,
        type: type || 'HOMEWORK',
        maxPoints,
        weight: weight || 1.0,
        dueDate: new Date(dueDate),
        lateDeadline: lateDeadline ? new Date(lateDeadline) : null,
        allowLateSubmission: allowLateSubmission || false,
        latePenalty: latePenalty || null,
        requireFile: requireFile !== undefined ? requireFile : true,
        maxFileSize: maxFileSize || null,
        attachments: attachments || null,
        status: status || 'DRAFT',
        createdById: req.user!.userId,
        publishedAt: status === 'PUBLISHED' ? new Date() : null
      },
      include: {
        subject: true,
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

    res.status(201).json(assignment);
  } catch (error: any) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ error: 'Failed to create assignment', details: error.message });
  }
};

// Get assignments for a club
export const getAssignments = async (req: AuthRequest, res: Response) => {
  try {
    const { clubId } = req.params;
    const { subjectId, status, type } = req.query;

    // Check if user is a member
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId,
        userId: req.user!.userId
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'You must be a club member to view assignments' });
    }

    const where: any = { clubId };
    
    // Students only see published assignments
    if (membership.role === 'STUDENT') {
      where.status = 'PUBLISHED';
    } else {
      if (status) where.status = status as string;
    }

    if (subjectId) where.subjectId = subjectId as string;
    if (type) where.type = type as string;

    const assignments = await prisma.clubAssignment.findMany({
      where,
      include: {
        subject: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            submissions: true
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    res.json(assignments);
  } catch (error: any) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments', details: error.message });
  }
};

// Get assignment by ID
export const getAssignmentById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const assignment = await prisma.clubAssignment.findUnique({
      where: { id },
      include: {
        club: {
          select: {
            id: true,
            name: true
          }
        },
        subject: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            submissions: true
          }
        }
      }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Check if user is a member
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId: assignment.clubId,
        userId: req.user!.userId
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'You must be a club member to view this assignment' });
    }

    // Students can only see published assignments
    if (membership.role === 'STUDENT' && assignment.status !== 'PUBLISHED') {
      return res.status(403).json({ error: 'Assignment not available yet' });
    }

    res.json(assignment);
  } catch (error: any) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ error: 'Failed to fetch assignment', details: error.message });
  }
};

// Update assignment
export const updateAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const assignment = await prisma.clubAssignment.findUnique({
      where: { id }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Check if user is instructor or owner
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId: assignment.clubId,
        userId: req.user!.userId,
        role: { in: ['OWNER', 'INSTRUCTOR', 'TEACHING_ASSISTANT'] }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Only instructors can update assignments' });
    }

    // Prepare update data
    const data: any = { ...updateData };
    if (data.dueDate) data.dueDate = new Date(data.dueDate);
    if (data.lateDeadline) data.lateDeadline = new Date(data.lateDeadline);
    
    // If publishing, set publishedAt
    if (data.status === 'PUBLISHED' && assignment.status !== 'PUBLISHED') {
      data.publishedAt = new Date();
    }

    const updatedAssignment = await prisma.clubAssignment.update({
      where: { id },
      data,
      include: {
        subject: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json(updatedAssignment);
  } catch (error: any) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ error: 'Failed to update assignment', details: error.message });
  }
};

// Delete assignment
export const deleteAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const assignment = await prisma.clubAssignment.findUnique({
      where: { id }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Check if user is instructor or owner
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId: assignment.clubId,
        userId: req.user!.userId,
        role: { in: ['OWNER', 'INSTRUCTOR'] }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Only owners and instructors can delete assignments' });
    }

    // This will cascade delete all submissions
    await prisma.clubAssignment.delete({
      where: { id }
    });

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ error: 'Failed to delete assignment', details: error.message });
  }
};

// Publish assignment
export const publishAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const assignment = await prisma.clubAssignment.findUnique({
      where: { id }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Check if user is instructor or owner
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId: assignment.clubId,
        userId: req.user!.userId,
        role: { in: ['OWNER', 'INSTRUCTOR'] }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Only instructors can publish assignments' });
    }

    const updatedAssignment = await prisma.clubAssignment.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date()
      },
      include: {
        subject: true
      }
    });

    res.json(updatedAssignment);
  } catch (error: any) {
    console.error('Error publishing assignment:', error);
    res.status(500).json({ error: 'Failed to publish assignment', details: error.message });
  }
};

// Get assignment statistics
export const getAssignmentStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const assignment = await prisma.clubAssignment.findUnique({
      where: { id },
      include: {
        submissions: {
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
        }
      }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Check if user is a member
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId: assignment.clubId,
        userId: req.user!.userId
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get total students
    const totalStudents = await prisma.clubMember.count({
      where: {
        clubId: assignment.clubId,
        role: 'STUDENT',
        isActive: true
      }
    });

    const submissions = assignment.submissions;
    const submittedCount = submissions.length;
    const notSubmittedCount = totalStudents - submittedCount;
    const lateCount = submissions.filter(s => s.isLate).length;
    const gradedCount = submissions.filter(s => s.status === 'GRADED').length;

    // Calculate average score
    const gradedSubmissions = submissions.filter(s => s.score !== null);
    const averageScore = gradedSubmissions.length > 0
      ? gradedSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) / gradedSubmissions.length
      : 0;

    res.json({
      assignmentId: id,
      totalStudents,
      submitted: submittedCount,
      notSubmitted: notSubmittedCount,
      late: lateCount,
      graded: gradedCount,
      averageScore: parseFloat(averageScore.toFixed(2)),
      submissionRate: parseFloat(((submittedCount / totalStudents) * 100).toFixed(2))
    });
  } catch (error: any) {
    console.error('Error fetching assignment statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics', details: error.message });
  }
};
