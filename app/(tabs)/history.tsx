import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { color, radius, space, text } from '../../src/theme';
import { Card, Icon } from '../../src/components/ui';
import { useApp } from '../../src/store';
import { listLockedCycles } from '../../src/repositories/cycles';
import { billLinesWithQty } from '../../src/billing/engine';
import { formatMoney } from '../../src/lib/currency';

export default function History() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { revision } = useApp();
  const cycles = React.useMemo(() => listLockedCycles(), [revision]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24 }]}>
      <View style={styles.header}>
        <Text style={text.h2}>History</Text>
      </View>

      {cycles.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon name="history" size={30} colorHex={color.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No closed cycles yet</Text>
          <Text style={styles.emptyBody}>
            When a month closes, its locked bill appears here for you to look back on.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {cycles.map((cycle) => {
            const itemCount = billLinesWithQty(cycle.id).length;
            const total = cycle.grandTotal ?? 0;
            return (
              <Pressable
                key={cycle.id}
                onPress={() => router.push('/bill/' + cycle.id)}
                style={({ pressed }) => pressed && { opacity: 0.7 }}
              >
                <Card style={styles.row}>
                  <View>
                    <Text style={styles.month}>{cycle.label}</Text>
                    <Text style={styles.subtitle}>
                      {itemCount} {itemCount === 1 ? 'item' : 'items'} · locked
                    </Text>
                  </View>
                  <View style={styles.right}>
                    <Text style={styles.total}>{formatMoney(total)}</Text>
                    <Icon name="chevron_right" size={20} colorHex={color.textMuted} />
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  header: {
    paddingHorizontal: space.gutter,
    paddingBottom: 12,
  },
  list: {
    paddingHorizontal: space.xl,
    paddingTop: 4,
    paddingBottom: space.xxl,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.lg,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  month: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 14.5,
    color: color.textPrimary,
  },
  subtitle: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
    color: color.textSecondary,
    marginTop: 3,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  total: {
    fontFamily: 'Sora_700Bold',
    fontSize: 15,
    color: color.textPrimary,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.borderSoft,
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 16,
    color: color.textPrimary,
    marginBottom: 6,
  },
  emptyBody: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: color.textSecondary,
    textAlign: 'center',
  },
});
