// Shared translation dictionary for the RESULT screen only (both the
// in-page overlay in content/overlay.ts and the toolbar popup's
// ResultScreen in App.tsx use this). Driven by the `language` field the
// backend detects from the claim itself (see server/src/ai/claimExtractor.ts)
// — so the result you get back is shown in the same language the claim
// was written in.
//
// This deliberately does NOT cover the Home/Loading/Error/History screens:
// those either appear before any claim exists (no language known yet) or
// mix claims from many different languages at once (History), so they stay
// in English. Only the Result screen has one specific claim with one
// specific detected language to key off of.
//
// To add another language: copy the `hi` block below, translate each
// value, and add it to `dictionaries`. Nothing else needs to change —
// unsupported codes silently fall back to English.

export interface UiStrings {
  claimDetected: string;
  evidenceConfidence: string;
  whatEvidenceSays: string;
  whyHarmful: string;
  nuancesCaveats: string;
  bottomLine: string;
  evidenceSources: string;
  evidenceSource: string;
  moreSources: (count: number) => string;
  footerMore: string;
  footerExplain: string;
  footerFull: string;
  footerShare: string;
  footerCopied: string;
  footerRelated: string;
  footerHide: string;
  close: string;
  relatedClaimsOnTopic: string;
  searchingWeb: string;
  couldntLoadRelated: string;
  retry: string;
  noRelatedFound: string;
  checking: string;
  fromWeb: string;
  checkedNTimes: (count: number) => string;
  backToYourClaim: string;
  relatedClaimLabel: string;
  checkingClaim: (claim: string) => string;
  verdictLabels: Record<
    | "Supported"
    | "Partially Supported"
    | "Insufficient Evidence"
    | "Potentially Harmful",
    string
  >;
}

const en: UiStrings = {
  claimDetected: "Claim Detected",
  evidenceConfidence: "Evidence confidence",
  whatEvidenceSays: "What Evidence Says",
  whyHarmful: "Why is this harmful?",
  nuancesCaveats: "Nuances & Caveats",
  bottomLine: "Bottom Line",
  evidenceSources: "Evidence Sources",
  evidenceSource: "Evidence source",
  moreSources: (count) => `+${count} more source${count > 1 ? "s" : ""}`,
  footerMore: "More",
  footerExplain: "Simplify",
  footerFull: "Detailed",
  footerShare: "Share",
  footerCopied: "Copied",
  footerRelated: "Related",
  footerHide: "Hide",
  close: "Close",
  relatedClaimsOnTopic: "Related claims on this topic",
  searchingWeb: "Searching the web for related claims…",
  couldntLoadRelated: "Couldn't load related claims.",
  retry: "Retry",
  noRelatedFound: "No related claims found for this topic right now.",
  checking: "Checking…",
  fromWeb: "From the web",
  checkedNTimes: (count) => `Checked ${count}× before`,
  backToYourClaim: "← Back to your claim",
  relatedClaimLabel: "Related Claim",
  checkingClaim: (claim) => `Checking "${claim}"…`,
  verdictLabels: {
    Supported: "Supported",
    "Partially Supported": "Partially Supported",
    "Insufficient Evidence": "Insufficient Evidence",
    "Potentially Harmful": "Potentially Harmful",
  },
};

const hi: UiStrings = {
  claimDetected: "पहचाना गया दावा",
  evidenceConfidence: "प्रमाण विश्वसनीयता",
  whatEvidenceSays: "प्रमाण क्या कहते हैं",
  whyHarmful: "यह हानिकारक क्यों है?",
  nuancesCaveats: "बारीकियाँ और सावधानियाँ",
  bottomLine: "निष्कर्ष",
  evidenceSources: "प्रमाण स्रोत",
  evidenceSource: "प्रमाण स्रोत",
  moreSources: (count) => `+${count} और स्रोत`,
  footerMore: "अधिक",
  footerExplain: "सरल करें",
  footerFull: "विस्तृत",
  footerShare: "साझा करें",
  footerCopied: "कॉपी हुआ",
  footerRelated: "संबंधित",
  footerHide: "छिपाएं",
  close: "बंद करें",
  relatedClaimsOnTopic: "इस विषय पर संबंधित दावे",
  searchingWeb: "वेब पर संबंधित दावे खोजे जा रहे हैं…",
  couldntLoadRelated: "संबंधित दावे लोड नहीं हो सके।",
  retry: "फिर कोशिश करें",
  noRelatedFound: "अभी इस विषय पर कोई संबंधित दावा नहीं मिला।",
  checking: "जांच हो रही है…",
  fromWeb: "वेब से",
  checkedNTimes: (count) => `${count} बार पहले जांचा गया`,
  backToYourClaim: "← अपने दावे पर वापस जाएं",
  relatedClaimLabel: "संबंधित दावा",
  checkingClaim: (claim) => `"${claim}" की जांच हो रही है…`,
  verdictLabels: {
    Supported: "समर्थित",
    "Partially Supported": "आंशिक रूप से समर्थित",
    "Insufficient Evidence": "अपर्याप्त प्रमाण",
    "Potentially Harmful": "संभावित रूप से हानिकारक",
  },
};

export type LangCode = "en" | "hi";

const dictionaries: Record<LangCode, UiStrings> = { en, hi };

export function getUiStrings(languageCode?: string): UiStrings {
  const code = (languageCode || "en").toLowerCase().slice(0, 2);
  return dictionaries[code as LangCode] ?? dictionaries.en;
}