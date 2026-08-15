/**
 * Design tokens for Tally.
 *
 * Colors are converted from the handoff's OKLCH values to sRGB hex/rgba,
 * since React Native's color parser does not support oklch(). The source
 * OKLCH value is kept in a comment next to each token for traceability.
 */

export const color = {
  // Surfaces
  bg: '#fbf4ed', //            oklch(0.97 0.012 70) — app background (cream)
  bgAlt: '#f5f1ec', //         oklch(0.96 0.008 70)
  card: '#ffffff', //          white cards
  chipBg: '#efe6dd', //        oklch(0.93 0.015 70) — segmented/stepper chips

  // Brand accent (warm amber/terracotta)
  accent: '#c26300', //        oklch(0.6 0.15 55)
  accentDeep: '#a14400', //    oklch(0.5 0.15 55) — pressed/hover
  accentSoftBg: '#ffeadc', //  oklch(0.95 0.03 55) — subtle accent surface

  // Text
  textPrimary: '#221811', //   oklch(0.22 0.02 60)
  text32: '#3b3129', //        oklch(0.32 0.02 60)
  text40: '#50453d', //        oklch(0.4 0.02 60)
  textSecondary: '#6c6158', // oklch(0.5 0.02 60)
  textMuted: '#968d86', //     oklch(0.65 0.015 60)
  onAccent: '#ffffff',

  // Status / semantic
  greenBg: '#d7f4e0', //       oklch(0.94 0.04 155) — streak / locked badge bg
  greenText: '#00572e', //     oklch(0.4 0.1 155)
  greenIcon: '#2c965d', //     oklch(0.6 0.13 155)
  blueIcon: '#5c80bc', //      oklch(0.6 0.1 260)
  googleBlue: '#0089d0', //    oklch(0.6 0.15 240)

  // Hairlines & scrims (alpha over textPrimary base #221811)
  border: 'rgba(34, 24, 17, 0.10)',
  borderSoft: 'rgba(34, 24, 17, 0.08)',
  borderStrong: 'rgba(34, 24, 17, 0.12)',
  dotIdle: 'rgba(34, 24, 17, 0.15)',
  iconIdle: 'rgba(34, 24, 17, 0.18)',
  divider: 'rgba(34, 24, 17, 0.12)',
  dashed: 'rgba(34, 24, 17, 0.20)',
} as const;

export const radius = {
  sm: 9,
  md: 12,
  lg: 14,
  xl: 16,
  card: 20,
  cardLg: 24,
  pill: 100,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  gutter: 24,
} as const;

/** Soft card elevation used on focus/receipt cards. */
export const shadow = {
  card: {
    shadowColor: '#221811',
    shadowOpacity: 0.08,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  accentButton: {
    shadowColor: '#c26300',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
} as const;

export type ColorToken = keyof typeof color;
