import { gemini, GEMINI_MODEL } from "./gemini.js";

export interface WebRelatedClaim {
  claim: string;
  domain?: string;
}

function cleanJsonResponse(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

// Uses Gemini's built-in Google Search grounding tool — no separate search
// API key needed — to look at what's actually being said on the web right
// now about this topic. This is the PRIMARY related-claims source; the
// Supabase history lookup (db/verifications.ts) is only a secondary
// fallback that fills remaining slots with claims other users of this
// extension already checked.
export async function findRelatedClaimsOnWeb(
  claim: string
): Promise<WebRelatedClaim[]> {
  const prompt = `
You have access to Google Search. Search the web for other health or
nutrition claims currently circulating about the SAME general topic as
the claim below — the kind of thing people post on social media, blogs,
or forums, or that news/fact-check sites have covered.

Do not just reword the same claim. Find genuinely different claims people
make about this topic (different angles, contradicting claims, related
myths, etc).

Return ONLY valid JSON in this exact format, with 4 to 6 items:
{
  "claims": [
    { "claim": "short claim text, one sentence", "domain": "example.com" }
  ]
}

If you genuinely can't find anything related, return { "claims": [] }.
Do not include the domain field if you're not confident of the source.

TOPIC CLAIM:
${claim}
`;

  try {
    const response = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text;
    if (!text) return [];

    const parsed = JSON.parse(cleanJsonResponse(text));
    if (!parsed || !Array.isArray(parsed.claims)) return [];

    return parsed.claims
      .filter(
        (c: unknown): c is { claim: string; domain?: string } =>
          typeof c === "object" &&
          c !== null &&
          typeof (c as any).claim === "string" &&
          (c as any).claim.trim().length > 0
      )
      .map((c: { claim: string; domain?: string }) => ({
        claim: c.claim.trim(),
        domain: typeof c.domain === "string" ? c.domain.trim() : undefined,
      }))
      .slice(0, 6);
  } catch (error) {
    // Web search grounding is best-effort — if it fails, the caller still
    // has the Supabase fallback, so don't let this take down the request.
    console.error("Web related-claims search failed:", error);
    return [];
  }
}