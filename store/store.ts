import { configureStore } from "@reduxjs/toolkit";
import { youtubeMusicApi } from "./api/youtubeMusicApi";

export const store = configureStore({
  reducer: {
    // Add the generated reducer as a specific top-level slice
    [youtubeMusicApi.reducerPath]: youtubeMusicApi.reducer,
  },
  // Adding the api middleware enables caching, invalidation, polling,
  // and other useful features of `rtk-query`.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(youtubeMusicApi.middleware),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
