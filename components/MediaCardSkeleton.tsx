import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface MediaCardSkeletonProps {
  layoutType?: 'grid' | 'horizontal';
}

export const MediaCardSkeleton: React.FC<MediaCardSkeletonProps> = ({
  layoutType = 'horizontal',
}) => {
  const isGrid = layoutType === 'grid';
  const cardWidth = isGrid ? (SCREEN_WIDTH - 60) / 2 : 160;

  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900 }),
        withTiming(0, { duration: 900 })
      ),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + shimmer.value * 0.35, // oscillates 0.25 → 0.6
  }));

  return (
    <View style={[styles.container, { width: cardWidth }]}>
      {/* Artwork placeholder */}
      <Animated.View style={[styles.imageSkeleton, shimmerStyle]} />

      {/* Text placeholders */}
      <View style={styles.textContainer}>
        {/* Title bar */}
        <Animated.View style={[styles.titleBar, shimmerStyle]} />
        {/* Artist row */}
        <View style={styles.artistRow}>
          <Animated.View style={[styles.dotSkeleton, shimmerStyle]} />
          <Animated.View style={[styles.artistBar, shimmerStyle]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: 14,
    marginBottom: 8,
  },
  imageSkeleton: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 18,
    backgroundColor: '#2A2A36',
  },
  textContainer: {
    marginTop: 10,
    paddingHorizontal: 2,
  },
  titleBar: {
    height: 13,
    width: '75%',
    backgroundColor: '#2A2A36',
    borderRadius: 6,
    marginBottom: 8,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotSkeleton: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#2A2A36',
    marginRight: 5,
  },
  artistBar: {
    height: 11,
    width: '45%',
    backgroundColor: '#2A2A36',
    borderRadius: 5,
  },
});
