import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swatch } from '../../src/components/ui';
import { color, radius, space, text } from '../../src/theme';
import { cycleRangeLabel } from '../../src/lib/date';
import { formatMoney, formatQty, formatUnitPrice } from '../../src/lib/currency';
import { UNIT_SUFFIX } from '../../src/models/types';
import type { BillLine } from '../../src/models/types';
import { useBill } from '../../src/store';

function unitSuffixFor(item: BillLine['item']): string {
  if (item.unit === 'custom' && item.customUnit) return item.customUnit;
  return UNIT_SUFFIX[item.unit];
}

function LineRow({ line }: { line: BillLine }) {
  const dimmed = line.quantity === 0;
  const suffix = unitSuffixFor(line.item);
  const subtitle = dimmed
    ? 'Not logged today'
    : `${formatQty(line.quantity)} ${suffix} logged · ${formatUnitPrice(line.pricePerUnit, suffix)}`;

  return (
    <View style={[styles.lineCard, dimmed && styles.lineDimmed]}>
      <View style={styles.lineLeft}>
        <Swatch size={36} colorHex={line.item.colorHex} radiusValue={10} />
        <View style={styles.lineText}>
          <Text style={text.bodyStrong} numberOfLines={1}>
            {line.item.name}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>
      <Text style={styles.subtotal}>{formatMoney(line.subtotal)}</Text>
    </View>
  );
}

export default function Bill() {
  const insets = useSafeAreaInsets();
  const bill = useBill();
  const { cycle, lines, grandTotal, dayOfCycle, daysInCycle, progress } = bill;

  const clampedProgress = Math.max(0, Math.min(1, progress));

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={text.h3}>This cycle</Text>
        <View style={styles.metaRow}>
          <Text style={text.caption}>{cycleRangeLabel(cycle.startDate, cycle.endDate)}</Text>
          <Text style={text.caption}>
            Day {dayOfCycle} of {daysInCycle}
          </Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${clampedProgress * 100}%` }]} />
        </View>
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={text.caption}>Running total</Text>
        <Text style={[text.amount, styles.heroAmount]}>{formatMoney(grandTotal)}</Text>
      </View>

      {/* Per-item list */}
      {lines.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing logged yet</Text>
          <Text style={styles.emptyBody}>
            Log an item from Home to start building this cycle's bill.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {lines.map((line) => (
            <LineRow key={line.item.id} line={line} />
          ))}
        </ScrollView>
      )}

      {/* Notice */}
      <View style={[styles.notice, { marginBottom: space.lg }]}>
        <Text style={styles.noticeText}>Final bill locks automatically at cycle end.</Text>
      </View>
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
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  track: {
    width: '100%',
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: color.border,
    marginTop: 8,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: color.accent,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 8,
    paddingHorizontal: space.gutter,
  },
  heroAmount: {
    marginTop: 4,
  },
  list: {
    flex: 1,
    paddingHorizontal: space.xl,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
  },
  lineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: color.card,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: color.borderSoft,
  },
  lineDimmed: {
    opacity: 0.55,
  },
  lineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  lineText: {
    flexShrink: 1,
  },
  subtitle: {
    ...text.captionMuted,
    color: color.textSecondary,
    marginTop: 2,
  },
  subtotal: {
    fontFamily: 'Sora_700Bold',
    fontSize: 14,
    color: color.textPrimary,
    marginLeft: 12,
  },
  notice: {
    marginTop: 14,
    marginHorizontal: space.xl,
    backgroundColor: color.accentSoftBg,
    borderRadius: radius.md,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  noticeText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 11.5,
    color: color.accentDeep,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.gutter,
  },
  emptyTitle: {
    ...text.h4,
    marginBottom: 6,
  },
  emptyBody: {
    ...text.caption,
    textAlign: 'center',
  },
});
