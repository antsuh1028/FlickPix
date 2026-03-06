/**
 * GPT-powered mood → movie recommendation service.
 *
 * Takes free-form user text (mood, vibe, constraints) and uses OpenAI
 * to translate it into TMDB discover filters, then returns ranked results.
 */

import * as tmdb from "./tmdb.ts";
import type { DiscoverOptions } from "./tmdb.ts";
import { getWatchedMovieIds } from "./storage.ts";
import type { Recommendation } from "./recommendations.ts";

// ── Types ──────────────────────────────────────────────────────────────────

export interface MoodFilters {
  with_genres?: string;
  without_genres?: string;
  sort_by?: string;
  "vote_average.gte"?: number;
  "vote_count.gte"?: number;
  with_runtime_lte?: number;
  with_runtime_gte?: number;
  primary_release_year?: number;
  "primary_release_date.gte"?: string;
  "primary_release_date.lte"?: string;
  with_original_language?: string;
  with_origin_country?: string;
  with_keywords?: string;
  without_keywords?: string;
  certification?: string;
  certification_country?: string;
  explanation?: string;
}

// ── OpenAI Call ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert movie recommendation assistant. The user describes their mood, vibe, or what they want to watch. Translate that into TMDB Discover API filters as JSON.

═══ CRITICAL RULES ═══
1. GENRE + COUNTRY/LANGUAGE is usually enough. Don't over-filter.
2. KEYWORDS: use pipe | for OR (any match), comma , for AND (all must match). Prefer | for broader results. ONLY use keywords for English-language/mainstream films — TMDB keyword tagging is sparse on foreign films and will return 0 results.
3. For NON-ENGLISH / FOREIGN films: rely on with_genres + with_original_language (single language) OR with_origin_country. Do NOT add with_keywords.
4. For MULTI-COUNTRY queries (e.g. "Asian"): use with_origin_country with pipe separator (e.g. "JP|KR|TH"). Do NOT combine with keywords.
5. vote_count.gte: use 10-30 for foreign/niche, 50-100 for moderate, 200+ for mainstream English.
6. with_genres uses comma for AND. Use only 1-2 genres max to avoid over-filtering.

═══ GENRE IDs ═══
28=Action, 12=Adventure, 16=Animation, 35=Comedy, 80=Crime, 99=Documentary, 18=Drama, 10751=Family, 14=Fantasy, 36=History, 27=Horror, 10402=Music, 9648=Mystery, 10749=Romance, 878=Sci-Fi, 10770=TV Movie, 53=Thriller, 10752=War, 37=Western

═══ LANGUAGE CODES (ISO 639-1) ═══
en=English, ja=Japanese, ko=Korean, zh=Chinese, hi=Hindi, fr=French, es=Spanish, de=German, it=Italian, pt=Portuguese, th=Thai, tl=Filipino, id=Indonesian, tr=Turkish, ar=Arabic, ru=Russian, sv=Swedish, da=Danish

═══ COUNTRY CODES (pipe-separated for OR) ═══
US, GB, JP, KR, CN, HK, TW, IN, FR, DE, IT, ES, MX, BR, TH, PH, ID, TR, SE, DK, NO, AU, NZ, CA

═══ KEYWORD IDs (English/mainstream films ONLY) ═══
818=based on novel, 9715=superhero, 9717=robot, 9672=based on true story
6054=supernatural, 3133=ghost, 10224=haunted house, 12332=zombie, 162846=possession
10084=serial killer, 11479=psychopath, 207317=home invasion, 4565=dystopia, 14760=slasher
2964=future, 4379=time travel, 310=artificial intelligence
2104=revenge, 5340=heist, 10683=coming of age, 5565=biography
178406=found footage, 234213=folk horror, 316232=slow burn
6152=survival, 1826=wilderness

═══ JSON FIELDS (all optional) ═══
- "with_genres": comma-separated genre IDs (AND logic — use 1-2 max)
- "without_genres": comma-separated genre IDs to exclude
- "with_original_language": single language code (e.g. "ja") — best for single-language queries
- "with_origin_country": pipe-separated countries for OR (e.g. "JP|KR|TH") — best for regional queries
- "with_keywords": pipe-separated keyword IDs for OR, comma for AND. ONLY for English/mainstream films!
- "without_keywords": keyword IDs to exclude
- "sort_by": "popularity.desc" | "vote_average.desc" | "primary_release_date.desc"
- "vote_average.gte": minimum rating (number)
- "vote_count.gte": minimum votes (number — lower for foreign films!)
- "with_runtime_lte" / "with_runtime_gte": runtime in minutes
- "primary_release_year": exact year
- "primary_release_date.gte" / "primary_release_date.lte": "YYYY-MM-DD" for era filtering
- "certification": "R", "PG-13", "PG" (pair with certification_country)
- "certification_country": "US"
- "explanation": one sentence (REQUIRED)

═══ EXAMPLES ═══

User: "asian horror"
{"with_genres":"27","with_origin_country":"JP|KR|TH|HK|CN","sort_by":"vote_average.desc","vote_average.gte":6.0,"vote_count.gte":20,"explanation":"Horror films from Japan, Korea, Thailand, Hong Kong, and China"}

User: "japanese horror"
{"with_genres":"27","with_original_language":"ja","sort_by":"vote_average.desc","vote_average.gte":6.0,"vote_count.gte":20,"explanation":"Japanese-language horror films"}

User: "something light and funny"
{"with_genres":"35","sort_by":"popularity.desc","vote_average.gte":6.5,"vote_count.gte":200,"explanation":"Popular, well-rated comedies"}

User: "intense thriller, no horror, under 2 hours"
{"with_genres":"53","without_genres":"27","with_runtime_lte":120,"sort_by":"vote_average.desc","vote_average.gte":7.0,"vote_count.gte":200,"explanation":"High-rated thrillers under 2 hours, no horror"}

User: "classic 80s action like rambo"
{"with_genres":"28","primary_release_date.gte":"1980-01-01","primary_release_date.lte":"1989-12-31","with_original_language":"en","sort_by":"popularity.desc","vote_average.gte":6.0,"vote_count.gte":100,"explanation":"English-language 1980s action films"}

User: "creepy slow burn horror, nothing gory"
{"with_genres":"27","without_keywords":"14760","with_keywords":"316232|6054","sort_by":"vote_average.desc","vote_average.gte":6.5,"vote_count.gte":50,"explanation":"Atmospheric slow-burn horror excluding slashers"}

User: "korean revenge movie"
{"with_genres":"53","with_original_language":"ko","sort_by":"vote_average.desc","vote_average.gte":7.0,"vote_count.gte":30,"explanation":"Korean-language revenge thrillers like Oldboy"}

User: "feel-good movie for the whole family"
{"with_genres":"10751","without_genres":"27,53","certification":"PG","certification_country":"US","sort_by":"popularity.desc","vote_average.gte":6.5,"vote_count.gte":200,"explanation":"Family-friendly PG movies"}

User: "mind-bending sci-fi like inception"
{"with_genres":"878","with_keywords":"4379|310","sort_by":"vote_average.desc","vote_average.gte":7.0,"vote_count.gte":200,"explanation":"High-concept sci-fi with time travel or reality-bending themes"}

User: "something based on a true story"
{"with_genres":"18","with_keywords":"9672","sort_by":"vote_average.desc","vote_average.gte":7.5,"vote_count.gte":100,"explanation":"True-story dramas with high ratings"}

User: "bollywood romance"
{"with_genres":"10749","with_original_language":"hi","sort_by":"popularity.desc","vote_average.gte":6.0,"vote_count.gte":20,"explanation":"Hindi-language romance films"}

User: "scary haunted house movie"
{"with_genres":"27","with_keywords":"10224|3133","with_original_language":"en","sort_by":"vote_average.desc","vote_average.gte":6.0,"vote_count.gte":100,"explanation":"English-language haunted house and ghost horror films"}`;

let _openaiKey: string | null = null;

export function setOpenAIKey(key: string) {
  _openaiKey = key;
}

function getOpenAIKey(): string {
  if (_openaiKey) return _openaiKey;
  const envKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (envKey) {
    _openaiKey = envKey;
    return envKey;
  }
  throw new Error("OpenAI API key not set. Add EXPO_PUBLIC_OPENAI_API_KEY to .env");
}

async function callOpenAI(userText: string): Promise<MoodFilters> {
  const apiKey = getOpenAIKey();

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 300,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userText },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? "{}";

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("GPT did not return valid JSON");
  }

  return JSON.parse(jsonMatch[0]) as MoodFilters;
}

// ── Public API ─────────────────────────────────────────────────────────────

export interface MoodSearchResult {
  recommendations: Recommendation[];
  moodExplanation: string;
  filters: MoodFilters;
}

function buildDiscoverOptions(filters: MoodFilters, page: number): DiscoverOptions {
  const opts: DiscoverOptions = {
    sort_by: filters.sort_by || "popularity.desc",
    "vote_average.gte": filters["vote_average.gte"] ?? 6.5,
    "vote_count.gte": filters["vote_count.gte"] ?? 100,
    page,
  };

  const passthrough: (keyof MoodFilters)[] = [
    "with_genres", "without_genres",
    "with_runtime_lte", "with_runtime_gte",
    "primary_release_year",
    "primary_release_date.gte", "primary_release_date.lte",
    "with_original_language", "with_origin_country",
    "with_keywords", "without_keywords",
    "certification", "certification_country",
  ];

  for (const key of passthrough) {
    const val = filters[key];
    if (val !== undefined && val !== null) {
      (opts as Record<string, unknown>)[key] = val;
    }
  }

  return opts;
}

async function fetchPage(
  filters: MoodFilters,
  explanation: string,
  page: number,
  limit: number
): Promise<Recommendation[]> {
  const [response, watchedIds, genres] = await Promise.all([
    tmdb.discoverMovies(buildDiscoverOptions(filters, page)),
    getWatchedMovieIds(),
    tmdb.getGenres(),
  ]);

  const genreMap: Record<number, string> = {};
  for (const g of genres) genreMap[g.id] = g.name;

  const unwatched = response.results.filter((m) => !watchedIds.includes(m.id));

  return unwatched.slice(0, limit).map((movie) => {
    const movieGenres = movie.genre_ids
      .map((id) => genreMap[id])
      .filter(Boolean)
      .slice(0, 2);

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
      reason: movieGenres.length > 0
        ? `${explanation} — ${movieGenres.join(", ")}`
        : explanation,
    };
  });
}

/**
 * Initial mood search — calls GPT to parse the mood, then fetches page 1.
 * Returns the parsed filters so subsequent pages can skip the GPT call.
 */
export async function getMoodRecommendations(
  moodText: string,
  limit = 10
): Promise<MoodSearchResult> {
  const rawFilters = await callOpenAI(moodText);
  const explanation = rawFilters.explanation || "Based on your mood";
  const filters = { ...rawFilters };
  delete filters.explanation;

  const recommendations = await fetchPage(filters, explanation, 1, limit);
  return { recommendations, moodExplanation: explanation, filters };
}

/**
 * Fetch a specific page using cached GPT filters (no OpenAI call).
 */
export async function getMoodPage(
  filters: MoodFilters,
  explanation: string,
  page: number,
  limit = 10
): Promise<Recommendation[]> {
  return fetchPage(filters, explanation, page, limit);
}
