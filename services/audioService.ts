import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { usePlayerStore } from '../store/usePlayerStore';

let playerInstance: any = null;
let statusSubscription: any = null;
let currentUri: string | null = null;

// ── Audio mode — called once on first player creation ─────────────────────────
let audioModeConfigured = false;
const ensureAudioMode = async () => {
  if (audioModeConfigured) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,        // play through iOS silent switch
      shouldPlayInBackground: true,   // keep playing when app is backgrounded
      // doNotMix is REQUIRED for setActiveForLockScreen to work
      interruptionMode: 'doNotMix',
    });
    audioModeConfigured = true;
    console.log('[AudioService] Audio mode set: background + lock screen enabled');
  } catch (err) {
    console.warn('[AudioService] setAudioModeAsync failed:', err);
  }
};

// ── Lock screen / media notification metadata ─────────────────────────────────
export interface TrackMetadata {
  title: string;
  artist: string;
  artworkUrl?: string;
}

const FALLBACK_ARTWORK = 'https://i.pinimg.com/736x/87/b9/69/87b969ed69c7cc9c3fdebd4da442d6c1.jpg';

// Returns a valid http/https URL or undefined — the native layer needs a network-reachable URL
const resolveArtworkUrl = (url?: string | null): string | undefined => {
  if (!url) return FALLBACK_ARTWORK;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // local file paths / relative paths cannot be fetched by the OS notification service
  return FALLBACK_ARTWORK;
};

const updateLockScreen = (metadata: TrackMetadata) => {
  if (!playerInstance) return;
  try {
    playerInstance.setActiveForLockScreen(
      true,
      {
        title: metadata.title,
        artist: metadata.artist,
        // NOTE: expo-audio v56 supports only Play/Pause + optional ±10s seek in the notification.
        // Next / Previous buttons are not exposed by the native MediaSession callback.
        artworkUrl: resolveArtworkUrl(metadata.artworkUrl),
      },
      {
        // Show seek-forward/backward as the closest approximation to skip controls
        showSeekForward: true,
        showSeekBackward: true,
      }
    );
    console.log(`[AudioService] Lock screen set: "${metadata.title}" by ${metadata.artist}`);
  } catch (err) {
    console.warn('[AudioService] setActiveForLockScreen failed:', err);
  }
};

let latestRequestedUri: string | null = null;

/**
 * Load and optionally play a URI.
 * If the same URI is already loaded, only the play/pause state is changed.
 */
export const playSound = async (
  uri: string,
  shouldPlay = true,
  metadata?: TrackMetadata
) => {
  latestRequestedUri = uri; // Track the most recent playback request
  const { setSound, setIsPlaying, setIsLoading, updateProgress, nextTrack } = usePlayerStore.getState();

  try {
    await ensureAudioMode();

    // Resolve the real streaming URL if it's our backend API endpoint
    let resolvedUri = uri;
    if (uri.includes('/stream/')) {
      try {
        setIsLoading(true);
        console.log(`[AudioService] Fetching direct stream URL from API: ${uri}`);
        const response = await fetch(uri);
        const data = await response.json();
        
        // Concurrency check: If user clicked another song while fetching, abort this one!
        if (latestRequestedUri !== uri) {
          console.log(`[AudioService] Aborting play for ${uri} (a newer track was requested)`);
          setIsLoading(false);
          return;
        }

        if (data && data.url) {
          resolvedUri = data.url;
        } else {
          console.error('[AudioService] API did not return a URL:', data);
          setIsLoading(false);
          return; // Abort so we don't try to play an error JSON response
        }
      } catch (e) {
        console.error('[AudioService] Failed to fetch stream URL from API:', e);
        setIsLoading(false);
        return; // Abort so we don't try to play an error HTML/JSON response
      } finally {
        if (latestRequestedUri === uri) {
           setIsLoading(false);
        }
      }
    }

    // ── Deduplication & Reuse ────────────────────────────────────────────────
    if (playerInstance) {
      if (currentUri !== uri) {
        console.log(`[AudioService] Replacing URI: ${uri}`);
        playerInstance.replace(resolvedUri);
        currentUri = uri;
        // Update lock screen metadata for the new track
        if (metadata) updateLockScreen(metadata);
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

    // ── Create new AudioPlayer ───────────────────────────────────────────────
    playerInstance = createAudioPlayer(resolvedUri);
    currentUri = uri;
    setSound(playerInstance);
    setIsPlaying(shouldPlay);

    if (shouldPlay) {
      playerInstance.play();
    }

    // Set lock screen metadata right after player creation
    if (metadata) updateLockScreen(metadata);

    // ── Status listener ──────────────────────────────────────────────────────
    statusSubscription = playerInstance.addListener('playbackStatusUpdate', (status: any) => {
      updateProgress(status.currentTime || 0, status.duration || 0);

      const state = usePlayerStore.getState();
      
      if (state.isPlaying !== status.playing) {
        setIsPlaying(status.playing);
      }
      
      // Update loading state if the native player is buffering
      if (status.isBuffering !== undefined && state.isLoading !== status.isBuffering) {
        setIsLoading(status.isBuffering);
      }

      if (status.didJustFinish) {
        nextTrack();

        const newState = usePlayerStore.getState();
        if (newState.tracks.length > 0) {
          const nextTrackItem = newState.tracks[newState.currentTrackIndex];
          if (nextTrackItem) {
            playSound(nextTrackItem.uri, true, {
              title: nextTrackItem.filename?.replace(/\.[^/.]+$/, '') || 'Unknown',
              artist: nextTrackItem.artist || 'Unknown Artist',
              artworkUrl: nextTrackItem.artwork ?? undefined,
            });
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
        await playSound(track.uri, true, {
          title: track.filename?.replace(/\.[^/.]+$/, '') || 'Unknown',
          artist: track.artist || 'Unknown Artist',
          artworkUrl: track.artwork ?? undefined,
        });
      }
    }
    return;
  }

  // If track index changed (e.g. from next/prev), load the new track
  if (tracks.length > 0 && currentTrackIndex !== null) {
    const expectedTrack = tracks[currentTrackIndex];
    if (expectedTrack && currentUri !== expectedTrack.uri) {
      console.log(`[AudioService] Track changed, loading: ${expectedTrack.uri}`);
      await playSound(expectedTrack.uri, true, {
        title: expectedTrack.filename?.replace(/\.[^/.]+$/, '') || 'Unknown',
        artist: expectedTrack.artist || 'Unknown Artist',
        artworkUrl: expectedTrack.artwork ?? undefined,
      });
      return;
    }
  }

  console.log(`[AudioService] Toggling Play/Pause. Currently: ${isPlaying}`);
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
