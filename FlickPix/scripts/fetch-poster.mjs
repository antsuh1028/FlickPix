#!/usr/bin/env node

/**
 * Fetch a movie poster from TMDB and save it to the repo.
 * Example: Interstellar — run from FlickPix/ with: node scripts/fetch-poster.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env");

let API_KEY;
try {
  const envContent = readFileSync(envPath, "utf-8");
  const match = envContent.match(/^TMDB_API_KEY=(.+)$/m);
  if (match) API_KEY = match[1].trim();
} catch {
  // ignore
}

if (!API_KEY || API_KEY === "YOUR_KEY_HERE") {
  console.error("❌  Set TMDB_API_KEY in .env first.");
  process.exit(1);
}

const BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";

async function tmdb(path, params = {}) {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("api_key", API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  const query = "Interstellar";
  console.log(`🔍 Searching for "${query}"...`);
  const search = await tmdb("/search/movie", { query });
  const movie = search.results.find((m) => m.title === "Interstellar") || search.results[0];
  if (!movie) {
    console.error("No results.");
    process.exit(1);
  }
  console.log(`   Found: ${movie.title} (id ${movie.id})`);

  const details = await tmdb(`/movie/${movie.id}`);
  const posterPath = details.poster_path;
  if (!posterPath) {
    console.error("No poster_path for this movie.");
    process.exit(1);
  }

  const posterUrl = `${IMAGE_BASE}/w500${posterPath}`;
  console.log(`   Poster URL: ${posterUrl}`);
  console.log(`   Downloading...`);

  const imgRes = await fetch(posterUrl);
  if (!imgRes.ok) {
    console.error(`Failed to download image: ${imgRes.status}`);
    process.exit(1);
  }
  const buf = Buffer.from(await imgRes.arrayBuffer());

  const outDir = resolve(root, "assets", "images");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "interstellar-poster.jpg");
  writeFileSync(outPath, buf);
  console.log(`   Saved: ${outPath}`);

  const htmlPath = resolve(outDir, "interstellar-poster.html");
  const html = `<!DOCTYPE html>
<html>
<head><title>Interstellar poster</title></head>
<body style="margin:0;background:#111;min-height:100vh;display:flex;align-items:center;justify-content:center;">
  <img src="interstellar-poster.jpg" alt="Interstellar" style="max-width:100%;height:auto;" />
</body>
</html>`;
  writeFileSync(htmlPath, html);
  console.log(`   Display: open ${htmlPath}`);
  console.log("   Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
