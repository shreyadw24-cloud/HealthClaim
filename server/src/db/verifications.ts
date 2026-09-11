import { supabase } from "./supabase.js";
import type { VerifyClaimResult } from "../ai/index.js";

export async function saveVerification(
  claim: string,
  result: VerifyClaimResult,
  harmLevel: "Low" | "Medium" | "High"
) {
  if (!supabase) return; // history-saving disabled — see supabase.ts

  const { error } = await supabase.from("verifications").insert({
    claim,
    verdict: result.verdict,
    harm_level: harmLevel,
    explanation: result.explanation,
    sources: result.sources,
  });

  if (error) {
    console.error("Failed to save verification:", error.message);
  }
}

export async function getHistory() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("verifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Failed to fetch history:", error.message);
    return [];
  }

  return data;
}

// ── Related claims (secondary / fallback source) ────────────────────────
// The primary related-claims source is a live web search (see
// ai/relatedClaims.ts). This only fills remaining slots with claims other
// HealthClaim users have already checked — matched by simple keyword
// overlap on the `claim` column, ranked by how many times each distinct
// claim has been checked (popularity).

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "of",
  "in", "on", "for", "to", "and", "or", "that", "this", "it", "its", "with",
  "as", "at", "by", "from", "can", "could", "will", "would", "should", "may",
  "might", "do", "does", "did", "has", "have", "had", "not", "no", "if",
  "than", "then", "so", "because", "about", "into", "your", "you", "they",
  "their", "them", "he", "she", "his", "her", "claim", "claims",
]);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

interface VerificationRow {
  claim: string;
  verdict: string;
  harm_level: string;
  explanation: string;
  sources: unknown;
  created_at: string;
}

// Groups exact-duplicate claims (case/whitespace-insensitive) and counts
// how many times each was checked — that count is "popularity".
function groupByPopularity(rows: VerificationRow[]) {
  const groups = new Map<string, { row: VerificationRow; count: number }>();

  for (const row of rows) {
    const key = row.claim.trim().toLowerCase();
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(key, { row, count: 1 });
    }
  }

  return Array.from(groups.values())
    .sort((a, b) => b.count - a.count)
    .map(({ row, count }) => ({ ...row, timesChecked: count }));
}

export async function getRelatedClaims(claim: string, limit = 5) {
  if (!supabase) return [];

  const keywords = extractKeywords(claim);
  if (keywords.length === 0) return [];

  // Cast a wide net (any keyword match) — popularity ranking above sorts
  // out what actually matters.
  const orFilter = keywords
    .slice(0, 6)
    .map((k) => `claim.ilike.%${k}%`)
    .join(",");

  const { data, error } = await supabase
    .from("verifications")
    .select("claim, verdict, harm_level, explanation, sources, created_at")
    .or(orFilter)
    .neq("claim", claim)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Failed to fetch related claims:", error.message);
    return [];
  }

  return groupByPopularity((data ?? []) as VerificationRow[]).slice(0, limit);
}