export interface TrustedSource {
  name: string;
  domain: string;
  searchUrl: (query: string) => string;
}

export const TRUSTED_SOURCES: TrustedSource[] = [
  {
    name: "World Health Organization",
    domain: "who.int",
    searchUrl: (query) =>
      `https://www.who.int/search?query=${encodeURIComponent(query)}`
  },
  {
    name: "Centers for Disease Control and Prevention",
    domain: "cdc.gov",
    searchUrl: (query) =>
      `https://search.cdc.gov/search/?query=${encodeURIComponent(query)}`
  },
  {
    name: "PubMed",
    domain: "pubmed.ncbi.nlm.nih.gov",
    searchUrl: (query) =>
      `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query)}`
  }
  // "National Institutes of Health" generic search-page link was removed —
  // it was redundant now that MedlinePlus, ClinicalTrials.gov and PubMed
  // (all real NIH/NLM services with precise, per-claim article links) are
  // already in the evidence list. Keeping a generic NIH search link
  // alongside those three precise ones would have looked like a fourth,
  // weaker duplicate of the same organization.
];