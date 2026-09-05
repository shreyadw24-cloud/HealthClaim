import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { verifyClaim } from "./ai/index.js";
import type { VerifyClaimResult, ClaimInput } from "./ai/index.js";
import { saveVerification, getHistory } from "./db/verifications.js";

const app = express();

// Chrome extension requests (service worker / offscreen doc) send either a
// chrome-extension:// origin or no Origin header at all — never an
// arbitrary website's origin. This stops random pages from calling our API
// straight from browser JS while still allowing the extension itself.
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || /^chrome-extension:\/\//.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);
// Raised from the default 100kb — base64-encoded screenshots and audio
// clips are much bigger than plain claim text.
app.use(express.json({ limit: "10mb" }));

// /verify-claim triggers several Gemini calls per request — without a
// limit, one bad actor (or a runaway retry loop) can burn through the
// whole API quota. 20 requests / 10 min per IP is generous for real usage.
const verifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many verification requests. Please wait a bit and try again." },
});

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

app.post("/verify-claim", verifyLimiter, async (req, res) => {
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

const historyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get("/history", historyLimiter, async (req, res) => {
  const history = await getHistory();
  res.json(history);
});

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});