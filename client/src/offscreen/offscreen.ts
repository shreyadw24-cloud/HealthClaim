// Runs inside the offscreen document (see manifest "offscreen" permission
// and service-worker.ts's ensureOffscreenDocument()). MV3 service workers
// cannot use MediaRecorder / getUserMedia directly — this document exists
// solely to do that on the service worker's behalf.

let recorder: MediaRecorder | null = null;
let chunks: Blob[] = [];

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function startCapture(streamId: string): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      },
    } as MediaTrackConstraints,
  });

  chunks = [];
  recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start();
}

function stopCapture(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!recorder) {
      reject(new Error("Not recording."));
      return;
    }
    const activeRecorder = recorder;
    activeRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const buffer = await blob.arrayBuffer();
      activeRecorder.stream.getTracks().forEach((track) => track.stop());
      resolve(arrayBufferToBase64(buffer));
    };
    activeRecorder.stop();
    recorder = null;
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "HEALTHCLAIM_START_AUDIO_CAPTURE") {
    startCapture(message.streamId)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message?.type === "HEALTHCLAIM_STOP_AUDIO_CAPTURE") {
    stopCapture()
      .then((audioBase64) => sendResponse({ ok: true, audioBase64 }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  return undefined;
});