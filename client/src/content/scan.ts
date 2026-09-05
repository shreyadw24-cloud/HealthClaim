import type { SiteAdapter } from "./extract";
import { getSelectedTextWithin } from "./extract";
import type { ClaimPayload } from "./types";
import { createVerifyButton } from "./button";
import { ResultOverlay } from "./overlay";
import { requestVerification } from "./messaging";

// Marks posts we've already injected a button into, so re-running the scan
// after a MutationObserver tick doesn't double-inject.
const PROCESSED = new WeakSet<Element>();
const overlay = new ResultOverlay();

function resolvePostUrl(postEl: HTMLElement): string | undefined {
  const link = postEl.querySelector<HTMLAnchorElement>(
    'a[href*="/status/"], a[href*="/p/"], a[href*="/comments/"], a[href*="/watch?v="], a[href*="/shorts/"], a[href*="/video/"], a[href*="/posts/"], a[href*="/post/"], a[href*="/feed/update/"], a[href*="/videos/"], a[href*="/photo/"]',
  );
  if (link?.href) return link.href;
  // YouTube watch pages and TikTok video pages are single-item pages, not a
  // feed of many posts — the current page *is* the post, so fall back to it
  // when nothing inside the matched element links back to itself (e.g. a
  // comment thread doesn't contain a link to its own video).
  if (/(^|\.)youtube\.com$/.test(location.hostname) || /(^|\.)tiktok\.com$/.test(location.hostname)) {
    return location.href;
  }
  return undefined;
}

function elementRect(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}

function handleVerifyClick(adapter: SiteAdapter, postEl: HTMLElement, buttonEl: HTMLElement, setState: (s: "idle" | "loading" | "no-claim") => void) {
  const selected = getSelectedTextWithin(postEl);
  const textClaim = selected ?? adapter.getClaimText(postEl);
  const anchorRect = buttonEl.getBoundingClientRect();

  // Fallback chain: selected/caption text first, then a screenshot of the
  // post's image or video frame, then give up with "no-claim".
  if (textClaim) {
    runVerification(adapter, postEl, buttonEl, setState, { kind: "text", text: textClaim }, textClaim);
    return;
  }

  const mediaEl = adapter.getClaimMedia?.(postEl);
  if (!mediaEl) {
    setState("no-claim");
    return;
  }

  // A video that's actually playing with sound is more likely to carry its
  // claim as spoken narration than as on-screen text — screenshotting a
  // frame of it would miss the claim entirely, so record a few seconds of
  // tab audio instead and let Gemini transcribe + extract from that.
  const isAudibleVideo =
    mediaEl instanceof HTMLVideoElement && !mediaEl.muted && !mediaEl.paused && mediaEl.currentTime > 0;

  if (isAudibleVideo) {
    setState("loading");
    overlay.showLoading(anchorRect, "Listening…");
    runVerification(adapter, postEl, buttonEl, setState, { kind: "audio" }, "Audio claim");
    return;
  }

  const payload: ClaimPayload = {
    kind: "media-rect",
    rect: elementRect(mediaEl),
    devicePixelRatio: window.devicePixelRatio || 1,
  };
  setState("loading");
  overlay.showLoading(anchorRect, "Reading image…");
  runVerification(adapter, postEl, buttonEl, setState, payload, "Image claim");
}

function runVerification(
  adapter: SiteAdapter,
  postEl: HTMLElement,
  buttonEl: HTMLElement,
  setState: (s: "idle" | "loading" | "no-claim") => void,
  payload: ClaimPayload,
  displayClaim: string,
) {
  if (payload.kind === "text") {
    setState("loading");
    overlay.showLoading(buttonEl.getBoundingClientRect(), displayClaim);
  }

  requestVerification(payload, resolvePostUrl(postEl))
    .then((result) => {
      setState("idle");
      overlay.showResult(buttonEl.getBoundingClientRect(), displayClaim, result);
    })
    .catch((err: Error) => {
      setState("idle");
      overlay.showError(buttonEl.getBoundingClientRect(), err.message || "Verification failed.", () =>
        handleVerifyClick(adapter, postEl, buttonEl, setState),
      );
    });
}

function injectButtonForPost(adapter: SiteAdapter, postEl: Element) {
  if (PROCESSED.has(postEl)) return;
  const anchor = adapter.getAnchorEl(postEl as HTMLElement);
  if (!anchor) return;

  PROCESSED.add(postEl);

  const { el: buttonEl, setState } = createVerifyButton(() => {
    handleVerifyClick(adapter, postEl as HTMLElement, buttonEl, setState);
  });

  anchor.appendChild(buttonEl);
}

export function scanForPosts(adapter: SiteAdapter) {
  const posts = document.querySelectorAll(adapter.postSelector);
  posts.forEach((post) => injectButtonForPost(adapter, post));
}

/**
 * Watches for new posts being added to the DOM (infinite scroll / dynamically
 * loaded feeds) and injects buttons into them as they appear. Debounced so a
 * burst of DOM mutations (typical during fast scrolling) only triggers one
 * scan pass.
 */
export function observeFeed(adapter: SiteAdapter): () => void {
  let debounceHandle: ReturnType<typeof setTimeout> | null = null;

  const observer = new MutationObserver(() => {
    if (debounceHandle) clearTimeout(debounceHandle);
    debounceHandle = setTimeout(() => scanForPosts(adapter), 200);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  return () => observer.disconnect();
}