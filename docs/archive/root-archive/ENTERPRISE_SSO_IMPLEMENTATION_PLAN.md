# 🚀 Enterprise SSO & Authentication Implementation Plan

**Date:** February 10, 2026  
**Status:** Analysis Complete | Ready for Implementation  
**Priority:** HIGH - Core Enterprise Feature

---

## 📋 Executive Summary

After comprehensive analysis of the codebase, the **Enterprise SSO** feature added to the mobile UI is **NOT implemented in the backend**. Additionally, the standard **Student/Teacher registration** flow is missing entirely. This document provides a complete implementation plan to:

1. ✅ Add Enterprise SSO support (SAML/OAuth)
2. ✅ Implement student/teacher registration
3. ✅ Add organization/institution management
4. ✅ Complete mobile API integration

---

## 🔍 Current State Analysis

### What's Implemented ✅
| Feature | Database | Backend API | Mobile UI |
|---------|----------|-------------|-----------|
| **Parent Login** | ✅ Complete | ✅ Complete (Phone auth) | 🔄 Ready |
| **Teacher/Admin Login** | ✅ Complete | ✅ Complete (Email auth) | ✅ Complete |
| **Parent Registration** | ✅ Complete | ✅ Complete | 🔄 Ready |
| **Feed Service** | ✅ Complete | ✅ Complete | ✅ Complete (UI) |
| **Messaging** | ✅ Complete | ✅ Complete | 🔄 Ready |
| **Social Features** | ✅ Complete | ✅ Complete | ✅ Complete (UI) |

### What's Missing ❌
| Feature | Database | Backend API | Mobile UI |
|---------|----------|-------------|-----------|
| **Enterprise SSO** | ❌ No fields | ❌ Not implemented | ✅ UI added (button only) |
| **Student Registration** | ✅ Schema ready | ❌ No endpoint | ✅ UI added |
| **Teacher Registration** | ✅ Schema ready | ❌ No endpoint | ✅ UI added |
| **Organization Selection** | ❌ No fields | ❌ Not implemented | ✅ UI added (Step 2) |
| **Google/Apple OAuth** | ❌ No fields | ❌ Not implemented | ✅ UI added (buttons) |
| **Email Verification** | ❌ No fields | ❌ Not implemented | ✅ Notice added |

---

## 🗄️ Database Schema Updates Required

### 1. Add SSO & Organization Fields to User Model

**File:** `packages/database/prisma/schema.prisma`

```prisma
model User {
  // ... existing fields ...
  
  // SSO Authentication
  ssoProvider          String?              // 'google', 'apple', 'microsoft', 'saml'
  ssoId                String?              @unique
  ssoEmail             String?
  ssoAccessToken       String?
  ssoRefreshToken      String?
  ssoTokenExpiry       DateTime?
  
  // Organization/Institution
  organizationCode     String?              // Institution code
  organizationType     OrganizationType?    // university, school, corporate, other
  organizationName     String?
  organizationDomain   String?              // For domain-based SSO
  
  // Email Verification
  isEmailVerified      Boolean              @default(false)
  emailVerifiedAt      DateTime?
  emailVerificationToken String?           @unique
  emailVerificationExpiry DateTime?
  
  // ... rest of fields ...
  
  @@index([ssoProvider, ssoId])
  @@index([organizationCode])
  @@index([organizationDomain])
  @@index([isEmailVerified])
}

enum OrganizationType {
  UNIVERSITY
  SCHOOL
  CORPORATE
  OTHER
}
```

### 2. Create Organization Model (Optional - for multi-tenancy)

```prisma
model Organization {
  id                String   @id @default(cuid())
  name              String
  code              String   @unique
  type              OrganizationType
  domain            String?  @unique  // For email domain matching
  logoUrl           String?
  
  // SSO Configuration
  ssoEnabled        Boolean  @default(false)
  ssoProvider       String?  // 'saml', 'oauth'
  ssoMetadataUrl    String?
  ssoEntityId       String?
  ssoSignOnUrl      String?
  ssoX509Cert       String?
  
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  users             User[]
  
  @@map("organizations")
}
```

### Migration Command
```bash
cd packages/database
npx prisma migrate dev --name add_sso_and_organization_fields
npx prisma generate
```

---

## 🔧 Backend API Implementation

### Phase 1: Standard Registration Endpoints

**File:** `services/auth-service/src/index.ts`

#### 1.1 Student Registration
```typescript
app.post('/auth/register/student',
  body('firstName').notEmpty(),
  body('lastName').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
  body('organization').optional(),
  body('organizationType').optional(),
  async (req: Request, res: Response) => {
    // Implementation
    const { firstName, lastName, email, password, organization, organizationType } = req.body;
    
    // 1. Check if email exists
    // 2. Hash password
    // 3. Create user with role: STUDENT
    // 4. Send verification email
    // 5. Return JWT token
  }
);
```

#### 1.2 Teacher Registration
```typescript
app.post('/auth/register/teacher',
  body('firstName').notEmpty(),
  body('lastName').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
  body('organization').notEmpty(),
  body('organizationType').notEmpty(),
  body('professionalTitle').optional(),
  async (req: Request, res: Response) => {
    // Implementation
  }
);
```

#### 1.3 Email Verification
```typescript
app.get('/auth/verify-email/:token', async (req, res) => {
  // 1. Find user by verification token
  // 2. Check if token expired
  // 3. Update isEmailVerified = true
  // 4. Return success
});
```

### Phase 2: OAuth Social Login (Google/Apple)

**Dependencies:**
```bash
npm install passport passport-google-oauth20 passport-apple
npm install @types/passport @types/passport-google-oauth20 --save-dev
```

#### 2.1 Google OAuth
```typescript
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  // Find or create user
  // Store SSO info
}));

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google'), (req, res) => {
  // Generate JWT
  // Redirect to mobile app with token
});
```

#### 2.2 Apple Sign In
```typescript
import { Strategy as AppleStrategy } from 'passport-apple';

passport.use(new AppleStrategy({
  clientID: process.env.APPLE_CLIENT_ID,
  teamID: process.env.APPLE_TEAM_ID,
  keyID: process.env.APPLE_KEY_ID,
  privateKeyLocation: process.env.APPLE_PRIVATE_KEY_PATH,
  callbackURL: '/auth/apple/callback'
}, async (accessToken, refreshToken, profile, done) => {
  // Find or create user
}));

app.post('/auth/apple', passport.authenticate('apple'));
app.post('/auth/apple/callback', passport.authenticate('apple'), (req, res) => {
  // Generate JWT
});
```

### Phase 3: Enterprise SSO (SAML)

**Dependencies:**
```bash
npm install passport-saml
npm install @types/passport-saml --save-dev
```

#### 3.1 SAML Configuration
```typescript
import { Strategy as SamlStrategy } from 'passport-saml';

// Dynamic SAML strategy per organization
const getSamlStrategy = (organization: Organization) => {
  return new SamlStrategy({
    entryPoint: organization.ssoSignOnUrl,
    issuer: organization.ssoEntityId,
    cert: organization.ssoX509Cert,
    callbackUrl: '/auth/saml/callback'
  }, async (profile, done) => {
    // Find or create user from SAML profile
  });
};

app.post('/auth/sso/login', async (req, res) => {
  const { organizationCode } = req.body;
  
  // 1. Find organization by code
  // 2. Check if SSO enabled
  // 3. Initialize SAML flow
  // 4. Redirect to IdP
});

app.post('/auth/saml/callback', async (req, res) => {
  // Handle SAML response
  // Generate JWT
  // Redirect to app
});
```

#### 3.2 Organization Lookup
```typescript
app.get('/auth/organization/:code', async (req, res) => {
  const { code } = req.params;
  
  const organization = await prisma.organization.findUnique({
    where: { code },
    select: {
      id: true,
      name: true,
      type: true,
      ssoEnabled: true,
      ssoProvider: true
    }
  });
  
  res.json({ success: true, data: organization });
});
```

---

## 📱 Mobile App Integration

### Phase 4: Mobile Auth Store Updates

**File:** `apps/mobile/src/stores/authStore.ts`

#### 4.1 Add Registration Methods
```typescript
interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'STUDENT' | 'TEACHER' | 'PARENT';
  organization?: string;
  organizationType?: string;
}

register: async (data: RegisterData) => {
  try {
    const response = await fetch(`${API_URL}/auth/register/${data.role.toLowerCase()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Save token
      await AsyncStorage.setItem('authToken', result.data.token);
      set({ user: result.data.user, isAuthenticated: true });
      return true;
    }
    
    set({ error: result.error });
    return false;
  } catch (error) {
    set({ error: 'Registration failed' });
    return false;
  }
}
```

#### 4.2 Add Social Login Methods
```typescript
loginWithGoogle: async () => {
  try {
    // Use Google Sign-In SDK
    const result = await GoogleSignin.signIn();
    
    // Send to backend
    const response = await fetch(`${API_URL}/auth/google/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: result.idToken })
    });
    
    // Handle response
  } catch (error) {
    set({ error: 'Google login failed' });
  }
},

loginWithApple: async () => {
  try {
    // Use Apple Authentication
    const appleAuthRequestResponse = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    
    // Send to backend
    const response = await fetch(`${API_URL}/auth/apple/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        identityToken: appleAuthRequestResponse.identityToken,
        user: appleAuthRequestResponse.user
      })
    });
    
    // Handle response
  } catch (error) {
    set({ error: 'Apple login failed' });
  }
},

loginWithSSO: async (organizationCode: string) => {
  try {
    // Open SSO flow in browser
    const result = await WebBrowser.openAuthSessionAsync(
      `${API_URL}/auth/sso/login?code=${organizationCode}`,
      'stunity://auth/callback'
    );
    
    if (result.type === 'success') {
      // Extract token from URL
      const token = extractTokenFromUrl(result.url);
      await AsyncStorage.setItem('authToken', token);
      // Fetch user data
    }
  } catch (error) {
    set({ error: 'SSO login failed' });
  }
}
```

### Phase 5: Update Registration Screen Handlers

**File:** `apps/mobile/src/screens/auth/RegisterScreen.tsx`

```typescript
const handleRegister = async () => {
  // ... validation ...
  
  const success = await register({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim(),
    password,
    role,
    organization: organization.trim(),
    organizationType
  });
  
  if (success) {
    Alert.alert(
      'Account Created', 
      'Your account has been created successfully. Please check your email to verify your account.',
      [{ text: 'OK', onPress: () => navigation.navigate('EmailVerification') }]
    );
  } else if (error) {
    Alert.alert('Registration Failed', error);
  }
};
```

### Phase 6: Update Login Screen Handlers

**File:** `apps/mobile/src/screens/auth/LoginScreen.tsx`

```typescript
const handleSocialLogin = async (provider: 'google' | 'apple') => {
  setSocialLoading(provider);
  try {
    if (provider === 'google') {
      await loginWithGoogle();
    } else {
      await loginWithApple();
    }
  } finally {
    setSocialLoading(null);
  }
};

const handleSSOLogin = async () => {
  if (!organization.trim()) {
    Alert.alert('Required', 'Please enter your organization code');
    return;
  }
  
  try {
    // First check if organization exists and has SSO
    const orgResponse = await fetch(`${API_URL}/auth/organization/${organization}`);
    const orgData = await orgResponse.json();
    
    if (!orgData.success) {
      Alert.alert('Error', 'Organization not found');
      return;
    }
    
    if (!orgData.data.ssoEnabled) {
      Alert.alert('Error', 'SSO not enabled for this organization');
      return;
    }
    
    // Proceed with SSO
    await loginWithSSO(organization);
  } catch (error) {
    Alert.alert('Error', 'Failed to connect to SSO provider');
  }
};
```

---

## 🎯 Implementation Roadmap

### Sprint 1: Database & Basic Registration (Week 1)
- [ ] **Day 1-2:** Update Prisma schema with SSO and organization fields
- [ ] **Day 3:** Run migrations and update Prisma client
- [ ] **Day 4-5:** Implement student/teacher registration endpoints
- [ ] **Day 6-7:** Implement email verification system

**Deliverables:**
- ✅ Database schema with SSO fields
- ✅ Student registration API
- ✅ Teacher registration API
- ✅ Email verification flow

### Sprint 2: Social Login (Week 2)
- [ ] **Day 1-2:** Set up Google OAuth
  - Create Google Cloud project
  - Configure OAuth consent screen
  - Implement Google login endpoint
- [ ] **Day 3-4:** Set up Apple Sign In
  - Configure Apple Developer account
  - Create service ID and key
  - Implement Apple login endpoint
- [ ] **Day 5-7:** Mobile integration
  - Add Google Sign-In SDK to mobile
  - Add Apple Authentication to mobile
  - Test on both platforms

**Deliverables:**
- ✅ Google OAuth working
- ✅ Apple Sign In working
- ✅ Mobile app social login integration

### Sprint 3: Enterprise SSO (Week 3)
- [ ] **Day 1-2:** Create Organization model and endpoints
- [ ] **Day 3-4:** Implement SAML SSO
  - Set up passport-saml
  - Implement SAML flow
  - Create organization admin panel
- [ ] **Day 5-6:** Test with test IdP (Okta/Auth0)
- [ ] **Day 7:** Documentation and deployment

**Deliverables:**
- ✅ Organization management
- ✅ SAML SSO working
- ✅ Admin panel for SSO config
- ✅ Documentation

### Sprint 4: Mobile Integration & Polish (Week 4)
- [ ] **Day 1-3:** Complete mobile API integration
  - Registration flow
  - Social login flows
  - SSO flow
- [ ] **Day 4-5:** Testing on real devices
  - iOS testing
  - Android testing
  - Bug fixes
- [ ] **Day 6-7:** Performance optimization & documentation
  - Loading states
  - Error handling
  - User documentation

**Deliverables:**
- ✅ Fully working mobile registration
- ✅ All auth methods tested
- ✅ Production ready
- ✅ User documentation

---

## 🔐 Security Considerations

### Authentication Security
1. **Password Requirements:**
   - Minimum 8 characters
   - At least 1 uppercase letter
   - At least 1 number
   - At least 1 special character (optional but recommended)

2. **Token Security:**
   - JWT tokens expire in 7 days (access) / 30 days (refresh)
   - Refresh token rotation
   - Secure token storage (AsyncStorage with encryption)

3. **Rate Limiting:**
   - Max 5 login attempts per 15 minutes
   - Max 3 registration attempts per hour
   - Max 10 verification email sends per day

4. **SSO Security:**
   - SAML assertions must be signed
   - SSL/TLS required for all SSO endpoints
   - Token validation and expiry checks

### Data Privacy
1. **GDPR Compliance:**
   - Users can request data deletion
   - Privacy policy acceptance required
   - Data processing consent tracked

2. **FERPA Compliance:**
   - Educational records protected
   - Parent consent for minors
   - Access logs maintained

---

## 📊 Testing Plan

### Unit Tests
```typescript
describe('Auth Service', () => {
  describe('Registration', () => {
    it('should register student with valid data');
    it('should reject duplicate email');
    it('should hash password correctly');
    it('should send verification email');
  });
  
  describe('SSO', () => {
    it('should authenticate via Google OAuth');
    it('should authenticate via Apple Sign In');
    it('should authenticate via SAML');
  });
});
```

### Integration Tests
- End-to-end registration flow
- Social login flow
- SSO flow with test IdP
- Email verification flow

### Manual Testing Checklist
- [ ] Register as student
- [ ] Register as teacher
- [ ] Verify email
- [ ] Login with Google
- [ ] Login with Apple
- [ ] Login with SSO (organization code)
- [ ] Test on iOS device
- [ ] Test on Android device

---

## 📈 Success Metrics

### Technical Metrics
- Registration success rate > 95%
- Login success rate > 98%
- SSO authentication < 3 seconds
- Email verification rate > 60%

### User Experience Metrics
- Registration completion rate > 70%
- User satisfaction score > 4.5/5
- Support tickets related to auth < 5%

---

## 🚀 Deployment Checklist

### Environment Variables
```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# Apple Sign In
APPLE_CLIENT_ID=your_client_id
APPLE_TEAM_ID=your_team_id
APPLE_KEY_ID=your_key_id
APPLE_PRIVATE_KEY_PATH=/path/to/key

# Email Service
SENDGRID_API_KEY=your_sendgrid_key
EMAIL_FROM=noreply@stunity.com

# SSO
SAML_CALLBACK_URL=https://api.stunity.com/auth/saml/callback
```

### Pre-Deployment
- [ ] Run all tests
- [ ] Update API documentation
- [ ] Create database backups
- [ ] Run security audit
- [ ] Test rate limiting

### Deployment Steps
1. Run database migrations
2. Deploy auth-service updates
3. Deploy mobile app updates
4. Monitor error logs
5. Test all auth flows

### Post-Deployment
- [ ] Monitor registration metrics
- [ ] Check error rates
- [ ] Verify email delivery
- [ ] Test SSO with pilot organization
- [ ] Collect user feedback

---

## 📝 Documentation Requirements

### API Documentation
- [ ] Update Swagger/OpenAPI specs
- [ ] Document all new endpoints
- [ ] Add authentication examples
- [ ] Include error codes

### User Documentation
- [ ] Registration guide
- [ ] SSO setup guide (for admins)
- [ ] Troubleshooting guide
- [ ] Video tutorials

### Developer Documentation
- [ ] Architecture diagrams
- [ ] Flow diagrams (registration, SSO)
- [ ] Code examples
- [ ] Testing guide

---

## 💡 Recommendations

### Immediate Actions (This Week)
1. **Update database schema** - Add SSO and organization fields
2. **Implement basic registration** - Student and teacher endpoints
3. **Test with mobile app** - Ensure UI connects to backend

### Short Term (Next 2 Weeks)
1. **Add social login** - Google and Apple integration
2. **Implement email verification** - Complete registration flow
3. **Add organization management** - Admin panel for SSO config

### Long Term (Next Month)
1. **Enterprise SSO** - Full SAML implementation
2. **Advanced features** - Multi-factor auth, biometric login
3. **Analytics** - Track registration funnels and auth metrics

---

## 🎯 Conclusion

The Enterprise SSO feature is **UI-ready but backend-incomplete**. This plan provides a comprehensive roadmap to:

✅ Fully implement Enterprise SSO (SAML)  
✅ Add social login (Google/Apple)  
✅ Complete standard registration  
✅ Integrate mobile app with backend  
✅ Ensure security and compliance  

**Estimated Timeline:** 4 weeks  
**Team Size:** 2-3 developers  
**Priority:** HIGH - Essential for enterprise adoption

---

**Next Steps:**
1. Review and approve this plan
2. Allocate development resources
3. Set up development environment (OAuth credentials, test IdP)
4. Begin Sprint 1 implementation

