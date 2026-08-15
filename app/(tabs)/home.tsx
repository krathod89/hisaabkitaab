import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useApp, useItems, useBill } from '../../src/store';
import { logEntry, entriesForPeriod } from '../../src/repositories/entries';
import { currentPrice } from '../../src/repositories/items';
import { formatMoney, formatUnitPrice, formatQty } from '../../src/lib/currency';
import { UNIT_SUFFIX, type Item, type Unit } from '../../src/models/types';
import { toDayString, weekdayDate, greeting } from '../../src/lib/date';
import { color, radius, shadow, space, text, font } from '../../src/theme';
import { Badge, Icon, PrimaryButton, Swatch } from '../../src/components/ui';

const STEP = 0.5;
const MIN_QTY = 0.5;
const CARD_MAX_WIDTH = 300;

/** Short unit label shown inside the stepper (e.g. "1 L"). */
function shortUnit(item: Item): string {
  const map: Record<Unit, string> = {
    litre: 'L',
    piece: 'pc',
    kg: 'kg',
    tablet: 'tab',
    custom: item.customUnit ?? 'unit',
  };
  return map[item.unit];
}

/** Consecutive days (ending today) with at least one entry, within the cycle. */
function computeStreak(period: string): number {
  const days = new Set(entriesForPeriod(period).map((e) => e.day));
  let streak = 0;
  const d = new Date();
  while (streak < 366 && days.has(toDayString(d))) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { mutate } = useApp();
  const items = useItems();
  const { grandTotal, cycle } = useBill();

  // Per-item quantity, keyed by item id. Falls back to the item's defaultQty.
  const [qtyById, setQtyById] = useState<Record<string, number>>({});
  const [loggedId, setLoggedId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const loggedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const streak = useMemo(
    () => computeStreak(cycle.period),
    // grandTotal changes on each log, keeping the streak fresh.
    [cycle.period, grandTotal],
  );

  const qtyFor = useCallback(
    (item: Item) => qtyById[item.id] ?? item.defaultQty,
    [qtyById],
  );

  const setQty = useCallback((item: Item, next: number) => {
    setQtyById((prev) => ({ ...prev, [item.id]: Math.max(MIN_QTY, Math.round(next * 100) / 100) }));
    setLoggedId(null);
  }, []);

  const onLog = useCallback(
    (item: Item, qty: number) => {
      mutate(() => logEntry({ itemId: item.id, quantity: qty }));
      setLoggedId(item.id);
      if (loggedTimer.current) clearTimeout(loggedTimer.current);
      loggedTimer.current = setTimeout(() => setLoggedId(null), 1600);
    },
    [mutate],
  );

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / width);
      setActiveIndex(idx);
    },
    [width],
  );

  // ---- Empty state --------------------------------------------------------
  if (items.length === 0) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 24 }]}>
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Icon name="add_shopping_cart" size={30} colorHex={color.accent} />
          </View>
          <Text style={styles.emptyTitle}>Nothing to log yet</Text>
          <Text style={styles.emptyBody}>
            Add the things you buy often, then log each day in a tap.
          </Text>
          <PrimaryButton
            label="Add your first item"
            onPress={() => router.push('/item/edit')}
            style={styles.emptyButton}
          />
        </View>
      </View>
    );
  }

  const renderCard = ({ item }: { item: Item }) => {
    const qty = qtyFor(item);
    const price = currentPrice(item.id);
    const suffix = UNIT_SUFFIX[item.unit];
    const isLogged = loggedId === item.id;

    return (
      <View style={[styles.slide, { width }]}>
        <View style={styles.card}>
          <Swatch size={56} colorHex={item.colorHex} radiusValue={16} />

          <View style={styles.cardHead}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemSub}>
              {formatQty(item.defaultQty)} {suffix} · {formatUnitPrice(price, suffix)}
            </Text>
          </View>

          <View style={styles.stepper}>
            <Pressable
              onPress={() => setQty(item, qty - STEP)}
              hitSlop={8}
              style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            >
              <Text style={styles.chipLabel}>−</Text>
            </Pressable>

            <Text style={styles.qty}>
              {formatQty(qty)} {shortUnit(item)}
            </Text>

            <Pressable
              onPress={() => setQty(item, qty + STEP)}
              hitSlop={8}
              style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            >
              <Text style={styles.chipLabel}>+</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => onLog(item, qty)}
            style={({ pressed }) => [
              styles.logBtn,
              shadow.accentButton,
              pressed && { backgroundColor: color.accentDeep },
            ]}
          >
            {isLogged ? (
              <View style={styles.logInner}>
                <Icon name="check" size={18} colorHex={color.onAccent} />
                <Text style={styles.logLabel}>Logged</Text>
              </View>
            ) : (
              <Text style={styles.logLabel}>
                Log {formatQty(qty)} {suffix}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.caption}>{weekdayDate()}</Text>
          <Text style={styles.greeting}>{greeting()}</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => router.push('/item/edit')}
            hitSlop={8}
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.6 }]}
          >
            <Icon name="add" size={20} colorHex={color.text40} />
          </Pressable>
          {streak > 0 ? <Badge tone="green" label={`${streak}-day streak`} /> : null}
        </View>
      </View>

      {/* Focus cards */}
      <View style={styles.center}>
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={renderCard}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumEnd}
          style={styles.pager}
        />

        {items.length > 1 ? (
          <View style={styles.dots}>
            {items.map((it, i) => (
              <View
                key={it.id}
                style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotIdle]}
              />
            ))}
          </View>
        ) : null}

        <View style={styles.cycleRow}>
          <Text style={styles.cycleLabel}>This cycle so far</Text>
          <Text style={styles.cycleTotal}>{formatMoney(grandTotal)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },

  // Header
  header: {
    paddingHorizontal: space.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexShrink: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  caption: { ...text.caption },
  greeting: { fontFamily: font.displayBold, fontSize: 21, color: color.textPrimary, marginTop: 2 },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Center column
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pager: { flexGrow: 0, alignSelf: 'stretch' },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.gutter },

  // Focus card
  card: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    backgroundColor: color.card,
    borderRadius: radius.cardLg,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 14,
    ...shadow.card,
  },
  cardHead: { alignItems: 'center' },
  itemName: { fontFamily: font.displayBold, fontSize: 19, color: color.textPrimary, textAlign: 'center' },
  itemSub: { ...text.caption, marginTop: 3, textAlign: 'center' },

  // Stepper
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 2 },
  chip: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: color.chipBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipPressed: { backgroundColor: color.border },
  chipLabel: { fontFamily: font.bodySemiBold, fontSize: 20, color: color.text32, lineHeight: 24 },
  qty: {
    fontFamily: font.displayBold,
    fontSize: 22,
    color: color.textPrimary,
    minWidth: 72,
    textAlign: 'center',
  },

  // Log button
  logBtn: {
    width: '100%',
    borderRadius: radius.lg,
    backgroundColor: color.accent,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  logInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logLabel: { fontFamily: font.bodySemiBold, fontSize: 15, color: color.onAccent },

  // Dots
  dots: { flexDirection: 'row', gap: 6, marginTop: 18, marginBottom: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { backgroundColor: color.accent },
  dotIdle: { backgroundColor: color.dotIdle },

  // Cycle total pill
  cycleRow: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: color.card,
    borderRadius: radius.lg,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: color.borderSoft,
    marginTop: 18,
  },
  cycleLabel: { ...text.caption },
  cycleTotal: { fontFamily: font.displayBold, fontSize: 15, color: color.textPrimary },

  // Empty state
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.gutter },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: color.accentSoftBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: { fontFamily: font.displayBold, fontSize: 20, color: color.textPrimary, textAlign: 'center' },
  emptyBody: {
    ...text.body,
    color: color.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 260,
  },
  emptyButton: { alignSelf: 'stretch', maxWidth: 280, marginTop: 24 },
});
