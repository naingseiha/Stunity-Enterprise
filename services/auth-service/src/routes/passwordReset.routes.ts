import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';

const router = Router();

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Strict rate limit for password reset
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, error: 'Too many reset attempts. Try again in 1 hour.' },
});

// ─── Password Policy (shared with index.ts — could be extracted to utils later) ───
const COMMON_PASSWORDS = new Set([
  'password', '123456', '12345678', 'qwerty', 'abc123', 'password1',
  'iloveyou', 'admin', 'letmein', 'welcome', 'monkey', 'master',
  'dragon', 'login', 'princess', 'football', 'shadow', 'sunshine',
  'trustno1', 'password123', 'stunity', 'stunity123',
]);

function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 8) errors.push('At least 8 characters required');
  if (password.length > 128) errors.push('Maximum 128 characters');
  if (!/[A-Z]/.test(password)) errors.push('At least 1 uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('At least 1 lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('At least 1 number');
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) errors.push('At least 1 special character');
  if (COMMON_PASSWORDS.has(password.toLowerCase())) errors.push('This password is too common');
  return { isValid: errors.length === 0, errors };
}

// ─── Email sending (pluggable — console.log for dev, Resend for production) ───
async function sendResetEmail(email: string, token: string): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  if (process.env.RESEND_API_KEY) {
    // Production: Use Resend (free 3,000 emails/month)
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.FROM_EMAIL || 'Stunity <noreply@stunity.com>',
      to: email,
      subject: 'Reset your Stunity password',
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
          <h2 style="color:#0EA5E9;">Reset Your Password</h2>
          <p>Click the button below to reset your password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display:inline-block;background:#0EA5E9;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">
            Reset Password
          </a>
          <p style="color:#6B7280;font-size:14px;margin-top:24px;">If you didn't request this, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0;" />
          <p style="color:#9CA3AF;font-size:12px;">Stunity Enterprise — Secure E-Learning Platform</p>
        </div>
      `,
    });
    console.log(`📧 Reset email sent to ${email}`);
  } else {
    // Development: Log to console
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('📧 PASSWORD RESET EMAIL (dev mode — no RESEND_API_KEY)');
    console.log(`   To: ${email}`);
    console.log(`   Reset URL: ${resetUrl}`);
    console.log(`   Token: ${token}`);
    console.log('   Expires: 1 hour');
    console.log('═══════════════════════════════════════════════');
    console.log('');
  }
}

export default function passwordResetRoutes(prisma: PrismaClient) {
  // POST /auth/forgot-password
  router.post('/forgot-password', resetLimiter, async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required' });
      }

      // Always return success to prevent email enumeration
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.json({
          success: true,
          message: 'If that email exists, a reset link has been sent.',
        });
      }

      // Generate secure token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: hashedToken,
          passwordResetExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      // Send email (Resend in prod, console.log in dev)
      await sendResetEmail(user.email!, resetToken);

      res.json({
        success: true,
        message: 'If that email exists, a reset link has been sent.',
      });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      res.status(500).json({ success: false, error: 'Failed to process request' });
    }
  });

  // POST /auth/reset-password
  router.post('/reset-password', resetLimiter, async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ success: false, error: 'Token and new password are required' });
      }

      // Validate password strength
      const passwordCheck = validatePassword(newPassword);
      if (!passwordCheck.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Password does not meet requirements',
          details: passwordCheck.errors,
        });
      }

      // Hash the submitted token and look up
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      const user = await prisma.user.findFirst({
        where: {
          passwordResetToken: hashedToken,
          passwordResetExpiry: { gt: new Date() },
        },
      });

      if (!user) {
        return res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
      }

      // Check password not in recent history (last 5)
      const hashesToCheck = [user.password, ...(user.lastPasswordHashes || [])].slice(0, 5);
      for (const hash of hashesToCheck) {
        if (hash && await bcrypt.compare(newPassword, hash)) {
          return res.status(400).json({
            success: false,
            error: 'Cannot reuse a recent password. Choose a new one.',
          });
        }
      }

      // Hash new password and save
      const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

      // Keep last 5 password hashes for reuse prevention
      const updatedHashes = [user.password, ...(user.lastPasswordHashes || [])].slice(0, 4);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpiry: null,
          passwordChangedAt: new Date(),
          failedAttempts: 0,
          lockedUntil: null,
          isDefaultPassword: false,
          lastPasswordHashes: updatedHashes,
        },
      });

      console.log(`✅ Password reset successful for: ${user.email}`);

      res.json({
        success: true,
        message: 'Password reset successful. Please log in with your new password.',
      });
    } catch (error: any) {
      console.error('Reset password error:', error);
      res.status(500).json({ success: false, error: 'Failed to reset password' });
    }
  });

  // POST /auth/change-password (authenticated)
  router.post('/change-password', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers['authorization'];
      const authToken = authHeader && authHeader.split(' ')[1];
      if (!authToken) {
        return res.status(401).json({ success: false, error: 'Access token required' });
      }

      const jwt = await import('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'stunity-enterprise-secret-2026';
      const decoded = jwt.default.verify(authToken, JWT_SECRET) as any;

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, error: 'Current and new password are required' });
      }

      const passwordCheck = validatePassword(newPassword);
      if (!passwordCheck.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Password does not meet requirements',
          details: passwordCheck.errors,
        });
      }

      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(400).json({ success: false, error: 'Current password is incorrect' });
      }

      // Check password history
      const hashesToCheck = [user.password, ...(user.lastPasswordHashes || [])].slice(0, 5);
      for (const hash of hashesToCheck) {
        if (hash && await bcrypt.compare(newPassword, hash)) {
          return res.status(400).json({
            success: false,
            error: 'Cannot reuse a recent password. Choose a new one.',
          });
        }
      }

      const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      const updatedHashes = [user.password, ...(user.lastPasswordHashes || [])].slice(0, 4);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordChangedAt: new Date(),
          isDefaultPassword: false,
          lastPasswordHashes: updatedHashes,
        },
      });

      res.json({ success: true, message: 'Password changed successfully. Please log in again.' });
    } catch (error: any) {
      console.error('Change password error:', error);
      res.status(500).json({ success: false, error: 'Failed to change password' });
    }
  });

  return router;
}
