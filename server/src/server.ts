import express from "express";
import cors from "cors";
import { verifyClaim } from "./ai/index.js";
import type { VerifyClaimResult, ClaimInput } from "./ai/index.js";
import { saveVerification, getHistory } from "./db/verifications.js";

const app = express();

app.use(cors());
// Raised from the default 100kb — base64-encoded screenshots and audio
// clips are much bigger than plain claim text.
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.json({
    message: "HealthClaim backend is running!",
  });
});

function toHarmLevel(verdict: VerifyClaimResult["verdict"]): "Low" | "Medium" | "High" {
  switch (verdict) {
    case "Supported":
      return "Low";
    case "Partially Supported":
      return "Medium";
    case "Insufficient Evidence":
      return "Medium";
    case "Potentially Harmful":
      return "High";
  }
}

app.post("/verify-claim", async (req, res) => {
  const { claim, imageBase64, audioBase64, mimeType } = req.body;

  let input: ClaimInput;
  if (imageBase64) {
    input = { kind: "image", imageBase64, mimeType: mimeType || "image/jpeg" };
  } else if (audioBase64) {
    input = { kind: "audio", audioBase64, mimeType: mimeType || "audio/webm" };
  } else if (claim && claim.trim()) {
    input = { kind: "text", text: claim };
  } else {
    return res.status(400).json({
      error: "claim, imageBase64, or audioBase64 is required",
    });
  }

  try {
    const startTime = Date.now();
    const result = await verifyClaim(input);
    const harmLevel = toHarmLevel(result.verdict);

    // Save the claim Gemini actually extracted, not the raw input (which
    // may have been an image/audio blob, not text).
    await saveVerification(result.claim, result, harmLevel);

    res.json({
      verdict: result.verdict,
      harmLevel,
      explanation: result.explanation,
      sources: result.sources.map((s) => ({
        name: s.source || s.title,
        url: s.url,
      })),
      analyzedInMs: Date.now() - startTime,
    });
  } catch (err) {
    console.error("verify-claim failed:", err);
    res.status(500).json({
      error: "Verification failed. Please try again.",
    });
  }
});

app.get("/history", async (req, res) => {
  const history = await getHistory();
  res.json(history);
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});