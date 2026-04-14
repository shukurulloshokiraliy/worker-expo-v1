import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useStore } from '../src/store';
import RegisterScreen from '../src/screens/RegisterScreen';
import HomeScreen     from '../src/screens/HomeScreen';
import BlockScreen    from '../src/screens/BlockScreen';
import { checkBlockStatus } from '../src/services/SyncService';
import { C } from '../src/utils/colors';

export default function RootLayout() {
  const { isRegistered, isBlocked, setBlocked, hydrate } = useStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      // 1. Local storage dan yuk
      await hydrate();
      // 2. Server dan block holatini tekshir
      try {
        const blocked = await checkBlockStatus();
        setBlocked(blocked);
      } catch {}
      setReady(true);
    }
    init();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar backgroundColor={C.bg} barStyle="light-content" />
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  // Qaysi screen ko'rsatiladi:
  // 1. Ro'yxatdan o'tmagan → Register
  // 2. Bloklangan → Block (chiqib bo'lmaydi)
  // 3. Normal → Home
  let Screen: React.ReactNode;
  if (!isRegistered) {
    Screen = <RegisterScreen />;
  } else if (isBlocked) {
    Screen = <BlockScreen />;
  } else {
    Screen = <HomeScreen onBlock={() => setBlocked(true)} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar backgroundColor={C.bg} barStyle="light-content" />
        {Screen}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
