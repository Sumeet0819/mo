import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { usePlayerStore } from '../store/usePlayerStore';
import { togglePlayPause } from '../services/audioService';

export const MiniPlayer: React.FC = () => {
  const { isPlaying } = usePlayerStore();

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        
        {/* Active Home Tab */}
        <TouchableOpacity style={styles.activeTab}>
          <Ionicons name="home-outline" size={24} color={theme.textDark} />
        </TouchableOpacity>

        {/* Music Tab (Play/Pause as fallback action) */}
        <TouchableOpacity style={styles.iconButton} onPress={togglePlayPause}>
          <Ionicons name={isPlaying ? "pause-outline" : "musical-notes-outline"} size={24} color={theme.textPrimary} />
        </TouchableOpacity>

        {/* Sync/Repeat */}
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="sync-outline" size={24} color={theme.textPrimary} />
        </TouchableOpacity>

        {/* Bookmark */}
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="bookmark-outline" size={24} color={theme.textPrimary} />
        </TouchableOpacity>

        {/* Settings */}
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="settings-outline" size={24} color={theme.textPrimary} />
        </TouchableOpacity>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#1E1E21', // Dark grey pill
    borderRadius: 40,
    width: '100%',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  activeTab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.accent, // Lime green
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
