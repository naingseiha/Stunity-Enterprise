import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Get user recommendations
 * GET /api/profile/:userId/recommendations
 */
export const getUserRecommendations = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = (req as AuthRequest).user?.userId;

    // Build where clause - if viewing own profile, show all; otherwise only public accepted ones
    const whereClause: any = {
      recipientId: userId
    };

    if (currentUserId !== userId) {
      // Not own profile - only show accepted & public recommendations
      whereClause.isAccepted = true;
      whereClause.isPublic = true;
    }

    const recommendations = await prisma.recommendation.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
            headline: true,
            student: {
              select: {
                khmerName: true
              }
            },
            teacher: {
              select: {
                khmerName: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.status(200).json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch recommendations'
    });
  }
};

/**
 * Write a recommendation for someone
 * POST /api/profile/recommendations
 */
export const writeRecommendation = async (req: AuthRequest, res: Response) => {
  try {
    const authorId = req.user?.userId;
    if (!authorId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const {
      recipientId,
      relationship,
      content,
      skills,
      rating
    } = req.body;

    // Validation
    if (!recipientId || !relationship || !content) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: recipientId, relationship, content'
      });
    }

    // Can't recommend yourself
    if (recipientId === authorId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot write a recommendation for yourself'
      });
    }

    // Check if recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId }
    });

    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient user not found'
      });
    }

    // Validate relationship
    const validRelationships = ['TEACHER', 'CLASSMATE', 'MENTOR', 'COLLEAGUE', 'SUPERVISOR', 'OTHER'];
    if (!validRelationships.includes(relationship)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid relationship type'
      });
    }

    // Validate content length
    if (content.length < 50) {
      return res.status(400).json({
        success: false,
        message: 'Recommendation must be at least 50 characters long'
      });
    }

    // Validate rating if provided
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if recommendation already exists
    const existingRecommendation = await prisma.recommendation.findUnique({
      where: {
        recipientId_authorId: {
          recipientId,
          authorId
        }
      }
    });

    if (existingRecommendation) {
      return res.status(400).json({
        success: false,
        message: 'You have already written a recommendation for this user'
      });
    }

    const recommendation = await prisma.recommendation.create({
      data: {
        recipientId,
        authorId,
        relationship,
        content,
        skills: skills || [],
        rating: rating || null,
        isPublic: true,
        isAccepted: false // Requires recipient approval
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
            headline: true,
            student: {
              select: {
                khmerName: true
              }
            },
            teacher: {
              select: {
                khmerName: true
              }
            }
          }
        },
        recipient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Recommendation sent successfully. Waiting for recipient approval.',
      data: recommendation
    });
  } catch (error) {
    console.error('Error writing recommendation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to write recommendation'
    });
  }
};

/**
 * Accept a recommendation
 * PUT /api/profile/recommendations/:recommendationId/accept
 */
export const acceptRecommendation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { recommendationId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Find recommendation
    const recommendation = await prisma.recommendation.findUnique({
      where: { id: recommendationId }
    });

    if (!recommendation) {
      return res.status(404).json({
        success: false,
        message: 'Recommendation not found'
      });
    }

    // Only recipient can accept
    if (recommendation.recipientId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only accept recommendations written for you'
      });
    }

    // Already accepted
    if (recommendation.isAccepted) {
      return res.status(400).json({
        success: false,
        message: 'Recommendation already accepted'
      });
    }

    const updatedRecommendation = await prisma.recommendation.update({
      where: { id: recommendationId },
      data: {
        isAccepted: true,
        acceptedAt: new Date()
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
            student: {
              select: {
                khmerName: true
              }
            },
            teacher: {
              select: {
                khmerName: true
              }
            }
          }
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Recommendation accepted successfully',
      data: updatedRecommendation
    });
  } catch (error) {
    console.error('Error accepting recommendation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to accept recommendation'
    });
  }
};

/**
 * Delete a recommendation
 * DELETE /api/profile/recommendations/:recommendationId
 */
export const deleteRecommendation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { recommendationId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Find recommendation
    const recommendation = await prisma.recommendation.findUnique({
      where: { id: recommendationId }
    });

    if (!recommendation) {
      return res.status(404).json({
        success: false,
        message: 'Recommendation not found'
      });
    }

    // Only recipient can delete (reject)
    if (recommendation.recipientId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete recommendations for your profile'
      });
    }

    await prisma.recommendation.delete({
      where: { id: recommendationId }
    });

    return res.status(200).json({
      success: true,
      message: 'Recommendation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting recommendation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete recommendation'
    });
  }
};
