import type {
  ClaimPayload,
  VerifyRequestMessage,
  VerifyResponseMessage,
  VerifyResult,
  RelatedClaim,
  RelatedClaimsRequestMessage,
  RelatedClaimsResponseMessage,
} from "./types";

export function requestVerification(payload: ClaimPayload, postUrl?: string): Promise<VerifyResult> {
  const message: VerifyRequestMessage = {
    type: "HEALTHCLAIM_VERIFY",
    payload,
    source: location.hostname,
    postUrl,
  };

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: VerifyResponseMessage | undefined) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message ?? "Extension messaging error."));
        return;
      }
      if (!response) {
        reject(new Error("No response from the background worker."));
        return;
      }
      if (response.ok) {
        resolve(response.result);
      } else {
        const error = new Error(response.error) as Error & { noHealthClaim?: boolean };
        if (response.noHealthClaim) error.noHealthClaim = true;
        reject(error);
      }
    });
  });
}
export function requestRelatedClaims(claim: string): Promise<RelatedClaim[]> {
  const message: RelatedClaimsRequestMessage = { type: "HEALTHCLAIM_RELATED_CLAIMS", claim };

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: RelatedClaimsResponseMessage | undefined) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message ?? "Extension messaging error."));
        return;
      }
      if (!response) {
        reject(new Error("No response from the background worker."));
        return;
      }
      if (response.ok) {
        resolve(response.items);
      } else {
        reject(new Error(response.error));
      }
    });
  });
}