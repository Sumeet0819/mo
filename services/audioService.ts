import { usePlayerStore } from '../store/usePlayerStore';

// Mocking expo-av since the native module is missing in the current Expo Go client.
let mockTimer: any = null;

export const playSound = async (uri: string) => {
  const { setSound, setIsPlaying, updateProgress } = usePlayerStore.getState();

  // Clear any existing mock timer
  if (mockTimer) clearInterval(mockTimer);

  console.log(`[Mock Audio] Playing URI: ${uri}`);
  setIsPlaying(true);
  
  // Set a fake sound object
  setSound({} as any);

  // Mock progress updates
  let currentPosition = 0;
  const mockDuration = 180000; // 3 minutes mock duration
  
  updateProgress(currentPosition, mockDuration);

  mockTimer = setInterval(() => {
    const state = usePlayerStore.getState();
    if (state.isPlaying) {
      currentPosition += 1000;
      updateProgress(currentPosition, mockDuration);
      
      if (currentPosition >= mockDuration) {
        clearInterval(mockTimer);
        usePlayerStore.getState().nextTrack();
      }
    }
  }, 1000);
};

export const togglePlayPause = async () => {
  const { isPlaying, setIsPlaying } = usePlayerStore.getState();
  console.log(`[Mock Audio] Toggling Play/Pause. Currently playing: ${isPlaying}`);
  setIsPlaying(!isPlaying);
};

export const seekSound = async (positionMillis: number) => {
  console.log(`[Mock Audio] Seeking to: ${positionMillis}`);
};
