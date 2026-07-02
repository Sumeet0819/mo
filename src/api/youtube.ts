import { SyncResponse, GetVideosResponse } from '../types/youtube';

const API_BASE_URL = 'http://localhost:3000/api/v1'; // Update with your actual backend URL

export const youtubeApi = {
  /**
   * Triggers the backend yt-dlp job to fetch and save channel data
   */
  syncChannel: async (channelUrl: string, cookiesPath?: string): Promise<SyncResponse> => {
    const response = await fetch(`${API_BASE_URL}/youtube/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelUrl, cookiesPath }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to sync channel');
    }
    
    return response.json();
  },

  /**
   * Fetches the cached videos directly from the Supabase database
   */
  getVideos: async (limit = 50, offset = 0): Promise<GetVideosResponse> => {
    const response = await fetch(`${API_BASE_URL}/youtube/videos?limit=${limit}&offset=${offset}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch videos');
    }
    
    return response.json();
  }
};
