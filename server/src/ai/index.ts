import { extractClaim } from "./claimExtractor.js";
import { extractClaimFromImage, extractClaimFromAudio } from "./mediaExtractor.js";
import { classifyClaim } from "./classifier.js";
import { explainClaim } from "./explainer.js";
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

  // STEP 4: Classify the claim.
  const classification = await classifyClaim(
    extracted.claim,
    evidenceText
  );

  // STEP 5: Generate the explanation.
  const explanation = await explainClaim(
    extracted.claim,
    classification.verdict,
    evidenceText
  );

  console.log(
    `Claim verified in ${Date.now() - startTime} ms`
  );

  return {
    claim: extracted.claim,
    verdict: classification.verdict,
    confidence: classification.confidence,
    explanation: explanation.explanation,
    sources: evidence.map((item) => ({
      title: item.title,
      source: item.source,
      url: item.url,
      score: item.score
    }))
  };
}