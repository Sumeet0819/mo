import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../../constants/theme";
import {
  playSound,
  togglePlayPause,
} from "../../services/audioService";
import { usePlayerStore } from "../../store/usePlayerStore";

const { width, height } = Dimensions.get("window");
const CARD_COLORS = ["#FA8094", "#E6E2D0", "#9FF843", "#39E1EA", "#A855F7"];

export default function PlayerScreen() {
  const router = useRouter();
  const { tracks, currentTrackIndex, isPlaying } = usePlayerStore();

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

  const handlePlayPause = () => {
    togglePlayPause();
  };

  const handleNext = () => {
    const nextIndex = (currentTrackIndex + 1) % tracks.length;
    usePlayerStore.getState().setCurrentTrackIndex(nextIndex);
    playSound(tracks[nextIndex].uri);
  };

  const handlePrev = () => {
    const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    usePlayerStore.getState().setCurrentTrackIndex(prevIndex);
    playSound(tracks[prevIndex].uri);
  };

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: cardColor }]}
    >
      <SafeAreaView style={{ flex: 1 }}>
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
                uri: "https://i.pinimg.com/736x/87/b9/69/87b969ed69c7cc9c3fdebd4da442d6c1.jpg",
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

        {/* Progress Bar (Mock) */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: "30%" }]} />
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>1:20</Text>
            <Text style={styles.timeText}>-2:15</Text>
          </View>
        </View>

        <View style={styles.controlsContainer}>
          <TouchableOpacity onPress={handlePrev} style={styles.secondaryButton}>
            <Ionicons
              name="play-skip-back"
              size={32}
              color={theme.textPrimary}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={handlePlayPause} style={styles.playButton}>
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={40}
              color="#000"
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleNext} style={styles.secondaryButton}>
            <Ionicons
              name="play-skip-forward"
              size={32}
              color={theme.textPrimary}
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
    marginTop: 40,
    marginBottom: 40,
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
    marginTop: 40,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 3,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: theme.accent,
    borderRadius: 3,
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
    marginTop: 40,
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
