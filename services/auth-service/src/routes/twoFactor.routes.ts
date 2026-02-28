import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'stunity-enterprise-secret-2026';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';
const REFRESH_TOKEN_EXPIRATION = process.env.REFRESH_TOKEN_EXPIRATION || '365d';

const twoFactorLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many 2FA attempts. Try again in 5 minutes.' },
});

// Helper: decode auth token
function decodeAuthToken(req: Request): any {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) throw new Error('Access token required');
  return jwt.verify(token, JWT_SECRET);
}

export default function twoFactorRoutes(prisma: PrismaClient) {
  // POST /auth/2fa/setup (authenticated)
  router.post('/setup', async (req: Request, res: Response) => {
    try {
      const decoded = decodeAuthToken(req) as any;
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      const OTPAuth = await import('otpauth');

      const totp = new OTPAuth.TOTP({
        issuer: 'Stunity',
        label: user.email || user.id,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: new OTPAuth.Secret({ size: 20 }),
      });

      // Store secret (not yet enabled)
      await prisma.twoFactorSecret.upsert({
        where: { userId: user.id },
        create: { userId: user.id, secret: totp.secret.base32, isEnabled: false },
        update: { secret: totp.secret.base32, isEnabled: false, verifiedAt: null },
      });

      // Generate QR code
      const QRCode = await import('qrcode');
      const qrDataUrl = await QRCode.default.toDataURL(totp.toString());

      res.json({
        success: true,
        data: {
          qrCode: qrDataUrl,
          manualEntry: totp.secret.base32,
          message: 'Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)',
        },
      });
    } catch (error: any) {
      console.error('2FA setup error:', error.message);
      res.status(error.message === 'Access token required' ? 401 : 500).json({
        success: false, error: error.message || 'Failed to setup 2FA',
      });
    }
  });

  // POST /auth/2fa/verify-setup (authenticated — first-time enable)
  router.post('/verify-setup', async (req: Request, res: Response) => {
    try {
      const decoded = decodeAuthToken(req) as any;
      const { code } = req.body;
      if (!code) return res.status(400).json({ success: false, error: '6-digit code is required' });

      const record = await prisma.twoFactorSecret.findUnique({
        where: { userId: decoded.userId },
      });
      if (!record) return res.status(400).json({ success: false, error: '2FA not set up. Call /auth/2fa/setup first.' });

      const OTPAuth = await import('otpauth');
      const totp = new OTPAuth.TOTP({
        issuer: 'Stunity',
        label: '',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(record.secret),
      });

      const delta = totp.validate({ token: code, window: 1 });
      if (delta === null) {
        return res.status(400).json({ success: false, error: 'Invalid code. Make sure your authenticator is synced.' });
      }

      // Generate 10 backup codes
      const backupCodes = Array.from({ length: 10 }, () =>
        crypto.randomBytes(4).toString('hex').toUpperCase()
      );
      const hashedBackupCodes = await Promise.all(
        backupCodes.map(c => bcrypt.hash(c, 10))
      );

      await prisma.twoFactorSecret.update({
        where: { userId: decoded.userId },
        data: {
          isEnabled: true,
          verifiedAt: new Date(),
          backupCodes: hashedBackupCodes,
        },
      });

      res.json({
        success: true,
        data: {
          backupCodes,
          message: 'Two-factor authentication enabled. Save these backup codes — they will not be shown again.',
        },
      });
    } catch (error: any) {
      console.error('2FA verify-setup error:', error.message);
      res.status(500).json({ success: false, error: error.message || 'Failed to verify 2FA setup' });
    }
  });

  // POST /auth/2fa/verify (during login — with challenge token)
  router.post('/verify', twoFactorLimiter, async (req: Request, res: Response) => {
    try {
      const { challengeToken, code } = req.body;
      if (!challengeToken || !code) {
        return res.status(400).json({ success: false, error: 'challengeToken and code are required' });
      }

      const decoded = jwt.verify(challengeToken, JWT_SECRET) as any;
      if (decoded.purpose !== '2fa_challenge') {
        return res.status(400).json({ success: false, error: 'Invalid challenge token' });
      }

      const record = await prisma.twoFactorSecret.findUnique({
        where: { userId: decoded.userId },
      });
      if (!record?.isEnabled) {
        return res.status(400).json({ success: false, error: '2FA not enabled' });
      }

      // Try TOTP code
      const OTPAuth = await import('otpauth');
      const totp = new OTPAuth.TOTP({
        issuer: 'Stunity',
        label: '',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(record.secret),
      });

      let isValid = totp.validate({ token: code, window: 1 }) !== null;

      // If TOTP fails, try backup codes
      if (!isValid) {
        for (let i = 0; i < record.backupCodes.length; i++) {
          if (await bcrypt.compare(code.toUpperCase(), record.backupCodes[i])) {
            isValid = true;
            const updatedCodes = [...record.backupCodes];
            updatedCodes.splice(i, 1);
            await prisma.twoFactorSecret.update({
              where: { userId: decoded.userId },
              data: { backupCodes: updatedCodes },
            });
            break;
          }
        }
      }

      if (!isValid) {
        return res.status(400).json({ success: false, error: 'Invalid 2FA code' });
      }

      // Issue full JWT
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { school: true },
      });

      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      const accessToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          schoolId: user.schoolId,
          school: user.school ? {
            id: user.school.id,
            name: user.school.name,
            isActive: user.school.isActive,
          } : null,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION } as jwt.SignOptions
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRATION } as jwt.SignOptions
      );

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date(), loginCount: { increment: 1 } },
      });

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            schoolId: user.schoolId,
          },
          school: user.school,
          tokens: { accessToken, refreshToken, expiresIn: JWT_EXPIRATION },
        },
      });
    } catch (error: any) {
      console.error('2FA verify error:', error.message);
      res.status(400).json({ success: false, error: error.message || '2FA verification failed' });
    }
  });

  // POST /auth/2fa/disable (authenticated, requires current TOTP)
  router.post('/disable', async (req: Request, res: Response) => {
    try {
      const decoded = decodeAuthToken(req) as any;
      const { code } = req.body;
      if (!code) return res.status(400).json({ success: false, error: 'Current 2FA code is required to disable' });

      const record = await prisma.twoFactorSecret.findUnique({
        where: { userId: decoded.userId },
      });
      if (!record?.isEnabled) {
        return res.status(400).json({ success: false, error: '2FA is not enabled' });
      }

      const OTPAuth = await import('otpauth');
      const totp = new OTPAuth.TOTP({
        issuer: 'Stunity',
        label: '',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(record.secret),
      });

      if (totp.validate({ token: code, window: 1 }) === null) {
        return res.status(400).json({ success: false, error: 'Invalid 2FA code' });
      }

      await prisma.twoFactorSecret.delete({ where: { userId: decoded.userId } });

      res.json({ success: true, message: 'Two-factor authentication disabled.' });
    } catch (error: any) {
      console.error('2FA disable error:', error.message);
      res.status(500).json({ success: false, error: error.message || 'Failed to disable 2FA' });
    }
  });

  // POST /auth/2fa/backup-codes (authenticated — regenerate)
  router.post('/backup-codes', async (req: Request, res: Response) => {
    try {
      const decoded = decodeAuthToken(req) as any;
      const { code } = req.body;
      if (!code) return res.status(400).json({ success: false, error: 'Current 2FA code is required' });

      const record = await prisma.twoFactorSecret.findUnique({
        where: { userId: decoded.userId },
      });
      if (!record?.isEnabled) {
        return res.status(400).json({ success: false, error: '2FA is not enabled' });
      }

      const OTPAuth = await import('otpauth');
      const totp = new OTPAuth.TOTP({
        issuer: 'Stunity',
        label: '',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(record.secret),
      });

      if (totp.validate({ token: code, window: 1 }) === null) {
        return res.status(400).json({ success: false, error: 'Invalid 2FA code' });
      }

      const backupCodes = Array.from({ length: 10 }, () =>
        crypto.randomBytes(4).toString('hex').toUpperCase()
      );
      const hashedBackupCodes = await Promise.all(
        backupCodes.map(c => bcrypt.hash(c, 10))
      );

      await prisma.twoFactorSecret.update({
        where: { userId: decoded.userId },
        data: { backupCodes: hashedBackupCodes },
      });

      res.json({
        success: true,
        data: {
          backupCodes,
          message: 'New backup codes generated. Save them — old codes are now invalid.',
        },
      });
    } catch (error: any) {
      console.error('2FA backup-codes error:', error.message);
      res.status(500).json({ success: false, error: error.message || 'Failed to regenerate backup codes' });
    }
  });

  return router;
}
