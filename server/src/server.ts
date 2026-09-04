import express from "express";
import cors from "cors";
import { verifyClaim } from "./ai/index.js";
import type { VerifyClaimResult } from "./ai/index.js";

const app = express();

app.use(cors());
app.use(express.json());

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
  const claim = req.body.claim;

  if (!claim || !claim.trim()) {
    return res.status(400).json({
      error: "Claim is required",
    });
  }

  try {
    const startTime = Date.now();
    const result = await verifyClaim(claim);

    res.json({
      verdict: result.verdict,
      harmLevel: toHarmLevel(result.verdict),
      confidence: result.confidence,
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

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});