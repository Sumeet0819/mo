import { useState } from 'react';
import * as MediaLibrary from 'expo-media-library/legacy';
import { usePlayerStore } from '../store/usePlayerStore';

export const useLocalMusic = () => {
  const [loading, setLoading] = useState(false);
  const setTracks = usePlayerStore((state) => state.setTracks);

  const scanLocalFiles = async () => {
    setLoading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access media library is required!');
        setLoading(false);
        return;
      }

      // Fetch audio files from device
      const media = await MediaLibrary.getAssetsAsync({
        mediaType: 'audio',
        first: 50, // Get top 50 tracks
      });

      if (media.assets && media.assets.length > 0) {
        const audioTracks = media.assets.map(asset => ({
          id: asset.id,
          filename: asset.filename,
          uri: asset.uri,
          duration: asset.duration || 0,
        }));
        
        setTracks(audioTracks);
      } else {
        alert('No audio files found on your device.');
      }
    } catch (error) {
      console.error('Error scanning files:', error);
      alert('Failed to scan local audio files.');
    } finally {
      setLoading(false);
    }
  };

  return { loading, scanLocalFiles };
};
