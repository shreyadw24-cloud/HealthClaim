import { detectAdapter } from "./extract";
import { scanForPosts, observeFeed } from "./scan";
import { injectMetaFallbackButton } from "./meta-fallback";

function init() {
  const adapter = detectAdapter();

  // Initial pass over whatever's already on the page.
  scanForPosts(adapter);

  // Then keep watching as the feed loads more posts (infinite scroll, SPA
  // route changes, lazy-rendered content, etc).
  observeFeed(adapter);

  // Instagram permalink pages (instagram.com/p/... or /reel/...) opened
  // while logged out — e.g. clicking a Google search result — often don't
  // render the normal <article> feed markup at all (login wall / stripped
  // page). Give the normal adapter a moment, then fall back to a floating
  // button built from the page's meta tags if nothing got injected.
  if (/(^|\.)instagram\.com$/.test(location.hostname) && /\/(p|reel|reels)\//.test(location.pathname)) {
    setTimeout(() => {
      if (!document.querySelector("healthclaim-button")) {
        injectMetaFallbackButton();
      }
    }, 1500);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}