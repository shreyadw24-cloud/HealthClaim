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

interface MedlinePlusResult {
  title: string;
  snippet: string;
  url: string;
}

function stripTags(value: string): string {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// MedlinePlus (a National Library of Medicine / NIH service) offers a free,
// public web service for searching its health topic summaries by free text.
// Unlike the generic search-page links below, this returns actual snippet
// content we can show the user directly.
async function searchMedlinePlus(
  claim: string
): Promise<MedlinePlusResult[]> {
  const url =
    "https://wsearch.nlm.nih.gov/ws/query" +
    `?db=healthTopics&term=${encodeURIComponent(claim)}&retmax=2`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `MedlinePlus request failed with status ${response.status}`
    );
  }

  const xml = await response.text();
  const documents = xml.split("<document").slice(1, 3);

  return documents.map((doc) => {
    const titleMatch = doc.match(
      /<content name="title"[^>]*>([\s\S]*?)<\/content>/
    );
    const snippetMatch = doc.match(
      /<content name="snippet"[^>]*>([\s\S]*?)<\/content>/
    );
    const urlMatch = doc.match(/url="([^"]+)"/);

    return {
      title: titleMatch ? stripTags(titleMatch[1]) : "MedlinePlus health topic",
      snippet: snippetMatch
        ? stripTags(snippetMatch[1])
        : "Relevant MedlinePlus health topic found — see the linked page for details.",
      url: urlMatch ? urlMatch[1] : "https://medlineplus.gov"
    };
  });
}

export async function searchEvidence(
  claim: string
): Promise<Evidence[]> {
  if (!claim.trim()) {
    return [];
  }

  const evidence: Evidence[] = [];

  try {
    let pubmedArticles = await searchPubMed(claim);

    if (pubmedArticles.length === 0) {
      // Fallback: the keyword query was too narrow, try broader terms
      const broaderTerm = claim.split(" ").slice(0, 3).join(" ");
      pubmedArticles = await searchPubMed(broaderTerm);
    }

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

  try {
    const medlineResults = await searchMedlinePlus(claim);

    for (const result of medlineResults) {
      evidence.push({
        title: result.title,
        summary: result.snippet,
        source: "MedlinePlus (NIH)",
        url: result.url
      });
    }
  } catch (error) {
    console.error("MedlinePlus search failed:", error);
  }

  // For sources we don't have a real content API for, link to their
  // official search page instead of claiming we checked the page's
  // content — the AI has not independently verified this specific
  // claim against what's on that page.
  for (const source of TRUSTED_SOURCES) {
    if (source.name === "PubMed") {
      continue;
    }

    evidence.push({
      title: `${source.name} — official source`,
      summary:
        `This links to an official ${source.name} resource. The AI has not independently verified this specific claim against its content — use it to cross-check manually.`,
      source: source.name,
      url: source.searchUrl(claim)
    });
  }

  return evidence;
}