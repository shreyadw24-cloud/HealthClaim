import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    "GEMINI_API_KEY is missing. Add it to server/.env before running the AI pipeline."
  );
}

export const gemini = new GoogleGenAI({
  apiKey
});

export const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.6-flash";

export async function generateText(prompt: string): Promise<string> {
  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt
  });

  const text = response.text;

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text.trim();
}

// NEW — lets us send image/audio bytes alongside a text prompt (used for
// image and audio claim extraction, not just plain text claims).
export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export async function generateWithParts(parts: GeminiPart[]): Promise<string> {
  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts }]
  });

  const text = response.text;

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text.trim();
}