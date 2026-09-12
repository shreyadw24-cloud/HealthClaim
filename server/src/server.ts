import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { verifyClaim } from "./ai/index.js";
import type { VerifyClaimResult, ClaimInput } from "./ai/index.js";
import { saveVerification, getHistory, getRelatedClaims } from "./db/verifications.js";
import { findRelatedClaimsOnWeb } from "./ai/relatedClaims.js";

const app = express();

// Render (and most hosts) put the app behind a reverse proxy, which sets
// the X-Forwarded-For header on every request. Without this, express's
// req.ip is the proxy's own internal IP for every request (useless for
// rate limiting) and express-rate-limit logs a ValidationError on every
// single request warning that it can't trust that header yet. "1" trusts
// exactly one hop — the proxy directly in front of us — which matches
// Render's setup.
app.set("trust proxy", 1);

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
// whole API quota. Raised from 20 to 60 per 10 min per IP so a demo
// session (judges + team testing) doesn't get 429'd mid-demo.
const verifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 60,
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
  if (claim && claim.trim() && imageBase64) {
    // Both a caption AND an image/video-frame screenshot came in together —
    // send both to Gemini in one call so it can pick the real claim out of
    // whichever one actually has it (see extractClaimFromTextAndImage).
    input = { kind: "text-and-image", text: claim, imageBase64, mimeType: mimeType || "image/jpeg" };
  } else if (imageBase64) {
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
      claim: result.claim,
      verdict: result.verdict,
      harmLevel,
      confidence: result.confidence,
      language: result.language,
      explanation: result.explanation,
      caveats: result.caveats,
      bottomLine: result.bottomLine,
      sources: result.sources.map((s) => ({
        name: s.source || s.title,
        url: s.url,
      })),
      analyzedInMs: Date.now() - startTime,
    });
  } catch (err) {
    console.error("verify-claim failed:", err);

    // Thrown deliberately by claimExtractor.ts / mediaExtractor.ts when the
    // post genuinely has no health claim in it — a clearer, non-alarming
    // message than the generic fallback below, and no retry button on the
    // client makes sense here since retrying won't change the answer.
    const message = err instanceof Error ? err.message : "";
    if (message === "NO_HEALTH_CLAIM" || message.startsWith("Could not find a health claim")) {
      return res.status(422).json({
        error: "No health claim was found in this post — nothing to verify here.",
        noHealthClaim: true
      });
    }

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

// Primary source: live web search (via Gemini + Google Search grounding —
// see ai/relatedClaims.ts) for what's actually being claimed about this
// topic right now. Secondary/fallback source: our own Supabase history,
// which fills remaining slots with claims other users already checked
// (and comes with an instant, precomputed verdict).
app.get("/related-claims", historyLimiter, async (req, res) => {
  const claim = typeof req.query.claim === "string" ? req.query.claim.trim() : "";

  if (!claim) {
    return res.status(400).json({ error: "claim is required" });
  }

  const [webClaims, dbClaims] = await Promise.all([
    findRelatedClaimsOnWeb(claim),
    getRelatedClaims(claim, 5),
  ]);

  const seen = new Set<string>([claim.trim().toLowerCase()]);
  const combined: Array<{
    claim: string;
    sourceType: "web" | "history";
    domain?: string;
    verdict?: string;
    harmLevel?: string;
    explanation?: string;
    sources?: { name: string; url: string }[];
    timesChecked?: number;
  }> = [];

  for (const w of webClaims) {
    const key = w.claim.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    combined.push({ claim: w.claim, sourceType: "web", domain: w.domain });
  }

  for (const r of dbClaims as any[]) {
    if (combined.length >= 6) break;
    const key = r.claim.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    combined.push({
      claim: r.claim,
      sourceType: "history",
      verdict: r.verdict,
      harmLevel: r.harm_level,
      explanation: r.explanation,
      sources: (r.sources ?? []).map((s: any) => ({ name: s.source || s.title || s.name, url: s.url })),
      timesChecked: r.timesChecked,
    });
  }

  res.json(combined.slice(0, 6));
});

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});