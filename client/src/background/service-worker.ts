import { isVerifyRequestMessage } from "../content/types";
import type { VerifyResponseMessage } from "../content/types";
import { verifyClaim } from "./api";
import { saveToHistory } from "./history";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isVerifyRequestMessage(message)) return undefined;

  (async () => {
    try {
      const result = await verifyClaim(message.claim);
      await saveToHistory(message.claim, result, message.postUrl ?? message.source);
      const response: VerifyResponseMessage = { type: "HEALTHCLAIM_VERIFY_RESULT", ok: true, result };
      sendResponse(response);
    } catch (err) {
      const response: VerifyResponseMessage = {
        type: "HEALTHCLAIM_VERIFY_RESULT",
        ok: false,
        error: err instanceof Error ? err.message : "Verification failed.",
      };
      sendResponse(response);
    }
  })();

  // Keep the message channel open for the async sendResponse above.
  return true;
});