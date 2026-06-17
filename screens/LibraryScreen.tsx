import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalMusic } from '../hooks/useLocalMusic';
import { usePlayerStore } from '../store/usePlayerStore';
import { playSound } from '../services/audioService';
import { MiniPlayer } from '../components/MiniPlayer';
import { theme } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { Image } from 'expo-image';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.85;
const CARD_HEIGHT = 320;
const CARD_BORDER_RADIUS = 36;

const CARD_COLORS = ['#FA8094', '#E6E2D0', '#9FF843', '#39E1EA', '#A855F7'];

// iOS-style spring: smooth, slightly underdamped, never mechanical
const EXPAND_SPRING: Parameters<typeof withSpring>[1] = {
  damping: 36,
  stiffness: 240,
  mass: 1.0,
  overshootClamping: false,
  restDisplacementThreshold: 0.001,
  restSpeedThreshold: 0.001,
};

const COLLAPSE_SPRING: Parameters<typeof withSpring>[1] = {
  damping: 40,
  stiffness: 320,
  mass: 0.9,
  overshootClamping: true, // snap back cleanly, no bounce
  restDisplacementThreshold: 0.001,
  restSpeedThreshold: 0.001,
};

interface CardLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  trackIndex: number;
}

// ── Hero Overlay ────────────────────────────────────────────────────────────
interface HeroOverlayProps {
  layout: CardLayout;
  trackName: string;
  duration: string;
  onClose: () => void;
  isPlaying: boolean;
  onPlayPause: () => void;
}

const HeroOverlay: React.FC<HeroOverlayProps> = ({
  layout,
  trackName,
  duration,
  onClose,
  isPlaying,
  onPlayPause,
}) => {
  const insets = useSafeAreaInsets();

  // Start at -1 so the overlay is at scale 0 / invisible on the first render frame,
  // preventing the 1-frame flash at (0,0) before the spring fires.
  const progress = useSharedValue(-1);
  const [canClose, setCanClose] = useState(false);

  React.useEffect(() => {
    // Fire immediately — Reanimated schedules this before the next frame paint
    progress.value = withSpring(1, EXPAND_SPRING);
    const t = setTimeout(() => setCanClose(true), 250);
    return () => clearTimeout(t);
  }, []);

  const containerStyle = useAnimatedStyle(() => {
    // Clamp so negative progress values just hold at the card position
    const p = Math.max(progress.value, 0);
    const left   = interpolate(p, [0, 1], [layout.x, 0],          Extrapolation.CLAMP);
    const top    = interpolate(p, [0, 1], [layout.y, 0],          Extrapolation.CLAMP);
    const w      = interpolate(p, [0, 1], [layout.width,  SCREEN_WIDTH],  Extrapolation.CLAMP);
    const h      = interpolate(p, [0, 1], [layout.height, SCREEN_HEIGHT], Extrapolation.CLAMP);
    const radius = interpolate(p, [0, 1], [CARD_BORDER_RADIUS, 0],        Extrapolation.CLAMP);
    // While progress < 0 keep the overlay invisible so it never flashes
    const opacity = progress.value < 0 ? 0 : 1;

    return { left, top, width: w, height: h, borderRadius: radius, opacity };
  });

  const detailContentStyle = useAnimatedStyle(() => {
    const p = Math.max(progress.value, 0);
    return {
      opacity:   interpolate(p, [0.5, 0.88], [0, 1], Extrapolation.CLAMP),
      transform: [{ translateY: interpolate(p, [0.5, 0.88], [22, 0], Extrapolation.CLAMP) }],
    };
  });

  const cardContentStyle = useAnimatedStyle(() => {
    const p = Math.max(progress.value, 0);
    return {
      opacity: interpolate(p, [0, 0.35], [1, 0], Extrapolation.CLAMP),
    };
  });

  const closeButtonStyle = useAnimatedStyle(() => {
    const p = Math.max(progress.value, 0);
    return {
      opacity:   interpolate(p, [0.72, 1], [0, 1], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(p, [0.72, 1], [0.5, 1], Extrapolation.CLAMP) }],
    };
  });

  const handleClose = () => {
    if (!canClose) return;
    setCanClose(false);
    progress.value = withSpring(0, COLLAPSE_SPRING, (finished) => {
      if (finished) runOnJS(onClose)();
    });
  };

  return (
    <Animated.View
      style={[styles.heroOverlay, { backgroundColor: layout.color }, containerStyle]}
    >
      {/* Original card content fades out */}
      <Animated.View style={[StyleSheet.absoluteFill, cardContentStyle]}>
        <View style={styles.heroCardLogo}>
          <Text style={styles.heroCardLogoText}>K.</Text>
        </View>
        <View style={styles.heroCardTextContainer}>
          <Text style={styles.heroCardSubtitleTop}>AURAMUSIC</Text>
          <Text style={styles.heroCardTitle} numberOfLines={2}>
            {trackName}
          </Text>
          <Text style={styles.heroCardSubtitle}>{duration}</Text>
          <View style={styles.seeDetailsBtn}>
            <Text style={styles.seeDetailsText}>Play Track</Text>
          </View>
        </View>
      </Animated.View>

      {/* Detail content fades in after expansion */}
      <Animated.View style={[StyleSheet.absoluteFill, detailContentStyle]}>
        {/* Artwork fills top portion */}
        <View style={[styles.heroArtworkArea, { paddingTop: insets.top + 60 }]}>
          <View style={styles.heroArtworkShadow}>
            <Image
              source={{ uri: 'https://i.pinimg.com/736x/87/b9/69/87b969ed69c7cc9c3fdebd4da442d6c1.jpg' }}
              style={styles.heroArtwork}
              contentFit="cover"
            />
          </View>
        </View>

        {/* Bottom info panel */}
        <View style={styles.heroInfoPanel}>
          <Text style={styles.heroInfoLabel}>AURAMUSIC</Text>
          <Text style={styles.heroInfoTitle} numberOfLines={2}>
            {trackName}
          </Text>
          <Text style={styles.heroInfoDuration}>{duration}</Text>

          {/* Fake progress bar */}
          <View style={styles.heroProgressBg}>
            <View style={[styles.heroProgressFill, { width: '35%' }]} />
          </View>
          <View style={styles.heroTimeRow}>
            <Text style={styles.heroTimeText}>1:20</Text>
            <Text style={styles.heroTimeText}>-2:15</Text>
          </View>

          {/* Controls */}
          <View style={styles.heroControls}>
            <TouchableOpacity style={styles.heroSecBtn}>
              <Ionicons name="play-skip-back" size={30} color="rgba(0,0,0,0.7)" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onPlayPause} style={styles.heroPlayBtn}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color={layout.color} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.heroSecBtn}>
              <Ionicons name="play-skip-forward" size={30} color="rgba(0,0,0,0.7)" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* Close button */}
      <Animated.View style={[styles.closeButton, { top: insets.top + 12 }, closeButtonStyle]}>
        <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <View style={styles.closeButtonInner}>
            <Ionicons name="chevron-down" size={22} color="rgba(0,0,0,0.6)" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

// ── LibraryScreen ────────────────────────────────────────────────────────────
export const LibraryScreen: React.FC = () => {
  const { loading, scanLocalFiles } = useLocalMusic();
  const { tracks, currentTrackIndex, isPlaying, setCurrentTrackIndex } = usePlayerStore();
  const [swipeDirection, setSwipeDirection] = useState<'up' | 'down'>('up');

  // Hero state
  const [heroLayout, setHeroLayout] = useState<CardLayout | null>(null);
  const cardRefs = useRef<Record<number, View | null>>({});

  const handleNextTrack = () => {
    if (tracks.length > 0) {
      const next = (currentTrackIndex + 1) % tracks.length;
      setCurrentTrackIndex(next);
      playSound(tracks[next].uri);
    }
  };

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === 5) {
      const { translationY, translationX } = event.nativeEvent;
      if (translationY < -40 || translationX < -40) {
        setSwipeDirection('up');
        handleNextTrack();
      } else if (translationY > 40 || translationX > 40) {
        setSwipeDirection('down');
        handleNextTrack();
      }
    }
  };

  const openHero = useCallback(
    (index: number, trackIndex: number) => {
      const ref = cardRefs.current[index];
      if (!ref) return;

      ref.measure((fx, fy, w, h, px, py) => {
        setHeroLayout({
          x: px,
          y: py,
          width: w,
          height: h,
          color: CARD_COLORS[trackIndex % CARD_COLORS.length],
          trackIndex,
        });
        setCurrentTrackIndex(trackIndex);
        playSound(tracks[trackIndex].uri);
      });
    },
    [tracks, setCurrentTrackIndex]
  );

  const closeHero = useCallback(() => {
    setHeroLayout(null);
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  const currentTrack = tracks[currentTrackIndex] ?? null;
  const heroDuration = currentTrack
    ? `${Math.floor(currentTrack.duration / 60)}:${String(Math.floor(currentTrack.duration % 60)).padStart(2, '0')}`
    : '0:00';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient colors={['#4C1D95', 'transparent']} style={styles.headerGradient} />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>S</Text>
          </View>
          <Text style={styles.greeting}>Hi, Samantha</Text>
          <View style={styles.headerActions}>
            <View style={styles.iconButton}>
              <Ionicons name="search" size={20} color={theme.textPrimary} />
            </View>
            <View style={styles.iconButton}>
              <Ionicons name="heart-outline" size={20} color={theme.textPrimary} />
            </View>
          </View>
        </View>

        {/* Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer}>
          <View style={[styles.chip, styles.chipActive]}>
            <Text style={styles.chipTextActive}>All</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>Local Files</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>Trending</Text>
          </View>
        </ScrollView>

        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Your Local Library</Text>
          <TouchableOpacity onPress={scanLocalFiles} style={styles.scanButton}>
            <Ionicons name="search" size={16} color="#000" />
            <Text style={styles.scanButtonText}>Scan</Text>
          </TouchableOpacity>
        </View>

        {/* Stacked Card Carousel */}
        {tracks.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No local audio files found.</Text>
            <TouchableOpacity onPress={scanLocalFiles} style={styles.largeScanButton}>
              <Text style={styles.largeScanButtonText}>Scan Device</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.carouselContainer}>
            <PanGestureHandler onHandlerStateChange={onHandlerStateChange}>
              <View style={{ flex: 1, alignItems: 'center', marginTop: 150 }}>
                <AnimatePresence>
                  {tracks.map((item, index) => {
                    const stackIndex = (index - currentTrackIndex + tracks.length) % tracks.length;
                    const isJustSwiped = stackIndex === tracks.length - 1;
                    if (stackIndex > 3 && !isJustSwiped) return null;

                    const isCurrent = stackIndex === 0;
                    const cardColor = CARD_COLORS[index % CARD_COLORS.length];

                    let targetTranslateY = -stackIndex * 55;
                    let targetScale = 1 - stackIndex * 0.06;
                    let targetRotateX = `${-stackIndex * 5}deg`;
                    let targetOpacity = 1;
                    let zIndex = tracks.length - stackIndex;

                    if (isJustSwiped) {
                      if (swipeDirection === 'down') {
                        targetTranslateY = 500;
                        targetScale = 1.3;
                        targetOpacity = 0;
                        targetRotateX = '20deg';
                        zIndex = 999;
                      } else {
                        targetTranslateY = -250;
                        targetScale = 0.5;
                        targetOpacity = 0;
                        targetRotateX = '-20deg';
                      }
                    }

                    return (
                      <MotiView
                        key={item.id}
                        animate={{
                          translateY: targetTranslateY,
                          scale: targetScale,
                          rotateX: targetRotateX,
                          opacity: targetOpacity,
                        }}
                        transition={{
                          type: 'spring',
                          damping: 20,
                          stiffness: 160,
                          mass: 0.9,
                        }}
                        style={[
                          styles.stackedCardWrapper,
                          { position: 'absolute', zIndex },
                        ]}
                      >
                        <TouchableOpacity
                          activeOpacity={0.95}
                          onPress={() => {
                            if (isCurrent) {
                              openHero(index, index);
                            } else {
                              setCurrentTrackIndex(index);
                            }
                          }}
                        >
                          <View
                            ref={(r) => {
                              cardRefs.current[index] = r;
                            }}
                            style={[
                              styles.stackedCard,
                              { backgroundColor: cardColor, shadowColor: cardColor },
                            ]}
                          >
                            {/* Logo */}
                            <View style={styles.cardLogo}>
                              <Text style={styles.cardLogoText}>K.</Text>
                            </View>

                            {/* Card text */}
                            <View style={styles.cardTextContainer}>
                              <Text style={styles.cardSubtitleTop}>AURAMUSIC</Text>
                              <Text style={styles.cardTitle} numberOfLines={2}>
                                {item.filename.replace(/\.[^/.]+$/, '')}
                              </Text>
                              <Text style={styles.cardSubtitle}>
                                {Math.floor(item.duration / 60)}:
                                {String(Math.floor(item.duration % 60)).padStart(2, '0')}
                              </Text>
                              <View style={styles.seeDetailsBtn}>
                                <Text style={styles.seeDetailsText}>Play Track</Text>
                              </View>
                            </View>

                            {/* Playing indicator */}
                            {isCurrent && isPlaying && (
                              <MotiView
                                from={{ scale: 0.8, opacity: 0.5 }}
                                animate={{ scale: 1.1, opacity: 1 }}
                                transition={{ loop: true, type: 'timing', duration: 800 }}
                                style={styles.playingIndicator}
                              >
                                <Ionicons name="stats-chart" size={24} color="#000" />
                              </MotiView>
                            )}
                          </View>
                        </TouchableOpacity>
                      </MotiView>
                    );
                  })}
                </AnimatePresence>
              </View>
            </PanGestureHandler>
          </View>
        )}
      </SafeAreaView>

      <MiniPlayer />

      {/* Hero Overlay — rendered at the root so it covers everything */}
      {heroLayout && currentTrack && (
        <HeroOverlay
          layout={heroLayout}
          trackName={currentTrack.filename.replace(/\.[^/.]+$/, '')}
          duration={heroDuration}
          onClose={closeHero}
          isPlaying={isPlaying}
          onPlayPause={() => {
            const { togglePlayPause } = require('../services/audioService');
            togglePlayPause();
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },

  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 350,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.textPrimary,
    flex: 1,
  },
  headerActions: { flexDirection: 'row', gap: 10 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  chipsContainer: {
    paddingHorizontal: 20,
    marginTop: 25,
    marginBottom: 20,
    flexDirection: 'row',
    maxHeight: 40,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: { backgroundColor: theme.accent },
  chipText: { color: theme.textSecondary, fontSize: 14, fontWeight: '500' },
  chipTextActive: { color: theme.textDark, fontSize: 14, fontWeight: '600' },

  sectionTitle: { fontSize: 24, fontWeight: '700', color: theme.textPrimary },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  scanButtonText: { color: '#000', fontSize: 12, fontWeight: '700' },

  largeScanButton: {
    marginTop: 20,
    backgroundColor: theme.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
  },
  largeScanButtonText: { color: '#000', fontSize: 16, fontWeight: '700' },

  carouselContainer: { marginTop: 10, flex: 1 },

  stackedCardWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.35,
    shadowRadius: 25,
    elevation: 10,
  },
  stackedCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: CARD_BORDER_RADIUS,
    overflow: 'hidden',
    padding: 24,
  },

  cardLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 'auto',
  },
  cardLogoText: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  cardTextContainer: { marginTop: 'auto' },
  cardSubtitleTop: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.4)',
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
    marginBottom: 4,
    lineHeight: 32,
  },
  cardSubtitle: { fontSize: 16, color: '#000', fontWeight: '700', marginBottom: 20 },
  seeDetailsBtn: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  seeDetailsText: { color: '#000', fontWeight: '700', fontSize: 14 },
  playingIndicator: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: theme.textSecondary, fontSize: 16 },

  // ── Hero Overlay styles ──────────────────────────────────────────────────
  heroOverlay: {
    position: 'absolute',
    overflow: 'hidden',
    // zIndex sits above everything
    zIndex: 9999,
    elevation: 99,
  },

  // Card content (mirrors the card layout — fades out during expand)
  heroCardLogo: {
    position: 'absolute',
    top: 24,
    left: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCardLogoText: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  heroCardTextContainer: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
  },
  heroCardSubtitleTop: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.4)',
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  heroCardTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
    marginBottom: 4,
    lineHeight: 32,
  },
  heroCardSubtitle: { fontSize: 16, color: '#000', fontWeight: '700', marginBottom: 20 },

  // Detail content (fades in after expand)
  heroArtworkArea: {
    alignItems: 'center',
    flex: 1,
  },
  heroArtworkShadow: {
    width: SCREEN_WIDTH * 0.78,
    height: SCREEN_WIDTH * 0.78,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 20,
    overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
  },
  heroArtwork: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
  },

  heroInfoPanel: {
    paddingHorizontal: 28,
    paddingBottom: 50,
  },
  heroInfoLabel: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.45)',
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  heroInfoTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#000',
    lineHeight: 36,
    marginBottom: 4,
  },
  heroInfoDuration: {
    fontSize: 16,
    color: 'rgba(0,0,0,0.55)',
    fontWeight: '600',
    marginBottom: 24,
  },

  heroProgressBg: {
    height: 5,
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 3,
    marginBottom: 8,
  },
  heroProgressFill: {
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 3,
  },
  heroTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  heroTimeText: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.45)',
    fontWeight: '600',
  },

  heroControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
  },
  heroSecBtn: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroPlayBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(0,0,0,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  closeButton: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  closeButtonInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
