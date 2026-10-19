// Shared by cli.js (Node 18+) and index.html (browser). No dependencies.

export const STOPWORDS = new Set(`a about above after again all also am an and any are as at be because been before
being below between both but by can could did do does doing down during each few for from further get got had has
have having he her here hers him his how i if in into is it its itself just let me more most my no nor not now of
off on once only or other our ours out over own same she should so some such than that the their theirs them then
there these they this those through to too under until up very was we were what when where which while who whom why
will with would you your yours yourself app apps`.split(/\s+/));

export function tokenize(text) {
  return (text || "").toLowerCase().normalize("NFKC").match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu) || [];
}

/** Count n-grams. Phrases that start or end with a stopword are skipped. */
export function ngrams(tokens, n, { stopwords = STOPWORDS } = {}) {
  const counts = new Map();
  for (let i = 0; i + n <= tokens.length; i++) {
    const gram = tokens.slice(i, i + n);
    if (stopwords.has(gram[0]) || stopwords.has(gram[n - 1])) continue;
    if (n === 1 && (gram[0].length < 2 || /^\d+$/.test(gram[0]))) continue;
    const key = gram.join(" ");
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

/**
 * Build a density report for a listing.
 * fields: { name, description, releaseNotes } (any may be empty)
 */
export function densityReport(fields, { maxN = 3, top = 20, minCount = 2 } = {}) {
  const descTokens = tokenize(fields.description);
  const nameTokens = new Set(tokenize(fields.name));
  const total = descTokens.length;
  const byN = {};
  for (let n = 1; n <= maxN; n++) {
    byN[n] = [...ngrams(descTokens, n)]
      .filter(([, c]) => c >= (n === 1 ? 1 : minCount))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, top)
      .map(([term, count]) => ({
        term,
        count,
        density: total ? +((count * n * 100) / total).toFixed(2) : 0,
        inName: term.split(" ").every((w) => nameTokens.has(w)),
      }));
  }
  const nameCoverage = [...nameTokens]
    .filter((w) => !STOPWORDS.has(w))
    .map((w) => ({ term: w, inDescription: descTokens.filter((t) => t === w).length }));
  return { totalWords: total, uniqueWords: new Set(descTokens).size, ngrams: byN, nameCoverage };
}

/** Accepts a numeric id, "id123", or an apps.apple.com URL. Returns the id or null. */
export function parseAppId(input) {
  const m = String(input).trim().match(/^(?:id)?(\d{5,})$/) || String(input).match(/\/id(\d{5,})/);
  return m ? m[1] : null;
}

const BASE = "https://itunes.apple.com";

export async function lookupApp(id, country = "us", fetchImpl = fetch) {
  const res = await fetchImpl(`${BASE}/lookup?id=${encodeURIComponent(id)}&country=${encodeURIComponent(country)}&entity=software`);
  if (!res.ok) throw new Error(`iTunes Lookup API returned HTTP ${res.status}`);
  const data = await res.json();
  return (data.results || []).find((r) => r.kind === "software" || r.wrapperType === "software") || null;
}

export async function searchApps(term, country = "us", limit = 5, fetchImpl = fetch) {
  const res = await fetchImpl(`${BASE}/search?term=${encodeURIComponent(term)}&country=${encodeURIComponent(country)}&entity=software&limit=${limit}`);
  if (!res.ok) throw new Error(`iTunes Search API returned HTTP ${res.status}`);
  return (await res.json()).results || [];
}
