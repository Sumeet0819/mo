import { useState } from 'react';
import * as MediaLibrary from 'expo-media-library/legacy';
import { usePlayerStore } from '../store/usePlayerStore';
import { getAlbumArt } from '../services/metadataService';

export const useLocalMusic = () => {
  const [loading, setLoading] = useState(false);
  const [albums, setAlbums] = useState<{ id: string; title: string; count: number }[]>([]);
  const setTracks = usePlayerStore((state) => state.setTracks);

  const getAudioAlbums = async () => {
    setLoading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access media library is required!');
        return [];
      }

      const allAlbums = await MediaLibrary.getAlbumsAsync();
      const audioAlbumsList = [];

      for (const album of allAlbums) {
        // Query to check if this album has any audio assets
        const media = await MediaLibrary.getAssetsAsync({
          album: album.id,
          mediaType: 'audio',
          first: 1,
        });

        if (media.assets && media.assets.length > 0) {
          // Fetch up to 100 audio files to count them in this album
          const allAudio = await MediaLibrary.getAssetsAsync({
            album: album.id,
            mediaType: 'audio',
            first: 100,
          });

          audioAlbumsList.push({
            id: album.id,
            title: album.title,
            count: allAudio.assets ? allAudio.assets.length : 0,
          });
        }
      }
      setAlbums(audioAlbumsList);
      return audioAlbumsList;
    } catch (error) {
      console.error('Error getting audio albums:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const scanLocalFiles = async (albumId?: string) => {
    setLoading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access media library is required!');
        setLoading(false);
        return;
      }

      const options: any = {
        mediaType: 'audio',
        first: 50, // Get top 50 tracks
      };

      if (albumId) {
        options.album = albumId;
      }

      // Fetch audio files from device or specific album
      const media = await MediaLibrary.getAssetsAsync(options);

      if (media.assets && media.assets.length > 0) {
        const audioTracks = media.assets.map(asset => ({
          id: asset.id,
          filename: asset.filename,
          uri: asset.uri,
          duration: asset.duration || 0,
          artwork: null, // placeholder
        }));
        
        setTracks(audioTracks);

        // Load artwork in background
        const updateTrackArtwork = usePlayerStore.getState().updateTrackArtwork;
        audioTracks.forEach((track) => {
          MediaLibrary.getAssetInfoAsync(track.id)
            .then((assetInfo) => {
              const fileUri = assetInfo.localUri || assetInfo.uri || track.uri;
              return getAlbumArt(fileUri, track.id);
            })
            .then((artwork) => {
              if (artwork) {
                updateTrackArtwork(track.id, artwork);
              }
            })
            .catch((err) => {
              console.warn('[useLocalMusic] Error retrieving artwork for track:', track.filename, err);
            });
        });
      } else {
        alert('No audio files found.');
      }
    } catch (error) {
      console.error('Error scanning files:', error);
      alert('Failed to scan local audio files.');
    } finally {
      setLoading(false);
    }
  };

  return { loading, albums, getAudioAlbums, scanLocalFiles };
};

