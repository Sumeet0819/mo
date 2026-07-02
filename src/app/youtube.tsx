import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { SyncYoutubeChannel } from '../components/SyncYoutubeChannel';
import { VideoGallery } from '../components/VideoGallery';

export default function YouTubeScreen() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSyncSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: 'YouTube Sync' }} />
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SyncYoutubeChannel onSyncSuccess={handleSyncSuccess} />
        <VideoGallery refreshTrigger={refreshTrigger} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  container: {
    flex: 1,
    paddingTop: 16,
  },
});
