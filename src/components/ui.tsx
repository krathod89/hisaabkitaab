import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { color, radius, shadow, space, text } from '../theme';

/** Font family for the loaded Material Symbols icon font. */
export const ICON_FONT = 'MaterialSymbols_400Regular';

/** Filled accent button — the primary CTA used across screens. */
export function PrimaryButton({
  label,
  onPress,
  style,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryBtn,
        shadow.accentButton,
        pressed && { backgroundColor: color.accentDeep },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <Text style={styles.primaryLabel}>{label}</Text>
    </Pressable>
  );
}

/** Outline accent button (e.g. "Export PDF"). */
export function OutlineButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.outlineBtn, pressed && { backgroundColor: color.accentSoftBg }, style]}
    >
      <Text style={styles.outlineLabel}>{label}</Text>
    </Pressable>
  );
}

/** White rounded card with soft elevation. */
export function Card({
  children,
  style,
  elevated,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
}) {
  return <View style={[styles.card, elevated ? shadow.card : styles.hairline, style]}>{children}</View>;
}

/** Rounded colored swatch used as an item avatar/icon. */
export function Swatch({ size = 36, colorHex, radiusValue }: { size?: number; colorHex: string; radiusValue?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radiusValue ?? Math.round(size * 0.28),
        backgroundColor: colorHex,
      }}
    />
  );
}

/** Pill badge (streak, "Locked · Cycle closed"). */
export function Badge({ label, tone = 'green' }: { label: string; tone?: 'green' | 'accent' }) {
  const bg = tone === 'green' ? color.greenBg : color.accentSoftBg;
  const fg = tone === 'green' ? color.greenText : color.accentDeep;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

/**
 * Material Symbols icon, rendered via the font's ligatures (avoids emoji-as-UI).
 * Pass the icon's ligature name, e.g. "home", "receipt_long", "history",
 * "settings", "chevron_right", "arrow_back_ios_new", "add".
 */
export function Icon({
  name,
  size = 22,
  colorHex = color.text40,
}: {
  name: string;
  size?: number;
  colorHex?: string;
}) {
  return (
    <Text
      allowFontScaling={false}
      style={{ fontFamily: ICON_FONT, fontSize: size, color: colorHex, lineHeight: size * 1.02 }}
    >
      {name}
    </Text>
  );
}

/** Small square header button (back / chevron). */
export function IconButton({ name, onPress, style }: { name: string; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }, style]}>
      <Icon name={name} size={18} colorHex={color.text40} />
    </Pressable>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  primaryBtn: {
    backgroundColor: color.accent,
    borderRadius: radius.lg,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { ...(text.bodyStrong as TextStyle), color: color.onAccent, fontSize: 15 },
  outlineBtn: {
    backgroundColor: color.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: color.accent,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineLabel: { ...(text.bodyStrong as TextStyle), color: color.accent, fontSize: 14 },
  card: { backgroundColor: color.card, borderRadius: radius.card, padding: space.lg },
  hairline: { borderWidth: 1, borderColor: color.borderSoft },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, alignSelf: 'flex-start' },
  badgeText: { ...(text.caption as TextStyle), fontFamily: 'WorkSans_600SemiBold', fontSize: 11.5 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
});
