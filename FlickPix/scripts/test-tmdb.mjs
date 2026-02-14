#!/usr/bin/env node

/**
 * Quick TMDB API test script.
 *
 * Usage:
 *   node scripts/test-tmdb.mjs
 *
 * Reads TMDB_API_KEY from .env in the project root.
 * No extra dependencies needed — uses Node 20+ built-in fetch.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── Load .env manually (zero deps) ────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env");

let API_KEY;
try {
  const envContent = readFileSync(envPath, "utf-8");
  const match = envContent.match(/^TMDB_API_KEY=(.+)$/m);
  if (match) API_KEY = match[1].trim();
} catch {
  // .env not found
}

if (!API_KEY || API_KEY === "YOUR_KEY_HERE") {
  console.error("❌  Set your TMDB_API_KEY in .env first!");
  console.error(`   File: ${envPath}`);
  process.exit(1);
}

const BASE = "https://api.themoviedb.org/3";

async function tmdb(path, params = {}) {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("api_key", API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDB ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// ── Helpers ────────────────────────────────────────────────────────────────

function divider(title) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"═".repeat(60)}`);
}

function movieLine(m, genreMap) {
  const year = m.release_date?.slice(0, 4) || "????";
  const rating = m.vote_average?.toFixed(1) ?? "N/A";
  const genres = (m.genre_ids || [])
    .map((id) => genreMap[id] || `#${id}`)
    .join(", ");
  return `  [${m.id}] ${m.title} (${year})  ★ ${rating}  |  ${genres}`;
}

// ── Tests ──────────────────────────────────────────────────────────────────

async function run() {
  console.log("🎬  TMDB API Test — FlickPix\n");

  // 1. Genres
  divider("1. ALL MOVIE GENRES");
  const { genres } = await tmdb("/genre/movie/list");
  const genreMap = {};
  for (const g of genres) {
    genreMap[g.id] = g.name;
    console.log(`  ${g.id.toString().padStart(6)}  ${g.name}`);
  }
  console.log(`\n  Total genres: ${genres.length}`);

  // 2. Popular movies
  divider("2. POPULAR MOVIES (page 1)");
  const popular = await tmdb("/movie/popular");
  for (const m of popular.results.slice(0, 10)) {
    console.log(movieLine(m, genreMap));
  }
  console.log(`  ... showing 10 of ${popular.total_results} total`);

  // 3. Search
  divider("3. SEARCH: \"inception\"");
  const search = await tmdb("/search/movie", { query: "inception" });
  for (const m of search.results.slice(0, 5)) {
    console.log(movieLine(m, genreMap));
  }

  // 4. Movie details (Inception, id 27205)
  divider("4. MOVIE DETAILS: Inception (27205)");
  const details = await tmdb("/movie/27205");
  console.log(`  Title:    ${details.title}`);
  console.log(`  Tagline:  ${details.tagline}`);
  console.log(`  Runtime:  ${details.runtime} min`);
  console.log(`  Rating:   ${details.vote_average} (${details.vote_count} votes)`);
  console.log(`  Genres:   ${details.genres.map((g) => g.name).join(", ")}`);
  console.log(`  Released: ${details.release_date}`);
  console.log(`  Overview: ${details.overview.slice(0, 120)}...`);
  console.log(`  Poster:   https://image.tmdb.org/t/p/w500${details.poster_path}`);

  // 5. Credits
  divider("5. CREDITS: Inception (27205)");
  const credits = await tmdb("/movie/27205/credits");
  console.log("  Top cast:");
  for (const c of credits.cast.slice(0, 5)) {
    console.log(`    ${c.name} as ${c.character}`);
  }
  const director = credits.crew.find((c) => c.job === "Director");
  if (director) console.log(`  Director: ${director.name}`);

  // 6. Discover: Action movies rated 7+
  divider("6. DISCOVER: Action movies rated 7+");
  const actionGenre = genres.find((g) => g.name === "Action");
  if (actionGenre) {
    const discover = await tmdb("/discover/movie", {
      with_genres: actionGenre.id,
      sort_by: "vote_average.desc",
      "vote_count.gte": 1000,
      "vote_average.gte": 7,
    });
    for (const m of discover.results.slice(0, 8)) {
      console.log(movieLine(m, genreMap));
    }
    console.log(`  ... ${discover.total_results} total action movies rated 7+`);
  }

  // 7. Similar + Recommendations
  divider("7. SIMILAR & RECOMMENDATIONS for Inception");
  const similar = await tmdb("/movie/27205/similar");
  console.log("  Similar:");
  for (const m of similar.results.slice(0, 5)) {
    console.log(movieLine(m, genreMap));
  }
  const recs = await tmdb("/movie/27205/recommendations");
  console.log("  Recommendations:");
  for (const m of recs.results.slice(0, 5)) {
    console.log(movieLine(m, genreMap));
  }

  // 8. Trending this week
  divider("8. TRENDING THIS WEEK");
  const trending = await tmdb("/trending/movie/week");
  for (const m of trending.results.slice(0, 8)) {
    console.log(movieLine(m, genreMap));
  }

  divider("DONE — All endpoints working!");
  console.log("  Your API key is valid and TMDB is responding.\n");
}

run().catch((err) => {
  console.error("❌  Error:", err.message);
  process.exit(1);
});
