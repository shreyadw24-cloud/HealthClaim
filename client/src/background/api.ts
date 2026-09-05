import type { VerifyResult } from "../content/types";

export type VerifyClaimBody =
  | { claim: string }
  | { imageBase64: string; mimeType: string }
  | { audioBase64: string; mimeType: string };

// A full verification runs several sequential Gemini calls, so give it
// real headroom — but without a limit at all, a stalled network or a
// hung backend leaves the "Verifying…" spinner running forever with no
// way to cancel.
const VERIFY_TIMEOUT_MS = 30_000;

export async function verifyClaim(body: VerifyClaimBody): Promise<VerifyResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/verify-claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      throw new Error(payload?.error || `Verification failed (${res.status}).`);
    }

    return res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Verification timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}