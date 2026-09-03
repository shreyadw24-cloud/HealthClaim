// ── Shared contract between content script <-> background worker <-> server ──
// Mirrors the VerifyResult shape already used in App.tsx / Section 7 of the
// build plan, so the popup and the in-page overlay stay in sync with the API.

export type VerifyResult = {
  verdict: "Supported" | "Partially Supported" | "Insufficient Evidence" | "Potentially Harmful";
  harmLevel: "Low" | "Medium" | "High";
  explanation: string;
  sources: { name: string; url: string }[];
};

// Message sent from the content script to the background service worker
// when the user clicks "Verify Health Claim" on a post.
export type VerifyRequestMessage = {
  type: "HEALTHCLAIM_VERIFY";
  claim: string;
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
