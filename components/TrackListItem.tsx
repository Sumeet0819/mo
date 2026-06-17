import React from 'react';
import { Text, StyleSheet, Pressable, View, Image } from 'react-native';
import { AudioTrack } from '../store/usePlayerStore';
import { theme } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  track: AudioTrack;
  isPlaying: boolean;
  onPress: () => void;
}

export const TrackListItem: React.FC<Props> = ({ track, isPlaying, onPress }) => {
  return (
    <Pressable onPress={onPress} style={styles.container}>
      <Image 
        source={{ uri: `https://picsum.photos/seed/${track.id}/200` }} 
        style={styles.image} 
      />
      
      <View style={styles.textContainer}>
        <Text style={[styles.title, isPlaying && styles.playingText]} numberOfLines={1}>
          {track.filename.replace(/\.[^/.]+$/, '')}
        </Text>
        <Text style={styles.subtitle}>
          By Unknown • {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}
        </Text>
      </View>

      <View style={styles.actionContainer}>
        {isPlaying ? (
          <Ionicons name="pause-circle" size={28} color={theme.textPrimary} />
        ) : (
          <Ionicons name="play" size={20} color={theme.textPrimary} />
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: 10,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 16,
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  playingText: {
    color: theme.accent,
  },
  subtitle: {
    fontSize: 13,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  actionContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.cardSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  }
});
