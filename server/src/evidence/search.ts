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

// openFDA is unusual: it returns HTTP 404 when a search matches zero
// records, instead of a 200 with an empty results array like every other
// source here. That's a normal "nothing found for this claim" outcome
// (most claims aren't about a specific FDA-labeled drug), not a real
// failure — this variant treats 404 as "no results" so it doesn't get
// logged as an error alongside genuine failures.
async function fetchJsonOrNullOn404<T>(url: string): Promise<T | null> {
  const response = await fetch(url);

  if (response.status === 404) {
    return null;
  }

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
    const parsedUrl = urlMatch ? urlMatch[1] : null;
    // Defense-in-depth: this URL comes from an external XML response we
    // regex-parse rather than a real XML parser — only ever pass through
    // http(s) links to the client, never something like a javascript: URL.
    const safeUrl = parsedUrl && /^https?:\/\//i.test(parsedUrl) ? parsedUrl : "https://medlineplus.gov";

    return {
      title: titleMatch ? stripTags(titleMatch[1]) : "MedlinePlus health topic",
      snippet: snippetMatch
        ? stripTags(snippetMatch[1])
        : "Relevant MedlinePlus health topic found — see the linked page for details.",
      url: safeUrl
    };
  });
}

interface EuropePmcResult {
  title: string;
  abstract: string;
  url: string;
}

// Europe PMC (EMBL-EBI) mirrors PubMed's coverage but also indexes preprints
// and non-US journals, plus it returns the abstract text directly in the
// search response — no separate summary call needed like PubMed above.
async function searchEuropePmc(claim: string): Promise<EuropePmcResult[]> {
  const url =
    "https://www.ebi.ac.uk/europepmc/webservices/rest/search" +
    `?query=${encodeURIComponent(claim)}&format=json&pageSize=3&resultType=core`;

  interface EuropePmcResponse {
    resultList?: {
      result?: {
        title?: string;
        abstractText?: string;
        id?: string;
        source?: string;
        doi?: string;
      }[];
    };
  }

  const data = await fetchJson<EuropePmcResponse>(url);
  const results = data.resultList?.result ?? [];

  return results
    .filter((item) => item.title)
    .map((item) => ({
      title: item.title!,
      abstract: item.abstractText
        ? stripTags(item.abstractText)
        : "Abstract not available — see the linked record for study details.",
      url: item.doi
        ? `https://doi.org/${item.doi}`
        : `https://europepmc.org/article/${item.source ?? "MED"}/${item.id ?? ""}`
    }));
}

interface SemanticScholarResult {
  title: string;
  tldr: string;
  url: string;
}

// Semantic Scholar's public API needs no key and, unlike PubMed/Europe PMC,
// covers preprints and cross-disciplinary work (nutrition, public health)
// that pure biomedical indexes sometimes miss. Its "tldr" field gives a
// one-line, plain-language summary of the paper when one is available.
async function searchSemanticScholar(
  claim: string
): Promise<SemanticScholarResult[]> {
  const url =
    "https://api.semanticscholar.org/graph/v1/paper/search" +
    `?query=${encodeURIComponent(claim)}&limit=3&fields=title,abstract,url,tldr`;

  interface SemanticScholarResponse {
    data?: {
      title?: string;
      abstract?: string;
      url?: string;
      tldr?: { text?: string } | null;
    }[];
  }

  const data = await fetchJson<SemanticScholarResponse>(url);
  const results = data.data ?? [];

  return results
    .filter((item) => item.title && item.url)
    .map((item) => ({
      title: item.title!,
      tldr:
        item.tldr?.text ||
        (item.abstract ? stripTags(item.abstract).slice(0, 280) : "") ||
        "No summary available — see the linked paper for details.",
      url: item.url!
    }));
}

interface ClinicalTrialResult {
  title: string;
  summary: string;
  url: string;
}

interface OpenFdaResult {
  title: string;
  summary: string;
  url: string;
}

// openFDA — the FDA's own public API, no key required for this volume.
// Searches official drug labels (the same "indications and usage" text the
// FDA approved). Best fit for claims about a specific drug or supplement
// ("does X lower blood pressure") — general nutrition/lifestyle claims
// will often return nothing here, same as ClinicalTrials.gov above; that's
// expected, not a bug. The "id" field is the DailyMed set-id, so the link
// goes straight to that exact label page, not a search.
async function searchOpenFda(claim: string): Promise<OpenFdaResult[]> {
  const url =
    "https://api.fda.gov/drug/label.json" +
    `?search=indications_and_usage:"${encodeURIComponent(claim)}"&limit=2`;

  interface OpenFdaResponse {
    results?: {
      id?: string;
      openfda?: { brand_name?: string[]; generic_name?: string[] };
      indications_and_usage?: string[];
      purpose?: string[];
    }[];
  }

  const data = await fetchJsonOrNullOn404<OpenFdaResponse>(url);

  if (!data) {
    return [];
  }

  const results = data.results ?? [];

  return results
    .filter((item) => item.id)
    .map((item) => {
      const name =
        item.openfda?.brand_name?.[0] ||
        item.openfda?.generic_name?.[0] ||
        "FDA-approved drug label";
      const snippet =
        item.indications_and_usage?.[0] || item.purpose?.[0];

      return {
        title: `FDA label: ${name}`,
        summary: snippet
          ? stripTags(snippet).slice(0, 400)
          : "See the linked FDA-approved label for indications and usage.",
        url: `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${item.id}`
      };
    });
}

interface UsdaFoodResult {
  title: string;
  summary: string;
  url: string;
}

// USDA FoodData Central — optional, needs a free key from
// api.data.gov/signup (instant, no card). Best fit for claims about a
// specific food's nutrients ("does spinach have more iron than beef").
// Skipped entirely (not an error) when no key is configured, same pattern
// as Groq in ai/groq.ts.
async function searchUsdaFoodData(claim: string): Promise<UsdaFoodResult[]> {
  const apiKey = process.env.USDA_API_KEY;

  if (!apiKey) {
    return [];
  }

  const url =
    "https://api.nal.usda.gov/fdc/v1/foods/search" +
    `?query=${encodeURIComponent(claim)}&pageSize=2&api_key=${apiKey}`;

  interface UsdaResponse {
    foods?: {
      fdcId?: number;
      description?: string;
      foodNutrients?: { nutrientName?: string; value?: number; unitName?: string }[];
    }[];
  }

  const data = await fetchJson<UsdaResponse>(url);
  const foods = data.foods ?? [];

  return foods
    .filter((food) => food.fdcId && food.description)
    .map((food) => {
      const nutrients = (food.foodNutrients ?? [])
        .slice(0, 3)
        .map((n) => `${n.nutrientName}: ${n.value}${n.unitName ?? ""}`)
        .join(", ");

      return {
        title: `USDA food record: ${food.description}`,
        summary: nutrients
          ? `Key nutrients per USDA data — ${nutrients}.`
          : "See the linked USDA record for full nutrient data.",
        url: `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${food.fdcId}/nutrients`
      };
    });
}

// ClinicalTrials.gov is itself an NIH/NLM service (a sibling of PubMed and
// MedlinePlus, not a third-party aggregator), so this is genuine NIH
// content — useful specifically for claims about treatments, drugs, or
// supplements where a registered trial exists. Claims outside that (e.g.
// general nutrition tips) will often return nothing, which is expected.
async function searchClinicalTrials(
  claim: string
): Promise<ClinicalTrialResult[]> {
  const url =
    "https://clinicaltrials.gov/api/v2/studies" +
    `?query.term=${encodeURIComponent(claim)}&pageSize=2` +
    "&fields=NCTId,BriefTitle,BriefSummary";

  interface ClinicalTrialsResponse {
    studies?: {
      protocolSection?: {
        identificationModule?: { nctId?: string; briefTitle?: string };
        descriptionModule?: { briefSummary?: string };
      };
    }[];
  }

  const data = await fetchJson<ClinicalTrialsResponse>(url);
  const studies = data.studies ?? [];

  return studies
    .map((study) => {
      const nctId = study.protocolSection?.identificationModule?.nctId;
      const title = study.protocolSection?.identificationModule?.briefTitle;

      if (!nctId || !title) {
        return null;
      }

      return {
        title,
        summary:
          study.protocolSection?.descriptionModule?.briefSummary
            ? stripTags(study.protocolSection.descriptionModule.briefSummary).slice(0, 400)
            : "Registered clinical trial found — see the linked record for details.",
        url: `https://clinicaltrials.gov/study/${nctId}`
      };
    })
    .filter((study): study is ClinicalTrialResult => study !== null);
}

// Each task owns its own try/catch and always resolves (never rejects) with
// whatever it managed to find — that's what lets searchEvidence below run
// all four network calls concurrently with Promise.all instead of awaiting
// them one at a time. A single source being slow or down no longer delays
// or breaks the others.

async function fetchPubMedEvidence(claim: string): Promise<Evidence[]> {
  try {
    let pubmedArticles = await searchPubMed(claim);

    if (pubmedArticles.length === 0) {
      // Fallback: the keyword query was too narrow, try broader terms
      const broaderTerm = claim.split(" ").slice(0, 3).join(" ");
      pubmedArticles = await searchPubMed(broaderTerm);
    }

    return pubmedArticles.map((article) => ({
      title: article.title,
      summary:
        "Relevant PubMed record found for the health claim. Review the linked article for the actual evidence and study context.",
      source: "PubMed",
      url: article.url
    }));
  } catch (error) {
    console.error("PubMed search failed:", error);
    return [];
  }
}

async function fetchMedlinePlusEvidence(claim: string): Promise<Evidence[]> {
  try {
    const medlineResults = await searchMedlinePlus(claim);

    return medlineResults.map((result) => ({
      title: result.title,
      summary: result.snippet,
      source: "MedlinePlus (NIH)",
      url: result.url
    }));
  } catch (error) {
    console.error("MedlinePlus search failed:", error);
    return [];
  }
}

async function fetchEuropePmcEvidence(claim: string): Promise<Evidence[]> {
  try {
    const europePmcResults = await searchEuropePmc(claim);

    return europePmcResults.map((result) => ({
      title: result.title,
      summary: result.abstract,
      source: "Europe PMC",
      url: result.url
    }));
  } catch (error) {
    console.error("Europe PMC search failed:", error);
    return [];
  }
}

async function fetchSemanticScholarEvidence(claim: string): Promise<Evidence[]> {
  try {
    const semanticScholarResults = await searchSemanticScholar(claim);

    return semanticScholarResults.map((result) => ({
      title: result.title,
      summary: result.tldr,
      source: "Semantic Scholar",
      url: result.url
    }));
  } catch (error) {
    console.error("Semantic Scholar search failed:", error);
    return [];
  }
}

async function fetchClinicalTrialsEvidence(claim: string): Promise<Evidence[]> {
  try {
    const trials = await searchClinicalTrials(claim);

    return trials.map((trial) => ({
      title: trial.title,
      summary: trial.summary,
      source: "ClinicalTrials.gov (NIH)",
      url: trial.url
    }));
  } catch (error) {
    console.error("ClinicalTrials.gov search failed:", error);
    return [];
  }
}

async function fetchOpenFdaEvidence(claim: string): Promise<Evidence[]> {
  try {
    const results = await searchOpenFda(claim);

    return results.map((result) => ({
      title: result.title,
      summary: result.summary,
      source: "FDA (DailyMed)",
      url: result.url
    }));
  } catch (error) {
    console.error("openFDA search failed:", error);
    return [];
  }
}

async function fetchUsdaEvidence(claim: string): Promise<Evidence[]> {
  try {
    const results = await searchUsdaFoodData(claim);

    return results.map((result) => ({
      title: result.title,
      summary: result.summary,
      source: "USDA FoodData Central",
      url: result.url
    }));
  } catch (error) {
    console.error("USDA FoodData Central search failed:", error);
    return [];
  }
}

export async function searchEvidence(
  claim: string
): Promise<Evidence[]> {
  if (!claim.trim()) {
    return [];
  }

  // All seven real-content sources fire at once — total wait time is now
  // whichever one is slowest, not the sum of all of them. USDA silently
  // contributes nothing if USDA_API_KEY isn't set (see searchUsdaFoodData).
  const [
    pubmed,
    medline,
    europePmc,
    semanticScholar,
    clinicalTrials,
    openFda,
    usda
  ] = await Promise.all([
    fetchPubMedEvidence(claim),
    fetchMedlinePlusEvidence(claim),
    fetchEuropePmcEvidence(claim),
    fetchSemanticScholarEvidence(claim),
    fetchClinicalTrialsEvidence(claim),
    fetchOpenFdaEvidence(claim),
    fetchUsdaEvidence(claim)
  ]);

  const evidence: Evidence[] = [
    ...pubmed,
    ...medline,
    ...europePmc,
    ...semanticScholar,
    ...clinicalTrials,
    ...openFda,
    ...usda
  ];

  // For sources we don't have a real content API for, link to their
  // official search-results page instead of claiming we checked one exact
  // page's content. The title and summary say "search" explicitly — these
  // are NOT the same kind of evidence as the precise, per-claim links
  // above, and shouldn't be presented as if they were.
  for (const source of TRUSTED_SOURCES) {
    if (source.name === "PubMed") {
      continue;
    }

    evidence.push({
      title: `Search "${claim}" on ${source.name}`,
      summary:
        `This opens ${source.name}'s own search results for this claim, not one specific verified page — the AI has not checked any single page's content here. Use it to cross-check manually.`,
      source: source.name,
      url: source.searchUrl(claim)
    });
  }

  return evidence;
}