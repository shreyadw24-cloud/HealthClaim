import { extractClaim } from "./claimExtractor.js";
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

export async function verifyClaim(
  text: string
): Promise<VerifyClaimResult> {
  const startTime = Date.now();

  if (!text || !text.trim()) {
    throw new Error("Claim text cannot be empty.");
  }

  // STEP 1: Extract and normalize the claim.
  const extracted = await extractClaim(text);

  // STEP 2: Retrieve evidence.
  const evidence = await retrieveEvidence(
    extracted.claim
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