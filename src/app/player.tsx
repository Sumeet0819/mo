import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  PanResponder,
  GestureResponderEvent,
  ActivityIndicator,
} from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../../constants/theme";
import {
  playSound,
  togglePlayPause,
  seekSound,
} from "../../services/audioService";
import { usePlayerStore } from "../../store/usePlayerStore";

const { width, height } = Dimensions.get("window");
const CARD_COLORS = ["#FA8094", "#E6E2D0", "#9FF843", "#39E1EA", "#A855F7"];

export default function PlayerScreen() {
  const router = useRouter();
  const { tracks, currentTrackIndex, isPlaying, isLoading, position, duration } = usePlayerStore();
  const [progressBarWidth, setProgressBarWidth] = useState(0);

  if (tracks.length === 0 || currentTrackIndex === null) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-down" size={32} color={theme.textPrimary} />
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const currentTrack = tracks[currentTrackIndex];
  const cardColor = CARD_COLORS[currentTrackIndex % CARD_COLORS.length];
  const artworkUri = currentTrack?.artwork || "https://i.pinimg.com/736x/87/b9/69/87b969ed69c7cc9c3fdebd4da442d6c1.jpg";

  const handlePlayPause = () => {
    togglePlayPause();
  };

  const handleNext = () => {
    const nextIndex = (currentTrackIndex + 1) % tracks.length;
    usePlayerStore.getState().setCurrentTrackIndex(nextIndex);
    playSound(tracks[nextIndex].uri, true);
  };

  const handlePrev = () => {
    const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    usePlayerStore.getState().setCurrentTrackIndex(prevIndex);
    playSound(tracks[prevIndex].uri, true);
  };

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: cardColor }]}
    >
      <SafeAreaView style={{ flex: 1, paddingBottom: 20 }}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-down" size={32} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Now Playing</Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.artworkContainer}>
          <View style={styles.artworkWrapper}>
            <Image
              source={{
                uri: artworkUri,
              }}
              style={styles.artwork}
              resizeMode="cover"
            />
          </View>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {currentTrack.filename}
          </Text>
          <Text style={styles.artist}>Local Device Track</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View 
            onLayout={(e) => setProgressBarWidth(e.nativeEvent.layout.width)}
            {...PanResponder.create({
              onStartShouldSetPanResponder: () => true,
              onMoveShouldSetPanResponder: () => true,
              onPanResponderGrant: (e) => {
                if (progressBarWidth > 0 && duration > 0) {
                  let x = e.nativeEvent.locationX;
                  if (x < 0) x = 0;
                  if (x > progressBarWidth) x = progressBarWidth;
                  seekSound((x / progressBarWidth) * duration);
                }
              },
              onPanResponderMove: (e) => {
                if (progressBarWidth > 0 && duration > 0) {
                  let x = e.nativeEvent.locationX;
                  if (x < 0) x = 0;
                  if (x > progressBarWidth) x = progressBarWidth;
                  seekSound((x / progressBarWidth) * duration);
                }
              }
            }).panHandlers}
            style={styles.progressBarBg}
          >
            <View 
              pointerEvents="none"
              style={[
                styles.progressBarFill, 
                { width: `${duration > 0 ? (position / duration) * 100 : 0}%` }
              ]} 
            />
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>
              {(() => {
                const mins = Math.floor(position / 60);
                const secs = Math.floor(position % 60);
                return `${mins}:${String(secs).padStart(2, "0")}`;
              })()}
            </Text>
            <Text style={styles.timeText}>
              {(() => {
                const remaining = Math.max(duration - position, 0);
                const mins = Math.floor(remaining / 60);
                const secs = Math.floor(remaining % 60);
                return `-${mins}:${String(secs).padStart(2, "0")}`;
              })()}
            </Text>
          </View>
        </View>

        <View style={styles.controlsContainer}>
          <TouchableOpacity onPress={handlePrev} style={styles.secondaryButton} disabled={isLoading}>
            <Ionicons
              name="play-skip-back"
              size={32}
              color={theme.textPrimary}
              style={{ opacity: isLoading ? 0.5 : 1 }}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={handlePlayPause} style={styles.playButton} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="large" color="#000" />
            ) : (
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={40}
                color="#000"
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleNext} style={styles.secondaryButton} disabled={isLoading}>
            <Ionicons
              name="play-skip-forward"
              size={32}
              color={theme.textPrimary}
              style={{ opacity: isLoading ? 0.5 : 1 }}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 10,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  artworkContainer: {
    alignItems: "center",
    marginTop: 50,
    marginBottom: 50,
  },
  artworkWrapper: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 15,
  },
  artwork: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
  },
  infoContainer: {
    alignItems: "center",
    paddingHorizontal: 30,
  },
  title: {
    color: theme.textPrimary,
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  artist: {
    color: theme.textSecondary,
    fontSize: 18,
    fontWeight: "500",
  },
  progressContainer: {
    paddingHorizontal: 30,
    marginTop: 50,
  },
  progressBarBg: {
    height: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 6,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: theme.accent,
    borderRadius: 6,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  timeText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  controlsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 80,
    gap: 40,
  },
  secondaryButton: {
    padding: 10,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.accent,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: theme.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
});
