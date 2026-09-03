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
};

const HOST_ADAPTERS: { test: RegExp; adapter: SiteAdapter }[] = [
  { test: /(^|\.)x\.com$|(^|\.)twitter\.com$/, adapter: twitterAdapter },
  { test: /(^|\.)instagram\.com$/, adapter: instagramAdapter },
  { test: /(^|\.)reddit\.com$/, adapter: redditAdapter },
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
