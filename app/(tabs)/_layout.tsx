import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color } from '../../src/theme';
import { Icon } from '../../src/components/ui';

const TABS: { name: string; label: string; icon: string }[] = [
  { name: 'home', label: 'Home', icon: 'home' },
  { name: 'bill', label: 'Bill', icon: 'receipt_long' },
  { name: 'history', label: 'History', icon: 'history' },
  { name: 'settings', label: 'Settings', icon: 'settings' },
];

/** Bottom tab bar matching the handoff: icon glyph over a small label. */
function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
      {state.routes.map((route: any, index: number) => {
        const meta = TABS.find((t) => t.name === route.name);
        if (!meta) return null;
        const focused = state.index === index;
        const tint = focused ? color.accent : color.textSecondary;
        return (
          <Pressable
            key={route.key}
            style={styles.tab}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
          >
            <Icon name={meta.icon} size={22} colorHex={focused ? color.accent : color.iconIdle} />
            <Text style={[styles.label, { color: tint, fontFamily: focused ? 'WorkSans_600SemiBold' : 'WorkSans_400Regular' }]}>
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.bg } }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="bill" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: color.card,
    borderTopWidth: 1,
    borderTopColor: color.borderSoft,
    paddingTop: 12,
  },
  tab: { flex: 1, alignItems: 'center', gap: 5 },
  label: { fontSize: 10.5 },
});
