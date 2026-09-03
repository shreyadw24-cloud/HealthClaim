import { BRAND, OVERLAY_CSS, injectFontLink } from "./styles";
import type { VerifyResult } from "./types";

const VERDICT_STYLE: Record<VerifyResult["verdict"], { bg: string; fg: string; border: string; barFrom: string; barTo: string }> = {
  Supported: {
    bg: "rgba(52,211,153,0.12)",
    fg: BRAND.emeraldDark,
    border: "rgba(52,211,153,0.4)",
    barFrom: BRAND.emeraldDark,
    barTo: BRAND.emerald,
  },
  "Partially Supported": {
    bg: "rgba(251,191,36,0.14)",
    fg: "#b45309",
    border: "rgba(251,191,36,0.4)",
    barFrom: "#d97706",
    barTo: BRAND.amber,
  },
  "Insufficient Evidence": {
    bg: "rgba(11,31,58,0.06)",
    fg: "rgba(11,31,58,0.6)",
    border: "rgba(11,31,58,0.15)",
    barFrom: "rgba(11,31,58,0.4)",
    barTo: "rgba(11,31,58,0.2)",
  },
  "Potentially Harmful": {
    bg: "rgba(251,113,133,0.12)",
    fg: BRAND.roseDark,
    border: "rgba(251,113,133,0.4)",
    barFrom: BRAND.roseDark,
    barTo: BRAND.rose,
  },
};

const HARM_WIDTH: Record<VerifyResult["harmLevel"], string> = {
  Low: "18%",
  Medium: "55%",
  High: "90%",
};

/**
 * A single, reused overlay instance. There's only ever one open at a time —
 * clicking a different post's button repositions and repopulates it, which
 * keeps the DOM footprint small even on pages with hundreds of posts.
 */
export class ResultOverlay {
  private host: HTMLElement;
  private shadow: ShadowRoot;
  private card: HTMLDivElement;
  private outsideClickHandler = (e: MouseEvent) => {
    if (!this.host.contains(e.target as Node)) this.hide();
  };

  constructor() {
    this.host = document.createElement("healthclaim-overlay");
    this.host.style.setProperty("visibility", "visible", "important");
    this.host.style.setProperty("display", "block", "important");
    this.shadow = this.host.attachShadow({ mode: "open" });
    injectFontLink(this.shadow);

    const style = document.createElement("style");
    style.textContent = OVERLAY_CSS;
    this.shadow.appendChild(style);

    this.card = document.createElement("div");
    this.card.className = "hc-overlay hc-root";
    this.shadow.appendChild(this.card);

    document.documentElement.appendChild(this.host);
  }

  private position(anchorRect: DOMRect) {
    const margin = 8;
    const width = 320;
    let left = anchorRect.left;
    if (left + width + margin > window.innerWidth) {
      left = Math.max(margin, window.innerWidth - width - margin);
    }
    let top = anchorRect.bottom + margin;
    // Flip above the anchor if there isn't room below.
    if (top + 200 > window.innerHeight) {
      top = Math.max(margin, anchorRect.top - margin - 200);
    }
    this.card.style.left = `${left}px`;
    this.card.style.top = `${top}px`;
  }

  private header(): string {
    return `
      <div class="hc-overlay-header">
        <div class="hc-brand"><span class="hc-serif">HealthClaim</span></div>
        <button class="hc-close" aria-label="Close">✕</button>
      </div>
    `;
  }

  private bindClose() {
    this.card.querySelector<HTMLButtonElement>(".hc-close")?.addEventListener("click", () => this.hide());
  }

  showLoading(anchorRect: DOMRect, claim: string) {
    this.position(anchorRect);
    this.card.innerHTML = `
      ${this.header()}
      <p class="hc-claim">"${escapeHtml(truncate(claim, 160))}"</p>
      <div class="hc-loading">
        <div class="hc-ring"></div>
        <span class="hc-loading-text">Checking evidence…</span>
      </div>
    `;
    this.bindClose();
    this.show();
  }

  showResult(anchorRect: DOMRect, claim: string, result: VerifyResult) {
    this.position(anchorRect);
    const v = VERDICT_STYLE[result.verdict];
    const barWidth = HARM_WIDTH[result.harmLevel];
    const sourcesHtml = result.sources
      .map(
        (s) =>
          `<a class="hc-source-chip" href="${escapeAttr(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.name)}</a>`,
      )
      .join("");

    this.card.innerHTML = `
      ${this.header()}
      <p class="hc-claim">"${escapeHtml(truncate(claim, 160))}"</p>
      <span class="hc-pill" style="background:${v.bg};color:${v.fg};border:1px solid ${v.border}">${escapeHtml(result.verdict)}</span>
      <div class="hc-bar-track">
        <div class="hc-bar-fill" style="width:${barWidth};background:linear-gradient(90deg, ${v.barFrom}, ${v.barTo})"></div>
      </div>
      <p class="hc-explanation">${escapeHtml(result.explanation)}</p>
      ${
        result.sources.length
          ? `<p class="hc-sources-label">Evidence Sources</p><div class="hc-sources">${sourcesHtml}</div>`
          : ""
      }
    `;
    this.bindClose();
    this.show();
  }

  showError(anchorRect: DOMRect, message: string, onRetry: () => void) {
    this.position(anchorRect);
    this.card.innerHTML = `
      ${this.header()}
      <p class="hc-error">${escapeHtml(message)}</p>
      <button class="hc-retry">Try again</button>
    `;
    this.bindClose();
    this.card.querySelector<HTMLButtonElement>(".hc-retry")?.addEventListener("click", onRetry);
    this.show();
  }

  private show() {
    document.addEventListener("mousedown", this.outsideClickHandler, true);
    window.addEventListener("scroll", this.hideOnScroll, true);
    requestAnimationFrame(() => this.card.classList.add("hc-visible"));
  }

  private hideOnScroll = (e: Event) => {
    // Ignore scrolling inside the overlay card itself (e.g. a long explanation).
    if (e.target === this.card || this.card.contains(e.target as Node)) return;
    this.hide();
  };

  hide() {
    this.card.classList.remove("hc-visible");
    document.removeEventListener("mousedown", this.outsideClickHandler, true);
    window.removeEventListener("scroll", this.hideOnScroll, true);
  }
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/"/g, "&quot;");
}