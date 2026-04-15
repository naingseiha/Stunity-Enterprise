import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export class ReviewController {
  /**
   * GET /courses/:courseId/reviews - List reviews and stats
   */
  static async listReviews(req: Request, res: Response) {
    try {
      const { courseId } = req.params;

      const reviews = await prisma.courseReview.findMany({
        where: { courseId },
        include: {
          user: {
            select: { firstName: true, lastName: true, role: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Calculate stats
      const totalReviews = reviews.length;
      const averageRating = totalReviews > 0
        ? reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews
        : 0;

      const ratingDistribution = [1, 2, 3, 4, 5].map(star => ({
        rating: star,
        count: reviews.filter(r => r.rating === star).length,
        percentage: totalReviews > 0
          ? Math.round((reviews.filter(r => r.rating === star).length / totalReviews) * 100)
          : 0
      })).reverse();

      res.json({
        reviews,
        stats: {
          averageRating: Number(averageRating.toFixed(1)),
          totalReviews,
          ratingDistribution
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: 'Error fetching reviews', error: error.message });
    }
  }

  /**
   * POST /courses/:courseId/reviews - Create or update review
   */
  static async submitReview(req: AuthRequest, res: Response) {
    try {
      const { courseId } = req.params;
      const userId = req.user?.id;
      const { rating, comment } = req.body;

      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      // Upsert: Create or update based on unique constraint
      const review = await prisma.courseReview.upsert({
        where: {
          userId_courseId: { userId, courseId }
        },
        update: {
          rating: Number(rating),
          comment
        },
        create: {
          courseId,
          userId,
          rating: Number(rating),
          comment
        },
        include: {
          user: {
            select: { firstName: true, lastName: true, role: true }
          }
        }
      });

      res.json({ review });
    } catch (error: any) {
      res.status(500).json({ message: 'Error submitting review', error: error.message });
    }
  }
}
