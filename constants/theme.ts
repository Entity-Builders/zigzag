/**
 * ZigZag Design System — Dark Mode First
 *
 * Central theme tokens used across all screens.
 * Import from here, never hardcode colors/spacing in components.
 */

// ─── Colors ──────────────────────────────────────────────
export const colors = {
  // Backgrounds
  background: '#0a0a0a',
  surface: '#141414',
  surfaceElevated: '#1a1a1a',

  // Borders
  border: '#2a2a2a',
  borderLight: '#333333',

  // Text
  text: '#ffffff',
  textSecondary: '#a0a0a0',
  textMuted: '#666666',

  // Brand — electric cyan for "zigzag energy"
  primary: '#00d4ff',
  primaryMuted: '#00a3c4',
  primarySoft: 'rgba(0, 212, 255, 0.12)',

  // Status
  success: '#34d399',
  successSoft: 'rgba(52, 211, 153, 0.12)',
  warning: '#fbbf24',
  warningSoft: 'rgba(251, 191, 36, 0.12)',
  error: '#f87171',
  errorSoft: 'rgba(248, 113, 113, 0.12)',

  // Tab bar
  tabBarBackground: '#0f0f0f',
  tabBarBorder: '#1a1a1a',
  tabBarActive: '#00d4ff',
  tabBarInactive: '#555555',
} as const;

// ─── Typography ──────────────────────────────────────────
export const typography = {
  largeTitle: {
    fontSize: 34,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    color: colors.text,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    color: colors.text,
  },
  headline: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: colors.textMuted,
  },
  label: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    color: colors.textMuted,
  },
} as const;

// ─── Spacing ─────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// ─── Radii ───────────────────────────────────────────────
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;
