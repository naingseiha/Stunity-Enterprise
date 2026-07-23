import { prisma } from '../context';
import { v4 as uuidv4 } from 'uuid';

export class CertificateService {
  /**
   * Issues a certificate for a given enrollment if not already issued.
   */
  static async issueCertificate(userId: string, courseId: string, enrollmentId: string) {
    // Check if certificate already exists
    let cert = await prisma.courseCertificate.findUnique({
      where: { enrollmentId },
    });

    if (cert) {
      return cert;
    }

    // Generate a clean verification code: eg. STU-A1B2C3D4
    const uuidClean = uuidv4().replace(/-/g, '').toUpperCase();
    const verificationCode = `STU-${uuidClean.substring(0, 10)}`;

    cert = await prisma.$transaction(async (tx: any) => {
      const newCert = await tx.courseCertificate.create({
        data: {
          verificationCode,
          enrollmentId,
          userId,
          courseId,
        },
      });

      // Update the enrollment with the certificate URL path
      await tx.enrollment.update({
        where: { id: enrollmentId },
        data: {
          certificateUrl: `/verify/${newCert.verificationCode}`,
        },
      });

      return newCert;
    });

    return cert;
  }
}
