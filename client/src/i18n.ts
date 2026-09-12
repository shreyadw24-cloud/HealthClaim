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

const bn: UiStrings = {
  claimDetected: "সনাক্ত করা দাবি",
  evidenceConfidence: "প্রমাণের নির্ভরযোগ্যতা",
  whatEvidenceSays: "প্রমাণ কী বলে",
  whyHarmful: "এটি ক্ষতিকর কেন?",
  nuancesCaveats: "সূক্ষ্মতা ও সতর্কতা",
  bottomLine: "মূল কথা",
  evidenceSources: "প্রমাণ সূত্র",
  evidenceSource: "প্রমাণ সূত্র",
  moreSources: (count) => `+${count}টি আরও সূত্র`,
  footerMore: "আরও",
  footerExplain: "সহজ করুন",
  footerFull: "বিস্তারিত",
  footerShare: "শেয়ার করুন",
  footerCopied: "কপি হয়েছে",
  footerRelated: "সম্পর্কিত",
  footerHide: "লুকান",
  close: "বন্ধ করুন",
  relatedClaimsOnTopic: "এই বিষয়ে সম্পর্কিত দাবি",
  searchingWeb: "ওয়েবে সম্পর্কিত দাবি খোঁজা হচ্ছে…",
  couldntLoadRelated: "সম্পর্কিত দাবি লোড করা যায়নি।",
  retry: "আবার চেষ্টা করুন",
  noRelatedFound: "এই মুহূর্তে এই বিষয়ে কোনো সম্পর্কিত দাবি পাওয়া যায়নি।",
  checking: "যাচাই করা হচ্ছে…",
  fromWeb: "ওয়েব থেকে",
  checkedNTimes: (count) => `আগে ${count} বার যাচাই করা হয়েছে`,
  backToYourClaim: "← আপনার দাবিতে ফিরে যান",
  relatedClaimLabel: "সম্পর্কিত দাবি",
  checkingClaim: (claim) => `"${claim}" যাচাই করা হচ্ছে…`,
  verdictLabels: {
    Supported: "সমর্থিত",
    "Partially Supported": "আংশিকভাবে সমর্থিত",
    "Insufficient Evidence": "অপর্যাপ্ত প্রমাণ",
    "Potentially Harmful": "সম্ভাব্য ক্ষতিকর",
  },
};

const ta: UiStrings = {
  claimDetected: "கண்டறியப்பட்ட கூற்று",
  evidenceConfidence: "ஆதார நம்பகத்தன்மை",
  whatEvidenceSays: "ஆதாரம் என்ன கூறுகிறது",
  whyHarmful: "இது ஏன் தீங்கு விளைவிக்கும்?",
  nuancesCaveats: "நுணுக்கங்கள் & எச்சரிக்கைகள்",
  bottomLine: "முடிவுரை",
  evidenceSources: "ஆதார மூலங்கள்",
  evidenceSource: "ஆதார மூலம்",
  moreSources: (count) => `+${count} மேலும் மூலங்கள்`,
  footerMore: "மேலும்",
  footerExplain: "எளிமையாக்கு",
  footerFull: "முழுமையானது",
  footerShare: "பகிர்",
  footerCopied: "நகலெடுக்கப்பட்டது",
  footerRelated: "தொடர்புடையவை",
  footerHide: "மறை",
  close: "மூடு",
  relatedClaimsOnTopic: "இந்த தலைப்பில் தொடர்புடைய கூற்றுகள்",
  searchingWeb: "தொடர்புடைய கூற்றுகளுக்கு இணையத்தில் தேடுகிறது…",
  couldntLoadRelated: "தொடர்புடைய கூற்றுகளை ஏற்ற முடியவில்லை.",
  retry: "மீண்டும் முயற்சி செய்",
  noRelatedFound: "இப்போது இந்த தலைப்பில் தொடர்புடைய கூற்றுகள் எதுவும் இல்லை.",
  checking: "சரிபார்க்கிறது…",
  fromWeb: "இணையத்திலிருந்து",
  checkedNTimes: (count) => `முன்பு ${count} முறை சரிபார்க்கப்பட்டது`,
  backToYourClaim: "← உங்கள் கூற்றுக்குத் திரும்பு",
  relatedClaimLabel: "தொடர்புடைய கூற்று",
  checkingClaim: (claim) => `"${claim}" சரிபார்க்கிறது…`,
  verdictLabels: {
    Supported: "ஆதரிக்கப்படுகிறது",
    "Partially Supported": "ஓரளவு ஆதரிக்கப்படுகிறது",
    "Insufficient Evidence": "போதிய ஆதாரம் இல்லை",
    "Potentially Harmful": "தீங்கு விளைவிக்கக்கூடியது",
  },
};

const te: UiStrings = {
  claimDetected: "గుర్తించిన వాదన",
  evidenceConfidence: "ఆధార విశ్వసనీయత",
  whatEvidenceSays: "ఆధారాలు ఏమి చెబుతున్నాయి",
  whyHarmful: "ఇది ఎందుకు హానికరం?",
  nuancesCaveats: "సూక్ష్మ విషయాలు & జాగ్రత్తలు",
  bottomLine: "ముఖ్యాంశం",
  evidenceSources: "ఆధార వనరులు",
  evidenceSource: "ఆధార వనరు",
  moreSources: (count) => `+${count} మరిన్ని వనరులు`,
  footerMore: "మరిన్ని",
  footerExplain: "సరళంగా చెప్పు",
  footerFull: "పూర్తి వివరణ",
  footerShare: "పంచుకోండి",
  footerCopied: "కాపీ చేయబడింది",
  footerRelated: "సంబంధిత",
  footerHide: "దాచు",
  close: "మూసివేయి",
  relatedClaimsOnTopic: "ఈ అంశంపై సంబంధిత వాదనలు",
  searchingWeb: "సంబంధిత వాదనల కోసం వెబ్‌లో వెతుకుతోంది…",
  couldntLoadRelated: "సంబంధిత వాదనలను లోడ్ చేయలేకపోయాము.",
  retry: "మళ్లీ ప్రయత్నించండి",
  noRelatedFound: "ప్రస్తుతం ఈ అంశంపై సంబంధిత వాదనలు ఏవీ కనుగొనబడలేదు.",
  checking: "తనిఖీ చేస్తోంది…",
  fromWeb: "వెబ్ నుండి",
  checkedNTimes: (count) => `గతంలో ${count} సార్లు తనిఖీ చేయబడింది`,
  backToYourClaim: "← మీ వాదనకు తిరిగి వెళ్లండి",
  relatedClaimLabel: "సంబంధిత వాదన",
  checkingClaim: (claim) => `"${claim}" తనిఖీ చేస్తోంది…`,
  verdictLabels: {
    Supported: "మద్దతు ఉంది",
    "Partially Supported": "పాక్షికంగా మద్దతు ఉంది",
    "Insufficient Evidence": "సరిపడా ఆధారాలు లేవు",
    "Potentially Harmful": "హానికరం కావచ్చు",
  },
};

const mr: UiStrings = {
  claimDetected: "आढळलेला दावा",
  evidenceConfidence: "पुरावा विश्वासार्हता",
  whatEvidenceSays: "पुरावा काय सांगतो",
  whyHarmful: "हे हानिकारक का आहे?",
  nuancesCaveats: "बारकावे आणि सावधगिरी",
  bottomLine: "सारांश",
  evidenceSources: "पुरावा स्रोत",
  evidenceSource: "पुरावा स्रोत",
  moreSources: (count) => `+${count} अधिक स्रोत`,
  footerMore: "अधिक",
  footerExplain: "सोपे करा",
  footerFull: "संपूर्ण",
  footerShare: "शेअर करा",
  footerCopied: "कॉपी झाले",
  footerRelated: "संबंधित",
  footerHide: "लपवा",
  close: "बंद करा",
  relatedClaimsOnTopic: "या विषयावरील संबंधित दावे",
  searchingWeb: "संबंधित दाव्यांसाठी वेबवर शोधत आहे…",
  couldntLoadRelated: "संबंधित दावे लोड करता आले नाहीत.",
  retry: "पुन्हा प्रयत्न करा",
  noRelatedFound: "सध्या या विषयावर कोणतेही संबंधित दावे आढळले नाहीत.",
  checking: "तपासत आहे…",
  fromWeb: "वेबवरून",
  checkedNTimes: (count) => `यापूर्वी ${count} वेळा तपासले`,
  backToYourClaim: "← तुमच्या दाव्याकडे परत जा",
  relatedClaimLabel: "संबंधित दावा",
  checkingClaim: (claim) => `"${claim}" तपासत आहे…`,
  verdictLabels: {
    Supported: "समर्थित",
    "Partially Supported": "अंशतः समर्थित",
    "Insufficient Evidence": "अपुरा पुरावा",
    "Potentially Harmful": "संभाव्य हानिकारक",
  },
};

const es: UiStrings = {
  claimDetected: "Afirmación detectada",
  evidenceConfidence: "Confianza en la evidencia",
  whatEvidenceSays: "Qué dice la evidencia",
  whyHarmful: "¿Por qué es perjudicial?",
  nuancesCaveats: "Matices y advertencias",
  bottomLine: "Conclusión",
  evidenceSources: "Fuentes de evidencia",
  evidenceSource: "Fuente de evidencia",
  moreSources: (count) => `+${count} fuente${count > 1 ? "s" : ""} más`,
  footerMore: "Más",
  footerExplain: "Simplificar",
  footerFull: "Detallado",
  footerShare: "Compartir",
  footerCopied: "Copiado",
  footerRelated: "Relacionado",
  footerHide: "Ocultar",
  close: "Cerrar",
  relatedClaimsOnTopic: "Afirmaciones relacionadas sobre este tema",
  searchingWeb: "Buscando afirmaciones relacionadas en la web…",
  couldntLoadRelated: "No se pudieron cargar las afirmaciones relacionadas.",
  retry: "Reintentar",
  noRelatedFound: "No se encontraron afirmaciones relacionadas sobre este tema por ahora.",
  checking: "Verificando…",
  fromWeb: "De la web",
  checkedNTimes: (count) => `Verificado ${count} veces antes`,
  backToYourClaim: "← Volver a tu afirmación",
  relatedClaimLabel: "Afirmación relacionada",
  checkingClaim: (claim) => `Verificando "${claim}"…`,
  verdictLabels: {
    Supported: "Respaldado",
    "Partially Supported": "Parcialmente respaldado",
    "Insufficient Evidence": "Evidencia insuficiente",
    "Potentially Harmful": "Potencialmente dañino",
  },
};

const fr: UiStrings = {
  claimDetected: "Affirmation détectée",
  evidenceConfidence: "Fiabilité des preuves",
  whatEvidenceSays: "Ce que disent les preuves",
  whyHarmful: "Pourquoi est-ce dangereux ?",
  nuancesCaveats: "Nuances et mises en garde",
  bottomLine: "L'essentiel",
  evidenceSources: "Sources de preuves",
  evidenceSource: "Source de preuve",
  moreSources: (count) => `+${count} source${count > 1 ? "s" : ""} de plus`,
  footerMore: "Plus",
  footerExplain: "Simplifier",
  footerFull: "Détaillé",
  footerShare: "Partager",
  footerCopied: "Copié",
  footerRelated: "Similaires",
  footerHide: "Masquer",
  close: "Fermer",
  relatedClaimsOnTopic: "Affirmations similaires sur ce sujet",
  searchingWeb: "Recherche d'affirmations similaires sur le web…",
  couldntLoadRelated: "Impossible de charger les affirmations similaires.",
  retry: "Réessayer",
  noRelatedFound: "Aucune affirmation similaire trouvée sur ce sujet pour le moment.",
  checking: "Vérification…",
  fromWeb: "Depuis le web",
  checkedNTimes: (count) => `Vérifié ${count} fois auparavant`,
  backToYourClaim: "← Retour à votre affirmation",
  relatedClaimLabel: "Affirmation similaire",
  checkingClaim: (claim) => `Vérification de "${claim}"…`,
  verdictLabels: {
    Supported: "Confirmé",
    "Partially Supported": "Partiellement confirmé",
    "Insufficient Evidence": "Preuves insuffisantes",
    "Potentially Harmful": "Potentiellement dangereux",
  },
};

export type LangCode = "en" | "hi" | "bn" | "ta" | "te" | "mr" | "es" | "fr";

const dictionaries: Record<LangCode, UiStrings> = { en, hi, bn, ta, te, mr, es, fr };

export function getUiStrings(languageCode?: string): UiStrings {
  const code = (languageCode || "en").toLowerCase().slice(0, 2);
  return dictionaries[code as LangCode] ?? dictionaries.en;
}