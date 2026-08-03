/**
 * Admin Permission System
 * Defines all available permissions for admin users
 */

export const PERMISSIONS = {
  // Dashboard
  VIEW_DASHBOARD: 'VIEW_DASHBOARD',
  
  // Students
  MANAGE_STUDENTS: 'MANAGE_STUDENTS',
  
  // Teachers
  MANAGE_TEACHERS: 'MANAGE_TEACHERS',
  
  // Classes
  MANAGE_CLASSES: 'MANAGE_CLASSES',
  
  // Subjects
  MANAGE_SUBJECTS: 'MANAGE_SUBJECTS',
  
  // Grades
  MANAGE_GRADES: 'MANAGE_GRADES',
  
  // Attendance
  MANAGE_ATTENDANCE: 'MANAGE_ATTENDANCE',
  
  // Reports
  VIEW_REPORTS: 'VIEW_REPORTS',
  VIEW_AWARD_REPORT: 'VIEW_AWARD_REPORT',
  VIEW_TRACKING_BOOK: 'VIEW_TRACKING_BOOK',
  
  // Settings
  VIEW_SETTINGS: 'VIEW_SETTINGS',
  
  // Admin management
  MANAGE_ADMINS: 'MANAGE_ADMINS',

  // Enterprise administration
  MANAGE_SCHOOL_SETTINGS: 'MANAGE_SCHOOL_SETTINGS',
  MANAGE_ACADEMIC_YEARS: 'MANAGE_ACADEMIC_YEARS',
  MANAGE_CLAIM_CODES: 'MANAGE_CLAIM_CODES',
  APPROVE_SCHOOL_LINKS: 'APPROVE_SCHOOL_LINKS',
  RESET_USER_PASSWORDS: 'RESET_USER_PASSWORDS',
  EXPORT_STUDENT_DATA: 'EXPORT_STUDENT_DATA',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

/**
 * Permission categories for UI organization
 */
export interface PermissionCategory {
  id: string;
  label: string;
  labelKhmer: string;
  icon: string;
  permissions: {
    key: Permission;
    label: string;
    labelKhmer: string;
    description?: string;
  }[];
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: 'dashboard',
    label: 'Dashboard & Overview',
    labelKhmer: 'ផ្ទាំងគ្រប់គ្រង',
    icon: '📊',
    permissions: [
      {
        key: PERMISSIONS.VIEW_DASHBOARD,
        label: 'View Dashboard',
        labelKhmer: 'មើលផ្ទាំងគ្រប់គ្រង',
        description: 'Access to main dashboard and statistics',
      },
    ],
  },
  {
    id: 'students',
    label: 'Student Management',
    labelKhmer: 'គ្រប់គ្រងសិស្ស',
    icon: '👥',
    permissions: [
      {
        key: PERMISSIONS.MANAGE_STUDENTS,
        label: 'Manage Students',
        labelKhmer: 'គ្រប់គ្រងសិស្ស',
        description: 'Create, edit, and delete students',
      },
    ],
  },
  {
    id: 'teachers',
    label: 'Teacher Management',
    labelKhmer: 'គ្រប់គ្រងគ្រូបង្រៀន',
    icon: '👨‍🏫',
    permissions: [
      {
        key: PERMISSIONS.MANAGE_TEACHERS,
        label: 'Manage Teachers',
        labelKhmer: 'គ្រប់គ្រងគ្រូបង្រៀន',
        description: 'Create, edit, and delete teachers',
      },
    ],
  },
  {
    id: 'academic',
    label: 'Academic Management',
    labelKhmer: 'គ្រប់គ្រងសិក្សា',
    icon: '🎓',
    permissions: [
      {
        key: PERMISSIONS.MANAGE_CLASSES,
        label: 'Manage Classes',
        labelKhmer: 'គ្រប់គ្រងថ្នាក់រៀន',
        description: 'Create, edit, and delete classes',
      },
      {
        key: PERMISSIONS.MANAGE_SUBJECTS,
        label: 'Manage Subjects',
        labelKhmer: 'គ្រប់គ្រងមុខវិជ្ជា',
        description: 'Create, edit, and delete subjects',
      },
    ],
  },
  {
    id: 'grades',
    label: 'Grades & Scores',
    labelKhmer: 'ពិន្ទុ និងចំណាត់ថ្នាក់',
    icon: '📝',
    permissions: [
      {
        key: PERMISSIONS.MANAGE_GRADES,
        label: 'Manage Grades',
        labelKhmer: 'គ្រប់គ្រងពិន្ទុ',
        description: 'Enter and modify student scores',
      },
    ],
  },
  {
    id: 'attendance',
    label: 'Attendance Management',
    labelKhmer: 'គ្រប់គ្រងវត្តមាន',
    icon: '📅',
    permissions: [
      {
        key: PERMISSIONS.MANAGE_ATTENDANCE,
        label: 'Manage Attendance',
        labelKhmer: 'គ្រប់គ្រងវត្តមាន',
        description: 'Mark and manage student attendance',
      },
    ],
  },
  {
    id: 'reports',
    label: 'Reports & Statistics',
    labelKhmer: 'របាយការណ៍ និងស្ថិតិ',
    icon: '📊',
    permissions: [
      {
        key: PERMISSIONS.VIEW_REPORTS,
        label: 'View Reports',
        labelKhmer: 'មើលរបាយការណ៍',
        description: 'Access monthly and statistical reports',
      },
      {
        key: PERMISSIONS.VIEW_AWARD_REPORT,
        label: 'View Award Reports',
        labelKhmer: 'មើលតារាងកិត្តិយស',
        description: 'Access honor roll and award reports',
      },
      {
        key: PERMISSIONS.VIEW_TRACKING_BOOK,
        label: 'View Tracking Book',
        labelKhmer: 'មើលសៀវភៅតាមដាន',
        description: 'Access student tracking books',
      },
    ],
  },
  {
    id: 'settings',
    label: 'System Settings',
    labelKhmer: 'ការកំណត់ប្រព័ន្ធ',
    icon: '⚙️',
    permissions: [
      {
        key: PERMISSIONS.VIEW_SETTINGS,
        label: 'Access Settings',
        labelKhmer: 'ចូលប្រើការកំណត់',
        description: 'Access system settings and configuration',
      },
      {
        key: PERMISSIONS.MANAGE_SCHOOL_SETTINGS,
        label: 'Manage School Settings',
        labelKhmer: 'គ្រប់គ្រងការកំណត់សាលា',
        description: 'Change school profile and onboarding settings',
      },
      {
        key: PERMISSIONS.MANAGE_ACADEMIC_YEARS,
        label: 'Manage Academic Years',
        labelKhmer: 'គ្រប់គ្រងឆ្នាំសិក្សា',
        description: 'Create, update, archive and promote academic years',
      },
    ],
  },
  {
    id: 'security',
    label: 'Security & Identity',
    labelKhmer: 'សុវត្ថិភាព និងអត្តសញ្ញាណ',
    icon: '🔐',
    permissions: [
      {
        key: PERMISSIONS.MANAGE_ADMINS,
        label: 'Manage Administrators',
        labelKhmer: 'គ្រប់គ្រងអ្នកគ្រប់គ្រង',
        description: 'View and assign administrator permissions',
      },
      {
        key: PERMISSIONS.MANAGE_CLAIM_CODES,
        label: 'Manage Claim Codes',
        labelKhmer: 'គ្រប់គ្រងលេខកូដភ្ជាប់គណនី',
        description: 'View, generate, export, revoke and distribute claim credentials',
      },
      {
        key: PERMISSIONS.APPROVE_SCHOOL_LINKS,
        label: 'Approve School Links',
        labelKhmer: 'អនុម័តការភ្ជាប់គណនីសាលា',
        description: 'Approve, reject and unlink school account requests',
      },
      {
        key: PERMISSIONS.RESET_USER_PASSWORDS,
        label: 'Reset User Passwords',
        labelKhmer: 'កំណត់ពាក្យសម្ងាត់អ្នកប្រើឡើងវិញ',
        description: 'Perform administrative password resets',
      },
      {
        key: PERMISSIONS.EXPORT_STUDENT_DATA,
        label: 'Export Student Data',
        labelKhmer: 'នាំចេញទិន្នន័យសិស្ស',
        description: 'Export student records and reports',
      },
    ],
  },
];

/**
 * Default permissions for new admin accounts
 */
export const DEFAULT_ADMIN_PERMISSIONS: Permission[] = [
  PERMISSIONS.VIEW_DASHBOARD,
  PERMISSIONS.VIEW_REPORTS,
];

/**
 * All available permissions (for Super Admin)
 */
export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

/**
 * Check if a permission set includes a specific permission
 */
export const hasPermission = (
  userPermissions: Permission[] | string[] | null | undefined,
  requiredPermission: Permission
): boolean => {
  if (!userPermissions) return false;
  return userPermissions.includes(requiredPermission);
};

/**
 * Check if user has any of the required permissions
 */
export const hasAnyPermission = (
  userPermissions: Permission[] | string[] | null | undefined,
  requiredPermissions: Permission[]
): boolean => {
  if (!userPermissions) return false;
  return requiredPermissions.some(perm => userPermissions.includes(perm));
};

/**
 * Check if user has all of the required permissions
 */
export const hasAllPermissions = (
  userPermissions: Permission[] | string[] | null | undefined,
  requiredPermissions: Permission[]
): boolean => {
  if (!userPermissions) return false;
  return requiredPermissions.every(perm => userPermissions.includes(perm));
};
