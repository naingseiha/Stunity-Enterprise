import { Request, Response } from 'express';
import { prisma } from '../context';

interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string; };
}

export class CertificateController {
  /**
   * GET /courses/:courseId/certificate
   * Gets the user's certificate for a specific course if they have completed it
   */
  static async getMyCertificate(req: AuthRequest, res: Response) {
    try {
      const { courseId } = req.params;
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      // Find enrollment
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } }
      });

      if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });
      
      const certificate = await prisma.courseCertificate.findUnique({
        where: { enrollmentId: enrollment.id },
        include: {
          course: {
            select: { title: true, instructor: { select: { firstName: true, lastName: true } } }
          },
          user: {
            select: { firstName: true, lastName: true }
          }
        }
      });

      if (!certificate) return res.status(404).json({ message: 'Certificate not found' });
      res.json(certificate);
    } catch(err: any) {
      res.status(500).json({ message: 'Error retrieving certificate', error: err.message });
    }
  }

  /**
   * GET /certificates/verify/:code
   * Public endpoint to verify a certificate
   */
  static async verifyCertificate(req: Request, res: Response) {
    try {
      const { code } = req.params;
      
      const certificate = await prisma.courseCertificate.findUnique({
        where: { verificationCode: code },
        include: {
          course: {
            select: { title: true, description: true, thumbnail: true, duration: true, instructor: { select: { firstName: true, lastName: true } } }
          },
          user: {
            select: { firstName: true, lastName: true, profilePictureUrl: true }
          }
        }
      });

      if (!certificate) {
        return res.status(404).json({ success: false, message: 'Invalid verification code' });
      }

      res.json({ success: true, certificate });
    } catch(err: any) {
      res.status(500).json({ success: false, message: 'Error verifying certificate', error: err.message });
    }
  }
}
