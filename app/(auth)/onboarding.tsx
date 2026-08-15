import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { color, font, radius, space, text } from '../../src/theme';
import { PrimaryButton } from '../../src/components/ui';
import { useAuth } from '../../src/auth/AuthProvider';

type Mode = 'signin' | 'signup';
type Stage = 'email' | 'code';

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sendOtp, verifyOtp } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [stage, setStage] = useState<Stage>('email');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const isSignup = mode === 'signup';
  const toggleMode = () => setMode((m) => (m === 'signin' ? 'signup' : 'signin'));

  const send = async () => {
    setError(null);
    setInfo(null);
    setBusy(true);
    const { needsCode, error } = await sendOtp(email, isSignup ? name : undefined);
    setBusy(false);
    if (error) return setError(error);
    if (needsCode) {
      setStage('code');
    } else {
      router.replace('/(tabs)/home'); // local-fallback path (no code needed)
    }
  };

  const verify = async () => {
    setError(null);
    setBusy(true);
    const err = await verifyOtp(email, code);
    setBusy(false);
    if (err) return setError(err);
    router.replace('/(tabs)/home');
  };

  const resend = async () => {
    setError(null);
    const { error } = await sendOtp(email, isSignup ? name : undefined);
    setInfo(error ? null : 'A new code is on its way.');
    if (error) setError(error);
  };

  return (
    <ScrollView
      style={{ backgroundColor: color.bg }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.wordmark}>HisaabKitaab</Text>
        <Text style={styles.tagline}>Know what you owe, one tap a day.</Text>
      </View>

      {stage === 'email' ? (
        <>
          <View style={styles.segment}>
            <Pressable onPress={() => setMode('signin')} style={[styles.segmentTab, !isSignup && styles.segmentTabActive]}>
              <Text style={[styles.segmentLabel, !isSignup && styles.segmentLabelActive]}>Sign in</Text>
            </Pressable>
            <Pressable onPress={() => setMode('signup')} style={[styles.segmentTab, isSignup && styles.segmentTabActive]}>
              <Text style={[styles.segmentLabel, isSignup && styles.segmentLabelActive]}>Sign up</Text>
            </Pressable>
          </View>

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
              placeholder="you@example.com"
              placeholderTextColor={color.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              inputMode="email"
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <PrimaryButton label={busy ? 'Sending…' : 'Email me a code'} onPress={send} disabled={busy} style={{ marginTop: 2 }} />
            <Text style={styles.hint}>We'll email you a 6-digit code — no password to remember.</Text>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>
          <View style={styles.ssoRow}>
            <Pressable onPress={() => setInfo('Social sign-in is coming soon.')} style={({ pressed }) => [styles.ssoBtn, pressed && styles.ssoBtnPressed]}>
              <View style={styles.googleDot} />
              <Text style={styles.ssoLabel}>Google</Text>
            </Pressable>
            <Pressable onPress={() => setInfo('Social sign-in is coming soon.')} style={({ pressed }) => [styles.ssoBtn, pressed && styles.ssoBtnPressed]}>
              <View style={styles.appleSquare} />
              <Text style={styles.ssoLabel}>Apple</Text>
            </Pressable>
          </View>
          {info && <Text style={styles.info}>{info}</Text>}

          <View style={{ flex: 1 }} />
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isSignup ? 'Already have an account? ' : "Don't have an account? "}
              <Text style={styles.footerAction} onPress={toggleMode}>{isSignup ? 'Sign in' : 'Sign up'}</Text>
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.fields}>
          <Text style={styles.codeTitle}>Enter your code</Text>
          <Text style={styles.codeSub}>We emailed a 6-digit code to {email}.</Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            value={code}
            onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
            placeholder="••••••"
            placeholderTextColor={color.textMuted}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={6}
            autoFocus
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton label={busy ? 'Verifying…' : 'Verify & sign in'} onPress={verify} disabled={busy || code.length < 6} style={{ marginTop: 2 }} />
          <View style={styles.codeActions}>
            <Text style={styles.footerAction} onPress={resend}>Resend code</Text>
            <Text style={styles.footerAction} onPress={() => { setStage('email'); setCode(''); setError(null); }}>Change email</Text>
          </View>
          {info && <Text style={styles.info}>{info}</Text>}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: space.gutter },
  header: { alignItems: 'center', marginBottom: 22 },
  wordmark: { fontFamily: font.displayExtraBold, fontSize: 28, color: color.textPrimary, letterSpacing: -0.3 },
  tagline: { ...text.caption, fontSize: 13, marginTop: 6 },
  segment: { flexDirection: 'row', backgroundColor: color.chipBg, borderRadius: radius.md, padding: 4, marginBottom: 20 },
  segmentTab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.sm },
  segmentTabActive: { backgroundColor: color.card, shadowColor: '#221811', shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segmentLabel: { fontFamily: font.bodySemiBold, fontSize: 13, color: color.textSecondary },
  segmentLabelActive: { color: color.textPrimary },
  fields: { gap: 12 },
  input: { backgroundColor: color.card, borderWidth: 1, borderColor: color.border, borderRadius: radius.lg, paddingVertical: 14, paddingHorizontal: 16, fontSize: 14.5, fontFamily: font.bodyRegular, color: color.text32 },
  codeInput: { textAlign: 'center', letterSpacing: 8, fontSize: 22, fontFamily: font.displayBold },
  hint: { ...text.captionMuted, textAlign: 'center', marginTop: 2 },
  error: { ...text.caption, color: '#b3261e' },
  info: { ...text.caption, color: color.greenText, textAlign: 'center', marginTop: 10 },
  codeTitle: { fontFamily: font.displayBold, fontSize: 20, color: color.textPrimary, textAlign: 'center' },
  codeSub: { ...text.caption, textAlign: 'center', marginBottom: 4 },
  codeActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 4 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22, marginBottom: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: color.divider },
  dividerText: { fontFamily: font.bodyRegular, fontSize: 11.5, color: color.textSecondary },
  ssoRow: { flexDirection: 'row', gap: 10 },
  ssoBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: color.card, borderWidth: 1, borderColor: color.divider, borderRadius: radius.lg, paddingVertical: 12 },
  ssoBtnPressed: { backgroundColor: color.bgAlt },
  googleDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: color.googleBlue },
  appleSquare: { width: 18, height: 18, borderRadius: 5, backgroundColor: color.textPrimary },
  ssoLabel: { fontFamily: font.bodySemiBold, fontSize: 13.5, color: color.text32 },
  footer: { alignItems: 'center' },
  footerText: { ...text.caption },
  footerAction: { color: color.accent, fontFamily: font.bodySemiBold },
});
