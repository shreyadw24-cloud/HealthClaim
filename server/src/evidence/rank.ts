import type { Evidence } from "./search.js";

// Sources that return actual fetched content (an abstract, a snippet) for
// this specific claim, as opposed to a generic official-site search link —
// see search.ts. These get the same relevance bonus as PubMed did before;
// a plain search-page link is a weaker signal and stays at the lower bonus.
// Also exported so ai/index.ts can filter these back out when building the
// context sent to the classifier — a "search results" placeholder isn't
// actual evidence and shouldn't influence the verdict, only appear as a
// cross-check link in the UI.
export const REAL_CONTENT_SOURCES = new Set([
  "PubMed",
  "MedlinePlus (NIH)",
  "Europe PMC",
  "Semantic Scholar",
  "ClinicalTrials.gov (NIH)",
  "FDA (DailyMed)",
  "USDA FoodData Central"
]);

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

  // Compare against the SET of evidence words, not the raw token list — a
  // relevant word repeated several times in one summary (e.g. "vitamin"
  // appearing 5 times) used to count as 5 separate matches and could push
  // a barely-relevant, repetitive result above a genuinely broad match.
  // What matters is how many distinct claim concepts the evidence covers,
  // not how many times any one of them is repeated.
  const evidenceWords = new Set(
    tokenize(`${evidence.title} ${evidence.summary}`)
  );

  if (claimWords.size === 0) {
    return 0;
  }

  let matches = 0;

  for (const word of claimWords) {
    if (evidenceWords.has(word)) {
      matches++;
    }
  }

  const relevance = matches / claimWords.size;

  const sourceBonus =
    REAL_CONTENT_SOURCES.has(evidence.source) ? 0.25 : 0.1;

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