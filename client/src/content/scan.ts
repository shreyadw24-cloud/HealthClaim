import type { SiteAdapter } from "./extract";
import { getSelectedTextWithin } from "./extract";
import { createVerifyButton } from "./button";
import { ResultOverlay } from "./overlay";
import { requestVerification } from "./messaging";

// Marks posts we've already injected a button into, so re-running the scan
// after a MutationObserver tick doesn't double-inject.
const PROCESSED = new WeakSet<Element>();
const overlay = new ResultOverlay();

function resolvePostUrl(postEl: HTMLElement): string | undefined {
  const link = postEl.querySelector<HTMLAnchorElement>('a[href*="/status/"], a[href*="/p/"], a[href*="/comments/"]');
  return link?.href;
}

function handleVerifyClick(adapter: SiteAdapter, postEl: HTMLElement, buttonEl: HTMLElement, setState: (s: "idle" | "loading" | "no-claim") => void) {
  const selected = getSelectedTextWithin(postEl);
  const claim = selected ?? adapter.getClaimText(postEl);

  if (!claim) {
    setState("no-claim");
    return;
  }

  const anchorRect = buttonEl.getBoundingClientRect();
  setState("loading");
  overlay.showLoading(anchorRect, claim);

  requestVerification(claim, resolvePostUrl(postEl))
    .then((result) => {
      setState("idle");
      overlay.showResult(buttonEl.getBoundingClientRect(), claim, result);
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
