import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from '@expo-google-fonts/sora';
import {
  WorkSans_400Regular,
  WorkSans_500Medium,
  WorkSans_600SemiBold,
} from '@expo-google-fonts/work-sans';
import { MaterialSymbols_400Regular } from '@expo-google-fonts/material-symbols';

import { color } from '../src/theme';
import { AppProvider } from '../src/store';
import { initDb } from '../src/db/client';
import { seedIfEmpty } from '../src/db/seed';

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [fontsLoaded] = useFonts({
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
    MaterialSymbols_400Regular,
  });

  useEffect(() => {
    // initDb is synchronous on native (expo-sqlite) and async on web (sql.js
    // loads its WASM), so await it before seeding either way.
    (async () => {
      await initDb();
      seedIfEmpty();
      setDbReady(true);
    })();
  }, []);

  if (!fontsLoaded || !dbReady) {
    return <View style={{ flex: 1, backgroundColor: color.bg }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="item/edit" options={{ presentation: 'modal' }} />
            <Stack.Screen name="bill/[cycleId]" />
          </Stack>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
