import { TRUSTED_SOURCES } from "./sources.js";

export interface Evidence {
  title: string;
  summary: string;
  source: string;
  url: string;
  score?: number;
}

interface PubMedArticle {
  uid: string;
  title: string;
  url: string;
}

interface PubMedSearchResponse {
  esearchresult?: {
    idlist?: string[];
  };
}

interface PubMedSummaryResponse {
  result?: Record<
    string,
    {
      title?: string;
    }
  >;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Evidence request failed with status ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}

async function searchPubMed(
  claim: string
): Promise<PubMedArticle[]> {
  const searchUrl =
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi" +
    `?db=pubmed&retmode=json&retmax=5&term=${encodeURIComponent(claim)}`;

  const searchData =
    await fetchJson<PubMedSearchResponse>(searchUrl);

  const ids = searchData.esearchresult?.idlist ?? [];

  if (ids.length === 0) {
    return [];
  }

  const summaryUrl =
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi" +
    `?db=pubmed&retmode=json&id=${ids.join(",")}`;

  const summaryData =
    await fetchJson<PubMedSummaryResponse>(summaryUrl);

  return ids
    .map((id) => {
      const article = summaryData.result?.[id];

      if (!article) {
        return null;
      }

      return {
        uid: id,
        title: article.title || "PubMed article",
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`
      };
    })
    .filter((article): article is PubMedArticle => article !== null);
}

export async function searchEvidence(
  claim: string
): Promise<Evidence[]> {
  if (!claim.trim()) {
    return [];
  }

  const evidence: Evidence[] = [];

  try {
    const pubmedArticles = await searchPubMed(claim);

    for (const article of pubmedArticles) {
      evidence.push({
        title: article.title,
        summary:
          "Relevant PubMed record found for the health claim. Review the linked article for the actual evidence and study context.",
        source: "PubMed",
        url: article.url
      });
    }
  } catch (error) {
    console.error("PubMed search failed:", error);
  }

  // Add official trusted-source search pages as additional navigation
  // references. These are search links, not claims that the page itself
  // proves the health claim.
  for (const source of TRUSTED_SOURCES) {
    if (source.name === "PubMed") {
      continue;
    }

    evidence.push({
      title: `${source.name} search`,
      summary:
        `Search ${source.name} for authoritative information related to this claim.`,
      source: source.name,
      url: source.searchUrl(claim)
    });
  }

  return evidence;
}