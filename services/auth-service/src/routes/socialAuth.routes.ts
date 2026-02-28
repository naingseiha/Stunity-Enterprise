import { Router, Request, Response } from 'express';
import { PrismaClient, SocialProvider } from '@prisma/client';
import jwt from 'jsonwebtoken';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'stunity-enterprise-secret-2026';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';
const REFRESH_TOKEN_EXPIRATION = process.env.REFRESH_TOKEN_EXPIRATION || '365d';

// ─── Provider Token Verification ─────────────────────────────────────

interface ProviderProfile {
  provider: SocialProvider;
  providerUserId: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  rawProfile: any;
}

async function verifyGoogleToken(idToken: string): Promise<ProviderProfile> {
  const { OAuth2Client } = await import('google-auth-library');
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.email_verified) {
    throw new Error('Google email not verified');
  }
  return {
    provider: 'GOOGLE',
    providerUserId: payload.sub,
    email: payload.email!,
    displayName: payload.name || '',
    avatarUrl: payload.picture || '',
    rawProfile: payload,
  };
}

async function verifyAppleToken(identityToken: string, fullName?: any): Promise<ProviderProfile> {
  const appleSignin = await import('apple-signin-auth');

  const payload = await appleSignin.default.verifyIdToken(identityToken, {
    audience: process.env.APPLE_CLIENT_ID,
    ignoreExpiration: false,
  });

  // Apple only sends name on first login — use fullName from request body if available
  let displayName = '';
  if (fullName) {
    displayName = [fullName.givenName, fullName.familyName].filter(Boolean).join(' ');
  }

  return {
    provider: 'APPLE',
    providerUserId: payload.sub,
    email: payload.email || '',
    displayName,
    avatarUrl: '',
    rawProfile: payload,
  };
}

async function verifyFacebookToken(accessToken: string): Promise<ProviderProfile> {
  // Step 1: Verify token belongs to our app
  const debugUrl = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`;
  const debugRes = await fetch(debugUrl).then(r => r.json());

  if (!debugRes.data?.is_valid || debugRes.data.app_id !== process.env.FACEBOOK_APP_ID) {
    throw new Error('Invalid Facebook token');
  }

  // Step 2: Get user profile
  const profileUrl = `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`;
  const profile = await fetch(profileUrl).then(r => r.json());

  if (!profile.email) {
    throw new Error('Facebook email permission required. Please grant email access.');
  }

  return {
    provider: 'FACEBOOK',
    providerUserId: profile.id,
    email: profile.email,
    displayName: profile.name || '',
    avatarUrl: profile.picture?.data?.url || '',
    rawProfile: profile,
  };
}

async function verifyLinkedInCode(authorizationCode: string, redirectUri: string): Promise<ProviderProfile> {
  // Exchange authorization code for access token
  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: authorizationCode,
      redirect_uri: redirectUri,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  }).then(r => r.json());

  if (!tokenRes.access_token) throw new Error('LinkedIn token exchange failed');

  // Get user profile via OpenID Connect
  const profile = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenRes.access_token}` },
  }).then(r => r.json());

  return {
    provider: 'LINKEDIN',
    providerUserId: profile.sub,
    email: profile.email,
    displayName: profile.name || '',
    avatarUrl: profile.picture || '',
    rawProfile: profile,
  };
}

// ─── Unified Social Login Handler ────────────────────────────────────

async function handleSocialLogin(
  prisma: PrismaClient,
  providerData: ProviderProfile,
  claimCode?: string,
) {
  // 1. Check if social account already linked (returning user)
  let socialAccount = await prisma.socialAccount.findUnique({
    where: {
      provider_providerUserId: {
        provider: providerData.provider,
        providerUserId: providerData.providerUserId,
      },
    },
    include: { user: { include: { school: true } } },
  });

  let user;

  if (socialAccount) {
    user = socialAccount.user;
  } else {
    // Check if email already exists
    user = await prisma.user.findUnique({
      where: { email: providerData.email },
      include: { school: true },
    });

    if (user) {
      // Link social account to existing user
      await prisma.socialAccount.create({
        data: {
          userId: user.id,
          provider: providerData.provider,
          providerUserId: providerData.providerUserId,
          email: providerData.email,
          displayName: providerData.displayName,
          avatarUrl: providerData.avatarUrl,
          rawProfile: providerData.rawProfile,
        },
      });
    } else {
      // Brand new user
      const nameParts = providerData.displayName.split(' ');
      user = await prisma.user.create({
        data: {
          email: providerData.email,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          password: '',
          role: 'STUDENT',
          accountType: 'SOCIAL_ONLY',
          isEmailVerified: true,
          profilePictureUrl: providerData.avatarUrl,
          socialFeaturesEnabled: true,
          socialAccounts: {
            create: {
              provider: providerData.provider,
              providerUserId: providerData.providerUserId,
              email: providerData.email,
              displayName: providerData.displayName,
              avatarUrl: providerData.avatarUrl,
              rawProfile: providerData.rawProfile,
            },
          },
        },
        include: { school: true },
      });
    }
  }

  // 2. Validate user is active
  if (!user.isActive) {
    throw new Error('Account is deactivated');
  }

  // 3. Process claim code if provided
  if (claimCode && !user.schoolId) {
    const code = await prisma.claimCode.findFirst({
      where: { code: claimCode, isActive: true, claimedByUserId: null },
    });
    if (code) {
      await prisma.user.update({
        where: { id: user.id },
        data: { schoolId: code.schoolId },
      });
      await prisma.claimCode.update({
        where: { id: code.id },
        data: { isActive: false, claimedByUserId: user.id, claimedAt: new Date() },
      });
      // Refetch user with school
      user = await prisma.user.findUnique({
        where: { id: user.id },
        include: { school: true },
      }) as any;
    }
  }

  // 4. Check 2FA
  const twoFactor = await prisma.twoFactorSecret.findUnique({
    where: { userId: user.id },
  });

  if (twoFactor?.isEnabled) {
    const challengeToken = jwt.sign(
      { userId: user.id, purpose: '2fa_challenge' },
      JWT_SECRET,
      { expiresIn: '5m' }
    );
    return { requires2FA: true, challengeToken };
  }

  // 5. Issue Stunity JWT
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

  // 6. Update login metadata
  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLogin: new Date(),
      loginCount: { increment: 1 },
      failedAttempts: 0,
      lockedUntil: null,
    },
  });

  return {
    requires2FA: false,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      profilePictureUrl: user.profilePictureUrl,
      schoolId: user.schoolId,
    },
    school: user.school,
    tokens: { accessToken, refreshToken, expiresIn: JWT_EXPIRATION },
  };
}

// ─── Routes ──────────────────────────────────────────────────────────

export default function socialAuthRoutes(prisma: PrismaClient) {
  // POST /auth/social/google
  router.post('/google', async (req: Request, res: Response) => {
    try {
      if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(501).json({ success: false, error: 'Google login not configured. Set GOOGLE_CLIENT_ID.' });
      }
      const { idToken, claimCode } = req.body;
      if (!idToken) {
        return res.status(400).json({ success: false, error: 'idToken is required' });
      }

      const profile = await verifyGoogleToken(idToken);
      const result = await handleSocialLogin(prisma, profile, claimCode);

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Google login error:', error.message);
      res.status(401).json({ success: false, error: error.message || 'Google login failed' });
    }
  });

  // POST /auth/social/apple
  router.post('/apple', async (req: Request, res: Response) => {
    try {
      if (!process.env.APPLE_CLIENT_ID) {
        return res.status(501).json({ success: false, error: 'Apple login not configured. Set APPLE_CLIENT_ID.' });
      }
      const { identityToken, fullName, claimCode } = req.body;
      if (!identityToken) {
        return res.status(400).json({ success: false, error: 'identityToken is required' });
      }

      const profile = await verifyAppleToken(identityToken, fullName);
      const result = await handleSocialLogin(prisma, profile, claimCode);

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Apple login error:', error.message);
      res.status(401).json({ success: false, error: error.message || 'Apple login failed' });
    }
  });

  // POST /auth/social/facebook
  router.post('/facebook', async (req: Request, res: Response) => {
    try {
      if (!process.env.FACEBOOK_APP_ID) {
        return res.status(501).json({ success: false, error: 'Facebook login not configured. Set FACEBOOK_APP_ID.' });
      }
      const { accessToken, claimCode } = req.body;
      if (!accessToken) {
        return res.status(400).json({ success: false, error: 'accessToken is required' });
      }

      const profile = await verifyFacebookToken(accessToken);
      const result = await handleSocialLogin(prisma, profile, claimCode);

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Facebook login error:', error.message);
      res.status(401).json({ success: false, error: error.message || 'Facebook login failed' });
    }
  });

  // POST /auth/social/linkedin
  router.post('/linkedin', async (req: Request, res: Response) => {
    try {
      if (!process.env.LINKEDIN_CLIENT_ID) {
        return res.status(501).json({ success: false, error: 'LinkedIn login not configured. Set LINKEDIN_CLIENT_ID.' });
      }
      const { authorizationCode, redirectUri, claimCode } = req.body;
      if (!authorizationCode || !redirectUri) {
        return res.status(400).json({ success: false, error: 'authorizationCode and redirectUri are required' });
      }

      const profile = await verifyLinkedInCode(authorizationCode, redirectUri);
      const result = await handleSocialLogin(prisma, profile, claimCode);

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('LinkedIn login error:', error.message);
      res.status(401).json({ success: false, error: error.message || 'LinkedIn login failed' });
    }
  });

  // POST /auth/social/link (authenticated — link additional provider)
  router.post('/link', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, error: 'Access token required' });

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const { provider, idToken, accessToken: fbToken, identityToken, authorizationCode, redirectUri } = req.body;

      let profile: ProviderProfile;
      switch (provider?.toUpperCase()) {
        case 'GOOGLE': profile = await verifyGoogleToken(idToken); break;
        case 'APPLE': profile = await verifyAppleToken(identityToken); break;
        case 'FACEBOOK': profile = await verifyFacebookToken(fbToken); break;
        case 'LINKEDIN': profile = await verifyLinkedInCode(authorizationCode, redirectUri); break;
        default: return res.status(400).json({ success: false, error: 'Invalid provider' });
      }

      // Check if this provider account is already linked to another user
      const existing = await prisma.socialAccount.findUnique({
        where: {
          provider_providerUserId: {
            provider: profile.provider,
            providerUserId: profile.providerUserId,
          },
        },
      });

      if (existing && existing.userId !== decoded.userId) {
        return res.status(409).json({
          success: false,
          error: 'This social account is already linked to another user.',
        });
      }

      if (existing) {
        return res.json({ success: true, message: 'Provider already linked.' });
      }

      await prisma.socialAccount.create({
        data: {
          userId: decoded.userId,
          provider: profile.provider,
          providerUserId: profile.providerUserId,
          email: profile.email,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          rawProfile: profile.rawProfile,
        },
      });

      res.json({ success: true, message: `${provider} account linked successfully.` });
    } catch (error: any) {
      console.error('Link provider error:', error.message);
      res.status(400).json({ success: false, error: error.message || 'Failed to link provider' });
    }
  });

  // DELETE /auth/social/unlink/:provider (authenticated)
  router.delete('/unlink/:provider', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, error: 'Access token required' });

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const provider = req.params.provider.toUpperCase() as SocialProvider;

      // Check user has at least one other login method
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { socialAccounts: true },
      });

      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      const hasPassword = user.password && user.password.length > 0;
      const otherProviders = user.socialAccounts.filter(sa => sa.provider !== provider);

      if (!hasPassword && otherProviders.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot unlink — this is your only login method. Set a password first.',
        });
      }

      await prisma.socialAccount.deleteMany({
        where: { userId: decoded.userId, provider },
      });

      res.json({ success: true, message: `${provider} account unlinked.` });
    } catch (error: any) {
      console.error('Unlink provider error:', error.message);
      res.status(400).json({ success: false, error: error.message || 'Failed to unlink provider' });
    }
  });

  return router;
}
