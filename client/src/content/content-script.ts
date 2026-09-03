import { detectAdapter } from "./extract";
import { scanForPosts, observeFeed } from "./scan";

function init() {
  const adapter = detectAdapter();

  // Initial pass over whatever's already on the page.
  scanForPosts(adapter);

  // Then keep watching as the feed loads more posts (infinite scroll, SPA
  // route changes, lazy-rendered content, etc).
  observeFeed(adapter);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
