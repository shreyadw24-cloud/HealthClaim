import { generateText } from "./gemini.js";

export interface ExtractedClaim {
  originalText: string;
  claim: string;
}

function cleanJsonResponse(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export async function extractClaim(
  text: string
): Promise<ExtractedClaim> {
  if (!text || !text.trim()) {
    throw new Error("Input text cannot be empty.");
  }

  const originalText = text.trim();

  const prompt = `
You are the claim extraction component of HealthClaim, an AI-powered
health claim verification system.

Extract the main factual health-related claim from the following social
media text.

Rules:
1. Keep the claim concise.
2. Remove hashtags, emojis, calls to action, greetings and opinions.
3. Do not add facts that are not present in the input.
4. If there are multiple claims, select the main health claim.
5. Preserve the meaning of the original statement.
6. Return ONLY valid JSON.

Required JSON format:
{
  "claim": "the normalized factual health claim"
}

Text:
${originalText}
`;

  const response = await generateText(prompt);
  const cleaned = cleanJsonResponse(response);

  try {
    const parsed = JSON.parse(cleaned);

    if (
      !parsed ||
      typeof parsed.claim !== "string" ||
      !parsed.claim.trim()
    ) {
      throw new Error("Invalid claim extraction response.");
    }

    return {
      originalText,
      claim: parsed.claim.trim()
    };
  } catch {
    // Safe fallback if Gemini doesn't return valid JSON.
    return {
      originalText,
      claim: originalText
    };
  }
}