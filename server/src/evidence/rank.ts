import type { Evidence } from "./search.js";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

function calculateScore(
  claim: string,
  evidence: Evidence
): number {
  const claimWords = new Set(tokenize(claim));

  const evidenceText = tokenize(
    `${evidence.title} ${evidence.summary}`
  );

  if (claimWords.size === 0) {
    return 0;
  }

  let matches = 0;

  for (const word of evidenceText) {
    if (claimWords.has(word)) {
      matches++;
    }
  }

  const relevance =
    matches / Math.max(claimWords.size, 1);

  const sourceBonus =
    evidence.source === "PubMed" ? 0.25 : 0.1;

  return Math.min(1, relevance + sourceBonus);
}

export function rankEvidence(
  claim: string,
  evidence: Evidence[]
): Evidence[] {
  return evidence
    .map((item) => ({
      ...item,
      score: calculateScore(claim, item)
    }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}