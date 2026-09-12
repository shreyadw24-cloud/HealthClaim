// ── Shared contract between content script <-> background worker <-> server ──
// Mirrors the VerifyResult shape already used in App.tsx / Section 7 of the
// build plan, so the popup and the in-page overlay stay in sync with the API.

export type VerifyResult = {
  claim: string;
  verdict: "Supported" | "Partially Supported" | "Insufficient Evidence" | "Potentially Harmful";
  harmLevel: "Low" | "Medium" | "High";
  confidence: number;
  explanation: string;
  // Distinct from "explanation" — powers the "Nuances & Caveats" section.
  // Optional because older cached responses or a stale server won't have it.
  caveats?: string;
  // ISO 639-1 code detected from the claim (e.g. "en", "hi") — drives the
  // result UI's language via client/src/i18n.ts. Optional because older
  // cached responses or a stale server won't have it; falls back to "en".
  language?: string;
  sources: { name: string; url: string }[];
};

// A claim can be found as plain text, or as an image/video-frame that needs
// to be screenshotted (the "media-rect" case carries the on-page bounding
// box of the image/video element — the actual pixels are captured later by
// the background worker, which is the only context allowed to call
// chrome.tabs.captureVisibleTab), or as audio to be recorded from the tab.
export type ClaimPayload =
  | { kind: "text"; text: string }
  | {
      kind: "media-rect";
      rect: { x: number; y: number; width: number; height: number };
      devicePixelRatio: number;
    }
  | { kind: "audio" }
  | {
      // Post has BOTH caption text AND an image/video — send both so
      // Gemini can pick the real claim out of whichever one has it
      // (previously the image/video was silently dropped whenever any
      // caption text existed, even a generic one).
      kind: "text-and-media-rect";
      text: string;
      rect: { x: number; y: number; width: number; height: number };
      devicePixelRatio: number;
    };

// Message sent from the content script to the background service worker
// when the user clicks "Verify Health Claim" on a post.
export type VerifyRequestMessage = {
  type: "HEALTHCLAIM_VERIFY";
  payload: ClaimPayload;
  /** Hostname of the page the claim was found on, e.g. "x.com" */
  source: string;
  /** Best-effort URL of the specific post, if one could be resolved */
  postUrl?: string;
};

export type VerifyResponseMessage =
  | { type: "HEALTHCLAIM_VERIFY_RESULT"; ok: true; result: VerifyResult }
  | { type: "HEALTHCLAIM_VERIFY_RESULT"; ok: false; error: string; noHealthClaim?: boolean };

export function isVerifyRequestMessage(msg: unknown): msg is VerifyRequestMessage {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as { type?: unknown }).type === "HEALTHCLAIM_VERIFY"
  );
}

// ── Related claims ─────────────────────────────────────────────────────────
// A related claim either comes from a live web search (just claim text +
// domain, no verdict yet — verifying it is a fresh verification) or from our
// own Supabase history (already has a precomputed verdict, so showing it is
// instant). Mirrors the RelatedClaim type in client/src/App.tsx so the popup
// and the in-page overlay stay in sync.
export type RelatedClaim = {
  claim: string;
  sourceType: "web" | "history";
  domain?: string;
  timesChecked?: number;
  verdict?: VerifyResult["verdict"];
  harmLevel?: VerifyResult["harmLevel"];
  explanation?: string;
  caveats?: string;
  sources?: { name: string; url: string }[];
};

export type RelatedClaimsRequestMessage = {
  type: "HEALTHCLAIM_RELATED_CLAIMS";
  claim: string;
};

export type RelatedClaimsResponseMessage =
  | { type: "HEALTHCLAIM_RELATED_CLAIMS_RESULT"; ok: true; items: RelatedClaim[] }
  | { type: "HEALTHCLAIM_RELATED_CLAIMS_RESULT"; ok: false; error: string };

export function isRelatedClaimsRequestMessage(msg: unknown): msg is RelatedClaimsRequestMessage {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as { type?: unknown }).type === "HEALTHCLAIM_RELATED_CLAIMS"
  );
}