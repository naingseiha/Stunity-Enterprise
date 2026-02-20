import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Get user experiences
 * GET /api/profile/:userId/experiences
 */
export const getUserExperiences = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const experiences = await prisma.experience.findMany({
      where: { userId },
      orderBy: [
        { isCurrent: 'desc' }, // Current experiences first
        { startDate: 'desc' }  // Then by most recent start date
      ]
    });

    return res.status(200).json({
      success: true,
      data: experiences
    });
  } catch (error) {
    console.error('Error fetching experiences:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch experiences'
    });
  }
};

/**
 * Add new experience
 * POST /api/profile/experiences
 */
export const addExperience = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const {
      type,
      title,
      organization,
      location,
      startDate,
      endDate,
      isCurrent,
      description,
      achievements,
      skills
    } = req.body;

    // Validation
    if (!type || !title || !organization || !startDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: type, title, organization, startDate'
      });
    }

    // Validate experience type
    const validTypes = ['WORK', 'TEACHING', 'VOLUNTEER', 'INTERNSHIP', 'RESEARCH', 'LEADERSHIP', 'EXTRACURRICULAR'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid experience type'
      });
    }

    // If current, endDate should be null
    const finalEndDate = isCurrent ? null : endDate;

    const experience = await prisma.experience.create({
      data: {
        userId,
        type,
        title,
        organization,
        location: location || null,
        startDate: new Date(startDate),
        endDate: finalEndDate ? new Date(finalEndDate) : null,
        isCurrent: isCurrent || false,
        description: description || null,
        achievements: achievements || [],
        skills: skills || [],
        mediaUrls: [],
        mediaKeys: []
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Experience added successfully',
      data: experience
    });
  } catch (error) {
    console.error('Error adding experience:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add experience'
    });
  }
};

/**
 * Update experience
 * PUT /api/profile/experiences/:experienceId
 */
export const updateExperience = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { experienceId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Check if experience exists and belongs to user
    const existingExperience = await prisma.experience.findUnique({
      where: { id: experienceId }
    });

    if (!existingExperience) {
      return res.status(404).json({
        success: false,
        message: 'Experience not found'
      });
    }

    if (existingExperience.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own experiences'
      });
    }

    const {
      type,
      title,
      organization,
      location,
      startDate,
      endDate,
      isCurrent,
      description,
      achievements,
      skills
    } = req.body;

    // Build update data (only include fields that are provided)
    const updateData: any = {};
    if (type !== undefined) updateData.type = type;
    if (title !== undefined) updateData.title = title;
    if (organization !== undefined) updateData.organization = organization;
    if (location !== undefined) updateData.location = location || null;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (isCurrent !== undefined) {
      updateData.isCurrent = isCurrent;
      updateData.endDate = isCurrent ? null : (endDate ? new Date(endDate) : null);
    } else if (endDate !== undefined) {
      updateData.endDate = endDate ? new Date(endDate) : null;
    }
    if (description !== undefined) updateData.description = description || null;
    if (achievements !== undefined) updateData.achievements = achievements;
    if (skills !== undefined) updateData.skills = skills;

    const experience = await prisma.experience.update({
      where: { id: experienceId },
      data: updateData
    });

    return res.status(200).json({
      success: true,
      message: 'Experience updated successfully',
      data: experience
    });
  } catch (error) {
    console.error('Error updating experience:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update experience'
    });
  }
};

/**
 * Delete experience
 * DELETE /api/profile/experiences/:experienceId
 */
export const deleteExperience = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { experienceId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Check if experience exists and belongs to user
    const experience = await prisma.experience.findUnique({
      where: { id: experienceId }
    });

    if (!experience) {
      return res.status(404).json({
        success: false,
        message: 'Experience not found'
      });
    }

    if (experience.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own experiences'
      });
    }

    await prisma.experience.delete({
      where: { id: experienceId }
    });

    return res.status(200).json({
      success: true,
      message: 'Experience deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting experience:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete experience'
    });
  }
};
