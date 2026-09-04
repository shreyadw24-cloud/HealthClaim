import { generateWithParts } from "./gemini.js";
import type { GeminiPart } from "./gemini.js";
import type { ExtractedClaim } from "./claimExtractor.js";

function cleanJsonResponse(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

const IMAGE_CLAIM_PROMPT = `
You are the claim extraction component of HealthClaim, an AI-powered
health claim verification system.

Look at the attached image. It is a screenshot of a social media post
(or a single frame from a video post).

Find any health or nutrition claim visible in it — from on-screen text,
a caption, an infographic, or a product/food label.

Rules:
1. Keep the claim concise.
2. Do not add facts that are not visible in the image.
3. If there are multiple claims, select the main health claim.
4. If NO health claim is visible at all, return an empty "claim" field.
5. Return ONLY valid JSON.

Required JSON format:
{
  "claim": "the normalized factual health claim, or an empty string if none",
  "searchTerms": "3-6 keywords suitable for a medical literature search (e.g. PubMed), not a full sentence"
}
`;

const AUDIO_CLAIM_PROMPT = `
You are the claim extraction component of HealthClaim, an AI-powered
health claim verification system.

Listen to the attached audio clip. It is spoken narration from a social
media video (e.g. a Reel, Short, or TikTok).

Transcribe the relevant part internally and extract the main health or
nutrition claim being spoken.

Rules:
1. Keep the claim concise.
2. Do not add facts that are not actually said in the audio.
3. If there are multiple claims, select the main health claim.
4. If NO health claim is spoken at all, return an empty "claim" field.
5. Return ONLY valid JSON.

Required JSON format:
{
  "claim": "the normalized factual health claim, or an empty string if none",
  "searchTerms": "3-6 keywords suitable for a medical literature search (e.g. PubMed), not a full sentence"
}
`;

function parseExtractedClaim(response: string, originalText: string): ExtractedClaim {
  const cleaned = cleanJsonResponse(response);
  const parsed = JSON.parse(cleaned);

  if (!parsed || typeof parsed.claim !== "string" || !parsed.claim.trim()) {
    throw new Error("No health claim could be found.");
  }

  return {
    originalText,
    claim: parsed.claim.trim(),
    searchTerms:
      typeof parsed.searchTerms === "string" && parsed.searchTerms.trim()
        ? parsed.searchTerms.trim()
        : parsed.claim.trim()
  };
}

export async function extractClaimFromImage(
  imageBase64: string,
  mimeType = "image/jpeg"
): Promise<ExtractedClaim> {
  if (!imageBase64) {
    throw new Error("Image data is required.");
  }

  const parts: GeminiPart[] = [
    { text: IMAGE_CLAIM_PROMPT },
    { inlineData: { mimeType, data: imageBase64 } }
  ];

  const response = await generateWithParts(parts);

  try {
    return parseExtractedClaim(response, "[image]");
  } catch {
    throw new Error("Could not find a health claim in this image.");
  }
}

export async function extractClaimFromAudio(
  audioBase64: string,
  mimeType = "audio/webm"
): Promise<ExtractedClaim> {
  if (!audioBase64) {
    throw new Error("Audio data is required.");
  }

  const parts: GeminiPart[] = [
    { text: AUDIO_CLAIM_PROMPT },
    { inlineData: { mimeType, data: audioBase64 } }
  ];

  const response = await generateWithParts(parts);

  try {
    return parseExtractedClaim(response, "[audio]");
  } catch {
    throw new Error("Could not find a health claim in this audio.");
  }
}