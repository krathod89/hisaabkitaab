import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, radius, space, text } from '../../src/theme';
import { Card, Icon } from '../../src/components/ui';
import { useApp, useSession } from '../../src/store';
import { signOut } from '../../src/auth/session';
import { resetAndReseed } from '../../src/db/seed';

function Item({ icon, label, value, onPress, danger }: { icon: string; label: string; value?: string; onPress?: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <Icon name={icon} size={20} colorHex={danger ? color.accentDeep : color.text40} />
      <Text style={[text.bodyStrong, styles.rowLabel, danger && { color: color.accentDeep }]}>{label}</Text>
      {value ? <Text style={text.caption}>{value}</Text> : <Icon name="chevron_right" size={18} colorHex={color.textMuted} />}
    </Pressable>
  );
}

export default function Settings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mutate } = useApp();
  const session = useSession();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.bg }} contentContainerStyle={{ padding: space.xl, paddingTop: insets.top + 24 }}>
      <Text style={[text.h2, { marginBottom: 16 }]}>Settings</Text>

      <Card style={styles.account}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(session?.name?.[0] ?? 'U').toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={text.bodyStrong}>{session?.name ?? 'Guest'}</Text>
          <Text style={text.caption}>{session?.email ?? 'Not signed in'}</Text>
        </View>
      </Card>

      <Text style={styles.section}>PREFERENCES</Text>
      <Card style={styles.group}>
        <Item icon="notifications" label="Daily reminder" value="8:00 AM" />
        <View style={styles.divider} />
        <Item icon="payments" label="Currency" value="¤" />
        <View style={styles.divider} />
        <Item icon="calendar_month" label="Billing cycle" value="Monthly" />
      </Card>

      <Text style={styles.section}>DATA</Text>
      <Card style={styles.group}>
        <Item
          icon="refresh"
          label="Reset demo data"
          onPress={() =>
            Alert.alert('Reset demo data?', 'This wipes all items and entries and reseeds the sample data.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Reset', style: 'destructive', onPress: () => mutate(() => resetAndReseed()) },
            ])
          }
        />
        <View style={styles.divider} />
        <Item icon="logout" label="Sign out" danger onPress={() => { signOut(); mutate(() => {}); router.replace('/(auth)/onboarding'); }} />
      </Card>

      <Text style={styles.footer}>HisaabKitaab · Phase 1 (local-only) · v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  account: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Sora_700Bold', fontSize: 18, color: color.onAccent },
  section: { ...text.label, marginTop: 22, marginBottom: 8, marginLeft: 4 },
  group: { padding: 0, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.lg, paddingVertical: 14 },
  rowLabel: { flex: 1 },
  divider: { height: 1, backgroundColor: color.borderSoft, marginLeft: 46 },
  footer: { ...text.captionMuted, textAlign: 'center', marginTop: 28 },
});
