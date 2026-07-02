import { createAudioPlayer } from 'expo-audio';
import { usePlayerStore } from '../store/usePlayerStore';

let playerInstance: any = null;
let statusSubscription: any = null;
let currentUri: string | null = null; // track which URI is loaded

/**
 * Load and optionally play a URI.
 * If the same URI is already loaded, only the play/pause state is changed
 * — the player is NOT torn down and re-created.
 */
export const playSound = async (uri: string, shouldPlay = true) => {
  const { setSound, setIsPlaying, updateProgress, nextTrack } = usePlayerStore.getState();

  try {
    // ── Deduplication & Reuse ───────────────────────────────────────────────────
    if (playerInstance) {
      if (currentUri !== uri) {
        console.log(`[AudioService] Replacing URI: ${uri}`);
        playerInstance.replace(uri);
        currentUri = uri;
      }
      
      setIsPlaying(shouldPlay);
      if (shouldPlay) {
        playerInstance.play();
      } else {
        playerInstance.pause();
      }
      return;
    }

    console.log(`[AudioService] Initializing URI: ${uri}, shouldPlay: ${shouldPlay}`);

    // ── Create new AudioPlayer ────────────────────────────────────────────────
    playerInstance = createAudioPlayer(uri);
    currentUri = uri;
    setSound(playerInstance);
    setIsPlaying(shouldPlay);

    if (shouldPlay) {
      playerInstance.play();
    }

    // ── Status listener ───────────────────────────────────────────────────────
    statusSubscription = playerInstance.addListener('playbackStatusUpdate', (status: any) => {
      updateProgress(status.currentTime || 0, status.duration || 0);

      if (usePlayerStore.getState().isPlaying !== status.playing) {
        setIsPlaying(status.playing);
      }

      if (status.didJustFinish) {
        nextTrack();

        const state = usePlayerStore.getState();
        if (state.tracks.length > 0) {
          const nextTrackItem = state.tracks[state.currentTrackIndex];
          if (nextTrackItem) {
            playSound(nextTrackItem.uri, true);
          }
        }
      }
    });

  } catch (error) {
    console.error('[AudioService] Error playing sound:', error);
  }
};

export const togglePlayPause = async () => {
  const { isPlaying, setIsPlaying, tracks, currentTrackIndex } = usePlayerStore.getState();

  if (!playerInstance) {
    if (tracks.length > 0 && currentTrackIndex !== null) {
      const track = tracks[currentTrackIndex];
      if (track) {
        await playSound(track.uri, true);
      }
    }
    return;
  }

  // Check if track index changed (e.g. from swiping) without playing
  if (tracks.length > 0 && currentTrackIndex !== null) {
    const expectedTrack = tracks[currentTrackIndex];
    if (expectedTrack && currentUri !== expectedTrack.uri) {
      console.log(`[AudioService] Track changed via swipe, loading new URI: ${expectedTrack.uri}`);
      await playSound(expectedTrack.uri, true);
      return;
    }
  }

  console.log(`[AudioService] Toggling Play/Pause. Currently playing: ${isPlaying}`);

  if (isPlaying) {
    playerInstance.pause();
    setIsPlaying(false);
  } else {
    playerInstance.play();
    setIsPlaying(true);
  }
};

export const seekSound = async (positionSeconds: number) => {
  if (!playerInstance) return;
  console.log(`[AudioService] Seeking to: ${positionSeconds}s`);
  playerInstance.seekTo(positionSeconds * 1000);
};
