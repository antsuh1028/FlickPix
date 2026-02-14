/**
 * TMDB API Service Module
 *
 * Wraps The Movie Database (TMDB) API v3 endpoints.
 * Used by the recommendation engine and UI to fetch movie data.
 *
 * Docs: https://developer.themoviedb.org/reference/intro/getting-started
 */

const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";

// ── Types ──────────────────────────────────────────────────────────────────

export interface Genre {
  id: number;
  name: string;
}

export interface MovieSummary {
  id: number;
  title: string;
  overview: string;
  genre_ids: number[];
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  poster_path: string | null;
  backdrop_path: string | null;
  original_language: string;
  adult: boolean;
}

export interface MovieDetails extends Omit<MovieSummary, "genre_ids"> {
  genres: Genre[];
  runtime: number | null;
  tagline: string;
  budget: number;
  revenue: number;
  status: string;
  production_companies: { id: number; name: string; logo_path: string | null; origin_country: string }[];
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface Credits {
  cast: CastMember[];
  crew: CrewMember[];
}

export interface DiscoverOptions {
  with_genres?: string;       // comma-separated genre IDs
  sort_by?: string;           // e.g. "popularity.desc", "vote_average.desc"
  primary_release_year?: number;
  "vote_average.gte"?: number;
  "vote_average.lte"?: number;
  "vote_count.gte"?: number;
  with_runtime_gte?: number;  // minutes
  with_runtime_lte?: number;  // minutes
  page?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

let _apiKey: string | null = null;

/**
 * Set the API key at runtime. Call this once on app startup.
 */
export function setApiKey(key: string) {
  _apiKey = key;
}

function getApiKey(): string {
  if (!_apiKey) {
    throw new Error(
      "TMDB API key not set. Call setApiKey() or pass it to the test script."
    );
  }
  return _apiKey;
}

async function tmdbFetch<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("api_key", getApiKey());
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TMDB ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ── Image URLs ─────────────────────────────────────────────────────────────

export type PosterSize = "w92" | "w154" | "w185" | "w342" | "w500" | "w780" | "original";
export type BackdropSize = "w300" | "w780" | "w1280" | "original";

export function posterUrl(path: string | null, size: PosterSize = "w500"): string | null {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

export function backdropUrl(path: string | null, size: BackdropSize = "w780"): string | null {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

// ── API Methods ────────────────────────────────────────────────────────────

/** Get the full list of movie genres (id → name mapping). */
export async function getGenres(): Promise<Genre[]> {
  const data = await tmdbFetch<{ genres: Genre[] }>("/genre/movie/list");
  return data.genres;
}

/** Search movies by title. */
export async function searchMovies(query: string, page = 1): Promise<{ results: MovieSummary[]; total_results: number; total_pages: number }> {
  return tmdbFetch("/search/movie", { query, page });
}

/** Get full details for a single movie. */
export async function getMovieDetails(movieId: number): Promise<MovieDetails> {
  return tmdbFetch(`/movie/${movieId}`);
}

/** Get cast & crew for a movie. */
export async function getMovieCredits(movieId: number): Promise<Credits> {
  return tmdbFetch(`/movie/${movieId}/credits`);
}

/** Get movies similar to a given movie (TMDB's similarity). */
export async function getSimilarMovies(movieId: number, page = 1): Promise<{ results: MovieSummary[]; total_results: number }> {
  return tmdbFetch(`/movie/${movieId}/similar`, { page });
}

/** Get TMDB's own recommendations based on a movie. */
export async function getRecommendations(movieId: number, page = 1): Promise<{ results: MovieSummary[]; total_results: number }> {
  return tmdbFetch(`/movie/${movieId}/recommendations`, { page });
}

/** Discover movies with filters (genre, rating, year, runtime, etc.). */
export async function discoverMovies(options: DiscoverOptions = {}): Promise<{ results: MovieSummary[]; total_results: number; total_pages: number }> {
  const params: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined && value !== null) {
      params[key] = value;
    }
  }
  return tmdbFetch("/discover/movie", params);
}

/** Get currently popular movies. */
export async function getPopularMovies(page = 1): Promise<{ results: MovieSummary[]; total_results: number }> {
  return tmdbFetch("/movie/popular", { page });
}

/** Get top-rated movies of all time. */
export async function getTopRatedMovies(page = 1): Promise<{ results: MovieSummary[]; total_results: number }> {
  return tmdbFetch("/movie/top_rated", { page });
}

/** Get trending movies (time_window: "day" or "week"). */
export async function getTrendingMovies(timeWindow: "day" | "week" = "week"): Promise<{ results: MovieSummary[] }> {
  return tmdbFetch(`/trending/movie/${timeWindow}`);
}
