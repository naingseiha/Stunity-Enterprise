import { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';

import { UserRole } from '@/types';

type IoniconsName = keyof typeof Ionicons.glyphMap;

export type UserCardStyleId =
  | 'brand-teal'
  | 'rose-blush'
  | 'pink-candy'
  | 'blush-sakura'
  | 'ocean-breeze'
  | 'emerald-dream'
  | 'violet-nova'
  | 'sunny-lemon'
  | 'peach-fizz';
export type UserCardTemplateId = 'aurora-wave' | 'glass-grid' | 'split-stripe' | 'sunrise-ring';
export type UserCardOrientation = 'horizontal' | 'vertical';
export type UserCardDesignId = 'classic' | 'wave' | 'prism' | 'luxe';

export interface UserCardDesignOption {
  id: UserCardDesignId;
  labelKey: string;
  fallbackLabel: string;
  icon: IoniconsName;
}

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
export const DEFAULT_USER_CARD_DESIGN_ID: UserCardDesignId = 'luxe';

export const USER_CARD_DESIGNS: readonly UserCardDesignOption[] = [
  {
    id: 'luxe',
    labelKey: 'profile.userCard.designs.luxe',
    fallbackLabel: 'Luxe',
    icon: 'sparkles-outline',
  },
  {
    id: 'wave',
    labelKey: 'profile.userCard.designs.wave',
    fallbackLabel: 'Wave',
    icon: 'color-wand-outline',
  },
  {
    id: 'prism',
    labelKey: 'profile.userCard.designs.prism',
    fallbackLabel: 'Prism',
    icon: 'diamond-outline',
  },
  {
    id: 'classic',
    labelKey: 'profile.userCard.designs.classic',
    fallbackLabel: 'Classic',
    icon: 'card-outline',
  },
];

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
    id: 'rose-blush',
    labelKey: 'profile.userCard.styles.roseBlush',
    fallbackLabel: 'Rose Blush',
    template: 'sunrise-ring',
    gradient: ['#4A102A', '#BE185D', '#FB7185'],
    chipBackground: '#FCE7F3',
    outline: '#EC4899',
    accent: '#F9A8D4',
    foreground: '#FFF1F2',
    mutedForeground: 'rgba(255,241,242,0.78)',
    panelTint: 'rgba(255,255,255,0.16)',
  },
  {
    id: 'pink-candy',
    labelKey: 'profile.userCard.styles.pinkCandy',
    fallbackLabel: 'Pink Candy',
    template: 'sunrise-ring',
    gradient: ['#7A163E', '#E11D8A', '#F9A8D4'],
    chipBackground: '#FCE7F3',
    outline: '#DB2777',
    accent: '#F9A8D4',
    foreground: '#FFF1F2',
    mutedForeground: 'rgba(255,241,242,0.78)',
    panelTint: 'rgba(255,255,255,0.16)',
  },
  {
    id: 'blush-sakura',
    labelKey: 'profile.userCard.styles.blushSakura',
    fallbackLabel: 'Blush Sakura',
    template: 'aurora-wave',
    gradient: ['#831843', '#F472B6', '#FBCFE8'],
    chipBackground: '#FCE7F3',
    outline: '#EC4899',
    accent: '#FBCFE8',
    foreground: '#FFF1F2',
    mutedForeground: 'rgba(255,241,242,0.78)',
    panelTint: 'rgba(255,255,255,0.17)',
  },
  {
    id: 'ocean-breeze',
    labelKey: 'profile.userCard.styles.oceanBreeze',
    fallbackLabel: 'Ocean Breeze',
    template: 'glass-grid',
    gradient: ['#0E7490', '#22D3EE', '#7DD3FC'],
    chipBackground: '#E0F2FE',
    outline: '#0EA5E9',
    accent: '#7DD3FC',
    foreground: '#F0F9FF',
    mutedForeground: 'rgba(240,249,255,0.76)',
    panelTint: 'rgba(255,255,255,0.16)',
  },
  {
    id: 'emerald-dream',
    labelKey: 'profile.userCard.styles.emeraldDream',
    fallbackLabel: 'Emerald Dream',
    template: 'aurora-wave',
    gradient: ['#052E2B', '#0F766E', '#34D399'],
    chipBackground: '#D1FAE5',
    outline: '#10B981',
    accent: '#6EE7B7',
    foreground: '#ECFDF5',
    mutedForeground: 'rgba(236,253,245,0.76)',
    panelTint: 'rgba(255,255,255,0.15)',
  },
  {
    id: 'violet-nova',
    labelKey: 'profile.userCard.styles.violetNova',
    fallbackLabel: 'Violet Nova',
    template: 'split-stripe',
    gradient: ['#240046', '#6D28D9', '#C084FC'],
    chipBackground: '#F3E8FF',
    outline: '#A855F7',
    accent: '#D8B4FE',
    foreground: '#FAF5FF',
    mutedForeground: 'rgba(250,245,255,0.76)',
    panelTint: 'rgba(255,255,255,0.15)',
  },
  {
    id: 'sunny-lemon',
    labelKey: 'profile.userCard.styles.sunnyLemon',
    fallbackLabel: 'Sunny Lemon',
    template: 'sunrise-ring',
    gradient: ['#A16207', '#FACC15', '#FEF08A'],
    chipBackground: '#FEF9C3',
    outline: '#EAB308',
    accent: '#FDE047',
    foreground: '#FFFBEB',
    mutedForeground: 'rgba(255,251,235,0.82)',
    panelTint: 'rgba(255,255,255,0.18)',
  },
  {
    id: 'peach-fizz',
    labelKey: 'profile.userCard.styles.peachFizz',
    fallbackLabel: 'Peach Fizz',
    template: 'sunrise-ring',
    gradient: ['#7C2D12', '#FB923C', '#FED7AA'],
    chipBackground: '#FFEDD5',
    outline: '#F97316',
    accent: '#FDBA74',
    foreground: '#FFF7ED',
    mutedForeground: 'rgba(255,247,237,0.78)',
    panelTint: 'rgba(255,255,255,0.16)',
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

export const isUserCardDesignId = (value: unknown): value is UserCardDesignId => (
  value === 'classic' || value === 'wave' || value === 'prism' || value === 'luxe'
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
