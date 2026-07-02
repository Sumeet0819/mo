import { create } from 'zustand';
import { Asset } from 'expo-media-library';

export interface AudioTrack {
  id: string;
  filename: string;
  uri: string;
  duration: number;
  artwork?: string | null;
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
  updateTrackArtwork: (trackId: string, artwork: string | null) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  isHeroOpen: boolean;
  setIsHeroOpen: (isOpen: boolean) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  tracks: [],
  currentTrackIndex: 0,
  isPlaying: false,
  sound: null,
  position: 0,
  duration: 0,
  favorites: [],
  isHeroOpen: false,

  setIsHeroOpen: (isOpen) => {
    console.debug('[PlayerStore] setIsHeroOpen:', isOpen);
    set({ isHeroOpen: isOpen });
  },

  toggleFavorite: (id) => set((state) => ({
    favorites: state.favorites.includes(id) 
      ? state.favorites.filter(favId => favId !== id)
      : [...state.favorites, id]
  })),

  setTracks: (tracks) => {
    console.debug(`[PlayerStore] setTracks: loaded ${tracks.length} tracks`);
    set({ tracks });
  },
  
  setCurrentTrackIndex: (index) => {
    console.debug('[PlayerStore] setCurrentTrackIndex:', index);
    set({ currentTrackIndex: index });
  },
  
  setIsPlaying: (isPlaying) => {
    console.debug('[PlayerStore] setIsPlaying:', isPlaying);
    set({ isPlaying });
  },
  
  setSound: (sound) => set({ sound }),
  
  updateProgress: (position, duration) => set({ position, duration }),

  updateTrackArtwork: (trackId, artwork) =>
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, artwork } : t)),
    })),

  nextTrack: () => {
    const { currentTrackIndex, tracks } = get();
    if (currentTrackIndex !== null && tracks.length > 0) {
      const nextIndex = (currentTrackIndex + 1) % tracks.length;
      console.debug('[PlayerStore] nextTrack: advancing to index', nextIndex);
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
