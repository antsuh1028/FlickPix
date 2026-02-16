/**
 * Local storage layer for user data.
 *
 * Supports multiple user profiles with setActiveUser() for switching.
 * Frontend integration: Import and call these functions to get/set user data.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface WatchedMovie {
  movieId: number;
  title: string;
  rating: number;        // 1-10
  watchedAt: string;     // ISO date
  genres: number[];      // TMDB genre IDs
}

export interface UserPreferences {
  favoriteGenres: number[];  // TMDB genre IDs
  notes?: string;
}

export interface UserProfile {
  preferences: UserPreferences;
  watchHistory: WatchedMovie[];
}

export interface UserEntry {
  id: string;
  name: string;
  profile: UserProfile;
}

// ── Built-in user profiles ────────────────────────────────────────────────

const USER_PROFILES: UserEntry[] = [
  {
    id: "default",
    name: "Default",
    profile: {
      preferences: {
        favoriteGenres: [28, 878, 53],
        notes: "Action, Science Fiction, Thriller",
      },
      watchHistory: [
        { movieId: 157336, title: "Interstellar", rating: 9, watchedAt: "2024-01-15", genres: [12, 18, 878] },
        { movieId: 27205, title: "Inception", rating: 10, watchedAt: "2024-01-20", genres: [28, 878, 53] },
        { movieId: 155, title: "The Dark Knight", rating: 9, watchedAt: "2024-02-01", genres: [28, 80, 18] },
        { movieId: 680, title: "Pulp Fiction", rating: 8, watchedAt: "2024-02-10", genres: [53, 80] },
        { movieId: 424, title: "Schindler's List", rating: 9, watchedAt: "2024-02-15", genres: [18, 36, 10752] },
        { movieId: 13, title: "Forrest Gump", rating: 7, watchedAt: "2024-02-20", genres: [35, 18, 10749] },
        { movieId: 769, title: "GoodFellas", rating: 8, watchedAt: "2024-03-01", genres: [18, 80] },
        { movieId: 550, title: "Fight Club", rating: 10, watchedAt: "2024-03-05", genres: [18] },
        { movieId: 603, title: "The Matrix", rating: 9, watchedAt: "2024-03-10", genres: [28, 878] },
        { movieId: 122, title: "The Lord of the Rings: The Return of the King", rating: 8, watchedAt: "2024-03-15", genres: [12, 14, 28] },
      ],
    },
  },
  {
    id: "sarah",
    name: "Sarah",
    profile: {
      preferences: {
        favoriteGenres: [10749, 35, 18],
        notes: "Romance, Comedy, Drama",
      },
      watchHistory: [
        { movieId: 11036, title: "The Notebook", rating: 10, watchedAt: "2024-01-10", genres: [10749, 18] },
        { movieId: 455207, title: "Crazy Rich Asians", rating: 9, watchedAt: "2024-01-18", genres: [35, 18, 10749] },
        { movieId: 4951, title: "10 Things I Hate About You", rating: 9, watchedAt: "2024-01-25", genres: [35, 18, 10749] },
        { movieId: 114, title: "Pretty Woman", rating: 8, watchedAt: "2024-02-05", genres: [35, 10749] },
        { movieId: 639, title: "When Harry Met Sally...", rating: 9, watchedAt: "2024-02-12", genres: [35, 18, 10749] },
        { movieId: 634, title: "Bridget Jones's Diary", rating: 8, watchedAt: "2024-02-20", genres: [35, 18, 10749] },
        { movieId: 313369, title: "La La Land", rating: 10, watchedAt: "2024-03-01", genres: [35, 18, 10402, 10749] },
        { movieId: 10625, title: "Mean Girls", rating: 7, watchedAt: "2024-03-08", genres: [35] },
        { movieId: 18240, title: "The Proposal", rating: 7, watchedAt: "2024-03-12", genres: [35, 18, 10749] },
        { movieId: 508, title: "Love Actually", rating: 8, watchedAt: "2024-03-18", genres: [35, 18, 10749] },
      ],
    },
  },
];

// ── State ─────────────────────────────────────────────────────────────────

let _cachedProfile: UserProfile | null = null;
let _activeUserId: string = "default";
const STORAGE_KEY_PREFIX = "flickpix_user_profile_v1";

function storageKey(): string {
  return `${STORAGE_KEY_PREFIX}_${_activeUserId}`;
}

/**
 * Get list of available users (for the switcher dropdown).
 */
export function getAvailableUsers(): { id: string; name: string }[] {
  return USER_PROFILES.map((u) => ({ id: u.id, name: u.name }));
}

/**
 * Get the currently active user ID.
 */
export function getActiveUserId(): string {
  return _activeUserId;
}

/**
 * Switch to a different user. Clears cache so next getUserProfile()
 * returns the new user's data.
 */
export function setActiveUser(userId: string): void {
  const found = USER_PROFILES.find((u) => u.id === userId);
  if (!found) {
    throw new Error(`Unknown user ID: ${userId}`);
  }
  _activeUserId = userId;
  _cachedProfile = null;
}

function getDefaultProfileForActiveUser(): UserProfile {
  const entry = USER_PROFILES.find((u) => u.id === _activeUserId);
  return JSON.parse(JSON.stringify(entry?.profile ?? USER_PROFILES[0].profile)) as UserProfile;
}

type AsyncStorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

let _asyncStorage: AsyncStorageLike | null | undefined;

function cloneDefaultProfile(): UserProfile {
  return getDefaultProfileForActiveUser();
}

function isNodeRuntime(): boolean {
  return typeof process !== "undefined" && !!process.versions?.node;
}

async function getAsyncStorage(): Promise<AsyncStorageLike | null> {
  if (_asyncStorage !== undefined) {
    return _asyncStorage;
  }

  try {
    const module = await import("@react-native-async-storage/async-storage");
    _asyncStorage = module.default;
  } catch {
    _asyncStorage = null;
  }

  return _asyncStorage;
}

async function readFromPersistentStorage(): Promise<UserProfile | null> {
  if (isNodeRuntime()) {
    return null;
  }

  if (typeof window !== "undefined" && window.localStorage) {
    const raw = window.localStorage.getItem(storageKey());
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  }

  const asyncStorage = await getAsyncStorage();
  if (!asyncStorage) {
    return null;
  }

  const raw = await asyncStorage.getItem(storageKey());
  return raw ? (JSON.parse(raw) as UserProfile) : null;
}

async function writeToPersistentStorage(profile: UserProfile): Promise<void> {
  if (isNodeRuntime()) {
    return;
  }

  const serialized = JSON.stringify(profile);

  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(storageKey(), serialized);
    return;
  }

  const asyncStorage = await getAsyncStorage();
  if (asyncStorage) {
    await asyncStorage.setItem(storageKey(), serialized);
  }
}

/**
 * Load user profile from storage.
 * In Node: reads from data/user-profile.json.
 * In React Native: would read from AsyncStorage.
 */
export async function getUserProfile(): Promise<UserProfile> {
  if (_cachedProfile) return _cachedProfile;

  // Node environment (testing/scripts) — use built-in profiles
  if (isNodeRuntime()) {
    _cachedProfile = cloneDefaultProfile();
    return _cachedProfile;
  }

  // React Native / web environment
  const persisted = await readFromPersistentStorage();
  if (persisted) {
    _cachedProfile = persisted;
    return _cachedProfile;
  }

  _cachedProfile = cloneDefaultProfile();
  await writeToPersistentStorage(_cachedProfile);
  return _cachedProfile;
}

/**
 * Get just the watch history.
 */
export async function getWatchHistory(): Promise<WatchedMovie[]> {
  const profile = await getUserProfile();
  return profile.watchHistory;
}

/**
 * Get user's ratings as a map: movieId → rating.
 */
export async function getRatings(): Promise<Record<number, number>> {
  const history = await getWatchHistory();
  const ratings: Record<number, number> = {};
  for (const item of history) {
    ratings[item.movieId] = item.rating;
  }
  return ratings;
}

/**
 * Get list of watched movie IDs (to filter out from recommendations).
 */
export async function getWatchedMovieIds(): Promise<number[]> {
  const history = await getWatchHistory();
  return history.map((item) => item.movieId);
}

/**
 * Get user preferences.
 */
export async function getPreferences(): Promise<UserPreferences> {
  const profile = await getUserProfile();
  return profile.preferences;
}

/**
 * Add a movie to watch history (frontend will call this after user marks as watched).
 * In production, would persist to AsyncStorage.
 */
export async function addToWatchHistory(movie: WatchedMovie): Promise<void> {
  const profile = await getUserProfile();
  profile.watchHistory.push(movie);
  _cachedProfile = profile;

  await writeToPersistentStorage(profile);
}

/**
 * Update a movie's rating.
 */
export async function updateRating(movieId: number, rating: number): Promise<void> {
  const profile = await getUserProfile();
  const existing = profile.watchHistory.find((m) => m.movieId === movieId);
  if (existing) {
    existing.rating = rating;
  }
  _cachedProfile = profile;

  await writeToPersistentStorage(profile);
}

/**
 * Clear cache (useful for testing).
 */
export function clearCache(): void {
  _cachedProfile = null;
}
