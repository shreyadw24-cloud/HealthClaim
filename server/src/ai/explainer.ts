import { generateText } from "./gemini.js";
import type { Verdict } from "./classifier.js";

export interface ExplanationResult {
  explanation: string;
}

export async function explainClaim(
  claim: string,
  verdict: Verdict,
  evidenceText: string
): Promise<ExplanationResult> {
  if (!claim.trim()) {
    throw new Error("Claim cannot be empty.");
  }

  const prompt = `
You are the explanation component of HealthClaim.

Explain why the following health claim received the given verdict.

The explanation must:
- Be understandable to a normal social media user.
- Be neutral and evidence-based.
- Clearly distinguish evidence from uncertainty.
- Avoid diagnosing the user.
- Avoid prescribing treatment.
- Avoid exaggerated certainty.
- Mention important missing context when relevant.
- Be concise: 2 to 4 sentences.

CLAIM:
${claim}

VERDICT:
${verdict}

EVIDENCE:
${evidenceText || "No reliable evidence was retrieved."}

Return only the explanation text.
`;

  const explanation = await generateText(prompt);

  return {
    explanation: explanation.trim()
  };
}