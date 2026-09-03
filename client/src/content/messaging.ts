import type { VerifyRequestMessage, VerifyResponseMessage, VerifyResult } from "./types";

export function requestVerification(claim: string, postUrl?: string): Promise<VerifyResult> {
  const message: VerifyRequestMessage = {
    type: "HEALTHCLAIM_VERIFY",
    claim,
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
        reject(new Error(response.error));
      }
    });
  });
}
