import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  PanResponder,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { usePlayerStore } from '../store/usePlayerStore';
import { togglePlayPause, playSound } from '../services/audioService';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25; // 25% of screen width to trigger

// ── Animated equalizer bar ────────────────────────────────────────────────────
const EqBar: React.FC<{ isPlaying: boolean; delay: number; maxH: number }> = ({
  isPlaying,
  delay,
  maxH,
}) => {
  const anim = useSharedValue(0.3);

  useEffect(() => {
    if (isPlaying) {
      anim.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 300 + delay }),
          withTiming(0.2, { duration: 250 + delay })
        ),
        -1,
        true
      );
    } else {
      anim.value = withTiming(0.3, { duration: 200 });
    }
  }, [isPlaying]);

  const style = useAnimatedStyle(() => ({
    height: interpolate(anim.value, [0, 1], [3, maxH], Extrapolation.CLAMP),
  }));

  return <Animated.View style={[styles.eqBar, style]} />;
};

// ── Progress strip ────────────────────────────────────────────────────────────
const ProgressStrip: React.FC = () => {
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const progress = duration > 0 ? position / duration : 0;

  const barWidth = useSharedValue(0);

  useEffect(() => {
    barWidth.value = withTiming(progress * SCREEN_WIDTH, { duration: 500 });
  }, [progress]);

  const fillStyle = useAnimatedStyle(() => ({ width: barWidth.value }));

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, fillStyle]} />
    </View>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
interface MiniAudioPlayerProps {
  onExpand: () => void;
}

export const MiniAudioPlayer: React.FC<MiniAudioPlayerProps> = ({ onExpand }) => {
  const tracks             = usePlayerStore((s) => s.tracks);
  const index              = usePlayerStore((s) => s.currentTrackIndex);
  const isPlaying          = usePlayerStore((s) => s.isPlaying);
  const setCurrentTrackIndex = usePlayerStore((s) => s.setCurrentTrackIndex);
  const currentTrack       = tracks[index] ?? null;

  // translateX for the swipe drag visual
  const translateX = useSharedValue(0);

  // ── swipe handler ──────────────────────────────────────────────────────────
  const handleSwipeNext = () => {
    if (tracks.length === 0) return;
    const nextIndex = (index + 1) % tracks.length;
    const nextTrack = tracks[nextIndex];
    setCurrentTrackIndex(nextIndex);
    playSound(nextTrack.uri, isPlaying, {
      title: nextTrack.filename?.replace(/\.[^/.]+$/, '') || 'Unknown',
      artist: nextTrack.artist || 'Unknown Artist',
      artworkUrl: nextTrack.artwork ?? undefined,
    });
  };

  const handleSwipePrev = () => {
    if (tracks.length === 0) return;
    const prevIndex = (index - 1 + tracks.length) % tracks.length;
    const prevTrack = tracks[prevIndex];
    setCurrentTrackIndex(prevIndex);
    playSound(prevTrack.uri, isPlaying, {
      title: prevTrack.filename?.replace(/\.[^/.]+$/, '') || 'Unknown',
      artist: prevTrack.artist || 'Unknown Artist',
      artworkUrl: prevTrack.artwork ?? undefined,
    });
  };

  // PanResponder — only handles horizontal gestures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderMove: (_, gesture) => {
        translateX.value = gesture.dx;
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -SWIPE_THRESHOLD) {
          // swipe left → next
          translateX.value = withTiming(-SCREEN_WIDTH, { duration: 180 }, () => {
            translateX.value = 0;
            runOnJS(handleSwipeNext)();
          });
        } else if (gesture.dx > SWIPE_THRESHOLD) {
          // swipe right → prev
          translateX.value = withTiming(SCREEN_WIDTH, { duration: 180 }, () => {
            translateX.value = 0;
            runOnJS(handleSwipePrev)();
          });
        } else {
          // snap back
          translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
        }
      },
      onPanResponderTerminate: () => {
        translateX.value = withTiming(0, { duration: 150 });
      },
    })
  ).current;

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (!currentTrack) return null;

  const title   = (currentTrack.filename || currentTrack.title || 'Unknown').replace(/\.[^/.]+$/, '');
  const artist  = currentTrack.artist || 'Unknown Artist';
  const artwork =
    currentTrack.artwork ||
    'https://i.pinimg.com/736x/87/b9/69/87b969ed69c7cc9c3fdebd4da442d6c1.jpg';

  return (
    <View style={styles.wrapper}>
      {/* ── Progress bar ── */}
      <ProgressStrip />

      {/* ── Swipeable + tappable row ── */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={onExpand}
        style={styles.rowOuter}
        {...panResponder.panHandlers}
      >
        <Animated.View style={[styles.row, rowStyle]}>
          {/* Artwork */}
          <Image
            source={{ uri: artwork }}
            style={styles.artwork}
            contentFit="cover"
            transition={300}
          />

          {/* Info + EQ */}
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{artist}</Text>
            <View style={styles.eqRow}>
              {isPlaying ? (
                <>
                  <EqBar isPlaying={isPlaying} delay={0}   maxH={14} />
                  <EqBar isPlaying={isPlaying} delay={80}  maxH={20} />
                  <EqBar isPlaying={isPlaying} delay={160} maxH={12} />
                  <EqBar isPlaying={isPlaying} delay={40}  maxH={18} />
                  <EqBar isPlaying={isPlaying} delay={120} maxH={10} />
                </>
              ) : (
                <Text style={styles.pausedText}>Paused</Text>
              )}
            </View>
          </View>

          {/* Play / Pause — stop tap from bubbling to onExpand */}
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); togglePlayPause(); }}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={28}
              color="#fff"
            />
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 80,
    backgroundColor: '#1C1C1E',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
    zIndex: 998,
    overflow: 'hidden',
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7C6FFF',
  },
  rowOuter: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#2A2A36',
  },
  info: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  artist: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    marginBottom: 6,
  },
  eqRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 20,
  },
  eqBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#7C6FFF',
  },
  pausedText: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
});
