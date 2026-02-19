/**
 * Theme Configuration
 * 
 * Enterprise design system with light/dark mode support
 * Following Material Design 3 and iOS Human Interface Guidelines
 */

// Color scales for full palette access
const ColorScale = {
  primary: {
    50: '#F0F9FF',
    100: '#E0F2FE',
    200: '#BAE6FD',
    300: '#7DD3FC',
    400: '#38BDF8',
    500: '#0EA5E9', // Main brand color — Stunity sky blue
    600: '#0284C7',
    700: '#0369A1',
    800: '#075985',
    900: '#0C4A6E',
  },

  secondary: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316', // Orange accent
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
  },

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
} as const;

// Semantic status colors
const StatusColors = {
  success: {
    light: '#4ADE80',
    main: '#22C55E',
    dark: '#16A34A',
  },

  warning: {
    light: '#FDE047',
    main: '#EAB308',
    dark: '#CA8A04',
  },

  error: {
    light: '#F87171',
    main: '#EF4444',
    dark: '#DC2626',
  },

  info: {
    light: '#60A5FA',
    main: '#3B82F6',
    dark: '#2563EB',
  },
} as const;

// Merged Colors export — backward compatible
// Colors.primary = '#0EA5E9' (flat string for quick access)
// ColorScale.primary[500] = '#0EA5E9' (scale access for full palette)
export const Colors = {
  // Spread scales (accessible via Colors.gray[500], etc.)
  ...ColorScale,
  // Spread status colors (accessible via Colors.success.main, etc.)
  ...StatusColors,

  // Base Colors
  white: '#FFFFFF' as const,
  black: '#000000' as const,
  transparent: 'transparent' as const,

  // Flat shorthand colors — used throughout the app
  // NOTE: These override the scale objects above, so Colors.primary returns the string.
  // Use ColorScale.primary[500] when you need the full palette scale.
  primary: '#0EA5E9' as const,
  secondary: '#6366F1' as const,
  background: '#F8F7FC' as const,
  card: '#FFFFFF' as const,
  text: '#374151' as const,
  textSecondary: '#6B7280' as const,
  textTertiary: '#9CA3AF' as const,
  border: '#E5E7EB' as const,
  error: '#EF4444' as const,
};

// Export ColorScale for components that need the full palette
export { ColorScale };

// Light Theme
export const LightTheme = {
  dark: false,
  colors: {
    primary: ColorScale.primary[500],
    background: ColorScale.gray[50],
    card: Colors.white,
    text: ColorScale.gray[900],
    textSecondary: ColorScale.gray[600],
    textTertiary: ColorScale.gray[400],
    border: ColorScale.gray[200],
    notification: StatusColors.error.main,

    // Surfaces
    surface: Colors.white,
    surfaceVariant: ColorScale.gray[100],

    // Interactive
    buttonPrimary: ColorScale.primary[500],
    buttonSecondary: ColorScale.gray[100],
    buttonDisabled: ColorScale.gray[300],

    // Status
    success: StatusColors.success.main,
    warning: StatusColors.warning.main,
    error: StatusColors.error.main,
    info: StatusColors.info.main,

    // Skeleton
    skeleton: ColorScale.gray[200],
    skeletonHighlight: ColorScale.gray[100],

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.3)',
  },
};

// Dark Theme
export const DarkTheme = {
  dark: true,
  colors: {
    primary: ColorScale.primary[400],
    background: ColorScale.gray[900],
    card: ColorScale.gray[800],
    text: ColorScale.gray[50],
    textSecondary: ColorScale.gray[400],
    textTertiary: ColorScale.gray[500],
    border: ColorScale.gray[700],
    notification: StatusColors.error.main,

    // Surfaces
    surface: ColorScale.gray[800],
    surfaceVariant: ColorScale.gray[700],

    // Interactive
    buttonPrimary: ColorScale.primary[500],
    buttonSecondary: ColorScale.gray[700],
    buttonDisabled: ColorScale.gray[600],

    // Status
    success: StatusColors.success.light,
    warning: StatusColors.warning.light,
    error: StatusColors.error.light,
    info: StatusColors.info.light,

    // Skeleton
    skeleton: ColorScale.gray[700],
    skeletonHighlight: ColorScale.gray[600],

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.7)',
    overlayLight: 'rgba(0, 0, 0, 0.5)',
  },
};

// Typography
export const Typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },

  // Font Sizes (following 8-point grid)
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },

  // Line Heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Font Weights
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

// Spacing (8-point grid system)
export const Spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

// Border Radius
export const BorderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

// Shadows
export const Shadows = {
  none: {},
  sm: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// Animation
export const Animation = {
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
  },
  easing: {
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
} as const;

export type ThemeType = typeof LightTheme | typeof DarkTheme;
