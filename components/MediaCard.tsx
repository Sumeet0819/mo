import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH_H = 160;
const CARD_WIDTH_G = (SCREEN_WIDTH - 60) / 2;

interface MediaCardProps {
  title: string;
  artist: string;
  thumbnail: string;
  onPress: () => void;
  layoutType?: 'grid' | 'horizontal';
  /** Optional accent color behind the card */
  accentColor?: string;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  title,
  artist,
  thumbnail,
  onPress,
  layoutType = 'horizontal',
  accentColor = '#6C63FF',
}) => {
  const isGrid = layoutType === 'grid';
  const cardWidth = isGrid ? CARD_WIDTH_G : CARD_WIDTH_H;

  // --- Animated press interaction ---
  const scale = useSharedValue(1);
  const overlayOpacity = useSharedValue(0);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedOverlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 20, stiffness: 300 });
    overlayOpacity.value = withTiming(1, { duration: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
    overlayOpacity.value = withTiming(0, { duration: 200 });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, { width: cardWidth }]}
    >
      <Animated.View style={[styles.innerWrapper, animatedCardStyle]}>
        {/* ─── Artwork ─────────────────────────────── */}
        <View style={styles.imageWrapper}>
          <Image
            source={{
              uri:
                thumbnail ||
                'https://i.pinimg.com/736x/87/b9/69/87b969ed69c7cc9c3fdebd4da442d6c1.jpg',
            }}
            style={styles.image}
            contentFit="cover"
            transition={300}
          />

          {/* Bottom gradient for text legibility */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.65)']}
            style={styles.artworkGradient}
            pointerEvents="none"
          />

          {/* Play overlay — shown on press */}
          <Animated.View style={[styles.playOverlay, animatedOverlayStyle]}>
            <View style={[styles.playCircle, { backgroundColor: accentColor }]}>
              <Ionicons name="play" size={20} color="#fff" style={{ marginLeft: 2 }} />
            </View>
          </Animated.View>
        </View>

        {/* ─── Text ────────────────────────────────── */}
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.artistRow}>
            <View style={[styles.dot, { backgroundColor: accentColor }]} />
            <Text style={styles.artist} numberOfLines={1}>
              {artist}
            </Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: 14,
    marginBottom: 8,
  },
  innerWrapper: {
    flex: 1,
  },
  imageWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#1A1A24',
    aspectRatio: 1,
    // subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  artworkGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '45%',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  playCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  textContainer: {
    marginTop: 10,
    paddingHorizontal: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 5,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 5,
  },
  artist: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
});
