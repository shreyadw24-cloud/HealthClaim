import express from "express";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "HealthClaim backend is running!",
  });
});

app.post("/verify-claim", (req, res) => {
  const claim = req.body.claim;

  if (!claim) {
    return res.status(400).json({
      error: "Claim is required",
    });
  }

  res.json({
    verdict: "Insufficient Evidence",
    harmLevel: "Medium",
    explanation: "This is a mock response. AI verification will be connected later.",
    sources: [],
    analyzedInMs: 100,
  });
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});