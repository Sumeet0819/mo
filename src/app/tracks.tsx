import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePlayerStore } from '../../store/usePlayerStore';
import { playSound } from '../../services/audioService';
import { theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

import { LinearGradient } from 'expo-linear-gradient';

export default function TracksScreen() {
  const { tracks, currentTrackIndex, setCurrentTrackIndex, favorites, toggleFavorite, isPlaying } = usePlayerStore();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#4C1D95', '#111015']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>All Tracks</Text>
        </View>
        <FlatList
          data={tracks}
          contentContainerStyle={styles.listContent}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const isCurrent = index === currentTrackIndex;
            const isFav = favorites.includes(item.id);
            return (
              <TouchableOpacity 
                style={[styles.trackItem, isCurrent && styles.trackItemPlaying]}
                activeOpacity={0.7}
                onPress={async () => {
                  if (!isCurrent) {
                    setCurrentTrackIndex(index);
                    await playSound(item.uri);
                  }
                }}
              >
                <View style={styles.artworkContainer}>
                  <Image 
                    source={{ uri: item.artwork || 'https://i.pinimg.com/736x/87/b9/69/87b969ed69c7cc9c3fdebd4da442d6c1.jpg' }} 
                    style={styles.artwork} 
                    contentFit="cover" 
                  />
                  {isCurrent && isPlaying && (
                    <View style={styles.playingOverlay}>
                      <Ionicons name="stats-chart" size={16} color="#FFF" />
                    </View>
                  )}
                </View>
                <View style={styles.trackInfo}>
                  <Text style={[styles.trackTitle, isCurrent && styles.trackTitlePlaying]} numberOfLines={1}>
                    {item.filename.replace(/\.[^/.]+$/, '')}
                  </Text>
                  <Text style={styles.trackDuration}>
                    {Math.floor(item.duration / 60)}:{String(Math.floor(item.duration % 60)).padStart(2, '0')} • Unknown Artist
                  </Text>
                </View>
                <TouchableOpacity onPress={() => toggleFavorite(item.id)} style={styles.favBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name={isFav ? "heart" : "heart-outline"} size={24} color={isFav ? theme.accent : "rgba(255,255,255,0.4)"} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn: { marginRight: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  listContent: { paddingBottom: 120, paddingTop: 10 }, // Extra padding for MiniPlayer
  trackItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  trackItemPlaying: { backgroundColor: 'rgba(255,255,255,0.03)' },
  artworkContainer: { width: 50, height: 50, borderRadius: 12, overflow: 'hidden', marginRight: 16, backgroundColor: 'rgba(255,255,255,0.1)' },
  artwork: { width: '100%', height: '100%' },
  playingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  trackInfo: { flex: 1, marginRight: 16, justifyContent: 'center' },
  trackTitle: { fontSize: 16, color: '#FFF', fontWeight: '600', marginBottom: 4 },
  trackTitlePlaying: { color: theme.accent },
  trackDuration: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  favBtn: { padding: 4 },
});
