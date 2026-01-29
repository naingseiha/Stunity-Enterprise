-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE_TRIAL_1M', 'FREE_TRIAL_3M', 'BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "AttendanceSession" AS ENUM ('MORNING', 'AFTERNOON');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'PERMISSION', 'LATE', 'EXCUSED');

-- CreateEnum
CREATE TYPE "DegreeLevel" AS ENUM ('CERTIFICATE', 'ASSOCIATE', 'BACHELOR', 'MASTER', 'DOCTORATE', 'OTHER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "TeacherRole" AS ENUM ('TEACHER', 'INSTRUCTOR');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'TEACHER', 'STUDENT', 'PARENT', 'STAFF');

-- CreateEnum
CREATE TYPE "WorkingLevel" AS ENUM ('FRAMEWORK_A', 'FRAMEWORK_B', 'FRAMEWORK_C', 'CONTRACT', 'PROBATION');

-- CreateEnum
CREATE TYPE "StudentRole" AS ENUM ('GENERAL', 'CLASS_LEADER', 'VICE_LEADER_1', 'VICE_LEADER_2');

-- CreateEnum
CREATE TYPE "ParentRelationship" AS ENUM ('FATHER', 'MOTHER', 'GUARDIAN', 'STEP_FATHER', 'STEP_MOTHER', 'GRANDPARENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('PUBLIC', 'SCHOOL', 'CLASS', 'PRIVATE');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('ARTICLE', 'COURSE', 'QUIZ', 'QUESTION', 'EXAM', 'ANNOUNCEMENT', 'ASSIGNMENT', 'POLL', 'RESOURCE', 'PROJECT', 'TUTORIAL', 'RESEARCH', 'ACHIEVEMENT', 'REFLECTION', 'COLLABORATION');

-- CreateEnum
CREATE TYPE "PostVisibility" AS ENUM ('PUBLIC', 'SCHOOL', 'CLASS', 'PRIVATE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('LIKE', 'COMMENT', 'REPLY', 'FOLLOW', 'MENTION', 'ANNOUNCEMENT', 'GRADE_POSTED', 'ATTENDANCE_MARKED', 'SKILL_ENDORSED', 'RECOMMENDATION_RECEIVED', 'PROJECT_LIKED', 'ACHIEVEMENT_EARNED', 'COURSE_ENROLL', 'ASSIGNMENT_DUE', 'POLL_RESULT');

-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'LOVE', 'HELPFUL', 'INSIGHTFUL');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'MISINFORMATION', 'VIOLENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'APPROVED', 'REMOVED');

-- CreateEnum
CREATE TYPE "SkillCategory" AS ENUM ('PROGRAMMING', 'LANGUAGES', 'MATHEMATICS', 'SCIENCE', 'HUMANITIES', 'ARTS', 'SPORTS', 'TEACHING', 'LEADERSHIP', 'COMMUNICATION', 'TECHNICAL', 'BUSINESS', 'OTHER');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "ExperienceType" AS ENUM ('WORK', 'TEACHING', 'VOLUNTEER', 'INTERNSHIP', 'RESEARCH', 'LEADERSHIP', 'EXTRACURRICULAR');

-- CreateEnum
CREATE TYPE "ProjectCategory" AS ENUM ('SOFTWARE', 'RESEARCH', 'DESIGN', 'WRITING', 'SCIENCE', 'MATHEMATICS', 'ARTS', 'ENGINEERING', 'BUSINESS', 'SOCIAL_IMPACT', 'OTHER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'IN_PROGRESS', 'COMPLETED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "AchievementType" AS ENUM ('COURSE_COMPLETION', 'SKILL_MASTERY', 'TEACHING_EXCELLENCE', 'COMMUNITY_CONTRIBUTION', 'LEADERSHIP', 'INNOVATION', 'COLLABORATION', 'CONSISTENCY_STREAK', 'TOP_PERFORMER', 'MILESTONE', 'COMPETITION_WIN', 'PUBLICATION', 'CERTIFICATION');

-- CreateEnum
CREATE TYPE "AchievementRarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "RecommendationRelation" AS ENUM ('TEACHER', 'CLASSMATE', 'MENTOR', 'COLLEAGUE', 'SUPERVISOR', 'OTHER');

-- CreateTable
CREATE TABLE "schools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "logo" TEXT,
    "website" TEXT,
    "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'FREE_TRIAL_1M',
    "subscriptionStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subscriptionEnd" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isTrial" BOOLEAN NOT NULL DEFAULT true,
    "maxStudents" INTEGER NOT NULL DEFAULT 100,
    "maxTeachers" INTEGER NOT NULL DEFAULT 10,
    "maxStorage" BIGINT NOT NULL DEFAULT 1073741824,
    "currentStudents" INTEGER NOT NULL DEFAULT 0,
    "currentTeachers" INTEGER NOT NULL DEFAULT 0,
    "currentStorage" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_years" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "session" "AttendanceSession" NOT NULL DEFAULT 'MORNING',

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT,
    "name" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "section" TEXT,
    "academicYear" TEXT NOT NULL DEFAULT '2024-2025',
    "capacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "track" TEXT,
    "homeroomTeacherId" TEXT,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grades" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "month" TEXT,
    "monthNumber" INTEGER,
    "year" INTEGER,
    "percentage" DOUBLE PRECISION,
    "weightedScore" DOUBLE PRECISION,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_confirmations" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmedBy" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_monthly_summaries" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "monthNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "totalMaxScore" DOUBLE PRECISION NOT NULL,
    "totalWeightedScore" DOUBLE PRECISION NOT NULL,
    "totalCoefficient" DOUBLE PRECISION NOT NULL,
    "average" DOUBLE PRECISION NOT NULL,
    "classRank" INTEGER,
    "gradeLevel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_monthly_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "khmerName" TEXT NOT NULL,
    "dateOfBirth" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "englishName" TEXT,
    "email" TEXT,
    "placeOfBirth" TEXT DEFAULT 'ភ្នំពេញ',
    "currentAddress" TEXT DEFAULT 'ភ្នំពេញ',
    "phoneNumber" TEXT,
    "classId" TEXT,
    "fatherName" TEXT DEFAULT 'ឪពុក',
    "motherName" TEXT DEFAULT 'ម្តាយ',
    "parentPhone" TEXT,
    "parentOccupation" TEXT DEFAULT 'កសិករ',
    "previousGrade" TEXT,
    "remarks" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "grade12ExamCenter" TEXT,
    "grade12ExamDesk" TEXT,
    "grade12ExamRoom" TEXT,
    "grade12ExamSession" TEXT,
    "grade12PassStatus" TEXT,
    "grade12Track" TEXT,
    "grade9ExamCenter" TEXT,
    "grade9ExamDesk" TEXT,
    "grade9ExamRoom" TEXT,
    "grade9ExamSession" TEXT,
    "grade9PassStatus" TEXT,
    "previousSchool" TEXT,
    "repeatingGrade" TEXT,
    "transferredFrom" TEXT,
    "accountDeactivatedAt" TIMESTAMP(3),
    "deactivationReason" TEXT,
    "isAccountActive" BOOLEAN NOT NULL DEFAULT true,
    "studentRole" "StudentRole" NOT NULL DEFAULT 'GENERAL',

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parents" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "khmerName" TEXT NOT NULL,
    "englishName" TEXT,
    "gender" "Gender",
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "relationship" "ParentRelationship" NOT NULL,
    "occupation" TEXT DEFAULT 'កសិករ',
    "emergencyPhone" TEXT,
    "isAccountActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_parents" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "relationship" "ParentRelationship" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_parents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_classes" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "academicYearId" TEXT,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject_teachers" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subject_teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKh" TEXT NOT NULL,
    "nameEn" TEXT,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "grade" TEXT NOT NULL,
    "track" TEXT,
    "category" TEXT NOT NULL,
    "weeklyHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "annualHours" INTEGER NOT NULL DEFAULT 0,
    "maxScore" INTEGER NOT NULL DEFAULT 100,
    "coefficient" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_classes" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teachers" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "khmerName" TEXT,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "employeeId" TEXT,
    "gender" "Gender",
    "dateOfBirth" TEXT,
    "position" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "address" TEXT,
    "hireDate" TEXT,
    "homeroomClassId" TEXT,
    "role" "TeacherRole" NOT NULL DEFAULT 'TEACHER',
    "englishName" TEXT,
    "degree" "DegreeLevel",
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "idCard" TEXT,
    "major1" TEXT,
    "major2" TEXT,
    "nationality" TEXT,
    "passport" TEXT,
    "phoneNumber" TEXT,
    "salaryRange" TEXT,
    "workingLevel" "WorkingLevel",
    "photoUrl" TEXT,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "loginCount" INTEGER NOT NULL DEFAULT 0,
    "permissions" JSONB DEFAULT '{"canEnterGrades": true, "canViewReports": true, "canMarkAttendance": true}',
    "phone" TEXT,
    "studentId" TEXT,
    "teacherId" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'TEACHER',
    "accountSuspendedAt" TIMESTAMP(3),
    "isDefaultPassword" BOOLEAN NOT NULL DEFAULT true,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "lastPasswordHashes" TEXT[],
    "passwordChangedAt" TIMESTAMP(3),
    "passwordExpiresAt" TIMESTAMP(3),
    "passwordResetExpiry" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "suspensionReason" TEXT,
    "parentId" TEXT,
    "profilePictureUrl" TEXT,
    "profilePictureKey" TEXT,
    "coverPhotoUrl" TEXT,
    "coverPhotoKey" TEXT,
    "bio" TEXT,
    "headline" TEXT,
    "interests" TEXT[],
    "skills" TEXT[],
    "socialLinks" JSONB,
    "profileCompleteness" INTEGER NOT NULL DEFAULT 0,
    "profileUpdatedAt" TIMESTAMP(3),
    "profileVisibility" "ProfileVisibility" NOT NULL DEFAULT 'SCHOOL',
    "careerGoals" TEXT,
    "location" TEXT,
    "languages" TEXT[],
    "professionalTitle" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "totalLearningHours" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "isOpenToOpportunities" BOOLEAN NOT NULL DEFAULT false,
    "resumeUrl" TEXT,
    "resumeKey" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrls" TEXT[],
    "mediaKeys" TEXT[],
    "postType" "PostType" NOT NULL DEFAULT 'ARTICLE',
    "visibility" "PostVisibility" NOT NULL DEFAULT 'SCHOOL',
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "sharesCount" INTEGER NOT NULL DEFAULT 0,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pollExpiresAt" TIMESTAMP(3),
    "pollAllowMultiple" BOOLEAN NOT NULL DEFAULT false,
    "pollMaxChoices" INTEGER,
    "pollIsAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "assignmentDueDate" TIMESTAMP(3),
    "assignmentPoints" INTEGER,
    "assignmentSubmissionType" TEXT,
    "courseCode" TEXT,
    "courseLevel" TEXT,
    "courseDuration" TEXT,
    "announcementUrgency" TEXT,
    "announcementExpiryDate" TIMESTAMP(3),
    "tutorialDifficulty" TEXT,
    "tutorialEstimatedTime" TEXT,
    "tutorialPrerequisites" TEXT,
    "examDate" TIMESTAMP(3),
    "examDuration" INTEGER,
    "examTotalPoints" INTEGER,
    "examPassingScore" INTEGER,
    "resourceType" TEXT,
    "resourceUrl" TEXT,
    "researchField" TEXT,
    "researchCollaborators" TEXT,
    "projectStatus" TEXT,
    "projectDeadline" TIMESTAMP(3),
    "projectTeamSize" INTEGER,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "likes" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_options" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "votesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_questions" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT[],
    "correctAnswer" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 10,
    "position" INTEGER NOT NULL DEFAULT 0,
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_votes" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poll_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "postId" TEXT,
    "commentId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_skills" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "category" "SkillCategory" NOT NULL,
    "level" "SkillLevel" NOT NULL DEFAULT 'BEGINNER',
    "yearsOfExp" DOUBLE PRECISION,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_endorsements" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "endorserId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_endorsements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ExperienceType" NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "location" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "achievements" TEXT[],
    "skills" TEXT[],
    "mediaUrls" TEXT[],
    "mediaKeys" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuingOrg" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "credentialId" TEXT,
    "credentialUrl" TEXT,
    "certificateUrl" TEXT,
    "certificateKey" TEXT,
    "description" TEXT,
    "skills" TEXT[],
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ProjectCategory" NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'COMPLETED',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "role" TEXT,
    "teamSize" INTEGER,
    "technologies" TEXT[],
    "skills" TEXT[],
    "mediaUrls" TEXT[],
    "mediaKeys" TEXT[],
    "projectUrl" TEXT,
    "githubUrl" TEXT,
    "demoUrl" TEXT,
    "achievements" TEXT[],
    "collaborators" TEXT[],
    "visibility" "ProfileVisibility" NOT NULL DEFAULT 'PUBLIC',
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AchievementType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "issuedBy" TEXT,
    "issuedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "badgeUrl" TEXT,
    "badgeKey" TEXT,
    "certificateUrl" TEXT,
    "certificateKey" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "rarity" "AchievementRarity" NOT NULL DEFAULT 'COMMON',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "relationship" "RecommendationRelation" NOT NULL,
    "content" TEXT NOT NULL,
    "skills" TEXT[],
    "rating" INTEGER,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isAccepted" BOOLEAN NOT NULL DEFAULT false,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_reactions" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_reports" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_blocks" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_views" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,
    "source" TEXT DEFAULT 'feed',
    "ipAddress" TEXT,

    CONSTRAINT "post_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "schools_slug_key" ON "schools"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "schools_email_key" ON "schools"("email");

-- CreateIndex
CREATE INDEX "schools_slug_idx" ON "schools"("slug");

-- CreateIndex
CREATE INDEX "schools_subscriptionTier_idx" ON "schools"("subscriptionTier");

-- CreateIndex
CREATE INDEX "schools_isActive_idx" ON "schools"("isActive");

-- CreateIndex
CREATE INDEX "academic_years_schoolId_isCurrent_idx" ON "academic_years"("schoolId", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "academic_years_schoolId_name_key" ON "academic_years"("schoolId", "name");

-- CreateIndex
CREATE INDEX "attendance_classId_date_idx" ON "attendance"("classId", "date");

-- CreateIndex
CREATE INDEX "attendance_studentId_date_idx" ON "attendance"("studentId", "date");

-- CreateIndex
CREATE INDEX "attendance_date_status_idx" ON "attendance"("date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_studentId_classId_date_session_key" ON "attendance"("studentId", "classId", "date", "session");

-- CreateIndex
CREATE UNIQUE INDEX "classes_classId_key" ON "classes"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "classes_homeroomTeacherId_key" ON "classes"("homeroomTeacherId");

-- CreateIndex
CREATE INDEX "classes_schoolId_idx" ON "classes"("schoolId");

-- CreateIndex
CREATE INDEX "classes_grade_idx" ON "classes"("grade");

-- CreateIndex
CREATE INDEX "classes_schoolId_grade_idx" ON "classes"("schoolId", "grade");

-- CreateIndex
CREATE INDEX "grades_classId_month_year_idx" ON "grades"("classId", "month", "year");

-- CreateIndex
CREATE INDEX "grades_studentId_month_year_idx" ON "grades"("studentId", "month", "year");

-- CreateIndex
CREATE INDEX "grades_subjectId_classId_idx" ON "grades"("subjectId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "grades_studentId_subjectId_classId_month_year_key" ON "grades"("studentId", "subjectId", "classId", "month", "year");

-- CreateIndex
CREATE INDEX "grade_confirmations_classId_month_year_idx" ON "grade_confirmations"("classId", "month", "year");

-- CreateIndex
CREATE INDEX "grade_confirmations_confirmedBy_idx" ON "grade_confirmations"("confirmedBy");

-- CreateIndex
CREATE UNIQUE INDEX "grade_confirmations_classId_subjectId_month_year_key" ON "grade_confirmations"("classId", "subjectId", "month", "year");

-- CreateIndex
CREATE INDEX "student_monthly_summaries_classId_month_year_idx" ON "student_monthly_summaries"("classId", "month", "year");

-- CreateIndex
CREATE INDEX "student_monthly_summaries_studentId_year_idx" ON "student_monthly_summaries"("studentId", "year");

-- CreateIndex
CREATE INDEX "student_monthly_summaries_month_year_average_idx" ON "student_monthly_summaries"("month", "year", "average");

-- CreateIndex
CREATE UNIQUE INDEX "student_monthly_summaries_studentId_classId_month_year_key" ON "student_monthly_summaries"("studentId", "classId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "students_studentId_key" ON "students"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "students_email_key" ON "students"("email");

-- CreateIndex
CREATE INDEX "students_schoolId_idx" ON "students"("schoolId");

-- CreateIndex
CREATE INDEX "students_classId_idx" ON "students"("classId");

-- CreateIndex
CREATE INDEX "students_grade12PassStatus_idx" ON "students"("grade12PassStatus");

-- CreateIndex
CREATE INDEX "students_gender_idx" ON "students"("gender");

-- CreateIndex
CREATE INDEX "students_isAccountActive_idx" ON "students"("isAccountActive");

-- CreateIndex
CREATE INDEX "students_classId_studentRole_idx" ON "students"("classId", "studentRole");

-- CreateIndex
CREATE INDEX "students_schoolId_classId_idx" ON "students"("schoolId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "parents_parentId_key" ON "parents"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "parents_email_key" ON "parents"("email");

-- CreateIndex
CREATE UNIQUE INDEX "parents_phone_key" ON "parents"("phone");

-- CreateIndex
CREATE INDEX "parents_phone_isAccountActive_idx" ON "parents"("phone", "isAccountActive");

-- CreateIndex
CREATE INDEX "parents_email_isAccountActive_idx" ON "parents"("email", "isAccountActive");

-- CreateIndex
CREATE INDEX "student_parents_studentId_idx" ON "student_parents"("studentId");

-- CreateIndex
CREATE INDEX "student_parents_parentId_idx" ON "student_parents"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "student_parents_studentId_parentId_key" ON "student_parents"("studentId", "parentId");

-- CreateIndex
CREATE INDEX "student_classes_studentId_idx" ON "student_classes"("studentId");

-- CreateIndex
CREATE INDEX "student_classes_classId_idx" ON "student_classes"("classId");

-- CreateIndex
CREATE INDEX "student_classes_status_idx" ON "student_classes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "student_classes_studentId_classId_academicYearId_key" ON "student_classes"("studentId", "classId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "subject_teachers_subjectId_teacherId_key" ON "subject_teachers"("subjectId", "teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_code_key" ON "subjects"("code");

-- CreateIndex
CREATE INDEX "subjects_grade_isActive_idx" ON "subjects"("grade", "isActive");

-- CreateIndex
CREATE INDEX "subjects_grade_track_isActive_idx" ON "subjects"("grade", "track", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_classes_teacherId_classId_key" ON "teacher_classes"("teacherId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_teacherId_key" ON "teachers"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_email_key" ON "teachers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_phone_key" ON "teachers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_employeeId_key" ON "teachers"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_homeroomClassId_key" ON "teachers"("homeroomClassId");

-- CreateIndex
CREATE INDEX "teachers_schoolId_idx" ON "teachers"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_studentId_key" ON "users"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "users_teacherId_key" ON "users"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "users_passwordResetToken_key" ON "users"("passwordResetToken");

-- CreateIndex
CREATE UNIQUE INDEX "users_parentId_key" ON "users"("parentId");

-- CreateIndex
CREATE INDEX "users_email_isActive_idx" ON "users"("email", "isActive");

-- CreateIndex
CREATE INDEX "users_phone_isActive_idx" ON "users"("phone", "isActive");

-- CreateIndex
CREATE INDEX "users_studentId_isActive_idx" ON "users"("studentId", "isActive");

-- CreateIndex
CREATE INDEX "users_parentId_isActive_idx" ON "users"("parentId", "isActive");

-- CreateIndex
CREATE INDEX "users_isDefaultPassword_idx" ON "users"("isDefaultPassword");

-- CreateIndex
CREATE INDEX "users_passwordExpiresAt_idx" ON "users"("passwordExpiresAt");

-- CreateIndex
CREATE INDEX "users_schoolId_idx" ON "users"("schoolId");

-- CreateIndex
CREATE INDEX "audit_logs_adminId_idx" ON "audit_logs"("adminId");

-- CreateIndex
CREATE INDEX "audit_logs_teacherId_idx" ON "audit_logs"("teacherId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "posts_authorId_createdAt_idx" ON "posts"("authorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "posts_postType_createdAt_idx" ON "posts"("postType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "posts_visibility_createdAt_idx" ON "posts"("visibility", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "posts_pollExpiresAt_idx" ON "posts"("pollExpiresAt");

-- CreateIndex
CREATE INDEX "comments_postId_createdAt_idx" ON "comments"("postId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "comments_authorId_idx" ON "comments"("authorId");

-- CreateIndex
CREATE INDEX "comments_parentId_idx" ON "comments"("parentId");

-- CreateIndex
CREATE INDEX "likes_userId_idx" ON "likes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "likes_postId_userId_key" ON "likes"("postId", "userId");

-- CreateIndex
CREATE INDEX "poll_options_postId_idx" ON "poll_options"("postId");

-- CreateIndex
CREATE INDEX "quiz_questions_postId_idx" ON "quiz_questions"("postId");

-- CreateIndex
CREATE INDEX "poll_votes_userId_idx" ON "poll_votes"("userId");

-- CreateIndex
CREATE INDEX "poll_votes_postId_userId_idx" ON "poll_votes"("postId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "poll_votes_postId_optionId_userId_key" ON "poll_votes"("postId", "optionId", "userId");

-- CreateIndex
CREATE INDEX "follows_followingId_idx" ON "follows"("followingId");

-- CreateIndex
CREATE INDEX "follows_followerId_idx" ON "follows"("followerId");

-- CreateIndex
CREATE UNIQUE INDEX "follows_followerId_followingId_key" ON "follows"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "notifications_recipientId_isRead_createdAt_idx" ON "notifications"("recipientId", "isRead", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_actorId_idx" ON "notifications"("actorId");

-- CreateIndex
CREATE INDEX "user_skills_userId_category_idx" ON "user_skills"("userId", "category");

-- CreateIndex
CREATE INDEX "user_skills_skillName_idx" ON "user_skills"("skillName");

-- CreateIndex
CREATE UNIQUE INDEX "user_skills_userId_skillName_key" ON "user_skills"("userId", "skillName");

-- CreateIndex
CREATE INDEX "skill_endorsements_recipientId_idx" ON "skill_endorsements"("recipientId");

-- CreateIndex
CREATE INDEX "skill_endorsements_endorserId_idx" ON "skill_endorsements"("endorserId");

-- CreateIndex
CREATE UNIQUE INDEX "skill_endorsements_skillId_endorserId_key" ON "skill_endorsements"("skillId", "endorserId");

-- CreateIndex
CREATE INDEX "experiences_userId_startDate_idx" ON "experiences"("userId", "startDate" DESC);

-- CreateIndex
CREATE INDEX "experiences_type_idx" ON "experiences"("type");

-- CreateIndex
CREATE INDEX "certifications_userId_issueDate_idx" ON "certifications"("userId", "issueDate" DESC);

-- CreateIndex
CREATE INDEX "projects_userId_createdAt_idx" ON "projects"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "projects_category_visibility_idx" ON "projects"("category", "visibility");

-- CreateIndex
CREATE INDEX "projects_isFeatured_idx" ON "projects"("isFeatured");

-- CreateIndex
CREATE INDEX "achievements_userId_issuedDate_idx" ON "achievements"("userId", "issuedDate" DESC);

-- CreateIndex
CREATE INDEX "achievements_type_rarity_idx" ON "achievements"("type", "rarity");

-- CreateIndex
CREATE INDEX "recommendations_recipientId_isAccepted_idx" ON "recommendations"("recipientId", "isAccepted");

-- CreateIndex
CREATE INDEX "recommendations_authorId_idx" ON "recommendations"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "recommendations_recipientId_authorId_key" ON "recommendations"("recipientId", "authorId");

-- CreateIndex
CREATE INDEX "comment_reactions_commentId_idx" ON "comment_reactions"("commentId");

-- CreateIndex
CREATE INDEX "comment_reactions_userId_idx" ON "comment_reactions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "comment_reactions_commentId_userId_type_key" ON "comment_reactions"("commentId", "userId", "type");

-- CreateIndex
CREATE INDEX "post_reports_postId_status_idx" ON "post_reports"("postId", "status");

-- CreateIndex
CREATE INDEX "post_reports_reporterId_idx" ON "post_reports"("reporterId");

-- CreateIndex
CREATE INDEX "post_reports_status_createdAt_idx" ON "post_reports"("status", "createdAt");

-- CreateIndex
CREATE INDEX "user_blocks_blockerId_idx" ON "user_blocks"("blockerId");

-- CreateIndex
CREATE INDEX "user_blocks_blockedId_idx" ON "user_blocks"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "user_blocks_blockerId_blockedId_key" ON "user_blocks"("blockerId", "blockedId");

-- CreateIndex
CREATE INDEX "post_views_postId_idx" ON "post_views"("postId");

-- CreateIndex
CREATE INDEX "post_views_userId_idx" ON "post_views"("userId");

-- CreateIndex
CREATE INDEX "post_views_viewedAt_idx" ON "post_views"("viewedAt");

-- AddForeignKey
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_confirmations" ADD CONSTRAINT "grade_confirmations_confirmedBy_fkey" FOREIGN KEY ("confirmedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_monthly_summaries" ADD CONSTRAINT "student_monthly_summaries_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_monthly_summaries" ADD CONSTRAINT "student_monthly_summaries_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_parents" ADD CONSTRAINT "student_parents_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_parents" ADD CONSTRAINT "student_parents_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_classes" ADD CONSTRAINT "student_classes_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_classes" ADD CONSTRAINT "student_classes_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_teachers" ADD CONSTRAINT "subject_teachers_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_teachers" ADD CONSTRAINT "subject_teachers_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_classes" ADD CONSTRAINT "teacher_classes_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_classes" ADD CONSTRAINT "teacher_classes_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_homeroomClassId_fkey" FOREIGN KEY ("homeroomClassId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "poll_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_endorsements" ADD CONSTRAINT "skill_endorsements_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "user_skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_endorsements" ADD CONSTRAINT "skill_endorsements_endorserId_fkey" FOREIGN KEY ("endorserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_endorsements" ADD CONSTRAINT "skill_endorsements_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
