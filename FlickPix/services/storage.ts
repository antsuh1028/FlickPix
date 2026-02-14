/**
 * Local storage layer for user data.
 *
 * For now, reads from a JSON file. In production React Native app,
 * this would use AsyncStorage or similar.
 *
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

// ── In-memory cache (for frontend use) ────────────────────────────────────

let _cachedProfile: UserProfile | null = null;

/**
 * Load user profile from storage.
 * In Node: reads from data/user-profile.json.
 * In React Native: would read from AsyncStorage.
 */
export async function getUserProfile(): Promise<UserProfile> {
  if (_cachedProfile) return _cachedProfile;

  // Node environment (testing/scripts)
  if (typeof window === "undefined") {
    const { readFileSync } = await import("fs");
    const { resolve, dirname } = await import("path");
    const { fileURLToPath } = await import("url");
    
    // Resolve path relative to this file
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const profilePath = resolve(__dirname, "..", "data", "user-profile.json");
    const data = readFileSync(profilePath, "utf-8");
    _cachedProfile = JSON.parse(data);
    return _cachedProfile!;
  }

  // React Native / web environment
  // TODO: Replace with AsyncStorage.getItem('user_profile') or localStorage
  throw new Error("getUserProfile: Not implemented for browser/RN yet. Use AsyncStorage.");
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
  
  // TODO: Persist to AsyncStorage in React Native
  // await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
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
  
  // TODO: Persist to AsyncStorage
}

/**
 * Clear cache (useful for testing).
 */
export function clearCache(): void {
  _cachedProfile = null;
}
