// ── Claim extraction ─────────────────────────────────────────────────────────
// Each supported platform gets a small adapter: how to find posts on the page,
// how to pull the claim text out of a post, and where to anchor the button.
// Anything not covered by a named adapter falls back to `genericAdapter`, which
// works on plain text/article pages (per the plan: "start with one platform,
// then generalize").

export interface SiteAdapter {
  id: string;
  /** CSS selector matching one "post" (tweet, caption, article, etc). */
  postSelector: string;
  /** Pulls the raw claim text out of a matched post element, or null if none found. */
  getClaimText: (postEl: HTMLElement) => string | null;
  /** Element the verify button should be anchored next to inside the post. */
  getAnchorEl: (postEl: HTMLElement) => HTMLElement | null;
  /**
   * Image or video element to screenshot when getClaimText() finds no text
   * (e.g. an infographic post, or a Reel/Short with no caption). Optional —
   * platforms without this fall straight to "no-claim" when there's no text.
   */
  getClaimMedia?: (postEl: HTMLElement) => HTMLImageElement | HTMLVideoElement | null;
}

function cleanText(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

// Loose sanity check so we don't offer to "verify" empty posts, UI chrome text,
// or absurdly long walls of text (e.g. an entire comment thread).
function isLikelyClaim(text: string): boolean {
  const trimmed = cleanText(text);
  if (trimmed.length < 20) return false;
  if (trimmed.length > 2000) return false;
  return true;
}

const twitterAdapter: SiteAdapter = {
  id: "twitter",
  postSelector: 'article[data-testid="tweet"]',
  getClaimText(postEl) {
    const textEl = postEl.querySelector<HTMLElement>('[data-testid="tweetText"]');
    const text = textEl?.textContent ?? "";
    return isLikelyClaim(text) ? cleanText(text) : null;
  },
  getAnchorEl(postEl) {
    return postEl.querySelector<HTMLElement>('[role="group"]') ?? postEl;
  },
  getClaimMedia(postEl) {
    return (
      postEl.querySelector<HTMLVideoElement>("video") ??
      postEl.querySelector<HTMLImageElement>('[data-testid="tweetPhoto"] img')
    );
  },
};

const instagramAdapter: SiteAdapter = {
  id: "instagram",
  postSelector: "article",
  getClaimText(postEl) {
    const caption = postEl.querySelector<HTMLElement>(
      'h1, [data-testid="post-caption"], ul li span, div[role="button"] + div span',
    );
    const text = caption?.textContent ?? "";
    return isLikelyClaim(text) ? cleanText(text) : null;
  },
  getAnchorEl(postEl) {
    return postEl.querySelector<HTMLElement>("section") ?? postEl;
  },
  getClaimMedia(postEl) {
    return (
      postEl.querySelector<HTMLVideoElement>("video") ??
      postEl.querySelector<HTMLImageElement>("img[srcset]")
    );
  },
};

const redditAdapter: SiteAdapter = {
  id: "reddit",
  postSelector: 'shreddit-post, div[data-testid="post-container"]',
  getClaimText(postEl) {
    const body = postEl.querySelector<HTMLElement>(
      '[slot="text-body"], [data-testid="post-content"] p, h1, h3',
    );
    const text = body?.textContent ?? postEl.getAttribute("post-title") ?? "";
    return isLikelyClaim(text) ? cleanText(text) : null;
  },
  getAnchorEl(postEl) {
    return postEl.querySelector<HTMLElement>('[slot="text-body"], [data-testid="post-content"]') ?? postEl;
  },
  getClaimMedia(postEl) {
    return (
      postEl.querySelector<HTMLVideoElement>("shreddit-player video, video") ??
      postEl.querySelector<HTMLImageElement>('[slot="post-media-container"] img, img')
    );
  },
};

// Text-only for now: pulls the video's title/description/comment text, the
// same way the other adapters pull post text. Actually transcribing spoken
// audio from the video itself is a separate, bigger piece of work — tracked
// as a follow-up, not covered here.
//
// ⚠️ YouTube and TikTok change their DOM (class names, data-* attributes)
// often and without notice. If posts stop being detected, re-check these
// selectors against the live page in DevTools before assuming the adapter
// logic itself is broken.
const youtubeAdapter: SiteAdapter = {
  id: "youtube",
  postSelector: "ytd-watch-metadata, #description, ytd-comment-thread-renderer",
  getClaimText(postEl) {
    const text = postEl.textContent ?? "";
    return isLikelyClaim(text) ? cleanText(text) : null;
  },
  getAnchorEl(postEl) {
    return postEl.querySelector<HTMLElement>("#top-row") ?? postEl;
  },
  getClaimMedia() {
    // The player isn't inside postEl (postEl is the metadata/description/
    // comment block) — it's the single main player on the page, so we
    // query the document directly instead of postEl.
    return document.querySelector<HTMLVideoElement>("video.html5-main-video, #movie_player video");
  },
};

const tiktokAdapter: SiteAdapter = {
  id: "tiktok",
  postSelector: '[data-e2e="browse-video-desc"], [data-e2e="video-desc"]',
  getClaimText(postEl) {
    const text = postEl.textContent ?? "";
    return isLikelyClaim(text) ? cleanText(text) : null;
  },
  getAnchorEl(postEl) {
    return postEl;
  },
  getClaimMedia(postEl) {
    // postEl here is just the description text, not the video container —
    // walk up to the nearest feed item and look for the player inside it,
    // falling back to whatever video is currently on screen.
    const container = postEl.closest<HTMLElement>('[data-e2e="feed-item"], [data-e2e="recommend-list-item-container"]');
    return (
      container?.querySelector<HTMLVideoElement>("video") ??
      document.querySelector<HTMLVideoElement>("video")
    );
  },
};

// Meta's other two apps (Facebook, Threads) share the same underlying
// component library as Instagram, so `[role="article"]` is the most stable
// thing to key off — Meta obfuscates class names on every deploy, but the
// ARIA role has stayed put across redesigns so far.
const facebookAdapter: SiteAdapter = {
  id: "facebook",
  postSelector: 'div[role="article"]',
  getClaimText(postEl) {
    const body = postEl.querySelector<HTMLElement>('[data-ad-preview="message"]') ?? postEl;
    const text = body.textContent ?? "";
    return isLikelyClaim(text) ? cleanText(text) : null;
  },
  getAnchorEl(postEl) {
    return postEl;
  },
  getClaimMedia(postEl) {
    return (
      postEl.querySelector<HTMLVideoElement>("video") ??
      postEl.querySelector<HTMLImageElement>('img[referrerpolicy="origin-when-cross-origin"]')
    );
  },
};

const threadsAdapter: SiteAdapter = {
  id: "threads",
  postSelector: 'div[role="article"]',
  getClaimText(postEl) {
    const text = postEl.textContent ?? "";
    return isLikelyClaim(text) ? cleanText(text) : null;
  },
  getAnchorEl(postEl) {
    return postEl;
  },
  getClaimMedia(postEl) {
    return (
      postEl.querySelector<HTMLVideoElement>("video") ??
      postEl.querySelector<HTMLImageElement>("img")
    );
  },
};

const linkedinAdapter: SiteAdapter = {
  id: "linkedin",
  postSelector: "div.feed-shared-update-v2, div[data-urn]",
  getClaimText(postEl) {
    const body = postEl.querySelector<HTMLElement>(".feed-shared-inline-show-more-text, .feed-shared-text");
    const text = body?.textContent ?? postEl.textContent ?? "";
    return isLikelyClaim(text) ? cleanText(text) : null;
  },
  getAnchorEl(postEl) {
    return postEl.querySelector<HTMLElement>(".feed-shared-social-action-bar") ?? postEl;
  },
  getClaimMedia(postEl) {
    return (
      postEl.querySelector<HTMLVideoElement>("video") ??
      postEl.querySelector<HTMLImageElement>(".feed-shared-image img, .update-components-image img")
    );
  },
};

// Fallback: treats any standalone <article> / <p> block of readable length as
// a candidate claim. Good enough for blog posts, news pages, and any platform
// we don't have a dedicated adapter for yet.
const genericAdapter: SiteAdapter = {
  id: "generic",
  postSelector: "article, main p",
  getClaimText(postEl) {
    const text = postEl.textContent ?? "";
    return isLikelyClaim(text) ? cleanText(text) : null;
  },
  getAnchorEl(postEl) {
    return postEl;
  },
  getClaimMedia(postEl) {
    return (
      postEl.querySelector<HTMLVideoElement>("video") ??
      postEl.querySelector<HTMLImageElement>("img")
    );
  },
};

const HOST_ADAPTERS: { test: RegExp; adapter: SiteAdapter }[] = [
  { test: /(^|\.)x\.com$|(^|\.)twitter\.com$/, adapter: twitterAdapter },
  { test: /(^|\.)instagram\.com$/, adapter: instagramAdapter },
  { test: /(^|\.)reddit\.com$/, adapter: redditAdapter },
  { test: /(^|\.)youtube\.com$/, adapter: youtubeAdapter },
  { test: /(^|\.)tiktok\.com$/, adapter: tiktokAdapter },
  { test: /(^|\.)facebook\.com$/, adapter: facebookAdapter },
  { test: /(^|\.)threads\.net$/, adapter: threadsAdapter },
  { test: /(^|\.)linkedin\.com$/, adapter: linkedinAdapter },
];

export function detectAdapter(hostname: string = location.hostname): SiteAdapter {
  const match = HOST_ADAPTERS.find(({ test }) => test.test(hostname));
  return match ? match.adapter : genericAdapter;
}

/**
 * Handles the "multiple claims in one post" edge case: if the user has
 * highlighted a specific sentence inside the post before clicking Verify,
 * prefer that over the whole post's text.
 */
export function getSelectedTextWithin(postEl: HTMLElement): string | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return null;
  const text = selection.toString();
  if (!postEl.contains(selection.anchorNode)) return null;
  return isLikelyClaim(text) ? cleanText(text) : null;
}

export { cleanText, isLikelyClaim };