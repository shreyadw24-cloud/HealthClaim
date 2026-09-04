import type { VerifyResult } from "../content/types";

export type VerifyClaimBody =
  | { claim: string }
  | { imageBase64: string; mimeType: string }
  | { audioBase64: string; mimeType: string };

export async function verifyClaim(body: VerifyClaimBody): Promise<VerifyResult> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/verify-claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Verification failed");
  return res.json();
}