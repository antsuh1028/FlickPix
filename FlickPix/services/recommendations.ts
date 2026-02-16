/**
 * Movie recommendation engine for FlickPix.
 *
 * Frontend integration:
 *   import { getRecommendations } from '@/services/recommendations';
 *   const recs = await getRecommendations({ limit: 10 });
 *   // Display recs in UI
 */

import * as tmdb from "./tmdb.ts";
import { getPreferences, getWatchedMovieIds, getRatings, getWatchHistory } from "./storage.ts";

// ── Types ──────────────────────────────────────────────────────────────────

export interface Recommendation {
  id: number;
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  voteCount: number;
  releaseDate: string;
  genreIds: number[];
  reason: string;  // Why this was recommended
}

export interface RecommendationOptions {
  limit?: number;           // How many to return (default: 10)
  minRating?: number;       // Minimum TMDB vote_average (default: 6.5)
  minVoteCount?: number;    // Minimum vote count for quality (default: 100)
}

// ── Recommendation Engine ──────────────────────────────────────────────────

/**
 * Main recommendation function. Call this from the UI.
 *
 * Algorithm:
 * 1. Load user's watch history and preferences
 * 2. Identify favorite genres (from highly-rated movies + explicit prefs)
 * 3. Get candidates from TMDB discover (filtered by genres)
 * 4. Filter out already-watched movies
 * 5. Score and rank by relevance + TMDB rating
 * 6. Return top N with explanations
 */
export async function getRecommendations(
  options: RecommendationOptions = {}
): Promise<Recommendation[]> {
  const {
    limit = 10,
    minRating = 6.5,
    minVoteCount = 100,
  } = options;

  // Load user data
  const preferences = await getPreferences();
  const watchedIds = await getWatchedMovieIds();
  const ratings = await getRatings();
  const watchHistory = await getWatchHistory();

  // Derive favorite genres from user's highly-rated movies (8+)
  const highlyRated = watchHistory.filter((m) => m.rating >= 8);
  const genreCounts: Record<number, number> = {};
  for (const movie of highlyRated) {
    for (const genreId of movie.genres) {
      genreCounts[genreId] = (genreCounts[genreId] || 0) + 1;
    }
  }
  
  // Merge with explicit preferences
  for (const genreId of preferences.favoriteGenres) {
    genreCounts[genreId] = (genreCounts[genreId] || 0) + 5; // Boost explicit prefs
  }

  // Top 3 genres
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => parseInt(id));

  if (topGenres.length === 0) {
    // No preferences, return popular movies as fallback
    return await getPopularFallback(watchedIds, limit);
  }

  // Get candidates from TMDB discover
  const genreStr = topGenres.join(",");
  const response = await tmdb.discoverMovies({
    with_genres: genreStr,
    sort_by: "vote_average.desc",
    "vote_average.gte": minRating,
    "vote_count.gte": minVoteCount,
    page: 1,
  });

  // Also get page 2 for more variety
  const response2 = await tmdb.discoverMovies({
    with_genres: genreStr,
    sort_by: "popularity.desc",
    "vote_average.gte": minRating,
    "vote_count.gte": minVoteCount,
    page: 2,
  });

  const allCandidates = [...response.results, ...response2.results];

  // Filter out watched
  const unwatched = allCandidates.filter((m) => !watchedIds.includes(m.id));

  // Remove duplicates by ID
  const uniqueMap = new Map<number, tmdb.MovieSummary>();
  for (const movie of unwatched) {
    if (!uniqueMap.has(movie.id)) {
      uniqueMap.set(movie.id, movie);
    }
  }
  const unique = Array.from(uniqueMap.values());

  // Score each candidate
  const scored = unique.map((movie) => {
    let score = movie.vote_average; // Base score from TMDB rating

    // Boost if genres match user's highly-rated movies
    const genreOverlap = movie.genre_ids.filter((g) => topGenres.includes(g)).length;
    score += genreOverlap * 0.5;

    // Boost by popularity (log scale to avoid huge numbers)
    score += Math.log10(movie.popularity + 1) * 0.1;

    return { movie, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Take top N
  const topN = scored.slice(0, limit);

  // Load genre names for reasons
  const genres = await tmdb.getGenres();
  const genreMap: Record<number, string> = {};
  for (const g of genres) {
    genreMap[g.id] = g.name;
  }

  // Format as Recommendation objects with reasons
  return topN.map(({ movie }) => {
    const matchedGenres = movie.genre_ids
      .filter((g) => topGenres.includes(g))
      .map((g) => genreMap[g])
      .slice(0, 2);

    const reason =
      matchedGenres.length > 0
        ? `Matches your favorite genres: ${matchedGenres.join(", ")}`
        : `Highly rated ${genreMap[movie.genre_ids[0]] || "movie"}`;

    return {
      id: movie.id,
      title: movie.title,
      overview: movie.overview,
      posterPath: movie.poster_path,
      backdropPath: movie.backdrop_path,
      voteAverage: movie.vote_average,
      voteCount: movie.vote_count,
      releaseDate: movie.release_date,
      genreIds: movie.genre_ids,
      reason,
    };
  });
}

/**
 * Fallback: return popular movies if user has no preferences.
 */
async function getPopularFallback(
  watchedIds: number[],
  limit: number
): Promise<Recommendation[]> {
  const response = await tmdb.getPopularMovies();
  const unwatched = response.results.filter((m) => !watchedIds.includes(m.id));
  const top = unwatched.slice(0, limit);

  return top.map((movie) => ({
    id: movie.id,
    title: movie.title,
    overview: movie.overview,
    posterPath: movie.poster_path,
    backdropPath: movie.backdrop_path,
    voteAverage: movie.vote_average,
    voteCount: movie.vote_count,
    releaseDate: movie.release_date,
    genreIds: movie.genre_ids,
    reason: "Popular right now",
  }));
}

/**
 * Helper: Get poster URL (re-export from tmdb for convenience).
 */
export function getPosterUrl(path: string | null, size: tmdb.PosterSize = "w500"): string | null {
  return tmdb.posterUrl(path, size);
}

/**
 * Helper: Get backdrop URL.
 */
export function getBackdropUrl(path: string | null, size: tmdb.BackdropSize = "w780"): string | null {
  return tmdb.backdropUrl(path, size);
}
