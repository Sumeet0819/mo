import * as FileSystem from 'expo-file-system';
import { BASE_URL } from '../store/api/youtubeMusicApi';
import { usePlayerStore } from '../store/usePlayerStore';

const getDownloadDirectory = () => {
  const dir = new FileSystem.Directory(FileSystem.Paths.document, 'downloads');
  if (!dir.exists) {
    dir.create();
  }
  return dir;
};

export const isSongDownloaded = (songId: string): boolean => {
  try {
    const dir = getDownloadDirectory();
    const file = new FileSystem.File(dir, `${songId}.mp3`);
    return file.exists;
  } catch {
    return false;
  }
};

export const getLocalSongUri = (songId: string): string | null => {
  try {
    const dir = getDownloadDirectory();
    const file = new FileSystem.File(dir, `${songId}.mp3`);
    return file.exists ? file.uri : null;
  } catch (err) {
    console.error('[DownloadService] Error checking local file:', err);
    return null;
  }
};

export const downloadSong = async (songId: string): Promise<string | null> => {
  try {
    const dir = getDownloadDirectory();
    const file = new FileSystem.File(dir, `${songId}.mp3`);
    const streamUrl = `${BASE_URL}/stream/${songId}`;

    const { setDownloadProgress, removeDownload } = usePlayerStore.getState();

    const downloadTask = new FileSystem.DownloadTask(
      streamUrl,
      file,
      {
        onProgress: (downloadProgress) => {
          const progress = downloadProgress.totalBytes > 0
            ? downloadProgress.bytesWritten / downloadProgress.totalBytes
            : 0;
          setDownloadProgress(songId, progress);
        }
      }
    );

    // Initialize progress to 0.01 so UI shows downloading indicator immediately
    setDownloadProgress(songId, 0.01);
    
    const resultFile = await downloadTask.downloadAsync();
    
    removeDownload(songId);

    if (resultFile && resultFile.exists) {
      console.log(`[DownloadService] Successfully downloaded ${songId} to ${resultFile.uri}`);
      return resultFile.uri;
    } else {
      console.warn(`[DownloadService] Failed to download ${songId}`);
      return null;
    }
  } catch (err) {
    console.error(`[DownloadService] Error downloading song ${songId}:`, err);
    usePlayerStore.getState().removeDownload(songId);
    return null;
  }
};
