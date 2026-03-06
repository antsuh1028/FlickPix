import "dotenv/config";

const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
console.log("API key present:", !!apiKey);
console.log("Key prefix:", apiKey?.slice(0, 10) + "...");

const SYSTEM_PROMPT = `You are a movie recommendation assistant. The user will describe their mood. Return ONLY valid JSON with these optional fields:
- "with_genres": comma-separated TMDB genre IDs (28=Action, 35=Comedy, 18=Drama, 10749=Romance, 878=Sci-Fi, 53=Thriller, 27=Horror)
- "sort_by": "popularity.desc" or "vote_average.desc"
- "vote_average.gte": minimum rating (number)
- "vote_count.gte": minimum votes (number)
- "explanation": one sentence summary`;

console.log("\n--- Calling OpenAI gpt-4o-mini ---");

try {
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
        { role: "user", content: "something light and funny" },
      ],
    }),
  });

  console.log("Status:", res.status, res.statusText);

  const body = await res.text();
  console.log("Response body:", body);

  if (res.ok) {
    const data = JSON.parse(body);
    const content = data.choices?.[0]?.message?.content;
    console.log("\nGPT response content:", content);
    const parsed = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || "{}");
    console.log("Parsed filters:", parsed);
  }
} catch (err) {
  console.error("Fetch error:", err);
}
