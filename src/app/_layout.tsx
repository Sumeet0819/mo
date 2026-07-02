import { Stack, usePathname } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MiniPlayer } from '../../components/MiniPlayer';
import { View } from 'react-native';
import { usePlayerStore } from '../../store/usePlayerStore';
import { Provider } from 'react-redux';
import { store } from '../../store/store';

export default function Layout() {
  const pathname = usePathname();
  const isHeroOpen = usePlayerStore((state) => state.isHeroOpen);

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
