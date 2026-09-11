import { createVerifyButton } from "./button";
import { ResultOverlay } from "./overlay";
import { requestVerification } from "./messaging";
import { cleanText } from "./extract";

// Instagram always writes Open Graph tags into <head> for link-preview
// purposes — even on the stripped-down / login-wall page you land on when
// opening a post from a Google search result while logged out, where the
// normal <article> feed markup never renders. We use those tags instead of
// trying to anchor inline, so this fallback doesn't depend on guessing
// Instagram's DOM structure at all.
function metaContent(prop: string): string | null {
  const el = document.querySelector<HTMLMetaElement>(`meta[property="${prop}"], meta[name="${prop}"]`);
  const content = el?.content?.trim();
  return content ? content : null;
}

let injected = false;

export function injectMetaFallbackButton() {
  if (injected) return;
  injected = true;

  const overlay = new ResultOverlay();
  const rawText = metaContent("og:description") ?? metaContent("description") ?? document.title;
  const claimText = rawText ? cleanText(rawText) : null;

  const { el: buttonEl, setState } = createVerifyButton(() => {
    const anchorRect = buttonEl.getBoundingClientRect();
    if (!claimText) {
      setState("no-claim");
      return;
    }
    setState("loading");
    overlay.showLoading(anchorRect, claimText);
    requestVerification({ kind: "text", text: claimText }, location.href)
      .then((result) => {
        setState("idle");
        overlay.showResult(buttonEl.getBoundingClientRect(), claimText, result);
      })
      .catch((err: Error & { noHealthClaim?: boolean }) => {
        setState("idle");
        if (err.noHealthClaim) {
          overlay.showNoClaim(buttonEl.getBoundingClientRect(), err.message, () => setState("idle"));
          return;
        }
        overlay.showError(buttonEl.getBoundingClientRect(), err.message || "Verification failed.", () =>
          buttonEl.click(),
        );
      });
  });

  buttonEl.style.setProperty("position", "fixed", "important");
  buttonEl.style.setProperty("bottom", "20px", "important");
  buttonEl.style.setProperty("right", "20px", "important");
  buttonEl.style.setProperty("z-index", "2147483647", "important");
  buttonEl.style.margin = "0";

  document.body.appendChild(buttonEl);
}