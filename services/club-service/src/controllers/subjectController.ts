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

// Create subject for a club
export const createSubject = async (req: AuthRequest, res: Response) => {
  try {
    const { clubId } = req.params;
    const {
      name,
      code,
      description,
      credits,
      weeklyHours,
      weight,
      instructorId,
      maxScore,
      passingScore
    } = req.body;

    // Check if user is club owner or instructor
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId,
        userId: req.user!.userId,
        role: { in: ['OWNER', 'INSTRUCTOR'] }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Only club owners and instructors can create subjects' });
    }

    const subject = await prisma.clubSubject.create({
      data: {
        clubId,
        name,
        code,
        description,
        credits: credits || null,
        weeklyHours: weeklyHours || null,
        weight: weight || 1.0,
        instructorId: instructorId || req.user!.userId,
        maxScore: maxScore || 100,
        passingScore: passingScore || null
      },
      include: {
        instructor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePictureUrl: true
          }
        }
      }
    });

    res.status(201).json(subject);
  } catch (error: any) {
    console.error('Error creating subject:', error);
    res.status(500).json({ error: 'Failed to create subject', details: error.message });
  }
};

// Get all subjects for a club
export const getSubjects = async (req: AuthRequest, res: Response) => {
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
      return res.status(403).json({ error: 'You must be a club member to view subjects' });
    }

    const subjects = await prisma.clubSubject.findMany({
      where: { clubId },
      include: {
        instructor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePictureUrl: true
          }
        },
        _count: {
          select: {
            grades: true,
            assignments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(subjects);
  } catch (error: any) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ error: 'Failed to fetch subjects', details: error.message });
  }
};

// Get single subject by ID
export const getSubjectById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const subject = await prisma.clubSubject.findUnique({
      where: { id },
      include: {
        club: {
          select: {
            id: true,
            name: true
          }
        },
        instructor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePictureUrl: true
          }
        },
        _count: {
          select: {
            grades: true,
            assignments: true
          }
        }
      }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Check if user is a member of the club
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId: subject.clubId,
        userId: req.user!.userId
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'You must be a club member to view this subject' });
    }

    res.json(subject);
  } catch (error: any) {
    console.error('Error fetching subject:', error);
    res.status(500).json({ error: 'Failed to fetch subject', details: error.message });
  }
};

// Update subject
export const updateSubject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Get subject with club info
    const subject = await prisma.clubSubject.findUnique({
      where: { id },
      include: { club: true }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Check if user is club owner or instructor
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId: subject.clubId,
        userId: req.user!.userId,
        role: { in: ['OWNER', 'INSTRUCTOR'] }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Only club owners and instructors can update subjects' });
    }

    const updatedSubject = await prisma.clubSubject.update({
      where: { id },
      data: updateData,
      include: {
        instructor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePictureUrl: true
          }
        }
      }
    });

    res.json(updatedSubject);
  } catch (error: any) {
    console.error('Error updating subject:', error);
    res.status(500).json({ error: 'Failed to update subject', details: error.message });
  }
};

// Delete subject
export const deleteSubject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get subject with club info
    const subject = await prisma.clubSubject.findUnique({
      where: { id },
      include: { club: true }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Check if user is club owner or instructor
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId: subject.clubId,
        userId: req.user!.userId,
        role: { in: ['OWNER', 'INSTRUCTOR'] }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Only club owners and instructors can delete subjects' });
    }

    await prisma.clubSubject.delete({
      where: { id }
    });

    res.json({ message: 'Subject deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ error: 'Failed to delete subject', details: error.message });
  }
};

// Assign instructor to subject
export const assignInstructor = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { instructorId } = req.body;

    const subject = await prisma.clubSubject.findUnique({
      where: { id },
      include: { club: true }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Check if requester is club owner
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId: subject.clubId,
        userId: req.user!.userId,
        role: 'OWNER'
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Only club owners can assign instructors' });
    }

    // Check if new instructor is a member
    const instructorMembership = await prisma.clubMember.findFirst({
      where: {
        clubId: subject.clubId,
        userId: instructorId,
        role: { in: ['OWNER', 'INSTRUCTOR', 'TEACHING_ASSISTANT'] }
      }
    });

    if (!instructorMembership) {
      return res.status(400).json({ error: 'User must be a club instructor or teaching assistant' });
    }

    const updatedSubject = await prisma.clubSubject.update({
      where: { id },
      data: { instructorId },
      include: {
        instructor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePictureUrl: true
          }
        }
      }
    });

    res.json(updatedSubject);
  } catch (error: any) {
    console.error('Error assigning instructor:', error);
    res.status(500).json({ error: 'Failed to assign instructor', details: error.message });
  }
};
