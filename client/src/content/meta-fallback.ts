import { createVerifyButton } from "./button";
import { ResultOverlay } from "./overlay";
import { requestVerification } from "./messaging";
import { cleanText, isLikelyClaim } from "./extract";
import type { ClaimPayload } from "./types";

// Instagram always writes Open Graph tags into <head> for link-preview
// purposes — even on the stripped-down / login-wall page you land on when
// opening a post from a Google search result while logged out, where the
// normal <article> feed markup never renders. We use those for the caption,
// combined with whatever image/video element is actually on the page (a
// Reel/infographic post usually carries its real claim in the media, not
// the caption), so this fallback doesn't depend on guessing Instagram's DOM
// structure at all.
function metaContent(prop: string): string | null {
  const el = document.querySelector<HTMLMetaElement>(`meta[property="${prop}"], meta[name="${prop}"]`);
  const content = el?.content?.trim();
  return content ? content : null;
}

// Looks anywhere on the page (not scoped to a specific post container,
// since there may be no reliable container) for the main media element —
// same idea as the YouTube adapter, which does the same thing because its
// player also isn't nested inside the "post" element it matches on.
function findMediaEl(): HTMLImageElement | HTMLVideoElement | null {
  return (
    document.querySelector<HTMLVideoElement>("video") ??
    document.querySelector<HTMLImageElement>("img[srcset]") ??
    null
  );
}

function elementRect(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}

let injected = false;

export function injectMetaFallbackButton() {
  if (injected) return;
  injected = true;

  const overlay = new ResultOverlay();
  const rawText = metaContent("og:description") ?? metaContent("description") ?? document.title;
  const metaText = rawText ? cleanText(rawText) : null;
  // Caption text pulled from meta tags is often generic ("Save this reel
  // for later!") rather than an actual claim, so still gate it through the
  // same length/sanity check the normal adapters use.
  const textClaim = metaText && isLikelyClaim(metaText) ? metaText : null;

  function run(payload: ClaimPayload, displayClaim: string, anchorRect: DOMRect, setState: (s: "idle" | "loading" | "no-claim") => void, buttonEl: HTMLElement) {
    requestVerification(payload, location.href)
      .then((result) => {
        setState("idle");
        overlay.showResult(buttonEl.getBoundingClientRect(), displayClaim, result);
      })
      .catch((err: Error & { noHealthClaim?: boolean }) => {
        setState("idle");
        if (err.noHealthClaim) {
          overlay.showNoClaim(buttonEl.getBoundingClientRect(), err.message || "No health claim was found in this post — nothing to verify here.", () => setState("idle"));
          return;
        }
        overlay.showError(buttonEl.getBoundingClientRect(), err.message || "Verification failed.", () => buttonEl.click());
      });
  }

  const { el: buttonEl, setState } = createVerifyButton(() => {
    const mediaEl = findMediaEl();
    const anchorRect = buttonEl.getBoundingClientRect();
    const isAudibleVideo =
      mediaEl instanceof HTMLVideoElement && !mediaEl.muted && !mediaEl.paused && mediaEl.currentTime > 0;

    // Same fallback chain as the normal per-platform flow: prefer text+media
    // together when both exist (lets Gemini pick the real claim out of
    // whichever one actually has it), otherwise text-only, then a
    // screenshot of the media, then audio for an audible video, then give up.
    if (textClaim && mediaEl && !isAudibleVideo) {
      setState("loading");
      overlay.showLoading(anchorRect, textClaim);
      run(
        { kind: "text-and-media-rect", text: textClaim, rect: elementRect(mediaEl), devicePixelRatio: window.devicePixelRatio || 1 },
        textClaim,
        anchorRect,
        setState,
        buttonEl,
      );
      return;
    }

    if (textClaim) {
      setState("loading");
      overlay.showLoading(anchorRect, textClaim);
      run({ kind: "text", text: textClaim }, textClaim, anchorRect, setState, buttonEl);
      return;
    }

    if (!mediaEl) {
      setState("no-claim");
      return;
    }

    if (isAudibleVideo) {
      setState("loading");
      overlay.showLoading(anchorRect, "Listening…");
      run({ kind: "audio" }, "Audio claim", anchorRect, setState, buttonEl);
      return;
    }

    setState("loading");
    overlay.showLoading(anchorRect, "Reading image…");
    run(
      { kind: "media-rect", rect: elementRect(mediaEl), devicePixelRatio: window.devicePixelRatio || 1 },
      "Image claim",
      anchorRect,
      setState,
      buttonEl,
    );
  });

  buttonEl.style.setProperty("position", "fixed", "important");
  buttonEl.style.setProperty("bottom", "20px", "important");
  buttonEl.style.setProperty("right", "20px", "important");
  buttonEl.style.setProperty("z-index", "2147483647", "important");
  buttonEl.style.margin = "0";

  document.body.appendChild(buttonEl);
}