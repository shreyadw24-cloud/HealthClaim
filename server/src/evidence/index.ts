import { searchEvidence } from "./search.js";
import { rankEvidence } from "./rank.js";

export async function retrieveEvidence(
  claim: string
) {
  const evidence = await searchEvidence(claim);

  // Raised to 14 — up to 7 real-content sources (PubMed, MedlinePlus,
  // Europe PMC, Semantic Scholar, ClinicalTrials.gov, FDA, USDA) can now
  // each contribute results, so the cutoff needed more room. The 2 search-
  // link sources (WHO, CDC) rank lowest and only fill remaining slots.
  return rankEvidence(claim, evidence).slice(0, 14);
}

export { searchEvidence } from "./search.js";
export { rankEvidence } from "./rank.js";
export type { Evidence } from "./search.js";