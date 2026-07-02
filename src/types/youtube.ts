export interface YouTubeVideo {
  id: string; // Internal Supabase UUID
  video_id: string; // YouTube Video ID
  title: string | null;
  url: string;
  thumbnail_url: string | null;
  duration: number; // in seconds
  view_count: number;
  uploader: string | null;
  synced_at: string;
}

export interface SyncResponse {
  success: boolean;
  count: number;
  error?: string;
}

export interface GetVideosResponse {
  data: YouTubeVideo[];
  count: number;
}
