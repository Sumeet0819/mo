import React, { useState, useCallback, useLayoutEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Pressable,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePlayerStore, AudioTrack } from '../store/usePlayerStore';
import { playSound, seekSound, togglePlayPause } from '../services/audioService';
import { theme } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useGetLibrarySongsQuery, useLazySearchMusicQuery, BASE_URL, useGetListeningHistoryQuery } from '../store/api/youtubeMusicApi';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const EXPAND_SPRING: Parameters<typeof withSpring>[1] = {
  damping: 32,
  stiffness: 380,
  mass: 0.8,
  overshootClamping: false,
};

const COLLAPSE_SPRING: Parameters<typeof withSpring>[1] = {
  damping: 38,
  stiffness: 420,
  mass: 0.7,
  overshootClamping: true,
};

interface CardLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  trackIndex: number;
}

// ── Waveform Progress ──────────────────────────────────────────────────────────
const WaveformProgress = memo(() => {
  const position = usePlayerStore((s) => s.position);
  const trackDuration = usePlayerStore((s) => s.duration);
  const [barWidth, setBarWidth] = useState(0);

  const progressPercent = trackDuration > 0 ? position / trackDuration : 0;
  const mins = Math.floor(position / 60);
  const secs = Math.floor(position % 60);
  const totalMins = Math.floor(trackDuration / 60);
  const totalSecs = Math.floor(trackDuration % 60);

  // Generate 35 randomish heights for the fake waveform
  const bars = Array.from({ length: 35 }).map((_, i) => {
    // some pseudo-random curve
    const h = 10 + Math.abs(Math.sin(i * 0.5) * 15) + (i % 3) * 5;
    return h;
  });

  return (
    <View style={styles.waveformRow}>
      <Text style={styles.waveformTime}>{`${mins}:${String(secs).padStart(2, '0')}`}</Text>
      
      <Pressable 
        style={styles.waveformContainer}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        onPress={(e) => {
          if (barWidth > 0 && trackDuration > 0) {
            seekSound((e.nativeEvent.locationX / barWidth) * trackDuration);
          }
        }}
      >
        {bars.map((h, i) => {
          const isActive = (i / bars.length) <= progressPercent;
          return (
            <View 
              key={i} 
              style={[
                styles.waveformBar, 
                { height: h, backgroundColor: isActive ? '#fff' : 'rgba(255,255,255,0.2)' }
              ]} 
            />
          );
        })}
      </Pressable>

      <Text style={styles.waveformTime}>{`${totalMins}:${String(totalSecs).padStart(2, '0')}`}</Text>
    </View>
  );
});

// ── Hero Overlay ────────────────────────────────────────────────────────────
interface HeroOverlayProps {
  layout: CardLayout;
  trackName: string;
  duration: string;
  onClose: () => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  artistName: string;
}

const HeroOverlay: React.FC<HeroOverlayProps> = ({
  layout,
  trackName,
  onClose,
  isPlaying,
  onPlayPause,
  artistName
}) => {
  const insets = useSafeAreaInsets();
  const tracks = usePlayerStore((s) => s.tracks);
  const currentTrackIndex = usePlayerStore((s) => s.currentTrackIndex);
  const setCurrentTrackIndex = usePlayerStore((s) => s.setCurrentTrackIndex);

  const currentTrack = tracks[currentTrackIndex];
  const artworkUri = currentTrack?.artwork || 'https://i.pinimg.com/736x/87/b9/69/87b969ed69c7cc9c3fdebd4da442d6c1.jpg';

  const progress = useSharedValue(-1);
  const [canClose, setCanClose] = useState(false);

  useLayoutEffect(() => {
    progress.value = withSpring(1, EXPAND_SPRING);
    const t = setTimeout(() => setCanClose(true), 200);
    return () => {
      clearTimeout(t);
      cancelAnimation(progress);
    };
  }, []);

  const containerStyle = useAnimatedStyle(() => {
    'worklet';
    const p = Math.max(progress.value, 0);
    return {
      left: interpolate(p, [0, 1], [layout.x, 0], Extrapolation.CLAMP),
      top: interpolate(p, [0, 1], [layout.y, 0], Extrapolation.CLAMP),
      width: interpolate(p, [0, 1], [layout.width, SCREEN_WIDTH], Extrapolation.CLAMP),
      height: interpolate(p, [0, 1], [layout.height, SCREEN_HEIGHT], Extrapolation.CLAMP),
      borderRadius: interpolate(p, [0, 1], [24, 0], Extrapolation.CLAMP),
      opacity: progress.value < 0 ? 0 : 1,
    };
  });

  const detailContentStyle = useAnimatedStyle(() => {
    'worklet';
    const p = Math.max(progress.value, 0);
    return {
      opacity: interpolate(p, [0.5, 0.9], [0, 1], Extrapolation.CLAMP),
    };
  });

  const handleClose = () => {
    if (!canClose) return;
    setCanClose(false);
    progress.value = withSpring(0, COLLAPSE_SPRING, (finished) => {
      if (finished) runOnJS(onClose)();
    });
  };

  const handleNext = () => {
    if (currentTrackIndex < tracks.length - 1) {
      setCurrentTrackIndex(currentTrackIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentTrackIndex > 0) {
      setCurrentTrackIndex(currentTrackIndex - 1);
    }
  };

  return (
    <Animated.View style={[styles.heroOverlay, containerStyle]}>
      <Animated.View style={[StyleSheet.absoluteFill, detailContentStyle]}>
        
        {/* Soft Glow */}
        <LinearGradient 
          colors={['rgba(255, 100, 150, 0.15)', 'transparent']} 
          style={StyleSheet.absoluteFill} 
          pointerEvents="none"
        />

        {/* Header */}
        <View style={[styles.heroHeader, { marginTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.heroHeaderText}>Now Playing</Text>
          <TouchableOpacity hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Artwork */}
        <View style={styles.heroArtworkArea}>
          <Image source={{ uri: artworkUri }} style={styles.heroArtwork} contentFit="cover" />
        </View>

        {/* Info & Controls */}
        <View style={styles.heroInfoPanel}>
          
          <View style={styles.heroInfoRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroInfoTitle} numberOfLines={1}>{trackName}</Text>
              <Text style={styles.heroInfoArtist} numberOfLines={1}>{artistName}</Text>
            </View>
            <TouchableOpacity>
              <Ionicons name="heart-outline" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <WaveformProgress />

          <View style={styles.heroControls}>
            <TouchableOpacity>
              <Ionicons name="shuffle" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePrev}>
              <Ionicons name="play-skip-back" size={32} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={onPlayPause} style={styles.heroPlayBtn}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color="#000" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleNext}>
              <Ionicons name="play-skip-forward" size={32} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity>
              <Ionicons name="repeat" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Lyrics Button */}
          <View style={styles.lyricsContainer}>
            <TouchableOpacity style={styles.lyricsBtn}>
              <Text style={styles.lyricsBtnText}>Lyrics</Text>
              <Ionicons name="chevron-down" size={16} color="#fff" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

        </View>
      </Animated.View>
    </Animated.View>
  );
};

// ── LibraryScreen ────────────────────────────────────────────────────────────
export const LibraryScreen: React.FC = () => {
  const { tracks, currentTrackIndex, isPlaying, setTracks, setCurrentTrackIndex, setIsHeroOpen } = usePlayerStore();
  const [activeTab, setActiveTab] = useState('Popular');
  const [isSearchActive, setIsSearchActive] = useState(false);

  const { data: cloudLibrary, isLoading: isCloudLoading } = useGetLibrarySongsQuery();
  const { data: historyData, isLoading: isHistoryLoading } = useGetListeningHistoryQuery();

  const [searchQuery, setSearchQuery] = useState('');
  const [triggerSearch, { data: searchResults, isFetching: isSearchLoading }] = useLazySearchMusicQuery();

  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    let sourceData = cloudLibrary?.songs || [];
    if (sourceData.length === 0 && historyData?.history) {
      sourceData = historyData.history;
    }
    
    if (sourceData && sourceData.length > 0) {
      const newTracks: AudioTrack[] = sourceData.map((song: any) => ({
        id: song.videoId || song.id,
        filename: song.title,
        uri: `${BASE_URL}/stream/${song.videoId || song.id}`,
        duration: song.duration || 0,
        artwork: song.thumbnail,
        artist: song.artist || 'YouTube Music',
      }));
      
      const currentTrackIds = tracks.map(t => t.id).join(',');
      const newTrackIds = newTracks.map(t => t.id).join(',');
      if (currentTrackIds !== newTrackIds) {
        setTracks(newTracks);
        setCurrentTrackIndex(0);
      }
    }
  }, [historyData, cloudLibrary, tracks.length]);

  const [heroLayout, setHeroLayout] = useState<CardLayout | null>(null);

  const openHero = (index: number) => {
    // For simplicity, just pop it from center if no ref
    setHeroLayout({
      x: SCREEN_WIDTH / 2 - 100,
      y: SCREEN_HEIGHT / 2 - 100,
      width: 200,
      height: 200,
      color: '#121212',
      trackIndex: index,
    });
    setIsHeroOpen(true);
  };

  const closeHero = useCallback(() => {
    setHeroLayout(null);
    setIsHeroOpen(false);
  }, [setIsHeroOpen]);

  const handleStreamSong = (song: any) => {
    const newTrack: AudioTrack = {
      id: song.videoId || song.id,
      filename: song.title,
      uri: `${BASE_URL}/stream/${song.videoId || song.id}`,
      duration: song.duration || 0,
      artwork: song.thumbnail,
      artist: song.artist || 'YouTube Music',
    };

    const existsIndex = tracks.findIndex(t => t.id === newTrack.id);
    let targetIndex = tracks.length;

    if (existsIndex >= 0) {
      targetIndex = existsIndex;
    } else {
      setTracks([newTrack, ...tracks]);
      targetIndex = 0;
    }

    setCurrentTrackIndex(targetIndex);
    playSound(newTrack.uri);
    
    // open Hero automatically
    openHero(targetIndex);
  };

  const currentTrack = tracks[currentTrackIndex] ?? null;
  const heroDuration = currentTrack
    ? `${Math.floor(currentTrack.duration / 60)}:${String(Math.floor(currentTrack.duration % 60)).padStart(2, '0')}`
    : '0:00';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Top Header */}
        <View style={styles.browseHeader}>
          {isSearchActive ? (
            <View style={styles.searchBarContainer}>
              <TouchableOpacity onPress={() => setIsSearchActive(false)}>
                <Ionicons name="arrow-back" size={20} color="#fff" style={styles.searchIcon} />
              </TouchableOpacity>
              <TextInput
                style={styles.searchInput}
                placeholder="Search songs..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={() => triggerSearch({ q: searchQuery })}
                returnKeyType="search"
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); triggerSearch({ q: '' }); }}>
                  <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              <TouchableOpacity onPress={() => setIsSearchActive(true)} style={styles.iconBtn}>
                <Ionicons name="search" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={styles.headerRight}>
                <TouchableOpacity style={styles.iconBtn}>
                  <Ionicons name="notifications-outline" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn}>
                  <Ionicons name="settings-outline" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {!isSearchActive && (
          <Text style={styles.mainTitle}>Browse</Text>
        )}

        {isSearchActive ? (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10 }}>
            {isSearchLoading ? (
               <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />
            ) : searchResults?.results && searchResults.results.length > 0 ? (
               <View>
                 {searchResults.results.map((song: any) => (
                   <TouchableOpacity key={song.videoId} onPress={() => { setIsSearchActive(false); handleStreamSong(song); }} style={styles.listItem}>
                     <Image source={{ uri: song.thumbnail }} style={styles.listArtwork} contentFit="cover" />
                     <View style={styles.listTextContainer}>
                       <Text style={styles.listTitle} numberOfLines={1}>{song.title}</Text>
                       <Text style={styles.listArtist} numberOfLines={1}>{song.artist}</Text>
                     </View>
                     <Ionicons name="ellipsis-vertical" size={20} color="rgba(255,255,255,0.6)" />
                   </TouchableOpacity>
                 ))}
               </View>
            ) : null}
          </ScrollView>
        ) : (
          <ScrollView>
            {/* Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
              {['Popular', 'New', 'Trend', 'Podcasts', 'Favourites'].map(tab => (
                <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)}>
                  <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Horizontal Featured */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuredContainer}>
              {(cloudLibrary?.songs?.length ? cloudLibrary.songs : tracks).map((song: any, i: number) => (
                <TouchableOpacity key={song.id || i} style={styles.featuredCard} onPress={() => handleStreamSong(song)}>
                  <Image source={{ uri: song.thumbnail || song.artwork }} style={styles.featuredArtwork} contentFit="cover" />
                  <Text style={styles.featuredTitle} numberOfLines={1}>{song.title || song.filename}</Text>
                  <Text style={styles.featuredArtist} numberOfLines={1}>{song.artist}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Vertical List */}
            <View style={styles.listContainer}>
              <Text style={styles.sectionTitle}>Top hits 2023</Text>
              {(historyData?.history?.length ? historyData.history : tracks).map((song: any, i: number) => (
                <TouchableOpacity key={song.videoId || song.id || i} style={styles.listItem} onPress={() => handleStreamSong(song)}>
                  <Image source={{ uri: song.thumbnail || song.artwork }} style={styles.listArtwork} contentFit="cover" />
                  <View style={styles.listRankContainer}>
                    <Text style={styles.listRank}>#{i + 1}</Text>
                  </View>
                  <View style={styles.listTextContainer}>
                    <Text style={styles.listTitle} numberOfLines={1}>{song.title || song.filename}</Text>
                    <Text style={styles.listArtist} numberOfLines={1}>{song.artist}</Text>
                  </View>
                  <Ionicons name="ellipsis-vertical" size={20} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Bottom Nav Placeholder */}
        <View style={styles.bottomNav}>
          <Ionicons name="home" size={24} color="#fff" />
          <Ionicons name="book-outline" size={24} color="rgba(255,255,255,0.5)" />
          <Ionicons name="person-outline" size={24} color="rgba(255,255,255,0.5)" />
        </View>


      </SafeAreaView>

      {/* Hero Overlay */}
      {heroLayout && currentTrack && (
        <HeroOverlay
          layout={heroLayout}
          trackName={currentTrack.filename.replace(/\.[^/.]+$/, '')}
          artistName={currentTrack.artist}
          duration={heroDuration}
          onClose={closeHero}
          isPlaying={isPlaying}
          onPlayPause={togglePlayPause}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  browseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    height: 50,
  },
  headerRight: { flexDirection: 'row', gap: 15 },
  iconBtn: { padding: 5 },
  mainTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  tabsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginRight: 20,
  },
  tabTextActive: {
    color: '#fff',
  },
  featuredContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  featuredCard: {
    width: 150,
    marginRight: 16,
  },
  featuredArtwork: {
    width: 150,
    height: 150,
    borderRadius: 16,
    marginBottom: 10,
  },
  featuredTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  featuredArtist: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100, // padding for bottom nav
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  listArtwork: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  listRankContainer: {
    width: 24,
  },
  listRank: {
    color: '#ff4d4d',
    fontSize: 14,
    fontWeight: '700',
  },
  listTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  listTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  listArtist: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 20,
  },

  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 16 },

  // Hero Styles
  heroOverlay: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: '#121212',
    zIndex: 9999,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  heroHeaderText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  heroArtworkArea: {
    alignItems: 'center',
    marginBottom: 40,
  },
  heroArtwork: {
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_WIDTH * 0.85,
    borderRadius: 20,
  },
  heroInfoPanel: {
    paddingHorizontal: 30,
    flex: 1,
  },
  heroInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  heroInfoTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  heroInfoArtist: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textTransform: 'uppercase',
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  waveformTime: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    width: 30,
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 10,
    height: 30,
  },
  waveformBar: {
    width: 3,
    borderRadius: 2,
  },
  heroControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  heroPlayBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lyricsContainer: {
    alignItems: 'center',
  },
  lyricsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  lyricsBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  }
});
