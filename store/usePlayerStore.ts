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
  isLoading: boolean;
  sound: any | null;
  position: number;
  duration: number;
  setTracks: (tracks: AudioTrack[]) => void;
  setCurrentTrackIndex: (index: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setSound: (sound: any | null) => void;
  updateProgress: (position: number, duration: number) => void;
  updateTrackArtwork: (trackId: string, artwork: string | null) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  favorites: string[];
  setFavorites: (favorites: string[]) => void;
  toggleFavorite: (id: string) => void;
  isHeroOpen: boolean;
  setIsHeroOpen: (isOpen: boolean) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  tracks: [],
  currentTrackIndex: 0,
  isPlaying: false,
  isLoading: false,
  sound: null,
  position: 0,
  duration: 0,
  favorites: [],
  isHeroOpen: false,

  setIsHeroOpen: (isOpen) => {
    console.debug('[PlayerStore] setIsHeroOpen:', isOpen);
    set({ isHeroOpen: isOpen });
  },

  setIsLoading: (isLoading) => {
    set({ isLoading });
  },

  setFavorites: (favorites) => set({ favorites }),

  toggleFavorite: (id) => set((state) => {
    const isFav = state.favorites.includes(id);
    const newFavorites = isFav 
      ? state.favorites.filter(favId => favId !== id)
      : [...state.favorites, id];
      
    // Find the track to save in DB
    const track = state.tracks.find(t => t.id === id);
    if (track) {
      // Dynamically import db to avoid circular deps or init issues
      import('../services/db').then(({ toggleFavoriteDB }) => {
        toggleFavoriteDB(track, !isFav);
      });
    }

    return { favorites: newFavorites };
  }),

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
