#!/usr/bin/env node

/**
 * Test the recommendation engine.
 *
 * Usage:
 *   npm run test:recs
 *   or: node scripts/test-recommendations.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env");

// Load API key
let API_KEY;
try {
  const envContent = readFileSync(envPath, "utf-8");
  const match = envContent.match(/^TMDB_API_KEY=(.+)$/m);
  if (match) API_KEY = match[1].trim();
} catch {}

if (!API_KEY || API_KEY === "YOUR_KEY_HERE") {
  console.error("❌  Set TMDB_API_KEY in .env first.");
  process.exit(1);
}

// Set API key for tmdb service
const tmdbModule = await import("../services/tmdb.ts");
tmdbModule.setApiKey(API_KEY);

// Import recommendation service
const { getRecommendations, getPosterUrl } = await import("../services/recommendations.ts");
const { getUserProfile } = await import("../services/storage.ts");

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("🎬  FlickPix Recommendation Test\n");

  // Show user profile
  console.log("═".repeat(60));
  console.log("  USER PROFILE");
  console.log("═".repeat(60));

  const profile = await getUserProfile();
  console.log(`  Watch history: ${profile.watchHistory.length} movies`);
  console.log(`  Favorite genres: ${profile.preferences.favoriteGenres.join(", ")}`);
  console.log("\n  Recently watched:");
  
  const genres = await tmdbModule.getGenres();
  const genreMap = {};
  for (const g of genres) genreMap[g.id] = g.name;

  for (const movie of profile.watchHistory.slice(0, 5)) {
    const genreNames = movie.genres.map((id) => genreMap[id] || `#${id}`).join(", ");
    console.log(`    • ${movie.title} — rated ${movie.rating}/10 (${genreNames})`);
  }
  if (profile.watchHistory.length > 5) {
    console.log(`    ... and ${profile.watchHistory.length - 5} more`);
  }

  // Get recommendations
  console.log("\n" + "═".repeat(60));
  console.log("  GENERATING RECOMMENDATIONS...");
  console.log("═".repeat(60));

  const startTime = Date.now();
  const recs = await getRecommendations({ limit: 10 });
  const elapsed = Date.now() - startTime;

  console.log(`  Found ${recs.length} recommendations in ${elapsed}ms\n`);

  // Display each recommendation
  for (let i = 0; i < recs.length; i++) {
    const rec = recs[i];
    const year = rec.releaseDate?.slice(0, 4) || "????";
    const genreNames = rec.genreIds.map((id) => genreMap[id] || `#${id}`).slice(0, 3).join(", ");
    
    console.log(`${(i + 1).toString().padStart(2)}. ${rec.title} (${year})`);
    console.log(`    ★ ${rec.voteAverage.toFixed(1)}  |  ${genreNames}`);
    console.log(`    Why: ${rec.reason}`);
    console.log(`    Poster: ${getPosterUrl(rec.posterPath)}`);
    console.log(`    Overview: ${rec.overview.slice(0, 100)}...`);
    console.log();
  }

  console.log("═".repeat(60));
  console.log("  FRONTEND INTEGRATION");
  console.log("═".repeat(60));
  console.log(`
  In your React component:

  import { getRecommendations, getPosterUrl } from '@/services/recommendations';

  const MyComponent = () => {
    const [recs, setRecs] = useState([]);

    useEffect(() => {
      async function load() {
        const results = await getRecommendations({ limit: 10 });
        setRecs(results);
      }
      load();
    }, []);

    return (
      <View>
        {recs.map(rec => (
          <View key={rec.id}>
            <Image source={{ uri: getPosterUrl(rec.posterPath) }} />
            <Text>{rec.title}</Text>
            <Text>{rec.reason}</Text>
          </View>
        ))}
      </View>
    );
  };
  `);

  console.log("\n✅  Done! Recommendations are ready for the UI.\n");
}

main().catch((err) => {
  console.error("❌  Error:", err);
  process.exit(1);
});
