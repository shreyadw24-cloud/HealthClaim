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
    name: "National Institutes of Health",
    domain: "nih.gov",
    searchUrl: (query) =>
      `https://search.nih.gov/search?affiliate=nih&query=${encodeURIComponent(query)}`
  },
  {
    name: "PubMed",
    domain: "pubmed.ncbi.nlm.nih.gov",
    searchUrl: (query) =>
      `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query)}`
  }
];