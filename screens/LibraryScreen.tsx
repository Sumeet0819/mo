import { router } from 'expo-router';
import React, { memo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';
import { MiniAudioPlayer } from '../components/MiniAudioPlayer';
import { playSound, seekSound, togglePlayPause } from '../services/audioService';
import { addRecentlyPlayed, addRecentSearch, getRecentlyPlayed, getRecentSearches } from '../services/db';
import { downloadSong, getLocalSongUri, isSongDownloaded } from '../services/downloadService';
import {
  BASE_URL,
  useGetLibrarySongsQuery,
  useGetListeningHistoryQuery,
  useGetNewReleasesQuery,
  useGetPodcastsQuery,
  useGetTrendingQuery,
  useLazySearchMusicQuery
} from '../store/api/youtubeMusicApi';
import { AudioTrack, usePlayerStore } from '../store/usePlayerStore';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// We use a high-quality spring now that layout thrashing is gone. 
// This provides a buttery, organic Apple-like feel.
const EXPAND_SPRING: Parameters<typeof withSpring>[1] = {
  damping: 26,
  stiffness: 260,
  mass: 0.9,
  overshootClamping: false,
};

const COLLAPSE_SPRING: Parameters<typeof withSpring>[1] = {
  damping: 28,
  stiffness: 280,
  mass: 0.9,
  overshootClamping: false,
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
  const bars = React.useMemo(() => {
    return Array.from({ length: 35 }).map((_, i) => {
      const h = 20 + Math.abs(Math.sin(i * 0.5) * 30) + (i % 3) * 10;
      return h;
    });
  }, []);

  const handleSeek = (x: number) => {
    if (barWidth > 0 && trackDuration > 0) {
      let boundedX = x;
      if (boundedX < 0) boundedX = 0;
      if (boundedX > barWidth) boundedX = barWidth;
      seekSound((boundedX / barWidth) * trackDuration);
    }
  };

  const gesture = Gesture.Pan()
    .minDistance(0)
    .onStart((e) => {
      runOnJS(handleSeek)(e.x);
    })
    .onUpdate((e) => {
      runOnJS(handleSeek)(e.x);
    });

  return (
    <View style={styles.waveformRow}>
      <Text style={styles.waveformTime}>{`${mins}:${String(secs).padStart(2, '0')}`}</Text>
      
      <GestureDetector gesture={gesture}>
        <View 
          style={styles.waveformContainer}
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        >
          {bars.map((h, i) => {
          const isActive = (i / bars.length) <= progressPercent;
          return (
            <View 
              key={i} 
              pointerEvents="none"
              style={[
                styles.waveformBar, 
                { height: h, backgroundColor: isActive ? '#fff' : 'rgba(255,255,255,0.2)' }
              ]} 
            />
          );
        })}
        </View>
      </GestureDetector>

      <Text style={styles.waveformTime}>{`${totalMins}:${String(totalSecs).padStart(2, '0')}`}</Text>
    </View>
  );
});

// ── Hero Overlay ────────────────────────────────────────────────────────────
const AnimatedExpoImage = Animated.createAnimatedComponent(Image);

const HeroOverlay: React.FC = () => {
  const insets = useSafeAreaInsets();
  const tracks = usePlayerStore((s) => s.tracks);
  const currentTrackIndex = usePlayerStore((s) => s.currentTrackIndex);
  const setCurrentTrackIndex = usePlayerStore((s) => s.setCurrentTrackIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isHeroOpen = usePlayerStore((s) => s.isHeroOpen);
  const setIsHeroOpen = usePlayerStore((s) => s.setIsHeroOpen);

  const currentTrack = tracks[currentTrackIndex];
  const trackName = currentTrack?.filename?.replace(/\.[^/.]+$/, '') || 'Unknown';
  const artistName = currentTrack?.artist || 'Unknown Artist';
  const artworkUri = currentTrack?.artwork || 'https://i.pinimg.com/736x/87/b9/69/87b969ed69c7cc9c3fdebd4da442d6c1.jpg';

  const progress = useSharedValue(0);

  // Trigger animation when isHeroOpen changes
  React.useEffect(() => {
    if (isHeroOpen) {
      progress.value = withSpring(1, EXPAND_SPRING);
    } else {
      progress.value = withSpring(0, COLLAPSE_SPRING);
    }
  }, [isHeroOpen]);

  const panGesture = Gesture.Pan()
    .activeOffsetY(10)
    .onUpdate((e) => {
      const newProgress = 1 - (e.translationY / SCREEN_HEIGHT);
      if (newProgress <= 1) {
        progress.value = newProgress;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 150 || e.velocityY > 500) {
        runOnJS(setIsHeroOpen)(false);
      } else {
        progress.value = withSpring(1, EXPAND_SPRING);
      }
    });

  // MiniAudioPlayer is exactly at this position/size:
  const startScaleY = 0.5; // Start at 50% of the screen height
  const startTranslateY = 0; // 0 means perfectly centered on the screen

  // Artwork shared element math
  const finalArtworkSize = SCREEN_WIDTH * 0.85;
  const initialArtworkSize = 48;
  const startArtworkScale = initialArtworkSize / finalArtworkSize;
  
  const headerHeight = (insets.top || 40) + 10 + 50;
  const blockHeight = finalArtworkSize + 40 + 280;
  const availableSpace = SCREEN_HEIGHT - headerHeight;
  const finalArtworkY = headerHeight + Math.max(10, (availableSpace - blockHeight) / 6);
  const finalCenterY = finalArtworkY + (finalArtworkSize / 2);
  const initialCenterY = (SCREEN_HEIGHT - 138) + (initialArtworkSize / 2); // 138 is miniplayer top padding offset
  const initialCenterX = 14 + (initialArtworkSize / 2); // 14 is horizontal padding in miniplayer
  const finalCenterX = SCREEN_WIDTH / 2;

  const artworkStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateX: interpolate(progress.value, [0, 1], [initialCenterX - finalCenterX, 0], Extrapolation.CLAMP) },
        { translateY: interpolate(progress.value, [0, 1], [initialCenterY - finalCenterY, 0], Extrapolation.CLAMP) },
        { scale: interpolate(progress.value, [0, 1], [startArtworkScale, 1], Extrapolation.CLAMP) },
      ],
      // Approximate border radius scaling (48px box has 8px radius -> 8/scale)
      borderRadius: interpolate(progress.value, [0, 1], [8 / startArtworkScale, 20], Extrapolation.CLAMP),
    };
  });

  const containerStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      left: 0,
      top: 0,
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      opacity: progress.value < 0.05 ? 0 : 1, 
      pointerEvents: progress.value < 0.5 ? 'none' : 'auto',
    };
  });

  const backgroundStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateY: interpolate(progress.value, [0, 1], [startTranslateY, 0], Extrapolation.CLAMP) },
        { scaleX: interpolate(progress.value, [0, 1], [0.95, 1], Extrapolation.CLAMP) },
        { scaleY: interpolate(progress.value, [0, 1], [startScaleY, 1], Extrapolation.CLAMP) },
      ],
      borderRadius: interpolate(progress.value, [0, 1], [32, 0], Extrapolation.CLAMP),
      backgroundColor: '#1C1C1E',
    };
  });

  const detailContentStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      // Delay fade-in so the flying artwork draws the eye first
      opacity: interpolate(progress.value, [0.35, 0.95], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(progress.value, [0, 1], [60, 0], Extrapolation.CLAMP) },
      ],
    };
  });

  const handleClose = () => {
    setIsHeroOpen(false);
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

  // If no track, just return empty view so it doesn't crash, but container style keeps it hidden
  if (!currentTrack) return <Animated.View style={[styles.heroOverlay, containerStyle]} />;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.heroOverlay, containerStyle]}>
        {/* Expanding background layer */}
      <Animated.View style={[StyleSheet.absoluteFill, backgroundStyle]} />

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

        {/* Dummy space to hold layout for artwork */}
        <View style={[styles.heroArtworkArea, { height: finalArtworkSize, marginTop: finalArtworkY - headerHeight }]} />

        {/* Info & Controls */}
        <View style={styles.heroInfoPanel}>
          <View>
            <View style={styles.heroInfoRow}>
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text style={styles.heroInfoTitle} numberOfLines={1}>{trackName}</Text>
              <Text style={styles.heroInfoArtist} numberOfLines={1}>{artistName}</Text>
            </View>
            <TouchableOpacity style={{ padding: 8, marginRight: -8 }}>
              <Ionicons name="heart-outline" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

            <WaveformProgress />
          </View>

          <View style={styles.heroControls}>
            <TouchableOpacity>
              <Ionicons name="shuffle" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePrev}>
              <Ionicons name="play-skip-back" size={32} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={togglePlayPause} style={styles.heroPlayBtn}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color="#000" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleNext}>
              <Ionicons name="play-skip-forward" size={32} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity>
              <Ionicons name="repeat" size={24} color="#fff" />
            </TouchableOpacity>
          </View>


        </View>
      </Animated.View>

      {/* The actual Artwork that scales up independently */}
      <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none', zIndex: 10 }]}>
        <View style={{ marginTop: finalArtworkY, alignItems: 'center' }}>
          <AnimatedExpoImage 
            source={{ uri: artworkUri }} 
            style={[styles.heroArtwork, artworkStyle]} 
            contentFit="cover" 
          />
        </View>
      </View>
    </Animated.View>
    </GestureDetector>
  );
};

const chunkArray = (array: any[], size: number) => {
  const chunked = [];
  let index = 0;
  while (index < (array?.length || 0)) {
    chunked.push(array.slice(index, size + index));
    index += size;
  }
  return chunked;
};

// ── LibraryScreen ────────────────────────────────────────────────────────────
export const LibraryScreen: React.FC = () => {
  const tracks = usePlayerStore((s) => s.tracks);
  const currentTrackIndex = usePlayerStore((s) => s.currentTrackIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const setTracks = usePlayerStore((s) => s.setTracks);
  const setCurrentTrackIndex = usePlayerStore((s) => s.setCurrentTrackIndex);
  const setIsHeroOpen = usePlayerStore((s) => s.setIsHeroOpen);
  const downloadingQueue = usePlayerStore((s) => s.downloadingQueue);
  const downloadingCount = Object.keys(downloadingQueue).length;
  
  const [activeTab, setActiveTab] = useState('Popular');
  const [isSearchActive, setIsSearchActive] = useState(false);

  const { data: cloudLibrary, isLoading: isCloudLoading } = useGetLibrarySongsQuery();
  const { data: historyData, isLoading: isHistoryLoading } = useGetListeningHistoryQuery();

  const { data: trendingData, isLoading: isTrendingLoading } = useGetTrendingQuery();
  const { data: podcastData, isLoading: isPodcastLoading } = useGetPodcastsQuery();
  const { data: newData, isLoading: isNewLoading } = useGetNewReleasesQuery();

  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [recentlyPlayedDb, setRecentlyPlayedDb] = useState<any[]>([]);
  const [triggerSearch, { data: searchResults, isFetching: isSearchLoading }] = useLazySearchMusicQuery();

  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (isSearchActive) {
      getRecentSearches().then(setRecentSearches);
    }
  }, [isSearchActive]);

  React.useEffect(() => {
    getRecentlyPlayed().then(setRecentlyPlayedDb);
  }, []);

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
  }, [historyData, cloudLibrary]);

  const openHero = (index: number) => {
    setIsHeroOpen(true);
  };

  const handleDownload = async (song: any) => {
    const songId = song.videoId || song.id;
    if (downloadingQueue[songId] !== undefined) {
      return;
    }
    const isDownloaded = isSongDownloaded(songId);
    if (!isDownloaded) {
      await downloadSong(songId);
    } else {
      console.log(`[LibraryScreen] Song ${songId} is already downloaded.`);
    }
  };

  const handleStreamSong = async (song: any) => {
    const songId = song.videoId || song.id;
    const localUri = getLocalSongUri(songId);
    const finalUri = localUri || `${BASE_URL}/stream/${songId}`;

    const newTrack: AudioTrack = {
      id: songId,
      filename: song.title,
      uri: finalUri,
      duration: song.duration || 0,
      artwork: song.thumbnail || song.artwork,
      artist: song.artist || 'YouTube Music',
    };

    addRecentlyPlayed(newTrack);
    getRecentlyPlayed().then(setRecentlyPlayedDb);

    const existsIndex = tracks.findIndex(t => t.id === newTrack.id);
    let targetIndex = tracks.length;

    if (existsIndex >= 0) {
      targetIndex = existsIndex;
    } else {
      setTracks([newTrack, ...tracks]);
      targetIndex = 0;
    }

    setCurrentTrackIndex(targetIndex);
    playSound(newTrack.uri, true, {
      title: newTrack.filename?.replace(/\.[^/.]+$/, '') || 'Unknown',
      artist: newTrack.artist || 'Unknown Artist',
      artworkUrl: newTrack.artwork ?? undefined,
    });

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

      {/* ── Top gradient overlay ── */}
      <LinearGradient
        colors={['rgba(108,99,255,0.45)', 'rgba(80,60,200,0.18)', 'transparent']}
        style={styles.topGradient}
        pointerEvents="none"
      />

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
                onSubmitEditing={() => {
                  if (searchQuery.trim().length > 0) {
                    const query = searchQuery.trim();
                    addRecentSearch(query);
                    getRecentSearches().then(setRecentSearches);
                    triggerSearch({ q: query });
                  }
                }}
                returnKeyType="search"
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { 
                  setSearchQuery(''); 
                  setIsSearchActive(false); 
                }}>
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
                <TouchableOpacity style={[styles.iconBtn, { flexDirection: 'row', alignItems: 'center' }]}>
                  {downloadingCount > 0 ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 12, marginLeft: 6, fontWeight: 'bold' }}>{downloadingCount}</Text>
                    </>
                  ) : (
                    <Ionicons name="cloud-download-outline" size={24} color="#fff" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn}>
                  <Ionicons name="notifications-outline" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/settings')}>
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
                     <TouchableOpacity style={{ padding: 8 }} onPress={() => handleDownload(song)}>
                       {downloadingQueue[song.videoId || song.id] !== undefined ? (
                         <ActivityIndicator size="small" color="#fff" />
                       ) : isSongDownloaded(song.videoId || song.id) ? (
                         <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                       ) : (
                         <Ionicons name="cloud-download-outline" size={20} color="rgba(255,255,255,0.6)" />
                       )}
                     </TouchableOpacity>
                     <TouchableOpacity style={{ padding: 8 }}>
                       <Ionicons name="ellipsis-vertical" size={20} color="rgba(255,255,255,0.6)" />
                     </TouchableOpacity>
                   </TouchableOpacity>
                 ))}
               </View>
            ) : (
               <View>
                 {recentSearches.length > 0 && <Text style={styles.sectionTitle}>Recent Searches</Text>}
                 {recentSearches.map((query, index) => (
                   <TouchableOpacity key={`rs-${index}`} onPress={() => {
                     setSearchQuery(query);
                     addRecentSearch(query);
                     getRecentSearches().then(setRecentSearches);
                     triggerSearch({ q: query });
                   }} style={styles.recentSearchItem}>
                     <Ionicons name="time-outline" size={20} color="rgba(255,255,255,0.5)" style={{ marginRight: 12 }} />
                     <Text style={{ color: '#fff', fontSize: 16 }}>{query}</Text>
                   </TouchableOpacity>
                 ))}
               </View>
            )}
          </ScrollView>
        ) : (
          <ScrollView>
            {/* Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer} contentContainerStyle={{ paddingHorizontal: 20 }}>
              {['Podcasts', 'Romance', 'Relax', 'Feel good', 'Sleep'].map(tab => (
                <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}>
                  <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Quick Picks */}
            <View style={styles.quickPicksSection}>
              <View style={styles.sectionHeader}>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={SCREEN_WIDTH * 0.85 + 16} decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: 20 }}>
                {chunkArray(trendingData?.results || (cloudLibrary?.songs?.length ? cloudLibrary.songs : tracks), 4).map((chunk, chunkIdx) => (
                  <View key={`chunk-${chunkIdx}`} style={styles.quickPickColumn}>
                    {chunk.map((song: any, i: number) => (
                      <TouchableOpacity key={song.videoId || song.id || i} style={styles.quickPickItem} onPress={() => handleStreamSong(song)}>
                        <Image source={{ uri: song.thumbnail || song.artwork }} style={styles.quickPickArtwork} contentFit="cover" />
                        <View style={styles.quickPickTextContainer}>
                          <Text style={styles.quickPickTitle} numberOfLines={1}>{song.title || song.filename}</Text>
                          <Text style={styles.quickPickArtist} numberOfLines={1}>{song.artist}</Text>
                        </View>
                        <TouchableOpacity style={{ padding: 8 }} onPress={() => handleDownload(song)}>
                          {downloadingQueue[song.videoId || song.id] !== undefined ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : isSongDownloaded(song.videoId || song.id) ? (
                            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                          ) : (
                            <Ionicons name="cloud-download-outline" size={20} color="#fff" />
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity style={{ padding: 8 }}>
                          <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Speed dial / Recently Played Grid List */}
            <View style={styles.listContainer}>
              <Text style={styles.sectionTitle}>Recently played</Text>
              <View style={styles.gridContainer}>
                {(recentlyPlayedDb.length > 0 ? recentlyPlayedDb : (historyData?.history?.length ? historyData.history : tracks)).slice(0, 9).map((song: any, i: number) => (
                  <TouchableOpacity key={song.videoId || song.id || i} style={styles.speedDialItem} onPress={() => handleStreamSong(song)}>
                    <Image source={{ uri: song.thumbnail || song.artwork }} style={styles.speedDialArtwork} contentFit="cover" />
                  </TouchableOpacity>
                ))}
              </View>
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

      {/* Mini Audio Player */}
      <MiniAudioPlayer onExpand={() => currentTrack && openHero(currentTrackIndex)} />

      {/* Hero Overlay */}
      <HeroOverlay />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    zIndex: 0,
  },
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
    marginBottom: 20,
    marginTop: 10,
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    marginRight: 10,
  },
  tabItemActive: {
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  tabTextActive: {
    color: '#000',
  },
  quickPicksSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  playAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 16,
  },
  playAllText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  quickPickColumn: {
    width: SCREEN_WIDTH * 0.85,
    marginRight: 16,
    flexDirection: 'column',
    gap: 12,
  },
  quickPickItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickPickArtwork: {
    width: 48,
    height: 48,
    borderRadius: 4,
    marginRight: 12,
  },
  quickPickTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  quickPickTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  quickPickArtist: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100, // padding for bottom nav
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
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
  },
  listTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  listTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  listArtist: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  speedDialItem: {
    width: (SCREEN_WIDTH - 40 - 20) / 3,
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  speedDialArtwork: {
    width: '100%',
    height: '100%',
  },

  gridTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  gridArtist: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: '#121212',

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
    marginBottom: 50,
  },
  heroArtwork: {
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_WIDTH * 0.85,
    borderRadius: 20,
  },
  heroInfoPanel: {
    paddingHorizontal: 30,
    paddingBottom: 20,
  },
  heroInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
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
    marginBottom: 70,
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
    height: 60,
  },
  waveformBar: {
    width: 4,
    borderRadius: 2,
  },
  heroControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 50,
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
