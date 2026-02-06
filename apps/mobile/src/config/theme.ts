/**
 * Theme Configuration
 * 
 * Enterprise design system with light/dark mode support
 * Following Material Design 3 and iOS Human Interface Guidelines
 */

export const Colors = {
  // Brand Colors
  primary: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B', // Main brand color
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
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
  
  // Semantic Colors
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
  
  // Neutral Colors
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
  
  // Base Colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

// Light Theme
export const LightTheme = {
  dark: false,
  colors: {
    primary: Colors.primary[500],
    background: Colors.gray[50],
    card: Colors.white,
    text: Colors.gray[900],
    textSecondary: Colors.gray[600],
    textTertiary: Colors.gray[400],
    border: Colors.gray[200],
    notification: Colors.error.main,
    
    // Surfaces
    surface: Colors.white,
    surfaceVariant: Colors.gray[100],
    
    // Interactive
    buttonPrimary: Colors.primary[500],
    buttonSecondary: Colors.gray[100],
    buttonDisabled: Colors.gray[300],
    
    // Status
    success: Colors.success.main,
    warning: Colors.warning.main,
    error: Colors.error.main,
    info: Colors.info.main,
    
    // Skeleton
    skeleton: Colors.gray[200],
    skeletonHighlight: Colors.gray[100],
    
    // Overlay
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.3)',
  },
};

// Dark Theme
export const DarkTheme = {
  dark: true,
  colors: {
    primary: Colors.primary[400],
    background: Colors.gray[900],
    card: Colors.gray[800],
    text: Colors.gray[50],
    textSecondary: Colors.gray[400],
    textTertiary: Colors.gray[500],
    border: Colors.gray[700],
    notification: Colors.error.main,
    
    // Surfaces
    surface: Colors.gray[800],
    surfaceVariant: Colors.gray[700],
    
    // Interactive
    buttonPrimary: Colors.primary[500],
    buttonSecondary: Colors.gray[700],
    buttonDisabled: Colors.gray[600],
    
    // Status
    success: Colors.success.light,
    warning: Colors.warning.light,
    error: Colors.error.light,
    info: Colors.info.light,
    
    // Skeleton
    skeleton: Colors.gray[700],
    skeletonHighlight: Colors.gray[600],
    
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
