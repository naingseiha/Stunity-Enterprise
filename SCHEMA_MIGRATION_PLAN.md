# 🔄 Schema Migration Plan - v1.0 to v2.0 Multi-Tenant SaaS

**Date:** January 29, 2026  
**Status:** Planning Phase  
**Goal:** Add multi-tenancy + SaaS subscription model

---

## 🎯 Business Requirements

### SaaS Model Features:
1. **Self-Service Registration** - Schools can register themselves
2. **Trial Periods** - 1 month or 3 months free trial
3. **Subscription Tiers** - Free Trial → Basic → Standard → Premium → Enterprise
4. **Auto-Expiration** - Trials expire automatically
5. **Upgrade Path** - Easy in-app upgrade to paid plans
6. **Usage Limits** - Student limits based on tier

---

## 📋 Schema Changes Required

### 1. New Enums

```prisma
enum SubscriptionTier {
  FREE_TRIAL_1M    // 1 month free trial
  FREE_TRIAL_3M    // 3 months free trial
  BASIC            // Small schools (< 500 students)
  STANDARD         // Medium schools (< 2000 students)
  PREMIUM          // Large schools (< 5000 students)
  ENTERPRISE       // Unlimited, multiple campuses
}

enum SubscriptionStatus {
  TRIAL            // Active trial
  ACTIVE           // Paid and active
  EXPIRED          // Trial/subscription ended
  CANCELLED        // Manually cancelled
  SUSPENDED        // Suspended (payment failure)
  GRACE_PERIOD     // Expired but in grace period
}

enum PaymentStatus {
  UNPAID
  PAID
  OVERDUE
  REFUNDED
}
```

### 2. New Models

#### School Model (Tenant Root)
```prisma
model School {
  id                   String             @id @default(cuid())
  name                 String
  slug                 String             @unique // URL-friendly: my-school
  domain               String?            @unique // custom domain
  email                String
  phone                String?
  address              String?
  city                 String?
  country              String             @default("Cambodia")
  
  // Subscription Management
  subscriptionTier     SubscriptionTier   @default(FREE_TRIAL_1M)
  subscriptionStatus   SubscriptionStatus @default(TRIAL)
  trialStartedAt       DateTime           @default(now())
  trialEndsAt          DateTime           // Auto-calculated
  subscriptionStartedAt DateTime?
  subscriptionEndsAt    DateTime?
  
  // Limits & Features
  studentLimit         Int                @default(100) // Based on tier
  teacherLimit         Int                @default(10)
  storageLimit         Int                @default(1024) // MB
  features             Json?              // Feature flags
  
  // Payment
  paymentStatus        PaymentStatus      @default(UNPAID)
  lastPaymentDate      DateTime?
  nextBillingDate      DateTime?
  
  // Metadata
  logo                 String?
  timezone             String             @default("Asia/Phnom_Penh")
  language             String             @default("en")
  isActive             Boolean            @default(true)
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt
  
  // Relations (all entities belong to a school)
  users                User[]
  students             Student[]
  teachers             Teacher[]
  classes              Class[]
  subjects             Subject[]
  academicYears        AcademicYear[]
  posts                Post[]
  
  @@index([slug])
  @@index([subscriptionStatus])
  @@index([subscriptionTier])
  @@map("schools")
}
```

#### AcademicYear Model
```prisma
model AcademicYear {
  id          String   @id @default(cuid())
  schoolId    String
  name        String   // "2024-2025"
  startDate   DateTime
  endDate     DateTime
  isCurrent   Boolean  @default(false)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  school      School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  classes     Class[]
  grades      Grade[]
  
  @@unique([schoolId, name])
  @@index([schoolId, isCurrent])
  @@map("academic_years")
}
```

### 3. Add schoolId to ALL Existing Models

Every model needs:
```prisma
schoolId  String
school    School @relation(fields: [schoolId], references: [id], onDelete: Cascade)

@@index([schoolId])
```

Models to update:
- ✅ User
- ✅ Student
- ✅ Teacher
- ✅ Parent
- ✅ Class
- ✅ Subject
- ✅ Grade
- ✅ Attendance
- ✅ Post
- ✅ Comment
- ✅ Like
- ✅ Follow
- ✅ Notification
- And ALL others...

### 4. Replace hardcoded academicYear

Current:
```prisma
academicYear String @default("2024-2025")
```

New:
```prisma
academicYearId String
academicYear   AcademicYear @relation(fields: [academicYearId], references: [id])
```

---

## 🚀 Migration Strategy

### Phase 1: Add New Models (Safe)
1. Add School model
2. Add AcademicYear model
3. Add new enums
4. Deploy schema (additive only)

### Phase 2: Add schoolId (Breaking Changes)
1. Add schoolId to User model
2. Add schoolId to Student model
3. Add schoolId to Teacher model
4. Continue for all models
5. Make schoolId required after migration

### Phase 3: Update Relations
1. Replace hardcoded academicYear with academicYearId
2. Update all foreign keys
3. Add proper indexes

### Phase 4: Data Migration (If needed)
1. Create default School for existing data
2. Create AcademicYear entries
3. Link existing records to school
4. Verify data integrity

---

## 📊 Subscription Tier Limits

| Tier | Students | Teachers | Storage | Price | Duration |
|------|----------|----------|---------|-------|----------|
| FREE_TRIAL_1M | 100 | 10 | 1GB | $0 | 30 days |
| FREE_TRIAL_3M | 300 | 20 | 2GB | $0 | 90 days |
| BASIC | 500 | 30 | 10GB | $49/mo | Monthly |
| STANDARD | 2000 | 100 | 50GB | $149/mo | Monthly |
| PREMIUM | 5000 | 300 | 200GB | $399/mo | Monthly |
| ENTERPRISE | Unlimited | Unlimited | 1TB | Custom | Yearly |

---

## 🎯 Registration Flow

1. **School Admin visits registration page**
2. **Fills form:**
   - School name
   - Email (becomes admin)
   - Password
   - Choose trial: 1 month or 3 months
3. **System auto-creates:**
   - School tenant (with slug)
   - Admin user
   - Default AcademicYear
   - Trial activation
4. **Email sent with:**
   - Welcome message
   - Trial details
   - Getting started guide
5. **Trial expiration:**
   - Email 7 days before
   - Email 1 day before
   - Email on expiration day
   - Grace period: 7 days (read-only)
   - Then suspended

---

## ⚠️ Important Considerations

### Data Isolation
- **Row-level security** - Filter by schoolId in ALL queries
- **API middleware** - Auto-inject schoolId from JWT
- **Database indexes** - All schoolId columns indexed
- **Backup/restore** - Per-school export/import

### Performance
- **Composite indexes** - (schoolId, otherField) for common queries
- **Connection pooling** - Per-school or shared with schoolId filter
- **Caching** - School-specific cache keys

### Security
- **No cross-tenant queries** - Strict schoolId filtering
- **Subdomain isolation** - school-slug.stunity.app
- **Custom domains** - Optional for Enterprise
- **Data encryption** - At rest and in transit

---

## 📝 Next Steps

1. Review this plan
2. Update schema.prisma with new models
3. Test migrations locally
4. Push to development database
5. Build school registration service
6. Build subscription management service
7. Implement trial expiration logic
8. Add payment integration (Stripe)

---

**Status:** Ready to implement  
**Est. Time:** 2-3 hours for schema updates  
**Risk:** Medium (breaking changes to existing schema)  
**Mitigation:** Backup created, can rollback
