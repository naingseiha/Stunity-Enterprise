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
  // Mobile Deep Link: ensures the link opens the Stunity app directly
  const deepLink = `stunity://reset-password?token=${token}`;

  // Web Fallback: for users opening on desktop
  const webUrl = `${APP_URL}/reset-password?token=${token}`;

  const emailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; color: #1F2937;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #0EA5E9; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">Stunity</h1>
        <p style="color: #6B7280; margin-top: 4px; font-size: 14px; font-weight: 500;">Secure E-Learning Engine</p>
      </div>
      
      <div style="background: #F9FAFB; border-radius: 16px; padding: 32px; border: 1px solid #F3F4F6;">
        <h2 style="color: #111827; margin: 0 0 16px; font-size: 20px; font-weight: 700;">Reset Your Password</h2>
        <p style="margin: 0 0 24px; line-height: 24px; color: #4B5563;">
          We received a request to reset your password. Tap the button below to secure your account. This link expires in 1 hour.
        </p>
        
        <a href="${deepLink}" style="display: block; background: #0EA5E9; color: white; padding: 14px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; text-align: center; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(14, 165, 233, 0.2);">
          Open in Stunity App
        </a>
        
        <div style="margin-top: 24px; text-align: center;">
          <p style="font-size: 13px; color: #9CA3AF; margin-bottom: 8px;">Using a computer?</p>
          <a href="${webUrl}" style="color: #0EA5E9; text-decoration: underline; font-size: 13px; font-weight: 500;">
            Reset in browser
          </a>
        </div>
      </div>
      
      <p style="color: #9CA3AF; font-size: 13px; text-align: center; margin-top: 32px;">
        If you didn't request this, you can safely ignore this email.
      </p>
      <div style="border-top: 1px solid #E5E7EB; margin-top: 32px; padding-top: 24px; text-align: center;">
        <p style="color: #D1D5DB; font-size: 11px; margin: 0; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">
          Stunity Enterprise © 2026
        </p>
      </div>
    </div>
  `;

  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.FROM_EMAIL || 'Stunity <noreply@stunity.com>',
      to: email,
      subject: 'Reset your Stunity password',
      html: emailHtml,
    });
    console.log(`📧 Reset email sent to ${email}`);
  } else {
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('📧 PASSWORD RESET EMAIL (dev mode)');
    console.log(`   To: ${email}`);
    console.log(`   Deep Link: ${deepLink}`);
    console.log(`   Web URL:   ${webUrl}`);
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
