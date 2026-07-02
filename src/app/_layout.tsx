import { Stack, usePathname } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MiniPlayer } from '../../components/MiniPlayer';
import { View } from 'react-native';
import { usePlayerStore } from '../../store/usePlayerStore';
import { Provider } from 'react-redux';
import { store } from '../../store/store';

import { useEffect } from 'react';
import { initDB, getFavorites } from '../../services/db';

export default function Layout() {
  const pathname = usePathname();
  const isHeroOpen = usePlayerStore((state) => state.isHeroOpen);
  const setFavorites = usePlayerStore((state) => state.setFavorites);

  useEffect(() => {
    const setupDB = async () => {
      await initDB();
      const favs = await getFavorites();
      setFavorites(favs.map((f: any) => f.id));
    };
    setupDB();
  }, []);

  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="player" />
            <Stack.Screen name="tracks" />
          </Stack>
        </View>
      </GestureHandlerRootView>
    </Provider>
  );
}
