import { TextStyle } from 'react-native';
import { color } from './tokens';

/**
 * Font family keys map to the @expo-google-fonts modules loaded in the root
 * layout. Sora is the display face (headings, numerals); Work Sans is body.
 */
export const font = {
  displayExtraBold: 'Sora_800ExtraBold',
  displayBold: 'Sora_700Bold',
  displaySemiBold: 'Sora_600SemiBold',
  bodyRegular: 'WorkSans_400Regular',
  bodyMedium: 'WorkSans_500Medium',
  bodySemiBold: 'WorkSans_600SemiBold',
} as const;

/** The exact font imports the root layout must pass to useFonts(). */
export const FONT_MAP_HINT = [
  'Sora_600SemiBold',
  'Sora_700Bold',
  'Sora_800ExtraBold',
  'WorkSans_400Regular',
  'WorkSans_500Medium',
  'WorkSans_600SemiBold',
];

/** Named text styles matching the design. Spread into <Text style={...}>. */
export const text = {
  // Display / Sora
  h1: { fontFamily: font.displayExtraBold, fontSize: 28, color: color.textPrimary, letterSpacing: -0.3 },
  h2: { fontFamily: font.displayBold, fontSize: 22, color: color.textPrimary },
  h3: { fontFamily: font.displayBold, fontSize: 20, color: color.textPrimary },
  h4: { fontFamily: font.displayBold, fontSize: 16, color: color.textPrimary },
  amount: { fontFamily: font.displayExtraBold, fontSize: 44, color: color.textPrimary, letterSpacing: -0.8 },
  amountMd: { fontFamily: font.displayBold, fontSize: 22, color: color.textPrimary },

  // Body / Work Sans
  body: { fontFamily: font.bodyRegular, fontSize: 14.5, color: color.text32 },
  bodyStrong: { fontFamily: font.bodySemiBold, fontSize: 14, color: color.textPrimary },
  label: { fontFamily: font.bodySemiBold, fontSize: 12, color: color.textSecondary, letterSpacing: 0.4 },
  caption: { fontFamily: font.bodyRegular, fontSize: 12.5, color: color.textSecondary },
  captionMuted: { fontFamily: font.bodyRegular, fontSize: 12, color: color.textMuted },
  tab: { fontFamily: font.bodySemiBold, fontSize: 10.5, color: color.textSecondary },
} satisfies Record<string, TextStyle>;
