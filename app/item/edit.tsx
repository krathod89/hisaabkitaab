import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '../../src/store';
import {
  addPriceVersion,
  createItem,
  currentPrice,
  getItem,
  updateItem,
} from '../../src/repositories/items';
import { longDate, parseDay, toDayString } from '../../src/lib/date';
import { CURRENCY_SYMBOL } from '../../src/lib/currency';
import { UNIT_LABELS, type Unit } from '../../src/models/types';
import { color, radius, space, text } from '../../src/theme';
import { IconButton, PrimaryButton } from '../../src/components/ui';

const UNIT_ORDER: Unit[] = ['litre', 'piece', 'kg', 'tablet', 'custom'];

export default function EditItem() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mutate } = useApp();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const isEditing = !!id;

  // Load the existing item once (edit mode) to seed initial field state.
  const existing = useMemo(() => (id ? getItem(id) : null), [id]);
  const existingPrice = useMemo(() => (id ? currentPrice(id) : null), [id]);

  const [name, setName] = useState(existing?.name ?? '');
  const [unit, setUnit] = useState<Unit>(existing?.unit ?? 'litre');
  const [customUnit, setCustomUnit] = useState(existing?.customUnit ?? '');
  const [price, setPrice] = useState(
    existingPrice != null ? String(existingPrice) : '',
  );
  const [day, setDay] = useState(toDayString());
  const [reminderEnabled, setReminderEnabled] = useState(existing?.reminderEnabled ?? true);
  const [showPicker, setShowPicker] = useState(false);

  const priceNum = Number(price);
  const canSave = name.trim().length > 0 && Number.isFinite(priceNum) && priceNum > 0;

  function onPickDate(event: DateTimePickerEvent, date?: Date) {
    // Android fires with type 'dismissed' on cancel; only commit a real selection.
    setShowPicker(Platform.OS === 'ios');
    if (event.type === 'set' && date) {
      setDay(toDayString(date));
    }
  }

  function handleSave() {
    if (!canSave) return;
    const trimmedName = name.trim();
    const trimmedCustom = unit === 'custom' ? customUnit.trim() || null : null;

    if (isEditing && id) {
      mutate(() => {
        updateItem(id, {
          name: trimmedName,
          unit,
          customUnit: trimmedCustom,
          reminderEnabled,
        });
        if (priceNum !== currentPrice(id)) {
          addPriceVersion(id, priceNum, day);
        }
      });
    } else {
      mutate(() =>
        createItem({
          name: trimmedName,
          unit,
          customUnit: trimmedCustom,
          colorHex: color.accent,
          pricePerUnit: priceNum,
          effectiveFrom: day,
          reminderEnabled,
        }),
      );
    }
    router.back();
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton name="arrow_back_ios_new" onPress={() => router.back()} />
        <Text style={styles.title}>{isEditing ? 'Edit item' : 'Add item'}</Text>
        <Pressable onPress={handleSave} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.6 }}>
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* NAME */}
          <View style={styles.group}>
            <Text style={styles.label}>NAME</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Item name"
              placeholderTextColor={color.textMuted}
              style={styles.input}
            />
          </View>

          {/* UNIT */}
          <View style={styles.group}>
            <Text style={styles.label}>UNIT</Text>
            <View style={styles.chips}>
              {UNIT_ORDER.map((u) => {
                const selected = u === unit;
                return (
                  <Pressable
                    key={u}
                    onPress={() => setUnit(u)}
                    style={[styles.chip, selected ? styles.chipOn : styles.chipOff]}
                  >
                    <Text style={selected ? styles.chipTextOn : styles.chipTextOff}>
                      {UNIT_LABELS[u]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {unit === 'custom' && (
              <TextInput
                value={customUnit}
                onChangeText={setCustomUnit}
                placeholder="e.g. bottle, dose, pack"
                placeholderTextColor={color.textMuted}
                style={[styles.input, { marginTop: space.sm }]}
              />
            )}
          </View>

          {/* PRICE PER UNIT */}
          <View style={styles.group}>
            <Text style={styles.label}>PRICE PER UNIT</Text>
            <View style={styles.priceRow}>
              <Text style={styles.currencyMark}>{CURRENCY_SYMBOL}</Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                placeholderTextColor={color.textMuted}
                keyboardType="decimal-pad"
                style={styles.priceInput}
              />
            </View>
          </View>

          {/* EFFECTIVE FROM */}
          <View style={styles.group}>
            <Text style={styles.label}>EFFECTIVE FROM</Text>
            <Pressable onPress={() => setShowPicker(true)} style={styles.dateRow}>
              <Text style={styles.dateText}>{longDate(day)}</Text>
            </Pressable>
          </View>

          {/* Reminder */}
          <View style={styles.reminderRow}>
            <Text style={styles.reminderLabel}>Remind me daily</Text>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ true: color.accent, false: color.border }}
              thumbColor="#ffffff"
              ios_backgroundColor={color.border}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {showPicker && (
        <DateTimePicker
          value={parseDay(day)}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={onPickDate}
        />
      )}

      {/* Bottom CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton label="Save item" onPress={handleSave} disabled={!canSave} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: space.xl,
    paddingBottom: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { ...text.h4 },
  saveText: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 14,
    color: color.accent,
  },
  body: {
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    paddingBottom: space.xl,
    gap: space.xl,
  },
  group: {},
  label: { ...text.label, marginBottom: space.sm },
  input: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontFamily: 'WorkSans_400Regular',
    fontSize: 14.5,
    color: color.textPrimary,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
  },
  chipOn: { backgroundColor: color.accent },
  chipOff: { backgroundColor: color.card, borderWidth: 1, borderColor: color.borderStrong },
  chipTextOn: { fontFamily: 'WorkSans_600SemiBold', fontSize: 13, color: color.onAccent },
  chipTextOff: { fontFamily: 'WorkSans_400Regular', fontSize: 13, color: color.text40 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  currencyMark: { fontFamily: 'WorkSans_400Regular', fontSize: 14.5, color: color.textSecondary },
  priceInput: {
    flex: 1,
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 14.5,
    color: color.textPrimary,
    padding: 0,
  },
  dateRow: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  dateText: { fontFamily: 'WorkSans_400Regular', fontSize: 14.5, color: color.textPrimary },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  reminderLabel: { fontFamily: 'WorkSans_400Regular', fontSize: 14, color: color.text32 },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
  },
});
