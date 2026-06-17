import { create } from 'zustand';
import { Asset } from 'expo-media-library';

export interface AudioTrack {
  id: string;
  filename: string;
  uri: string;
  duration: number;
  [key: string]: any;
}

export interface PlayerState {
  tracks: AudioTrack[];
  currentTrackIndex: number;
  isPlaying: boolean;
  sound: any | null;
  position: number;
  duration: number;
  setTracks: (tracks: AudioTrack[]) => void;
  setCurrentTrackIndex: (index: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setSound: (sound: any | null) => void;
  updateProgress: (position: number, duration: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  tracks: [],
  currentTrackIndex: 0,
  isPlaying: false,
  sound: null,
  position: 0,
  duration: 0,

  setTracks: (tracks) => set({ tracks }),
  
  setCurrentTrackIndex: (index) => set({ currentTrackIndex: index }),
  
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  
  setSound: (sound) => set({ sound }),
  
  updateProgress: (position, duration) => set({ position, duration }),

  nextTrack: () => {
    const { currentTrackIndex, tracks } = get();
    if (currentTrackIndex !== null && tracks.length > 0) {
      const nextIndex = (currentTrackIndex + 1) % tracks.length;
      set({ currentTrackIndex: nextIndex });
    }
  },

  prevTrack: () => {
    const { currentTrackIndex, tracks } = get();
    if (currentTrackIndex !== null && tracks.length > 0) {
      const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
      set({ currentTrackIndex: prevIndex });
    }
  }
}));
