import type { VerifyResult } from "../content/types";

// Mirrors the mock in App.tsx exactly, so the popup and the in-page overlay
// behave identically until server/ is live. Swap both call sites over to the
// real fetch together (Phase 2 — Integration).
export async function verifyClaim(claim: string): Promise<VerifyResult> {
  // TODO: uncomment when backend is live, remove the mock below
  // const res = await fetch(`${import.meta.env.VITE_API_URL}/verify-claim`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ claim }),
  // });
  // if (!res.ok) throw new Error("Verification failed");
  // return res.json();

  await new Promise((r) => setTimeout(r, 1500));

  const lower = claim.toLowerCase();
  if (lower.includes("bleach") || lower.includes("cure cancer")) {
    return {
      verdict: "Potentially Harmful",
      harmLevel: "High",
      explanation: "No credible clinical or preclinical evidence supports this claim.",
      sources: [{ name: "WHO", url: "https://who.int" }],
    };
  }

  return {
    verdict: "Insufficient Evidence",
    harmLevel: "Medium",
    explanation: "This is a mock verdict — the real classification comes from the AI pipeline once server/ is connected.",
    sources: [{ name: "NIH", url: "https://nih.gov" }],
  };
}
