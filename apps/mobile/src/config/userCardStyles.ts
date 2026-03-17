import { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';

import { UserRole } from '@/types';

type IoniconsName = keyof typeof Ionicons.glyphMap;

export type UserCardStyleId = 'brand-teal' | 'teal-night' | 'indigo-luxe' | 'sunset-amber';
export type UserCardTemplateId = 'aurora-wave' | 'glass-grid' | 'split-stripe' | 'sunrise-ring';
export type UserCardOrientation = 'horizontal' | 'vertical';

export interface UserCardStyleOption {
  id: UserCardStyleId;
  labelKey: string;
  fallbackLabel: string;
  template: UserCardTemplateId;
  gradient: [string, string, string];
  chipBackground: string;
  outline: string;
  accent: string;
  foreground: string;
  mutedForeground: string;
  panelTint: string;
}

export const DEFAULT_USER_CARD_STYLE_ID: UserCardStyleId = 'brand-teal';
export const DEFAULT_USER_CARD_ORIENTATION: UserCardOrientation = 'horizontal';

export const USER_CARD_STYLES: readonly UserCardStyleOption[] = [
  {
    id: 'brand-teal',
    labelKey: 'profile.userCard.styles.brandTeal',
    fallbackLabel: 'Brand Teal',
    template: 'aurora-wave',
    gradient: ['#003B46', '#08BFD1', '#17E1C4'],
    chipBackground: '#CCFBF1',
    outline: '#09CFF7',
    accent: '#A7F3D0',
    foreground: '#FFFFFF',
    mutedForeground: 'rgba(255,255,255,0.72)',
    panelTint: 'rgba(255,255,255,0.18)',
  },
  {
    id: 'teal-night',
    labelKey: 'profile.userCard.styles.tealNight',
    fallbackLabel: 'Teal Night',
    template: 'glass-grid',
    gradient: ['#031C24', '#0E5A74', '#22B8CF'],
    chipBackground: '#CFFAFE',
    outline: '#0891B2',
    accent: '#67E8F9',
    foreground: '#F8FAFC',
    mutedForeground: 'rgba(248,250,252,0.74)',
    panelTint: 'rgba(15,23,42,0.2)',
  },
  {
    id: 'indigo-luxe',
    labelKey: 'profile.userCard.styles.indigoLuxe',
    fallbackLabel: 'Indigo Luxe',
    template: 'split-stripe',
    gradient: ['#1B1B52', '#4338CA', '#8B5CF6'],
    chipBackground: '#EDE9FE',
    outline: '#6366F1',
    accent: '#DDD6FE',
    foreground: '#EEF2FF',
    mutedForeground: 'rgba(238,242,255,0.74)',
    panelTint: 'rgba(255,255,255,0.14)',
  },
  {
    id: 'sunset-amber',
    labelKey: 'profile.userCard.styles.sunsetAmber',
    fallbackLabel: 'Sunset Amber',
    template: 'sunrise-ring',
    gradient: ['#9A3412', '#EA580C', '#FBBF24'],
    chipBackground: '#FFEDD5',
    outline: '#EA580C',
    accent: '#FDE68A',
    foreground: '#FFFBEB',
    mutedForeground: 'rgba(255,251,235,0.78)',
    panelTint: 'rgba(120,53,15,0.22)',
  },
];

export const USER_CARD_ROLE_ICONS: Record<UserRole, IoniconsName> = {
  STUDENT: 'person-circle-outline',
  TEACHER: 'school-outline',
  PARENT: 'people-outline',
  ADMIN: 'shield-checkmark-outline',
  SUPER_ADMIN: 'shield-checkmark-outline',
  SCHOOL_ADMIN: 'business-outline',
  STAFF: 'briefcase-outline',
};

export const isUserCardStyleId = (value: unknown): value is UserCardStyleId => (
  typeof value === 'string'
  && USER_CARD_STYLES.some((styleOption) => styleOption.id === value)
);

export const isUserCardOrientation = (value: unknown): value is UserCardOrientation => (
  value === 'horizontal' || value === 'vertical'
);

export const getUserCardStyleById = (styleId?: string | null): UserCardStyleOption => {
  if (!styleId) return USER_CARD_STYLES[0];
  return USER_CARD_STYLES.find((styleOption) => styleOption.id === styleId) ?? USER_CARD_STYLES[0];
};

export const getUserRoleLabel = (role: UserRole, t: TFunction): string => {
  switch (role) {
    case 'TEACHER':
      return t('profile.roles.teacher', 'Teacher');
    case 'PARENT':
      return t('profile.roles.parent', 'Parent');
    case 'ADMIN':
      return t('profile.roles.admin', 'Admin');
    case 'SUPER_ADMIN':
      return t('profile.roles.superAdmin', 'Super Admin');
    case 'SCHOOL_ADMIN':
      return t('profile.roles.schoolAdmin', 'School Admin');
    case 'STAFF':
      return t('profile.roles.staff', 'Staff');
    default:
      return t('profile.roles.student', 'Student');
  }
};

export const formatUserCardDate = (value?: string): string => {
  if (!value) return '--/--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--/--';
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const yy = String(parsed.getFullYear()).slice(-2);
  return `${mm}/${yy}`;
};

export const formatUserCardExpiry = (issuedAt?: string, yearsValid = 4): string => {
  if (!issuedAt) return '--/--';
  const issued = new Date(issuedAt);
  if (Number.isNaN(issued.getTime())) return '--/--';
  issued.setFullYear(issued.getFullYear() + yearsValid);
  return formatUserCardDate(issued.toISOString());
};

export const formatUserCardNumber = (userId?: string, role: UserRole = 'STUDENT'): string => {
  const raw = `${role.slice(0, 3)}${(userId || '000000').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`;
  const padded = raw.padEnd(16, '0').slice(0, 16);
  return padded.match(/.{1,4}/g)?.join(' ') ?? padded;
};

export const formatUserCardVerificationCode = (userId?: string): string => {
  if (!userId) return 'STU-000000';
  return `STU-${userId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase().padStart(6, '0')}`;
};
