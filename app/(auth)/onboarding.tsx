import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { color, font, radius, space, text } from '../../src/theme';
import { PrimaryButton } from '../../src/components/ui';
import { signIn } from '../../src/auth/session';
import { useApp } from '../../src/store';

type Mode = 'signin' | 'signup';

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mutate } = useApp();

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const isSignup = mode === 'signup';
  const toggleMode = () => setMode((m) => (m === 'signin' ? 'signup' : 'signin'));

  const submit = () => {
    mutate(() => signIn(email || 'priya@example.com', name));
    router.replace('/(tabs)/home');
  };

  return (
    <ScrollView
      style={{ backgroundColor: color.bg }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Wordmark + tagline */}
      <View style={styles.header}>
        <Text style={styles.wordmark}>HisaabKitaab</Text>
        <Text style={styles.tagline}>Know what you owe, one tap a day.</Text>
      </View>

      {/* Segmented toggle */}
      <View style={styles.segment}>
        <Pressable
          onPress={() => setMode('signin')}
          style={[styles.segmentTab, !isSignup && styles.segmentTabActive]}
        >
          <Text style={[styles.segmentLabel, !isSignup && styles.segmentLabelActive]}>Sign in</Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('signup')}
          style={[styles.segmentTab, isSignup && styles.segmentTabActive]}
        >
          <Text style={[styles.segmentLabel, isSignup && styles.segmentLabelActive]}>Sign up</Text>
        </Pressable>
      </View>

      {/* Fields */}
      <View style={styles.fields}>
        {isSignup && (
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Full name"
            placeholderTextColor={color.textMuted}
            autoCapitalize="words"
          />
        )}
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="priya@example.com"
          placeholderTextColor={color.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={color.textMuted}
          secureTextEntry
        />

        {!isSignup && (
          <View style={styles.forgotRow}>
            <Pressable hitSlop={8}>
              <Text style={styles.forgotLink}>Forgot password?</Text>
            </Pressable>
          </View>
        )}

        <PrimaryButton
          label={isSignup ? 'Create account' : 'Sign in'}
          onPress={submit}
          style={{ marginTop: 2 }}
        />
      </View>

      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* SSO buttons (stubbed) */}
      <View style={styles.ssoRow}>
        <Pressable
          onPress={submit}
          style={({ pressed }) => [styles.ssoBtn, pressed && styles.ssoBtnPressed]}
        >
          <View style={styles.googleDot} />
          <Text style={styles.ssoLabel}>Google</Text>
        </Pressable>
        <Pressable
          onPress={submit}
          style={({ pressed }) => [styles.ssoBtn, pressed && styles.ssoBtnPressed]}
        >
          <View style={styles.appleSquare} />
          <Text style={styles.ssoLabel}>Apple</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }} />

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <Text style={styles.footerAction} onPress={toggleMode}>
            {isSignup ? 'Sign in' : 'Sign up'}
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: space.gutter,
  },
  header: {
    alignItems: 'center',
    marginBottom: 22,
  },
  wordmark: {
    fontFamily: font.displayExtraBold,
    fontSize: 28,
    color: color.textPrimary,
    letterSpacing: -0.3,
  },
  tagline: {
    ...text.caption,
    fontSize: 13,
    marginTop: 6,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: color.chipBg,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: 20,
  },
  segmentTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: radius.sm,
  },
  segmentTabActive: {
    backgroundColor: color.card,
    shadowColor: '#221811',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentLabel: {
    fontFamily: font.bodySemiBold,
    fontSize: 13,
    color: color.textSecondary,
  },
  segmentLabelActive: {
    color: color.textPrimary,
  },
  fields: {
    gap: 12,
  },
  input: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 14.5,
    fontFamily: font.bodyRegular,
    color: color.text32,
  },
  forgotRow: {
    alignItems: 'flex-end',
  },
  forgotLink: {
    fontFamily: font.bodySemiBold,
    fontSize: 12.5,
    color: color.accent,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 22,
    marginBottom: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: color.divider,
  },
  dividerText: {
    fontFamily: font.bodyRegular,
    fontSize: 11.5,
    color: color.textSecondary,
  },
  ssoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  ssoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.divider,
    borderRadius: radius.lg,
    paddingVertical: 12,
  },
  ssoBtnPressed: {
    backgroundColor: color.bgAlt,
  },
  googleDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: color.googleBlue,
  },
  appleSquare: {
    width: 18,
    height: 18,
    borderRadius: 5,
    backgroundColor: color.textPrimary,
  },
  ssoLabel: {
    fontFamily: font.bodySemiBold,
    fontSize: 13.5,
    color: color.text32,
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontFamily: font.bodyRegular,
    fontSize: 12.5,
    color: color.textSecondary,
  },
  footerAction: {
    fontFamily: font.bodySemiBold,
    color: color.accent,
  },
});
