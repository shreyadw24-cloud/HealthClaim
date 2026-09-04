import { supabase } from "./supabase.js";
import type { VerifyClaimResult } from "../ai/index.js";

export async function saveVerification(
  claim: string,
  result: VerifyClaimResult,
  harmLevel: "Low" | "Medium" | "High"
) {
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