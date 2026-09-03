import { searchEvidence } from "./search.js";
import { rankEvidence } from "./rank.js";

export async function retrieveEvidence(
  claim: string
) {
  const evidence = await searchEvidence(claim);

  return rankEvidence(claim, evidence).slice(0, 8);
}

export { searchEvidence } from "./search.js";
export { rankEvidence } from "./rank.js";
export type { Evidence } from "./search.js";