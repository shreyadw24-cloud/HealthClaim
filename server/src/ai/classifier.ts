import { generateText } from "./gemini.js";

export type Verdict =
  | "Supported"
  | "Partially Supported"
  | "Insufficient Evidence"
  | "Potentially Harmful";

export interface ClassificationResult {
  verdict: Verdict;
  confidence: number;
  reasoning: string;
}

function cleanJsonResponse(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalizeVerdict(value: unknown): Verdict {
  if (typeof value !== "string") {
    return "Insufficient Evidence";
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "supported") {
    return "Supported";
  }

  if (
    normalized === "partially supported" ||
    normalized === "partial"
  ) {
    return "Partially Supported";
  }

  if (
    normalized === "potentially harmful" ||
    normalized === "harmful"
  ) {
    return "Potentially Harmful";
  }

  return "Insufficient Evidence";
}

export async function classifyClaim(
  claim: string,
  evidenceText: string
): Promise<ClassificationResult> {
  if (!claim.trim()) {
    throw new Error("Claim cannot be empty.");
  }

  const prompt = `
You are the classification component of HealthClaim.

Classify the health claim using ONLY these four categories:

1. Supported
2. Partially Supported
3. Insufficient Evidence
4. Potentially Harmful

Definitions:

Supported:
The available evidence reasonably supports the main claim.

Partially Supported:
Some part of the claim is supported, but the wording is broader,
stronger or more certain than the evidence.

Insufficient Evidence:
There is not enough reliable evidence provided to support or reject
the claim.

Potentially Harmful:
Following the claim could reasonably create a meaningful health risk,
especially if it encourages unsafe treatment, stopping necessary care,
dangerous behavior, or a clearly unsafe practice.

Important:
- Do not invent medical evidence.
- Do not diagnose the user.
- Do not give treatment instructions.
- If evidence is insufficient, use "Insufficient Evidence".
- Consider the actual evidence supplied below.
- Return ONLY valid JSON.

Required JSON:
{
  "verdict": "Supported | Partially Supported | Insufficient Evidence | Potentially Harmful",
  "confidence": 0,
  "reasoning": "short explanation"
}

CLAIM:
${claim}

EVIDENCE:
${evidenceText || "No evidence was retrieved."}
`;

  const response = await generateText(prompt);
  const cleaned = cleanJsonResponse(response);

  try {
    const parsed = JSON.parse(cleaned);

    const confidence =
      typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5;

    return {
      verdict: normalizeVerdict(parsed.verdict),
      confidence,
      reasoning:
        typeof parsed.reasoning === "string"
          ? parsed.reasoning.trim()
          : "The available evidence was insufficient for a detailed explanation."
    };
  } catch {
    return {
      verdict: "Insufficient Evidence",
      confidence: 0,
      reasoning:
        "The classification response could not be safely parsed."
    };
  }
}