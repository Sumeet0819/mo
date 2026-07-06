import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<void> | null = null;

export const initDB = async () => {
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    try {
      db = await SQLite.openDatabaseAsync('mo_app.db', { useNewConnection: true });

      // Create recent_searches table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS recent_searches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          query TEXT UNIQUE,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create recently_played table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS recently_played (
          id TEXT PRIMARY KEY,
          title TEXT,
          artist TEXT,
          artwork TEXT,
          duration INTEGER,
          uri TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create favorites table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS favorites (
          id TEXT PRIMARY KEY,
          title TEXT,
          artist TEXT,
          artwork TEXT,
          duration INTEGER,
          uri TEXT,
          addedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      console.log('[DB] Initialized successfully');
    } catch (error) {
      console.error('[DB] Failed to initialize database:', error);
      initPromise = null;
      throw error;
    }
  })();
  
  return initPromise;
};

// -- Recent Searches --
export const addRecentSearch = async (query: string) => {
  await initDB();
  if (!db) return;
  try {
    // Insert or replace to update the timestamp if it already exists
    await db.runAsync('INSERT OR REPLACE INTO recent_searches (query, timestamp) VALUES (?, datetime("now"))', query);
    
    // LRU logic: keep only the 50 most recent searches
    await db.runAsync(`
      DELETE FROM recent_searches
      WHERE id NOT IN (
        SELECT id FROM recent_searches ORDER BY timestamp DESC LIMIT 50
      )
    `);
  } catch (error) {
    console.error('[DB] Failed to add recent search:', error);
  }
};

export const getRecentSearches = async () => {
  await initDB();
  if (!db) return [];
  try {
    const result = await db.getAllAsync('SELECT query FROM recent_searches ORDER BY timestamp DESC');
    return result.map((r: any) => r.query);
  } catch (error) {
    console.error('[DB] Failed to get recent searches:', error);
    return [];
  }
};

export const clearRecentSearches = async () => {
  await initDB();
  if (!db) return;
  try {
    await db.runAsync('DELETE FROM recent_searches');
  } catch (error) {
    console.error('[DB] Failed to clear recent searches:', error);
  }
};

// -- Recently Played --
export const addRecentlyPlayed = async (song: any) => {
  await initDB();
  if (!db) return;
  try {
    const { id, title, artist, artwork, duration, uri } = song;
    await db.runAsync(
      'INSERT OR REPLACE INTO recently_played (id, title, artist, artwork, duration, uri, timestamp) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
      [id, title, artist, artwork, duration, uri]
    );

    // LRU logic: keep only the 50 most recent played
    await db.runAsync(`
      DELETE FROM recently_played
      WHERE id NOT IN (
        SELECT id FROM recently_played ORDER BY timestamp DESC LIMIT 50
      )
    `);
  } catch (error) {
    console.error('[DB] Failed to add recently played:', error);
  }
};

export const getRecentlyPlayed = async () => {
  await initDB();
  if (!db) return [];
  try {
    return await db.getAllAsync('SELECT * FROM recently_played ORDER BY timestamp DESC');
  } catch (error) {
    console.error('[DB] Failed to get recently played:', error);
    return [];
  }
};

// -- Favorites --
export const toggleFavoriteDB = async (song: any, isFavorite: boolean) => {
  await initDB();
  if (!db) return;
  try {
    if (isFavorite) {
      const { id, title, artist, artwork, duration, uri } = song;
      await db.runAsync(
        'INSERT OR REPLACE INTO favorites (id, title, artist, artwork, duration, uri, addedAt) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
        [id, title, artist, artwork, duration, uri]
      );
    } else {
      await db.runAsync('DELETE FROM favorites WHERE id = ?', [song.id]);
    }
  } catch (error) {
    console.error('[DB] Failed to toggle favorite:', error);
  }
};

export const getFavorites = async () => {
  await initDB();
  if (!db) return [];
  try {
    return await db.getAllAsync('SELECT * FROM favorites ORDER BY addedAt DESC');
  } catch (error) {
    console.error('[DB] Failed to get favorites:', error);
    return [];
  }
};
