import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { Platform } from "react-native";

// Define the API base URL from the environment variable or fallback
// Note: Android emulator uses 10.0.2.2 to access the host's localhost
const defaultBaseUrl =
  Platform.OS === "android"
    ? "http://192.168.1.5:3000/api/v1"
    : "http://localhost:3000/api/v1";
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || defaultBaseUrl;

console.log(`[API INIT] Connected to API endpoint: ${BASE_URL}`);

const rawBaseQuery = fetchBaseQuery({ baseUrl: BASE_URL });

const customBaseQuery = async (args: any, api: any, extraOptions: any) => {
  console.log(`[API REQUEST] ${api.endpoint} to ${BASE_URL}:`, args);
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error) {
    console.error(`[API ERROR] ${api.endpoint}:`, result.error);
  } else {
    console.debug(`[API SUCCESS] ${api.endpoint}:`, result.data);
  }
  return result;
};

export const youtubeMusicApi = createApi({
  reducerPath: "youtubeMusicApi",
  baseQuery: customBaseQuery,
  tagTypes: ["Downloads", "Songs", "Playlists", "History"],
  endpoints: (builder) => ({
    // 1. System
    checkHealth: builder.query<{ status: string; timestamp: string }, void>({
      query: () => "/health",
    }),

    // 2. Search
    searchMusic: builder.query<
      { results: any[] },
      { q: string; limit?: number }
    >({
      query: ({ q, limit = 20 }) => ({
        url: "/search",
        params: { q, limit },
      }),
    }),

    // 4. Downloading (Offline Support)
    enqueueDownload: builder.mutation<
      { jobId: string; status: string },
      { videoId: string }
    >({
      query: (body) => ({
        url: "/downloads",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Downloads"],
    }),

    getDownloadQueue: builder.query<{ queue: any[] }, void>({
      query: () => "/downloads/queue",
      providesTags: ["Downloads"],
    }),

    cancelDownload: builder.mutation<{ success: boolean }, { jobId: string }>({
      query: ({ jobId }) => ({
        url: `/downloads/${jobId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Downloads"],
    }),

    // 5. Library Management
    getLibrarySongs: builder.query<{ songs: any[] }, void>({
      query: () => "/library/songs",
      providesTags: ["Songs"],
    }),

    getPlaylists: builder.query<{ playlists: any[] }, void>({
      query: () => "/library/playlists",
      providesTags: ["Playlists"],
    }),

    createPlaylist: builder.mutation<{ playlist: any }, { name: string }>({
      query: (body) => ({
        url: "/library/playlists",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Playlists"],
    }),

    addSongToPlaylist: builder.mutation<
      { success: boolean; data: any },
      { playlistId: string; songId: string }
    >({
      query: ({ playlistId, songId }) => ({
        url: `/library/playlists/${playlistId}/songs`,
        method: "POST",
        body: { songId },
      }),
      invalidatesTags: ["Playlists"], // Could also add specific tags if needed
    }),

    getListeningHistory: builder.query<{ history: any[] }, void>({
      query: () => "/library/history",
      providesTags: ["History"],
    }),

    recordPlayHistory: builder.mutation<
      { success: boolean; data: any },
      { songId: string }
    >({
      query: (body) => ({
        url: "/library/history",
        method: "POST",
        body,
      }),
      invalidatesTags: ["History"],
    }),

    // 6. Explore
    getTrending: builder.query<{ results: any[] }, { limit?: number } | void>({
      query: (args) => ({
        url: "/explore/trending",
        params: { limit: args?.limit || 20 },
      }),
    }),

    getPodcasts: builder.query<{ results: any[] }, { limit?: number } | void>({
      query: (args) => ({
        url: "/explore/podcasts",
        params: { limit: args?.limit || 20 },
      }),
    }),

    getNewReleases: builder.query<{ results: any[] }, { limit?: number } | void>({
      query: (args) => ({
        url: "/explore/new",
        params: { limit: args?.limit || 20 },
      }),
    }),
  }),
});

export const {
  useCheckHealthQuery,
  useSearchMusicQuery,
  useLazySearchMusicQuery,
  useEnqueueDownloadMutation,
  useGetDownloadQueueQuery,
  useCancelDownloadMutation,
  useGetLibrarySongsQuery,
  useGetPlaylistsQuery,
  useCreatePlaylistMutation,
  useAddSongToPlaylistMutation,
  useGetListeningHistoryQuery,
  useRecordPlayHistoryMutation,
  useGetTrendingQuery,
  useGetPodcastsQuery,
  useGetNewReleasesQuery,
} = youtubeMusicApi;

// Note: For streaming (GET /stream/:videoId), standard RTK Query is typically
// not used as it returns binary audio data.
// Instead, use the URL directly in an HTML5 <audio> tag or a React Native audio player:
// const streamUrl = `${BASE_URL}/stream/${videoId}`;
