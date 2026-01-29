"use client";

import { useState, useEffect, useMemo, memo, useRef, useCallback } from "react";
import {
  User,
  Calendar,
  Lock,
  Edit,
  Phone,
  Mail,
  MapPin,
  Users,
  GraduationCap,
  School,
  BookOpen,
  Award,
  FileText,
  CreditCard,
  Home,
  Briefcase,
  UserCircle,
  CheckCircle,
  Camera,
  Share2,
  UserPlus,
  Save,
  TrendingUp,
  BarChart3,
  Clock,
  Loader2,
  Activity,
  Sparkles,
  Target,
  AlertCircle,
  Image as ImageIcon,
  Bell,
  MessageSquare,
} from "lucide-react";
import {
  StudentProfile,
  GradesResponse,
  AttendanceResponse,
  getMonthlySummaries,
  getMyActivities,
  type Activity as ActivityType,
} from "@/lib/api/student-portal";
import StudentProfileEditForm from "../StudentProfileEditForm";
import { getCurrentAcademicYear } from "@/utils/academicYear";

const ROLE_LABELS = {
  GENERAL: "សិស្សទូទៅ",
  CLASS_LEADER: "ប្រធានថ្នាក់",
  VICE_LEADER_1: "អនុប្រធានទី១",
  VICE_LEADER_2: "អនុប្រធានទី២",
};

// Cache for profile data - persists across component remounts
const profileCache: { [key: string]: StudentProfile } = {};
const monthlySummariesCache: { [key: string]: any } = {};
const activitiesCache: { [key: string]: ActivityType[] } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface MonthlyStats {
  month: string;
  averageScore: number | null;
  hasData: boolean;
  subjectCount: number;
  totalSubjects: number;
  isComplete: boolean;
}

interface StudentProfileTabProps {
  profile: StudentProfile;
  gradesData?: GradesResponse | null;
  attendanceData?: AttendanceResponse | null;
  isEditingProfile: boolean;
  hasUnsavedProfileChanges: boolean;
  loading: boolean;
  onEdit: () => void;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  onChangePassword: () => void;
  onUnsavedChanges: (hasChanges: boolean) => void;
}

export default function StudentProfileTab({
  profile,
  gradesData,
  attendanceData,
  isEditingProfile,
  hasUnsavedProfileChanges,
  loading,
  onEdit,
  onSave,
  onCancel,
  onChangePassword,
  onUnsavedChanges,
}: StudentProfileTabProps) {
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showAllMonths, setShowAllMonths] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cacheTimeRef = useRef<{ [key: string]: number }>({});
  const currentAcademicYear = getCurrentAcademicYear();

  // Load profile photo from localStorage immediately
  useEffect(() => {
    if (profile?.student?.id) {
      const savedPhoto = localStorage.getItem(
        `student_photo_${profile.student.id}`,
      );
      if (savedPhoto) {
        setProfilePhoto(savedPhoto);
      }
    }
  }, [profile?.student?.id]);

  // Fetch monthly statistics with caching
  useEffect(() => {
    let isMounted = true;

    const fetchMonthlyStats = async () => {
      const cacheKey = `monthly_${currentAcademicYear}`;
      const now = Date.now();
      const isCacheValid =
        monthlySummariesCache[cacheKey] &&
        now - (cacheTimeRef.current[cacheKey] || 0) < CACHE_DURATION;

      if (isCacheValid) {
        setMonthlyStats(monthlySummariesCache[cacheKey]);
        return;
      }

      setLoadingStats(true);

      try {
        console.log(`🚀 Fetching monthly summaries for ${currentAcademicYear}`);

        const data = await getMonthlySummaries({
          year: currentAcademicYear,
        });

        const stats: MonthlyStats[] = data.summaries.map((summary) => ({
          month: summary.month,
          averageScore: summary.averageScore,
          hasData: summary.hasData,
          subjectCount: summary.subjectCount,
          totalSubjects: summary.totalSubjects,
          isComplete: summary.isComplete,
        }));

        // Cache the data
        monthlySummariesCache[cacheKey] = stats;
        cacheTimeRef.current[cacheKey] = now;

        if (isMounted) {
          setMonthlyStats(stats);
        }
      } catch (error) {
        console.error(`❌ Error fetching monthly summaries:`, error);
        if (isMounted) {
          setMonthlyStats([]);
        }
      } finally {
        if (isMounted) {
          setLoadingStats(false);
        }
      }
    };

    if (!isEditingProfile) {
      fetchMonthlyStats();
    } else {
      setMonthlyStats([]);
      setLoadingStats(false);
    }

    return () => {
      isMounted = false;
    };
  }, [isEditingProfile, currentAcademicYear]);

  // Fetch activity feed with caching
  useEffect(() => {
    let isMounted = true;

    const fetchActivities = async () => {
      const cacheKey = `activities_${profile?.student?.id}`;
      const now = Date.now();
      const isCacheValid =
        activitiesCache[cacheKey] &&
        now - (cacheTimeRef.current[cacheKey] || 0) < CACHE_DURATION;

      if (isCacheValid) {
        setActivities(activitiesCache[cacheKey]);
        return;
      }

      setLoadingActivities(true);

      try {
        const data = await getMyActivities({ limit: 5 });

        // Cache the data
        activitiesCache[cacheKey] = data.activities;
        cacheTimeRef.current[cacheKey] = now;

        if (isMounted) {
          setActivities(data.activities);
        }
      } catch (error) {
        console.error(`❌ Error fetching activities:`, error);
        // Generate sample activities based on grades data
        if (isMounted && gradesData?.grades && gradesData.grades.length > 0) {
          const sampleActivities = generateSampleActivities(
            gradesData,
            attendanceData,
          );
          setActivities(sampleActivities);
        }
      } finally {
        if (isMounted) {
          setLoadingActivities(false);
        }
      }
    };

    if (!isEditingProfile && profile?.student?.id) {
      fetchActivities();
    }

    return () => {
      isMounted = false;
    };
  }, [isEditingProfile, profile?.student?.id, gradesData, attendanceData]);

  // Generate sample activities from real data (fallback when API not available)
  const generateSampleActivities = useCallback(
    (
      grades?: GradesResponse | null,
      attendance?: AttendanceResponse | null,
    ): ActivityType[] => {
      const activities: ActivityType[] = [];

      // From grades
      if (grades?.grades && grades.grades.length > 0) {
        const recentGrade = grades.grades[0];
        if (recentGrade.score >= 45) {
          activities.push({
            id: `grade_${recentGrade.id}`,
            type: "ACHIEVEMENT_EARNED",
            title: "ទទួលបានពិន្ទុខ្ពស់",
            description: `${recentGrade.subject.nameKh}: ${recentGrade.score}/${recentGrade.maxScore}`,
            icon: "Award",
            color: "from-yellow-500 to-orange-600",
            timestamp: new Date().toISOString(),
            metadata: {
              score: recentGrade.score,
              maxScore: recentGrade.maxScore,
              subject: recentGrade.subject.nameKh,
            },
          });
        } else {
          activities.push({
            id: `grade_${recentGrade.id}`,
            type: "GRADE_ADDED",
            title: "ទទួលបានពិន្ទុថ្មី",
            description: `${recentGrade.subject.nameKh}: ${recentGrade.score}/${recentGrade.maxScore}`,
            icon: "CheckCircle",
            color: "from-green-500 to-emerald-600",
            timestamp: new Date().toISOString(),
            metadata: {
              score: recentGrade.score,
              maxScore: recentGrade.maxScore,
              subject: recentGrade.subject.nameKh,
            },
          });
        }
      }

      // From attendance
      if (
        attendance?.statistics &&
        attendance.statistics.attendanceRate >= 95
      ) {
        activities.push({
          id: "attendance_achievement",
          type: "ACHIEVEMENT_EARNED",
          title: "វត្តមានល្អប្រសើរ",
          description: `អត្ត្រាមករៀន ${attendance.statistics.attendanceRate.toFixed(0)}%`,
          icon: "Target",
          color: "from-blue-500 to-indigo-600",
          timestamp: new Date().toISOString(),
        });
      }

      // From average score
      if (grades?.statistics && grades.statistics.averageScore >= 40) {
        activities.push({
          id: "average_achievement",
          type: "ACHIEVEMENT_EARNED",
          title: "សមិទ្ធផលល្អប្រសើរ",
          description: `មធ្យមភាគ ${grades.statistics.averageScore.toFixed(1)}/50`,
          icon: "TrendingUp",
          color: "from-purple-500 to-pink-600",
          timestamp: new Date().toISOString(),
        });
      }

      return activities.slice(0, 5);
    },
    [],
  );

  // Handle photo upload
  const handlePhotoUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          alert("ទំហំរូបភាពធំពេក។ សូមជ្រើសរើសរូបភាពតូចជាង 5MB");
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          const photoUrl = reader.result as string;
          setProfilePhoto(photoUrl);
          if (profile?.student?.id) {
            requestIdleCallback(() => {
              localStorage.setItem(
                `student_photo_${profile.student.id}`,
                photoUrl,
              );
            });
          }
          setShowPhotoOptions(false);
        };
        reader.readAsDataURL(file);
      }
    },
    [profile?.student?.id],
  );

  const handleRemovePhoto = useCallback(() => {
    setProfilePhoto(null);
    if (profile?.student?.id) {
      requestIdleCallback(() => {
        localStorage.removeItem(`student_photo_${profile.student.id}`);
      });
    }
    setShowPhotoOptions(false);
  }, [profile?.student?.id]);

  // Memoized computed values
  const highestAverage = useMemo(() => {
    const monthsWithData = monthlyStats.filter(
      (s) => s.hasData && s.averageScore !== null,
    );
    return monthsWithData.length > 0
      ? Math.max(...monthsWithData.map((s) => s.averageScore || 0))
      : 0;
  }, [monthlyStats]);

  if (isEditingProfile) {
    return (
      <StudentProfileEditForm
        profile={profile}
        onSave={onSave}
        onCancel={onCancel}
        onUnsavedChanges={onUnsavedChanges}
        isSubmitting={loading}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Professional Education Social Media Profile Header */}
      <HeroSection
        profile={profile}
        profilePhoto={profilePhoto}
        gradesData={gradesData}
        attendanceData={attendanceData}
        onCameraClick={() => setShowPhotoOptions(true)}
      />

      {/* Social Action Buttons */}
      <SocialActionButtons onEdit={onEdit} />

      {/* Academic Highlights */}
      <AcademicHighlights
        profile={profile}
        highestAverage={highestAverage}
        attendanceData={attendanceData}
        gradesData={gradesData}
      />

      {/* Academic Year Statistics */}
      <AcademicYearStats
        monthlyStats={monthlyStats}
        loadingStats={loadingStats}
        showAllMonths={showAllMonths}
        onToggleShowAll={() => setShowAllMonths(!showAllMonths)}
        currentAcademicYear={currentAcademicYear}
      />

      {/* Activity Feed - Real Data */}
      <ActivityFeed activities={activities} loading={loadingActivities} />

      {/* Quick Info Grid */}
      <QuickInfoGrid profile={profile} />

      {/* Edit Profile Button */}
      <EditProfileButton onEdit={onEdit} />

      {/* Personal Information */}
      <PersonalInformation profile={profile} />

      {/* Family Information */}
      {(profile.student.fatherName ||
        profile.student.motherName ||
        profile.student.parentPhone) && <FamilyInformation profile={profile} />}

      {/* Academic History */}
      {(profile.student.previousSchool ||
        profile.student.previousGrade ||
        profile.student.transferredFrom) && (
        <AcademicHistory profile={profile} />
      )}

      {/* Grade 9 Exam Information */}
      {(profile.student.grade9ExamSession ||
        profile.student.grade9ExamCenter ||
        profile.student.grade9PassStatus) && (
        <Grade9ExamInfo profile={profile} />
      )}

      {/* Grade 12 Exam Information */}
      {(profile.student.grade12ExamSession ||
        profile.student.grade12ExamCenter ||
        profile.student.grade12Track ||
        profile.student.grade12PassStatus) && (
        <Grade12ExamInfo profile={profile} />
      )}

      {/* Remarks */}
      {profile.student.remarks && <Remarks profile={profile} />}

      {/* Change Password Button */}
      <ChangePasswordButton onChangePassword={onChangePassword} />

      {/* Photo Upload Modal */}
      {showPhotoOptions && (
        <PhotoUploadModal
          profilePhoto={profilePhoto}
          onClose={() => setShowPhotoOptions(false)}
          onChoosePhoto={() => fileInputRef.current?.click()}
          onRemovePhoto={handleRemovePhoto}
        />
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoUpload}
        className="hidden"
      />
    </div>
  );
}

// Memoized Hero Section Component
const HeroSection = memo(
  ({
    profile,
    profilePhoto,
    gradesData,
    attendanceData,
    onCameraClick,
  }: any) => (
    <div className="bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-lg">
      {/* Cover Banner */}
      <div className="relative h-32 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-20 translate-x-20"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-16 -translate-x-16"></div>
        </div>
        {/* Account Status Badge */}
        <div className="absolute top-4 right-4">
          <div
            className={`px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg ${
              profile.student.isAccountActive
                ? "bg-green-400/90 backdrop-blur-sm"
                : "bg-red-400/90 backdrop-blur-sm"
            }`}
          >
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-white text-xs font-bold">
              {profile.student.isAccountActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-5 pb-5">
        {/* Avatar - Center Aligned with Photo Upload */}
        <div className="flex flex-col items-center -mt-20 mb-4">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-pink-400 rounded-full blur-xl opacity-60"></div>
            <div className="relative w-40 h-40 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full p-1.5 shadow-2xl">
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                  <User className="w-20 h-20 text-indigo-600" />
                </div>
              )}
            </div>
            <button
              onClick={onCameraClick}
              className="absolute bottom-1 right-1 w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full border-4 border-white flex items-center justify-center shadow-xl hover:scale-110 transition-transform active:scale-95"
            >
              <Camera className="w-6 h-6 text-white" />
            </button>
            <div className="absolute top-0 right-0 w-10 h-10 bg-green-400 rounded-full border-4 border-white flex items-center justify-center shadow-lg">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Name & Bio */}
          <div className="text-center mb-4">
            <h1 className="text-2xl font-black text-gray-900 mb-1">
              {profile.student.khmerName}
            </h1>
            <p className="text-sm text-gray-600 mb-3">
              {profile.student.englishName ||
                `${profile.firstName} ${profile.lastName}`}
            </p>
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <CreditCard className="w-4 h-4" />
                <span className="font-bold">{profile.student.studentId}</span>
              </div>
              <span className="text-gray-300">•</span>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <GraduationCap className="w-4 h-4" />
                <span className="font-bold">
                  {profile.student?.class?.name || "N/A"}
                </span>
              </div>
            </div>

            {/* Role Badge */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 px-4 py-2 rounded-full shadow-sm">
              <Award className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-black text-indigo-700">
                {ROLE_LABELS[
                  profile.student?.studentRole as keyof typeof ROLE_LABELS
                ] || "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 py-4 border-t border-gray-100">
          <StatCard
            icon={Award}
            value={gradesData?.statistics?.averageScore?.toFixed(1) || "0.0"}
            label="មធ្យមភាគ"
            color="from-indigo-500 to-purple-600"
          />
          <StatCard
            icon={CheckCircle}
            value={`${attendanceData?.statistics?.attendanceRate?.toFixed(0) || "0"}%`}
            label="វត្តមាន"
            color="from-green-500 to-emerald-600"
          />
          <StatCard
            icon={BookOpen}
            value={gradesData?.grades?.length || "0"}
            label="មុខវិជ្ជា"
            color="from-blue-500 to-cyan-600"
          />
        </div>
      </div>
    </div>
  ),
);

HeroSection.displayName = "HeroSection";

// Memoized Stat Card
const StatCard = memo(({ icon: Icon, value, label, color }: any) => (
  <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4 border-2 border-gray-100 shadow-sm">
    <div className="flex flex-col items-center">
      <div
        className={`w-12 h-12 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mb-2 shadow-md`}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="text-xl font-black text-gray-900 mb-0.5">{value}</div>
      <div className="text-xs text-gray-600 font-bold text-center">{label}</div>
    </div>
  </div>
));

StatCard.displayName = "StatCard";

// Social Action Buttons
const SocialActionButtons = memo(({ onEdit }: any) => (
  <div className="grid grid-cols-4 gap-3">
    <button className="flex flex-col items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 rounded-2xl p-4 hover:border-indigo-300 hover:shadow-lg transition-all active:scale-95 group">
      <div className="w-12 h-12 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
        <MessageSquare className="w-6 h-6 text-indigo-600" />
      </div>
      <span className="text-xs font-bold">ផ្ញើសារ</span>
    </button>

    <button className="flex flex-col items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 rounded-2xl p-4 hover:border-blue-300 hover:shadow-lg transition-all active:scale-95 group">
      <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
        <UserPlus className="w-6 h-6 text-blue-600" />
      </div>
      <span className="text-xs font-bold">តាមដាន</span>
    </button>

    <button className="flex flex-col items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 rounded-2xl p-4 hover:border-green-300 hover:shadow-lg transition-all active:scale-95 group">
      <div className="w-12 h-12 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
        <Share2 className="w-6 h-6 text-green-600" />
      </div>
      <span className="text-xs font-bold">ចែករំលែក</span>
    </button>

    <button className="flex flex-col items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 rounded-2xl p-4 hover:border-amber-300 hover:shadow-lg transition-all active:scale-95 group">
      <div className="w-12 h-12 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
        <Bell className="w-6 h-6 text-amber-600" />
      </div>
      <span className="text-xs font-bold">ជូនដំណឹង</span>
    </button>
  </div>
));

SocialActionButtons.displayName = "SocialActionButtons";

// Academic Highlights
const AcademicHighlights = memo(
  ({ profile, highestAverage, attendanceData, gradesData }: any) => {
    const hasHighScore = highestAverage >= 40;
    const hasPerfectAttendance =
      attendanceData?.statistics?.attendanceRate &&
      attendanceData.statistics.attendanceRate >= 95;
    const isLeader = profile.student?.studentRole !== "GENERAL";
    const hasGrade9Pass =
      profile.student.grade9PassStatus &&
      (profile.student.grade9PassStatus.toLowerCase().includes("pass") ||
        profile.student.grade9PassStatus.toLowerCase().includes("ជាប់"));
    const hasGrade12Pass =
      profile.student.grade12PassStatus &&
      (profile.student.grade12PassStatus.toLowerCase().includes("pass") ||
        profile.student.grade12PassStatus.toLowerCase().includes("ជាប់"));

    const hasAnyAchievement =
      hasHighScore ||
      hasPerfectAttendance ||
      isLeader ||
      hasGrade9Pass ||
      hasGrade12Pass;

    if (!hasAnyAchievement) {
      return null;
    }

    return (
      <div className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-koulen font-black text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            <span>សមិទ្ធផល • Achievements</span>
          </h4>
          <TrendingUp className="w-5 h-5 text-green-500" />
        </div>
        <div className="grid grid-cols-1 gap-3">
          {hasHighScore && (
            <AchievementBadge
              icon={Award}
              title="មធ្យមភាគល្អបំផុត"
              subtitle={`High Achiever • Avg: ${highestAverage.toFixed(1)}`}
              emoji="🏆"
              color="yellow"
            />
          )}

          {hasPerfectAttendance && (
            <AchievementBadge
              icon={CheckCircle}
              title="អត្ត្រាមករៀនល្អ"
              subtitle="Perfect Attendance"
              emoji="✓"
              color="green"
            />
          )}

          {isLeader && (
            <AchievementBadge
              icon={Users}
              title="អ្នកដឹកនាំថ្នាក់"
              subtitle="Class Leader"
              emoji="★"
              color="blue"
            />
          )}

          {hasGrade9Pass && (
            <AchievementBadge
              icon={GraduationCap}
              title="ជាប់ថ្នាក់៩"
              subtitle="Grade 9 Pass"
              emoji="9"
              color="purple"
            />
          )}

          {hasGrade12Pass && (
            <AchievementBadge
              icon={Award}
              title="បាក់ឌុប"
              subtitle="Grade 12 Pass"
              emoji="🎓"
              color="rose"
            />
          )}
        </div>
      </div>
    );
  },
);

AcademicHighlights.displayName = "AcademicHighlights";

// Achievement Badge Component
const AchievementBadge = memo(
  ({ icon: Icon, title, subtitle, emoji, color }: any) => {
    const colorClasses = {
      yellow:
        "from-yellow-50 via-amber-50 to-yellow-50 border-yellow-200 text-yellow-900 bg-yellow-100 text-yellow-600 bg-yellow-200 text-yellow-700",
      green:
        "from-green-50 via-emerald-50 to-green-50 border-green-200 text-green-900 bg-green-100 text-green-600 bg-green-200 text-green-700",
      blue: "from-blue-50 via-cyan-50 to-blue-50 border-blue-200 text-blue-900 bg-blue-100 text-blue-600 bg-blue-200 text-blue-700",
      purple:
        "from-purple-50 via-pink-50 to-purple-50 border-purple-200 text-purple-900 bg-purple-100 text-purple-600 bg-purple-200 text-purple-700",
      rose: "from-rose-50 via-red-50 to-rose-50 border-rose-200 text-rose-900 bg-rose-100 text-rose-600 bg-rose-200 text-rose-700",
    };

    const [bgGrad, border, textMain, bgIcon, iconColor, bgEmoji, emojiColor] =
      colorClasses[color as keyof typeof colorClasses].split(" ");

    return (
      <div
        className={`flex items-center gap-3 bg-gradient-to-r ${bgGrad} border-2 ${border} px-4 py-3 rounded-xl shadow-sm`}
      >
        <div
          className={`w-11 h-11 ${bgIcon} rounded-full flex items-center justify-center flex-shrink-0`}
        >
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        <div className="flex-1">
          <p className={`text-sm font-black ${textMain}`}>{title}</p>
          <p className={`text-xs ${emojiColor} font-medium`}>{subtitle}</p>
        </div>
        <div
          className={`w-9 h-9 ${bgEmoji} rounded-lg flex items-center justify-center`}
        >
          <span className={`${emojiColor} font-black text-sm`}>{emoji}</span>
        </div>
      </div>
    );
  },
);

AchievementBadge.displayName = "AchievementBadge";

// Academic Year Stats Component - Remains mostly the same but with memoization
const AcademicYearStats = memo(
  ({
    monthlyStats,
    loadingStats,
    showAllMonths,
    onToggleShowAll,
    currentAcademicYear,
  }: any) => (
    <div className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          <h4 className="text-sm font-koulen font-black text-gray-900">
            ឆ្នាំសិក្សា {currentAcademicYear}-{currentAcademicYear + 1}
          </h4>
        </div>
        <span className="text-xs text-indigo-600 font-bold">Academic Year</span>
      </div>

      {loadingStats ? (
        <div className="text-center py-6">
          <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs text-gray-500">កំពុងផ្ទុក...</p>
        </div>
      ) : monthlyStats.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-sm font-bold text-gray-700 mb-1">
            មិនទាន់មានទិន្នន័យ
          </p>
          <p className="text-xs text-gray-500">No data available yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {monthlyStats
            .slice(0, showAllMonths ? monthlyStats.length : 5)
            .map((stat: any, index: number) => (
              <MonthStatRow key={index} stat={stat} />
            ))}

          {monthlyStats.length > 5 && (
            <button
              onClick={onToggleShowAll}
              className="w-full mt-3 py-3 px-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl text-indigo-700 font-bold text-sm hover:from-indigo-100 hover:to-purple-100 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-98"
            >
              <span>
                {showAllMonths
                  ? "បង្ហាញតិច • Show Less"
                  : "បង្ហាញច្រើន • Show More"}
              </span>
              <span className="text-lg">{showAllMonths ? "↑" : "↓"}</span>
            </button>
          )}
        </div>
      )}
    </div>
  ),
);

AcademicYearStats.displayName = "AcademicYearStats";

// Month Stat Row Component
const MonthStatRow = memo(({ stat }: { stat: MonthlyStats }) => {
  const hasScore = stat.hasData && stat.averageScore !== null;
  const inProgress = stat.hasData && !stat.isComplete;
  const hasAnyData = stat.hasData;

  const scoreColor = hasScore
    ? stat.averageScore! >= 40
      ? "text-green-600"
      : stat.averageScore! >= 35
        ? "text-blue-600"
        : stat.averageScore! >= 30
          ? "text-yellow-600"
          : "text-orange-600"
    : "text-gray-400";

  const bgColor = hasAnyData
    ? inProgress
      ? "bg-amber-50 border-amber-300"
      : hasScore && stat.averageScore! >= 40
        ? "bg-green-50 border-green-200"
        : hasScore && stat.averageScore! >= 35
          ? "bg-blue-50 border-blue-200"
          : hasScore && stat.averageScore! >= 30
            ? "bg-yellow-50 border-yellow-200"
            : hasScore
              ? "bg-orange-50 border-orange-200"
              : "bg-amber-50 border-amber-300"
    : "bg-gray-50 border-gray-200";

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 ${bgColor} shadow-sm`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            hasAnyData ? "bg-white border-2 border-gray-200" : "bg-gray-100"
          }`}
        >
          {hasAnyData ? (
            inProgress ? (
              <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
            ) : (
              <TrendingUp className={`w-5 h-5 ${scoreColor}`} />
            )
          ) : (
            <span className="text-gray-400 text-xs font-bold">—</span>
          )}
        </div>
        <div>
          <p className="text-xs font-black text-gray-900">{stat.month}</p>
          <p className="text-xs text-gray-500 font-medium">
            {hasAnyData
              ? inProgress
                ? `In Progress • ${stat.subjectCount}/${stat.totalSubjects}`
                : "Score Available"
              : "No data yet"}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p
          className={`text-lg font-black ${
            inProgress ? "text-amber-600" : scoreColor
          }`}
        >
          {hasScore ? stat.averageScore!.toFixed(1) : hasAnyData ? "—" : "—"}
        </p>
        {hasAnyData && <p className="text-xs text-gray-500 font-medium">/50</p>}
      </div>
    </div>
  );
});

MonthStatRow.displayName = "MonthStatRow";

// Activity Feed Component - Real Data
const ActivityFeed = memo(
  ({
    activities,
    loading,
  }: {
    activities: ActivityType[];
    loading: boolean;
  }) => {
    if (loading) {
      return (
        <div className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-md">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h4 className="text-lg font-black text-gray-900">
              សកម្មភាពថ្មីៗ • Recent Activity
            </h4>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl animate-pulse"
              >
                <div className="w-11 h-11 bg-gray-200 rounded-xl"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activities.length === 0) {
      return (
        <div className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-md">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h4 className="text-lg font-black text-gray-900">
              សកម្មភាពថ្មីៗ • Recent Activity
            </h4>
          </div>
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">📋</span>
            </div>
            <p className="text-sm font-bold text-gray-700 mb-1">
              មិនទាន់មានសកម្មភាព
            </p>
            <p className="text-xs text-gray-500">No activities yet</p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-md">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h4 className="text-lg font-black text-gray-900">
              សកម្មភាពថ្មីៗ • Recent Activity
            </h4>
          </div>
          <TrendingUp className="w-5 h-5 text-green-500" />
        </div>
        <div className="space-y-3">
          {activities.map((activity) => (
            <ActivityRow key={activity.id} activity={activity} />
          ))}
        </div>
      </div>
    );
  },
);

ActivityFeed.displayName = "ActivityFeed";

// Activity Row Component
const ActivityRow = memo(({ activity }: { activity: ActivityType }) => {
  const IconComponent = getIconComponent(activity.icon);

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
      <div
        className={`p-2.5 bg-gradient-to-br ${activity.color} rounded-xl shadow-md`}
      >
        <IconComponent className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-gray-900">{activity.title}</p>
        <p className="text-xs text-gray-600">{activity.description}</p>
      </div>
    </div>
  );
});

ActivityRow.displayName = "ActivityRow";

// Helper function to get icon component by name
function getIconComponent(iconName: string) {
  const icons: { [key: string]: any } = {
    Award,
    CheckCircle,
    Target,
    TrendingUp,
    Activity,
    BookOpen,
    Users,
  };
  return icons[iconName] || Activity;
}

// Quick Info Grid - Memoized
const QuickInfoGrid = memo(({ profile }: any) => (
  <div className="grid grid-cols-3 gap-3">
    <QuickInfoCard
      icon={Calendar}
      label="ថ្ងៃកំណើត"
      value={
        profile.student.dateOfBirth
          ? new Date(profile.student.dateOfBirth).toLocaleDateString("km-KH", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "N/A"
      }
      color="from-blue-50 to-cyan-50 border-blue-200"
    />
    <QuickInfoCard
      icon={UserCircle}
      label="ភេទ"
      value={profile.student.gender === "MALE" ? "ប្រុស" : "ស្រី"}
      color="from-purple-50 to-pink-50 border-purple-200"
    />
    <QuickInfoCard
      icon={MapPin}
      label="ទីកន្លែង"
      value={profile.student.placeOfBirth || "N/A"}
      color="from-green-50 to-emerald-50 border-green-200"
    />
  </div>
));

QuickInfoGrid.displayName = "QuickInfoGrid";

// Quick Info Card Component
const QuickInfoCard = memo(({ icon: Icon, label, value, color }: any) => (
  <div
    className={`bg-gradient-to-br ${color} rounded-2xl p-4 border-2 shadow-sm`}
  >
    <div className="flex flex-col items-center text-center">
      <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center mb-2 shadow-sm">
        <Icon className="w-6 h-6 text-gray-700" />
      </div>
      <p className="text-xs text-gray-600 font-bold mb-1">{label}</p>
      <p className="text-xs font-black text-gray-900 leading-tight">{value}</p>
    </div>
  </div>
));

QuickInfoCard.displayName = "QuickInfoCard";

// Edit Profile Button
const EditProfileButton = memo(({ onEdit }: any) => (
  <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
    <button
      onClick={onEdit}
      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-4 transition-all flex items-center justify-center gap-2 active:scale-98 shadow-lg"
    >
      <Edit className="w-5 h-5" />
      <span>កែប្រែព័ត៌មាន • Edit Profile</span>
    </button>
  </div>
));

EditProfileButton.displayName = "EditProfileButton";

// Personal Information Section
const PersonalInformation = memo(({ profile }: any) => (
  <div className="bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-lg">
    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-black text-white text-base">
            ព័ត៌មានផ្ទាល់ខ្លួន
          </h1>
          <p className="text-xs text-white/80 font-medium">
            Personal Information
          </p>
        </div>
      </div>
    </div>
    <div className="p-5 space-y-3">
      {profile.email && (
        <InfoRow
          icon={<Mail className="w-5 h-5" />}
          label="អ៊ីម៉ែល • Email"
          value={profile.email}
          color="indigo"
        />
      )}

      {(profile.phone || profile.student.phoneNumber) && (
        <InfoRow
          icon={<Phone className="w-5 h-5" />}
          label="លេខទូរស័ព្ទ • Phone"
          value={profile.phone || profile.student.phoneNumber}
          color="green"
        />
      )}

      {profile.student.currentAddress && (
        <InfoRow
          icon={<Home className="w-5 h-5" />}
          label="អាសយដ្ឋានបច្ចុប្បន្ន • Address"
          value={profile.student.currentAddress}
          color="orange"
        />
      )}
    </div>
  </div>
));

PersonalInformation.displayName = "PersonalInformation";

// Family Information Section
const FamilyInformation = memo(({ profile }: any) => (
  <div className="bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-lg">
    <div className="bg-gradient-to-r from-pink-500 to-rose-600 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-black text-white text-base">ព័ត៌មានគ្រួសារ</h1>
          <p className="text-xs text-white/80 font-medium">
            Family Information
          </p>
        </div>
      </div>
    </div>
    <div className="p-5 space-y-3">
      {profile.student.fatherName && (
        <InfoRow
          icon={<User className="w-5 h-5" />}
          label="ឈ្មោះឪពុក • Father"
          value={profile.student.fatherName}
          color="blue"
        />
      )}

      {profile.student.motherName && (
        <InfoRow
          icon={<User className="w-5 h-5" />}
          label="ឈ្មោះម្តាយ • Mother"
          value={profile.student.motherName}
          color="pink"
        />
      )}

      {profile.student.parentPhone && (
        <InfoRow
          icon={<Phone className="w-5 h-5" />}
          label="លេខទូរស័ព្ទ • Phone"
          value={profile.student.parentPhone}
          color="green"
        />
      )}

      {profile.student.parentOccupation && (
        <InfoRow
          icon={<Briefcase className="w-5 h-5" />}
          label="មុខរបរ • Occupation"
          value={profile.student.parentOccupation}
          color="purple"
        />
      )}
    </div>
  </div>
));

FamilyInformation.displayName = "FamilyInformation";

// Academic History Section
const AcademicHistory = memo(({ profile }: any) => (
  <div className="bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-lg">
    <div className="bg-gradient-to-r from-blue-500 to-cyan-600 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <School className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-black text-white text-base">ប្រវត្តិសិក្សា</h1>
          <p className="text-xs text-white/80 font-medium">Academic History</p>
        </div>
      </div>
    </div>
    <div className="p-5 space-y-3">
      {profile.student.previousSchool && (
        <InfoRow
          icon={<GraduationCap className="w-5 h-5" />}
          label="សាលាមុន • Previous School"
          value={profile.student.previousSchool}
          color="blue"
        />
      )}

      {profile.student.previousGrade && (
        <InfoRow
          icon={<BookOpen className="w-5 h-5" />}
          label="ឡើងពីថ្នាក់ • Previous Grade"
          value={profile.student.previousGrade}
          color="indigo"
        />
      )}

      {profile.student.transferredFrom && (
        <InfoRow
          icon={<School className="w-5 h-5" />}
          label="ផ្ទេរពី • Transferred From"
          value={profile.student.transferredFrom}
          color="cyan"
        />
      )}

      {profile.student.repeatingGrade && (
        <InfoRow
          icon={<FileText className="w-5 h-5" />}
          label="រៀនឡើងវិញ • Repeating"
          value={profile.student.repeatingGrade}
          color="orange"
        />
      )}
    </div>
  </div>
));

AcademicHistory.displayName = "AcademicHistory";

// Grade 9 Exam Info Section (same implementation as before but memoized)
const Grade9ExamInfo = memo(({ profile }: any) => (
  <div className="bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-lg">
    <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <Award className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-black text-white text-base">ប្រឡងថ្នាក់ទី៩</h1>
          <p className="text-xs text-white/80 font-medium">
            Grade 9 Examination
          </p>
        </div>
      </div>
    </div>
    <div className="p-5 space-y-3">
      {profile.student.grade9ExamSession && (
        <InfoRow
          icon={<Calendar className="w-5 h-5" />}
          label="សម័យប្រឡង • Session"
          value={profile.student.grade9ExamSession}
          color="blue"
        />
      )}

      {profile.student.grade9ExamCenter && (
        <InfoRow
          icon={<MapPin className="w-5 h-5" />}
          label="មណ្ឌលប្រឡង • Center"
          value={profile.student.grade9ExamCenter}
          color="purple"
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        {profile.student.grade9ExamRoom && (
          <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border-2 border-gray-200">
            <div className="flex-1">
              <p className="text-xs text-gray-600 font-bold mb-0.5">
                បន្ទប់ • Room
              </p>
              <p className="text-sm font-black text-gray-900">
                {profile.student.grade9ExamRoom}
              </p>
            </div>
          </div>
        )}

        {profile.student.grade9ExamDesk && (
          <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border-2 border-gray-200">
            <div className="flex-1">
              <p className="text-xs text-gray-600 font-bold mb-0.5">
                តុ • Desk
              </p>
              <p className="text-sm font-black text-gray-900">
                {profile.student.grade9ExamDesk}
              </p>
            </div>
          </div>
        )}
      </div>

      {profile.student.grade9PassStatus && (
        <div
          className={`flex items-center gap-3 p-4 rounded-2xl border-2 ${
            profile.student.grade9PassStatus.toLowerCase().includes("pass") ||
            profile.student.grade9PassStatus.toLowerCase().includes("ជាប់")
              ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
              : "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200"
          }`}
        >
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
              profile.student.grade9PassStatus.toLowerCase().includes("pass") ||
              profile.student.grade9PassStatus.toLowerCase().includes("ជាប់")
                ? "bg-gradient-to-br from-green-500 to-emerald-600"
                : "bg-gradient-to-br from-orange-500 to-amber-600"
            }`}
          >
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-600 font-bold mb-1">
              លទ្ធផល • Result
            </p>
            <p className="text-sm font-black text-gray-900">
              {profile.student.grade9PassStatus}
            </p>
          </div>
        </div>
      )}
    </div>
  </div>
));

Grade9ExamInfo.displayName = "Grade9ExamInfo";

// Grade 12 Exam Info Section (same implementation as before but memoized)
const Grade12ExamInfo = memo(({ profile }: any) => (
  <div className="bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-lg">
    <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-black text-white text-base">ប្រឡងបាក់ឌុប</h1>
          <p className="text-xs text-white/80 font-medium">
            Grade 12 Examination
          </p>
        </div>
      </div>
    </div>
    <div className="p-5 space-y-3">
      {profile.student.grade12Track && (
        <InfoRow
          icon={<BookOpen className="w-5 h-5" />}
          label="ផ្នែក • Track"
          value={profile.student.grade12Track}
          color="indigo"
        />
      )}

      {profile.student.grade12ExamSession && (
        <InfoRow
          icon={<Calendar className="w-5 h-5" />}
          label="វគ្គប្រឡង • Session"
          value={profile.student.grade12ExamSession}
          color="blue"
        />
      )}

      {profile.student.grade12ExamCenter && (
        <InfoRow
          icon={<MapPin className="w-5 h-5" />}
          label="មជ្ឈមណ្ឌល • Center"
          value={profile.student.grade12ExamCenter}
          color="purple"
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        {profile.student.grade12ExamRoom && (
          <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border-2 border-gray-200">
            <div className="flex-1">
              <p className="text-xs text-gray-600 font-bold mb-0.5">
                បន្ទប់ • Room
              </p>
              <p className="text-sm font-black text-gray-900">
                {profile.student.grade12ExamRoom}
              </p>
            </div>
          </div>
        )}

        {profile.student.grade12ExamDesk && (
          <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border-2 border-gray-200">
            <div className="flex-1">
              <p className="text-xs text-gray-600 font-bold mb-0.5">
                តុ • Desk
              </p>
              <p className="text-sm font-black text-gray-900">
                {profile.student.grade12ExamDesk}
              </p>
            </div>
          </div>
        )}
      </div>

      {profile.student.grade12PassStatus && (
        <div
          className={`flex items-center gap-3 p-4 rounded-2xl border-2 ${
            profile.student.grade12PassStatus.toLowerCase().includes("pass") ||
            profile.student.grade12PassStatus.toLowerCase().includes("ជាប់")
              ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
              : "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200"
          }`}
        >
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
              profile.student.grade12PassStatus
                .toLowerCase()
                .includes("pass") ||
              profile.student.grade12PassStatus.toLowerCase().includes("ជាប់")
                ? "bg-gradient-to-br from-green-500 to-emerald-600"
                : "bg-gradient-to-br from-orange-500 to-amber-600"
            }`}
          >
            <Award className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-600 font-bold mb-1">
              លទ្ធផល • Result
            </p>
            <p className="text-sm font-black text-gray-900">
              {profile.student.grade12PassStatus}
            </p>
          </div>
        </div>
      )}
    </div>
  </div>
));

Grade12ExamInfo.displayName = "Grade12ExamInfo";

// Remarks Section
const Remarks = memo(({ profile }: any) => (
  <div className="bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-lg">
    <div className="bg-gradient-to-r from-gray-600 to-slate-700 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-black text-white text-base">កំណត់សម្គាល់</h1>
          <p className="text-xs text-white/80 font-medium">Remarks</p>
        </div>
      </div>
    </div>
    <div className="p-5">
      <div className="p-4 bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl border-2 border-gray-200">
        <p className="text-sm text-gray-900 leading-relaxed font-medium">
          {profile.student.remarks}
        </p>
      </div>
    </div>
  </div>
));

Remarks.displayName = "Remarks";

// Change Password Button
const ChangePasswordButton = memo(({ onChangePassword }: any) => (
  <div className="pt-2">
    <button
      onClick={onChangePassword}
      className="w-full bg-white border-2 border-gray-200 text-gray-700 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-lg transition-all active:scale-98 flex items-center justify-center gap-3"
    >
      <Lock className="w-6 h-6" />
      <span className="font-bold text-lg">ផ្លាស់ប្តូរពាក្យសម្ងាត់</span>
    </button>
  </div>
));

ChangePasswordButton.displayName = "ChangePasswordButton";

// Info Row Component
const InfoRow = memo(({ icon, label, value, color = "gray" }: any) => {
  const colorClasses = {
    indigo: "from-indigo-50 to-purple-50 border-indigo-200",
    blue: "from-blue-50 to-cyan-50 border-blue-200",
    green: "from-green-50 to-emerald-50 border-green-200",
    pink: "from-pink-50 to-rose-50 border-pink-200",
    purple: "from-purple-50 to-pink-50 border-purple-200",
    orange: "from-orange-50 to-amber-50 border-orange-200",
    cyan: "from-cyan-50 to-teal-50 border-cyan-200",
    gray: "from-gray-50 to-slate-50 border-gray-200",
  };

  return (
    <div
      className={`flex items-start gap-3 p-4 bg-gradient-to-br ${colorClasses[color]} rounded-2xl border-2`}
    >
      <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-600 font-bold mb-1">{label}</p>
        <p className="text-sm font-bold text-gray-900 break-words leading-relaxed">
          {value}
        </p>
      </div>
    </div>
  );
});

InfoRow.displayName = "InfoRow";

// Photo Upload Modal
const PhotoUploadModal = memo(
  ({ profilePhoto, onClose, onChoosePhoto, onRemovePhoto }: any) => (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center max-w-md mx-auto backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full bg-white rounded-t-3xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6"></div>
        <h4 className="text-xl font-black text-gray-900 mb-4 text-center">
          ជ្រើសរើសរូបភាព
        </h4>
        <div className="space-y-3">
          <button
            onClick={onChoosePhoto}
            className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl active:scale-95 transition-transform hover:shadow-md"
          >
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <ImageIcon className="w-6 h-6 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="font-bold text-gray-900">ជ្រើសពីរូបថត</p>
              <p className="text-xs text-gray-600">
                ជ្រើសរូបភាពពីឧបករណ៍របស់អ្នក
              </p>
            </div>
          </button>
          <button
            onClick={onChoosePhoto}
            className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl active:scale-95 transition-transform hover:shadow-md"
          >
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="font-bold text-gray-900">ថតរូបថ្មី</p>
              <p className="text-xs text-gray-600">ប្រើកាមេរ៉ាថតរូបភាពថ្មី</p>
            </div>
          </button>
          {profilePhoto && (
            <button
              onClick={onRemovePhoto}
              className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-2xl active:scale-95 transition-transform hover:shadow-md"
            >
              <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div className="text-left flex-1">
                <p className="font-bold text-gray-900">លុបរូបភាព</p>
                <p className="text-xs text-gray-600">ដកចេញរូបភាពបច្ចុប្បន្ន</p>
              </div>
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full p-4 bg-gray-100 text-gray-700 rounded-2xl font-bold active:scale-95 transition-transform hover:bg-gray-200"
          >
            បោះបង់
          </button>
        </div>
      </div>
    </div>
  ),
);

PhotoUploadModal.displayName = "PhotoUploadModal";
