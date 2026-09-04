// ── Shared contract between content script <-> background worker <-> server ──
// Mirrors the VerifyResult shape already used in App.tsx / Section 7 of the
// build plan, so the popup and the in-page overlay stay in sync with the API.

export type VerifyResult = {
  verdict: "Supported" | "Partially Supported" | "Insufficient Evidence" | "Potentially Harmful";
  harmLevel: "Low" | "Medium" | "High";
  confidence: number;
  explanation: string;
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
  | { kind: "audio" };

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
  | { type: "HEALTHCLAIM_VERIFY_RESULT"; ok: false; error: string };

export function isVerifyRequestMessage(msg: unknown): msg is VerifyRequestMessage {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as { type?: unknown }).type === "HEALTHCLAIM_VERIFY"
  );
}