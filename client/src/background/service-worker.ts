import { isVerifyRequestMessage } from "../content/types";
import type { VerifyResponseMessage } from "../content/types";
import { verifyClaim } from "./api";
import { saveToHistory } from "./history";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/**
 * Crops a full-tab screenshot down to just the claim's image/video element,
 * using the element's on-page bounding rect. Runs entirely in the service
 * worker via OffscreenCanvas (no DOM available here, but this API is).
 */
async function cropDataUrl(
  dataUrl: string,
  rect: { x: number; y: number; width: number; height: number },
  scale: number,
): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const bitmap = await createImageBitmap(blob);

  const width = Math.max(1, Math.round(rect.width * scale));
  const height = Math.max(1, Math.round(rect.height * scale));
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create a canvas context to crop the screenshot.");

  ctx.drawImage(bitmap, rect.x * scale, rect.y * scale, width, height, 0, 0, width, height);

  const croppedBlob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
  return arrayBufferToBase64(await croppedBlob.arrayBuffer());
}

/** Makes sure exactly one offscreen document exists before recording audio. */
async function ensureOffscreenDocument(): Promise<void> {
  const existing = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
  });
  if (existing.length > 0) return;

  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: [chrome.offscreen.Reason.USER_MEDIA],
    justification: "Recording tab audio to transcribe a spoken health claim.",
  });
}

/** Records `durationMs` of the given tab's audio and returns it as base64 webm. */
async function captureTabAudio(tabId: number, durationMs = 8000): Promise<string> {
  await ensureOffscreenDocument();

  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });

  const startRes = await chrome.runtime.sendMessage({
    type: "HEALTHCLAIM_START_AUDIO_CAPTURE",
    streamId,
  });
  if (!startRes?.ok) throw new Error(startRes?.error || "Could not start audio capture.");

  await new Promise((resolve) => setTimeout(resolve, durationMs));

  const stopRes = await chrome.runtime.sendMessage({ type: "HEALTHCLAIM_STOP_AUDIO_CAPTURE" });
  if (!stopRes?.ok) throw new Error(stopRes?.error || "Could not stop audio capture.");

  return stopRes.audioBase64;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isVerifyRequestMessage(message)) return undefined;

  (async () => {
    try {
      let result;
      let claimLabel: string;

      if (message.payload.kind === "text") {
        claimLabel = message.payload.text;
        result = await verifyClaim({ claim: message.payload.text });
      } else if (message.payload.kind === "media-rect") {
        const tab = sender.tab;
        if (!tab?.windowId || tab.id === undefined) {
          throw new Error("Could not identify the source tab.");
        }
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: 85 });
        const imageBase64 = await cropDataUrl(dataUrl, message.payload.rect, message.payload.devicePixelRatio);
        claimLabel = "[image claim]";
        result = await verifyClaim({ imageBase64, mimeType: "image/jpeg" });
      } else {
        // kind === "audio" — an unmuted, playing <video> with no usable
        // caption/on-screen text (see scan.ts's isAudibleVideo check):
        // record a few seconds of the tab's own audio and let Gemini
        // transcribe + extract the claim from that instead of a screenshot.
        const tab = sender.tab;
        if (tab?.id === undefined) {
          throw new Error("Could not identify the source tab.");
        }
        const audioBase64 = await captureTabAudio(tab.id, 8000);
        claimLabel = "[audio claim]";
        result = await verifyClaim({ audioBase64, mimeType: "audio/webm" });
      }

      await saveToHistory(claimLabel, result, message.postUrl ?? message.source);
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