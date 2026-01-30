/**
 * Stunity Enterprise Design System
 * Based on V1 mobile app - Clean, professional, beautiful
 * Brand identity: Orange gradient + Purple accents
 */

export const colors = {
  // PRIMARY BRAND - Orange Gradient (Signature Stunity)
  brand: {
    orange: '#F59E0B',       // Primary orange
    orangeLight: '#FCD34D',  // Light yellow-orange
    orangeDark: '#D97706',   // Dark orange
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)',
  },
  
  // SECONDARY - Purple (Interactive elements)
  purple: {
    primary: '#6366F1',      // Main purple
    light: '#818CF8',
    dark: '#4F46E5',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
  },
  
  // BLUES (Professional, trust)
  blue: {
    primary: '#3B82F6',
    light: '#60A5FA',
    dark: '#2563EB',
    verification: '#3B82F6',  // Verification badge
  },
  
  // STATUS COLORS
  success: '#10B981',        // Green
  warning: '#F59E0B',        // Amber
  error: '#EF4444',          // Red
  info: '#3B82F6',           // Blue
  
  // NEUTRAL COLORS (Off-white backgrounds for softer look)
  white: '#FFFFFF',
  background: '#F9FAFB',     // Main background (off-white)
  cardBackground: '#FFFFFF',  // Card backgrounds
  border: '#E5E7EB',         // Borders
  
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  
  // TEXT COLORS
  text: {
    primary: '#111827',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
    white: '#FFFFFF',
  },
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
};

export const borderRadius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  full: '9999px',  // Pills and circular elements
};

export const shadows = {
  // Soft, professional shadows (not too heavy)
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  card: '0 2px 8px rgba(0, 0, 0, 0.08)',  // Card shadow from V1
};

export const typography = {
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    khmer: 'Battambang, "Noto Sans Khmer", sans-serif',
    heading: 'Koulen, "Noto Sans Khmer", sans-serif',
  },
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
};

export const components = {
  // PILL BUTTON (Navigation tabs)
  pill: {
    padding: '8px 20px',
    borderRadius: borderRadius.full,
    background: colors.white,
    activeBackground: colors.purple.gradient,
    color: colors.text.primary,
    activeColor: colors.white,
    shadow: shadows.sm,
  },
  
  // CARD (Feed posts, containers)
  card: {
    background: colors.cardBackground,
    borderRadius: borderRadius.lg,
    shadow: shadows.card,
    padding: spacing.md,
    border: `1px solid ${colors.border}`,
  },
  
  // CATEGORY TAG
  tag: {
    padding: '4px 12px',
    borderRadius: borderRadius.full,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
};

export default {
  colors,
  spacing,
  borderRadius,
  shadows,
  typography,
  components,
};
