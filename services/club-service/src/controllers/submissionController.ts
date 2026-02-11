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

// Submit assignment
export const submitAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const { content, attachments } = req.body;

    // Get assignment
    const assignment = await prisma.clubAssignment.findUnique({
      where: { id: assignmentId }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (assignment.status !== 'PUBLISHED') {
      return res.status(400).json({ error: 'Assignment is not published yet' });
    }

    // Get member
    const member = await prisma.clubMember.findFirst({
      where: {
        clubId: assignment.clubId,
        userId: req.user!.userId,
        role: 'STUDENT'
      }
    });

    if (!member) {
      return res.status(403).json({ error: 'Only students can submit assignments' });
    }

    // Check if already submitted
    const existingSubmission = await prisma.clubAssignmentSubmission.findFirst({
      where: {
        assignmentId,
        memberId: member.id
      },
      orderBy: { attemptNumber: 'desc' }
    });

    // Check if late
    const now = new Date();
    const isLate = now > assignment.dueDate;

    // Check if late submission is allowed
    if (isLate && !assignment.allowLateSubmission) {
      return res.status(400).json({ error: 'Late submissions are not allowed' });
    }

    if (isLate && assignment.lateDeadline && now > assignment.lateDeadline) {
      return res.status(400).json({ error: 'Late deadline has passed' });
    }

    const attemptNumber = existingSubmission ? existingSubmission.attemptNumber + 1 : 1;

    const submission = await prisma.clubAssignmentSubmission.create({
      data: {
        assignmentId,
        memberId: member.id,
        content,
        attachments: attachments || null,
        isLate,
        status: isLate ? 'LATE' : 'SUBMITTED',
        attemptNumber,
        previousSubmissionId: existingSubmission?.id || null
      },
      include: {
        assignment: true,
        member: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    });

    res.status(201).json(submission);
  } catch (error: any) {
    console.error('Error submitting assignment:', error);
    res.status(500).json({ error: 'Failed to submit assignment', details: error.message });
  }
};

// Get submissions for an assignment
export const getAssignmentSubmissions = async (req: AuthRequest, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const { status } = req.query;

    const assignment = await prisma.clubAssignment.findUnique({
      where: { id: assignmentId }
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
      return res.status(403).json({ error: 'Only instructors can view all submissions' });
    }

    const where: any = { assignmentId };
    if (status) where.status = status as string;

    // Get latest submission for each member
    const submissions = await prisma.clubAssignmentSubmission.findMany({
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
        gradedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    // Filter to latest attempt only
    const latestSubmissions = submissions.reduce((acc: any[], sub) => {
      const existing = acc.find(s => s.memberId === sub.memberId);
      if (!existing || sub.attemptNumber > existing.attemptNumber) {
        return [...acc.filter(s => s.memberId !== sub.memberId), sub];
      }
      return acc;
    }, []);

    res.json(latestSubmissions);
  } catch (error: any) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions', details: error.message });
  }
};

// Get member submissions
export const getMemberSubmissions = async (req: AuthRequest, res: Response) => {
  try {
    const { clubId, memberId } = req.params;

    // Check if user is viewing own submissions or is instructor
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
      where: { id: memberId }
    });

    if (!targetMember) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Students can only view own submissions
    if (membership.role === 'STUDENT' && membership.id !== memberId) {
      return res.status(403).json({ error: 'Students can only view their own submissions' });
    }

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
        },
        gradedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    res.json(submissions);
  } catch (error: any) {
    console.error('Error fetching member submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions', details: error.message });
  }
};

// Get submission by ID
export const getSubmissionById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const submission = await prisma.clubAssignmentSubmission.findUnique({
      where: { id },
      include: {
        assignment: {
          include: {
            subject: true
          }
        },
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
        gradedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        previousSubmission: true,
        resubmissions: true
      }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Check authorization
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId: submission.assignment.clubId,
        userId: req.user!.userId
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Students can only view own submissions
    if (membership.role === 'STUDENT' && submission.memberId !== membership.id) {
      return res.status(403).json({ error: 'Students can only view their own submissions' });
    }

    res.json(submission);
  } catch (error: any) {
    console.error('Error fetching submission:', error);
    res.status(500).json({ error: 'Failed to fetch submission', details: error.message });
  }
};

// Grade submission
export const gradeSubmission = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { score, feedback } = req.body;

    const submission = await prisma.clubAssignmentSubmission.findUnique({
      where: { id },
      include: {
        assignment: true
      }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Check if user is instructor
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId: submission.assignment.clubId,
        userId: req.user!.userId,
        role: { in: ['OWNER', 'INSTRUCTOR', 'TEACHING_ASSISTANT'] }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Only instructors can grade submissions' });
    }

    // Validate score
    if (score > submission.assignment.maxPoints) {
      return res.status(400).json({ 
        error: `Score cannot exceed ${submission.assignment.maxPoints} points` 
      });
    }

    // Apply late penalty if applicable
    let finalScore = score;
    if (submission.isLate && submission.assignment.latePenalty) {
      const daysLate = Math.ceil(
        (submission.submittedAt.getTime() - submission.assignment.dueDate.getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      const penalty = (submission.assignment.latePenalty / 100) * score * daysLate;
      finalScore = Math.max(0, score - penalty);
    }

    const gradedSubmission = await prisma.clubAssignmentSubmission.update({
      where: { id },
      data: {
        score: finalScore,
        feedback,
        status: 'GRADED',
        gradedAt: new Date(),
        gradedById: req.user!.userId
      },
      include: {
        assignment: true,
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
        gradedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json(gradedSubmission);
  } catch (error: any) {
    console.error('Error grading submission:', error);
    res.status(500).json({ error: 'Failed to grade submission', details: error.message });
  }
};

// Delete submission
export const deleteSubmission = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const submission = await prisma.clubAssignmentSubmission.findUnique({
      where: { id },
      include: {
        assignment: true
      }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Check if user is instructor or the student who submitted
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId: submission.assignment.clubId,
        userId: req.user!.userId
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const isInstructor = ['OWNER', 'INSTRUCTOR'].includes(membership.role);
    const isOwnSubmission = submission.memberId === membership.id;

    if (!isInstructor && !isOwnSubmission) {
      return res.status(403).json({ error: 'Not authorized to delete this submission' });
    }

    await prisma.clubAssignmentSubmission.delete({
      where: { id }
    });

    res.json({ message: 'Submission deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting submission:', error);
    res.status(500).json({ error: 'Failed to delete submission', details: error.message });
  }
};
