import "dotenv/config";

// Optional second provider for the text-only classification step. Groq's
// free tier (Llama models) is far more generous than Gemini's free-tier
// daily quota, so routing classification here — while extraction (image/
// audio, which needs a multimodal model) stays on Gemini — roughly halves
// how often we hit Gemini's quota per verification.
//
// This is optional: if GROQ_API_KEY isn't set, isGroqConfigured() returns
// false and classifier.ts falls back to Gemini for everything, exactly
// like before this file existed.

const apiKey = process.env.GROQ_API_KEY;

export const GROQ_MODEL =
  process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

export function isGroqConfigured(): boolean {
  return Boolean(apiKey);
}

interface GroqChatResponse {
  choices?: { message?: { content?: string } }[];
}

export async function generateJsonWithGroq(prompt: string): Promise<string> {
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set.");
  }

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Groq request failed with status ${response.status}`);
  }

  const data = (await response.json()) as GroqChatResponse;
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("Groq returned an empty response.");
  }

  return text.trim();
}