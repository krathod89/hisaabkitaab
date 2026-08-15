import React, { useRef } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

import { color, font, radius, shadow, space, text } from '../../src/theme';
import { Badge, IconButton, OutlineButton, PrimaryButton } from '../../src/components/ui';
import { getCycle } from '../../src/repositories/cycles';
import { billLinesWithQty } from '../../src/billing/engine';
import { CURRENCY_SYMBOL, formatMoney, formatQty } from '../../src/lib/currency';
import { cycleLabel, cycleRangeLabel } from '../../src/lib/date';
import { UNIT_SUFFIX } from '../../src/models/types';
import type { BillLine } from '../../src/models/types';

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Format an ISO timestamp as e.g. "Aug 1, 2026 · 12:03 AM". */
function formatGeneratedAt(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  let h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${h}:${min} ${ampm}`;
}

/** The short unit label shown after a quantity. */
function unitSuffixFor(line: BillLine): string {
  if (line.item.unit === 'custom' && line.item.customUnit) return line.item.customUnit;
  return UNIT_SUFFIX[line.item.unit];
}

/** "Item — 31 litre × ¤60" descriptor for one bill line. */
function lineDescriptor(line: BillLine): string {
  return `${line.item.name} — ${formatQty(line.quantity)} ${unitSuffixFor(line)} × ${CURRENCY_SYMBOL}${line.pricePerUnit}`;
}

export default function BillDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cycleId } = useLocalSearchParams<{ cycleId: string }>();

  const receiptRef = useRef<View>(null);

  const cycle = cycleId ? getCycle(cycleId) : null;

  if (!cycle) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top + 24 }]}>
        <Text style={text.h3}>Bill not found</Text>
        <View style={{ height: space.md }} />
        <OutlineButton label="Go back" onPress={() => router.back()} style={{ paddingHorizontal: 28 }} />
      </View>
    );
  }

  const lines = billLinesWithQty(cycle.id);
  const grandTotal = cycle.grandTotal ?? lines.reduce((s, l) => s + l.subtotal, 0);

  const year = cycle.endDate.slice(0, 4);
  const rangeLabel = `${cycleRangeLabel(cycle.startDate, cycle.endDate)}, ${year}`;
  const generated = formatGeneratedAt(cycle.generatedAt);

  const monthTitle = cycleLabel(cycle.id).split(' ')[0];

  async function onShareImage() {
    if (Platform.OS === 'web') return;
    try {
      const uri = await captureRef(receiptRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch (err) {
      console.warn('Share image failed', err);
    }
  }

  async function onExportPdf() {
    try {
      const rowsHtml = lines
        .map(
          (l) =>
            `<tr>
              <td style="padding:6px 0;color:#3b3129;font-size:13px;">${escapeHtml(lineDescriptor(l))}</td>
              <td style="padding:6px 0;text-align:right;color:#221811;font-weight:600;font-size:13px;">${escapeHtml(
                formatMoney(l.subtotal),
              )}</td>
            </tr>`,
        )
        .join('');

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" /></head>
        <body style="margin:0;padding:32px;font-family:-apple-system,Helvetica,Arial,sans-serif;color:#221811;background:#ffffff;">
          <div style="max-width:520px;margin:0 auto;">
            <div style="text-align:center;margin-bottom:20px;">
              <div style="display:inline-block;background:#d7f4e0;color:#00572e;font-size:11px;font-weight:600;padding:5px 12px;border-radius:100px;">Locked · Cycle closed</div>
              <div style="font-weight:700;font-size:18px;margin-top:14px;">${escapeHtml(rangeLabel)}</div>
              <div style="font-size:12px;color:#968d86;margin-top:4px;">Generated ${escapeHtml(generated)}</div>
            </div>
            <table style="width:100%;border-collapse:collapse;border-top:1px dashed rgba(34,24,17,0.2);border-bottom:1px dashed rgba(34,24,17,0.2);margin:8px 0;">
              ${rowsHtml}
            </table>
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:18px;">
              <span style="font-weight:700;font-size:15px;">Grand total</span>
              <span style="font-weight:800;font-size:26px;">${escapeHtml(formatMoney(grandTotal))}</span>
            </div>
          </div>
        </body></html>`;

      const { uri } = await Print.printToFileAsync({ html });
      if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri);
      }
    } catch (err) {
      console.warn('Export PDF failed', err);
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24 }]}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton name="arrow_back_ios_new" onPress={() => router.back()} />
        <Text style={styles.title}>{monthTitle} bill</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Scrollable receipt */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View ref={receiptRef} collapsable={false} style={[styles.receipt, shadow.card]}>
          <View style={styles.badgeRow}>
            <Badge tone="green" label="Locked · Cycle closed" />
          </View>

          <View style={styles.receiptHead}>
            <Text style={styles.rangeText}>{rangeLabel}</Text>
            <Text style={[text.captionMuted, styles.generatedText]}>Generated {generated}</Text>
          </View>

          <View style={styles.dashedDivider} />

          <View style={styles.lines}>
            {lines.map((l) => (
              <View key={l.item.id} style={styles.lineRow}>
                <Text style={styles.lineDesc} numberOfLines={2}>
                  {lineDescriptor(l)}
                </Text>
                <Text style={styles.lineAmount}>{formatMoney(l.subtotal)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.dashedDivider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Grand total</Text>
            <Text style={styles.totalAmount}>{formatMoney(grandTotal)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Action row */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + 20 }]}>
        <OutlineButton label="Export PDF" onPress={onExportPdf} style={styles.actionBtn} />
        <PrimaryButton label="Share image" onPress={onShareImage} style={styles.actionBtn} />
      </View>
    </View>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.gutter },
  header: {
    paddingHorizontal: space.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontFamily: font.displayBold, fontSize: 16, color: color.textPrimary },
  headerSpacer: { width: 32, height: 32 },
  scrollContent: { paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.sm },
  receipt: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    paddingVertical: 24,
    paddingHorizontal: 22,
  },
  badgeRow: { alignItems: 'center', marginBottom: 14 },
  receiptHead: { alignItems: 'center' },
  rangeText: { fontFamily: font.displayBold, fontSize: 17, color: color.textPrimary, textAlign: 'center' },
  generatedText: { marginTop: 3, textAlign: 'center' },
  dashedDivider: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.dashed,
    marginVertical: 18,
  },
  lines: { gap: 12 },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  lineDesc: { flex: 1, fontFamily: font.bodyRegular, fontSize: 13.5, color: color.text32, lineHeight: 19 },
  lineAmount: { fontFamily: font.bodySemiBold, fontSize: 13.5, color: color.textPrimary },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  totalLabel: { fontFamily: font.displayBold, fontSize: 15, color: color.textPrimary },
  totalAmount: { fontFamily: font.displayExtraBold, fontSize: 26, color: color.textPrimary },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
  },
  actionBtn: { flex: 1 },
});
