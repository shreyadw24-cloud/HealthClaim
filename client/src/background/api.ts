import type { VerifyResult } from "../content/types";

export async function verifyClaim(claim: string): Promise<VerifyResult> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/verify-claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ claim }),
  });
  if (!res.ok) throw new Error("Verification failed");
  return res.json();
}