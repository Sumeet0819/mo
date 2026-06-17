import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LibraryScreen } from './screens/LibraryScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <LibraryScreen />
    </SafeAreaProvider>
  );
}
