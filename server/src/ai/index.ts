import { extractClaim } from "./claimExtractor.js";
import { extractClaimFromImage, extractClaimFromAudio } from "./mediaExtractor.js";
import { classifyClaim } from "./classifier.js";
import { retrieveEvidence } from "../evidence/index.js";

export interface VerifyClaimResult {
  claim: string;
  verdict:
    | "Supported"
    | "Partially Supported"
    | "Insufficient Evidence"
    | "Potentially Harmful";
  confidence: number;
  explanation: string;
  sources: {
    title: string;
    source: string;
    url: string;
    score?: number;
  }[];
}

// A claim can come in as raw text, a screenshot of an image/video frame, or
// a recorded audio clip — extraction differs per kind, everything after
// that (evidence, classification, explanation) is identical.
export type ClaimInput =
  | { kind: "text"; text: string }
  | { kind: "image"; imageBase64: string; mimeType?: string }
  | { kind: "audio"; audioBase64: string; mimeType?: string };

// Same underlying claim gets checked by many different users (a viral post
// gets the same "does X cure Y" caption seen thousands of times), and each
// full run costs 2-3 Gemini calls. Caching by the *extracted* claim text —
// not the raw input, which differs per screenshot/recording even for the
// same post — means a repeat claim skips evidence lookup and both
// remaining Gemini calls entirely. This is process-local and resets on
// restart; fine for a single-instance server, not meant to replace a real
// shared cache if this ever runs multi-instance.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const resultCache = new Map<string, { result: VerifyClaimResult; expiresAt: number }>();

function cacheKey(claim: string): string {
  return claim.trim().toLowerCase().replace(/\s+/g, " ");
}

function getCached(claim: string): VerifyClaimResult | undefined {
  const key = cacheKey(claim);
  const entry = resultCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    resultCache.delete(key);
    return undefined;
  }
  return entry.result;
}

function setCached(claim: string, result: VerifyClaimResult): void {
  resultCache.set(cacheKey(claim), { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

export async function verifyClaim(
  input: ClaimInput
): Promise<VerifyClaimResult> {
  const startTime = Date.now();

  // STEP 1: Extract and normalize the claim — text, image, or audio.
  const extracted = await (async () => {
    switch (input.kind) {
      case "text":
        if (!input.text || !input.text.trim()) {
          throw new Error("Claim text cannot be empty.");
        }
        return extractClaim(input.text);
      case "image":
        return extractClaimFromImage(input.imageBase64, input.mimeType);
      case "audio":
        return extractClaimFromAudio(input.audioBase64, input.mimeType);
    }
  })();

  const cached = getCached(extracted.claim);
  if (cached) {
    console.log(`Claim served from cache in ${Date.now() - startTime} ms`);
    return cached;
  }

  // STEP 2: Retrieve evidence — use extracted keywords, not the full
  // sentence, since literature search engines match keywords far better
  // than natural-language claims.
  const evidence = await retrieveEvidence(
    extracted.searchTerms
  );

  // STEP 3: Convert evidence into context for Gemini.
  const evidenceText =
    evidence.length > 0
      ? evidence
          .map(
            (item, index) =>
              `[${index + 1}]
Title: ${item.title}
Source: ${item.source}
Summary: ${item.summary}
URL: ${item.url}`
          )
          .join("\n\n")
      : "No evidence was retrieved.";

  // STEP 4: Classify + explain in one call (was 2 separate Gemini calls —
  // merged to cut quota usage per verification by a third).
  const classification = await classifyClaim(
    extracted.claim,
    evidenceText
  );

  console.log(
    `Claim verified in ${Date.now() - startTime} ms`
  );

  const result: VerifyClaimResult = {
    claim: extracted.claim,
    verdict: classification.verdict,
    confidence: classification.confidence,
    explanation: classification.explanation,
    sources: evidence.map((item) => ({
      title: item.title,
      source: item.source,
      url: item.url,
      score: item.score
    }))
  };

  setCached(extracted.claim, result);
  return result;
}