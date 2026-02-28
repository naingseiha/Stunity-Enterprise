import { Router, Request, Response } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from 'passport-google-oauth20';
import { OIDCStrategy } from 'passport-azure-ad';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import * as ssoCodeStore from '../utils/ssoCodeStore';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'stunity-enterprise-secret-2026';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';
const REFRESH_TOKEN_EXPIRATION = process.env.REFRESH_TOKEN_EXPIRATION || '365d';

export default function ssoRoutes(prisma: PrismaClient) {
  // ─── Initialize Passport ──────────────────────────────────────────
  router.use(passport.initialize());

  // ─── POST /auth/sso/exchange - Exchange short-lived code for tokens (no tokens in URL) ───
  router.post('/exchange', async (req: Request, res: Response) => {
    try {
      const { code } = req.body;
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ success: false, error: 'Code is required' });
      }
      const data = ssoCodeStore.consumeCode(code);
      if (!data) {
        return res.status(401).json({ success: false, error: 'Invalid or expired code. Please try again.' });
      }
      res.json({
        success: true,
        data: {
          user: data.user,
          school: data.school,
          tokens: {
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            expiresIn: JWT_EXPIRATION,
          },
        },
      });
    } catch (error: any) {
      console.error('SSO exchange error:', error.message);
      res.status(500).json({ success: false, error: 'Exchange failed' });
    }
  });

  // ─── Helper function to issue tokens ────────────────────────────────
  const handleSSOSuccess = async (req: Request, res: Response, userEmail: string, provider: string, displayName: string, avatarUrl: string) => {
    try {
      // 1. Look up user by email
      let user = await prisma.user.findUnique({
        where: { email: userEmail },
        include: { school: true },
      });

      if (!user) {
        // Auto-provision basic social user if not found (matching socialAuth behavior)
        const nameParts = displayName.split(' ');
        user = await prisma.user.create({
          data: {
            email: userEmail,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            password: '',
            role: 'STUDENT',
            accountType: 'SOCIAL_ONLY',
            isEmailVerified: true,
            profilePictureUrl: avatarUrl || '',
            socialFeaturesEnabled: true,
          },
          include: { school: true },
        });
      }

      if (!user.isActive) {
        return res.status(403).json({ success: false, error: 'Account is deactivated' });
      }

      // 2. Issue Stunity JWT
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

      // 3. Update login metadata
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLogin: new Date(),
          loginCount: { increment: 1 },
          failedAttempts: 0,
          lockedUntil: null,
        },
      });

      // 4. Create short-lived code and redirect (no tokens in URL)
      const code = ssoCodeStore.createCode(
        accessToken,
        refreshToken,
        {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          profilePictureUrl: user.profilePictureUrl,
          schoolId: user.schoolId,
        },
        user.school
      );

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = new URL(frontendUrl + '/en/auth/login');
      redirectUrl.searchParams.append('code', code);
      redirectUrl.searchParams.append('sso', 'success');

      return res.redirect(redirectUrl.toString());
    } catch (error: any) {
      console.error('SSO Login Error:', error.message);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/en/auth/login?error=sso_failed`);
    }
  };

  // ─── Google Workspace Strategy ────────────────────────────────────
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${process.env.API_BASE_URL || 'http://localhost:3001'}/auth/sso/google-workspace/callback`,
        },
        (accessToken, refreshToken, profile, done) => {
          // Pass profile to Express middleware
          return done(null, profile);
        }
      )
    );

    router.get(
      '/google-workspace',
      passport.authenticate('google', { scope: ['profile', 'email'] })
    );

    router.get(
      '/google-workspace/callback',
      passport.authenticate('google', { session: false, failureRedirect: '/en/auth/login?error=google_sso_failed' }),
      async (req: Request, res: Response) => {
        const profile = req.user as GoogleProfile;
        const email = profile.emails?.[0]?.value;
        const displayName = profile.displayName || '';
        const avatarUrl = profile.photos?.[0]?.value || '';

        if (!email) {
          return res.status(400).send('Google account has no email associated.');
        }

        await handleSSOSuccess(req, res, email, 'GOOGLE', displayName, avatarUrl);
      }
    );
  } else {
    router.get('/google-workspace', (req, res) => res.status(501).json({ error: 'Google Workspace SSO not configured' }));
  }

  // ─── Azure AD Strategy ────────────────────────────────────────────
  if (process.env.AZURE_CLIENT_ID && process.env.AZURE_TENANT_ID) {
    passport.use(
      new OIDCStrategy(
        {
          identityMetadata: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0/.well-known/openid-configuration`,
          clientID: process.env.AZURE_CLIENT_ID,
          responseType: 'code id_token',
          responseMode: 'form_post',
          redirectUrl: `${process.env.API_BASE_URL || 'http://localhost:3001'}/auth/sso/azure/callback`,
          allowHttpForRedirectUrl: process.env.NODE_ENV !== 'production',
          clientSecret: process.env.AZURE_CLIENT_SECRET,
          validateIssuer: false,
          passReqToCallback: false,
        },
        (iss: any, sub: any, profile: any, accessToken: any, refreshToken: any, done: any) => {
          return done(null, profile);
        }
      )
    );

    router.get(
      '/azure',
      passport.authenticate('azuread-openidconnect', { failureRedirect: '/en/auth/login?error=azure_sso_failed' })
    );

    router.post(
      '/azure/callback',
      passport.authenticate('azuread-openidconnect', { session: false, failureRedirect: '/en/auth/login?error=azure_sso_failed' }),
      async (req: Request, res: Response) => {
        const profile = req.user as any;
        const email = profile.upn || profile._json?.preferred_username || profile._json?.email;
        const displayName = profile.displayName || profile.name || '';
        const avatarUrl = ''; // Azure usually requires a separate Graph API call for avatar

        if (!email) {
          return res.status(400).send('Azure AD account has no email associated.');
        }

        await handleSSOSuccess(req, res, email, 'AZURE', displayName, avatarUrl);
      }
    );
  } else {
    router.get('/azure', (req, res) => res.status(501).json({ error: 'Azure AD SSO not configured' }));
    router.post('/azure/callback', (req, res) => res.status(501).json({ error: 'Azure AD SSO not configured' }));
  }

  return router;
}
