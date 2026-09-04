import { OVERLAY_CSS, injectFontLink } from "./styles";
import type { VerifyResult } from "./types";

// Same verdict → color mapping as STATUS_STYLE in App.tsx (kept in sync by hand
// since this file can't import from the React app's module tree).
const STATUS_STYLE: Record<
  VerifyResult["verdict"],
  { pillBg: string; pillText: string; pillBorder: string; barFrom: string; barTo: string; barWidth: string; borderColor: string; accentText: string }
> = {
  Supported: {
    pillBg: "#E8F7F5", pillText: "#0F6E56", pillBorder: "rgba(32,178,170,0.3)",
    barFrom: "#20B2AA", barTo: "#3ED6C9", barWidth: "88%",
    borderColor: "#20B2AA", accentText: "#0F6E56",
  },
  "Partially Supported": {
    pillBg: "#FDF3E3", pillText: "#854F0B", pillBorder: "rgba(239,159,39,0.35)",
    barFrom: "#EF9F27", barTo: "#FBC96B", barWidth: "58%",
    borderColor: "#EF9F27", accentText: "#854F0B",
  },
  "Insufficient Evidence": {
    pillBg: "#F1F1EF", pillText: "#57564F", pillBorder: "rgba(87,86,79,0.25)",
    barFrom: "#9a988e", barTo: "#c7c5ba", barWidth: "35%",
    borderColor: "#9a988e", accentText: "#57564F",
  },
  "Potentially Harmful": {
    pillBg: "#FCEBEB", pillText: "#A32D2D", pillBorder: "rgba(226,75,74,0.3)",
    barFrom: "#E24B4A", barTo: "#F09595", barWidth: "8%",
    borderColor: "#E24B4A", accentText: "#A32D2D",
  },
};

const LOADING_MSGS = ["Extracting claim…", "Retrieving evidence…", "Analyzing…"];

// Same 16px pulse-mark SVG used everywhere in the popup (LogoBadge/PulseIcon).
function pulseSvg(width: number, height: number, strokeWidth: number): string {
  return `<svg width="${width}" height="${height}" viewBox="0 0 92 48" fill="none">
    <polyline class="hc-pulse-line" points="0,24 16,24 22,10 28,38 34,4 40,24 92,24" stroke="#FFFFFF" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`;
}

/**
 * A single, reused overlay instance. There's only ever one open at a time —
 * clicking a different post's button repositions and repopulates it, which
 * keeps the DOM footprint small even on pages with hundreds of posts.
 *
 * Visually this mirrors the extension popup's Loading/Result/Error screens
 * (same colors, fonts, spacing, and animations) so the experience feels like
 * one continuous product whether it's opened inline or from the toolbar icon.
 */
export class ResultOverlay {
  private host: HTMLElement;
  private shadow: ShadowRoot;
  private card: HTMLDivElement;
  private loadingTimer: ReturnType<typeof setInterval> | null = null;
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
    const width = 340;
    let left = anchorRect.left;
    if (left + width + margin > window.innerWidth) {
      left = Math.max(margin, window.innerWidth - width - margin);
    }
    let top = anchorRect.bottom + margin;
    const estimatedHeight = 420;
    if (top + estimatedHeight > window.innerHeight) {
      top = Math.max(margin, anchorRect.top - margin - estimatedHeight);
    }
    this.card.style.left = `${left}px`;
    this.card.style.top = `${top}px`;
  }

  private header(): string {
    return `
      <div class="hc-topbar"></div>
      <div class="hc-overlay-header">
        <div class="hc-brand">
          <div class="hc-badge-sm">${pulseSvg(16, 9, 4)}</div>
          <span class="hc-wordmark">HealthClaim</span>
        </div>
        <button class="hc-close" aria-label="Close">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" />
            <line x1="8.5" y1="1.5" x2="1.5" y2="8.5" />
          </svg>
        </button>
      </div>
    `;
  }

  private bindClose() {
    this.card.querySelector<HTMLButtonElement>(".hc-close")?.addEventListener("click", () => this.hide());
  }

  private stopLoadingTimer() {
    if (this.loadingTimer) {
      clearInterval(this.loadingTimer);
      this.loadingTimer = null;
    }
  }

  showLoading(anchorRect: DOMRect, claim: string) {
    this.stopLoadingTimer();
    this.position(anchorRect);
    this.card.innerHTML = `
      ${this.header()}
      <div class="hc-body" style="padding-bottom:0;">
        <div class="hc-claim-card">
          <div class="hc-claim-label-row">
            <span class="hc-claim-label">Claim Detected</span>
            <div class="hc-claim-rule"></div>
          </div>
          <p class="hc-claim">${escapeHtml(truncate(claim, 160))}</p>
        </div>
      </div>
      <div class="hc-loading">
        <div class="hc-rings">
          <div class="hc-ring-out"></div>
          <div class="hc-ring-mid"></div>
          <div class="hc-badge-lg">${pulseSvg(30, 16, 2.5)}</div>
        </div>
        <p class="hc-loading-msg">${LOADING_MSGS[0]}</p>
        <div class="hc-dots">
          ${LOADING_MSGS.map((_, i) => `<div class="hc-dot${i === 0 ? " hc-active" : ""}"></div>`).join("")}
        </div>
        <div class="hc-cross-checking">
          <span class="hc-cc-label">Cross-checking</span>
          <span class="hc-cc-source">WHO</span>
          <span class="hc-cc-source">CDC</span>
          <span class="hc-cc-source">NIH</span>
        </div>
      </div>
    `;
    this.bindClose();
    this.show();

    let idx = 0;
    const msgEl = this.card.querySelector<HTMLParagraphElement>(".hc-loading-msg");
    const dotEls = this.card.querySelectorAll<HTMLDivElement>(".hc-dot");
    this.loadingTimer = setInterval(() => {
      idx = (idx + 1) % LOADING_MSGS.length;
      if (msgEl) msgEl.textContent = LOADING_MSGS[idx];
      dotEls.forEach((dot, i) => dot.classList.toggle("hc-active", i === idx));
    }, 2200);
  }

  showResult(anchorRect: DOMRect, claim: string, result: VerifyResult) {
    this.stopLoadingTimer();
    this.position(anchorRect);
    const v = STATUS_STYLE[result.verdict];
    const barWidth =
      typeof result.confidence === "number" && !Number.isNaN(result.confidence)
        ? `${Math.round(Math.max(0, Math.min(1, result.confidence)) * 100)}%`
        : v.barWidth;
    const isHarmful = result.verdict === "Potentially Harmful" || result.verdict === "Insufficient Evidence";

    const SOURCES_PREVIEW_COUNT = 3;
    const sourceChip = (s: VerifyResult["sources"][number]) =>
      `<a class="hc-source-chip" href="${escapeAttr(s.url)}" target="_blank" rel="noopener noreferrer">
        <div class="hc-source-name">${escapeHtml(s.name)}</div>
        <div class="hc-source-caption">Evidence source</div>
      </a>`;
    const previewSources = result.sources.slice(0, SOURCES_PREVIEW_COUNT);
    const hiddenSources = result.sources.slice(SOURCES_PREVIEW_COUNT);
    const sourcesHtml = previewSources.map(sourceChip).join("");
    const hiddenSourcesHtml = hiddenSources.map(sourceChip).join("");

    // "Explain simply" reuses the same explanation field the backend already
    // sends — just breaks it into short, plain sentences instead of one
    // dense paragraph. No extra API call needed.
    const explanationSentences =
      result.explanation
        .match(/[^.!?]+[.!?]*/g)
        ?.map((t) => t.trim())
        .filter(Boolean) ?? [result.explanation];
    const explanationFullHtml = `<p class="hc-explanation">${escapeHtml(result.explanation)}</p>`;
    const explanationSimpleHtml = `<ul class="hc-explanation-list" style="color:${v.accentText}">${explanationSentences
      .map((sentence) => `<li><span>${escapeHtml(sentence)}</span></li>`)
      .join("")}</ul>`;

    this.card.innerHTML = `
      ${this.header()}
      <div class="hc-body">
        <div class="hc-claim-card">
          <div class="hc-claim-label-row">
            <span class="hc-claim-label">Claim Detected</span>
            <div class="hc-claim-rule"></div>
          </div>
          <p class="hc-claim">${escapeHtml(truncate(claim, 160))}</p>
        </div>

        <div class="hc-status-block">
          <span class="hc-pill" style="background:${v.pillBg};color:${v.pillText};border:1px solid ${v.pillBorder}">${escapeHtml(result.verdict)}</span>
          <span class="hc-confidence-label">Evidence confidence</span>
          <div class="hc-bar-track">
            <div class="hc-bar-fill" style="width:${barWidth};background:linear-gradient(90deg, ${v.barFrom}, ${v.barTo})"></div>
          </div>
        </div>

        <div class="hc-evidence-block" style="border-color:${v.borderColor}">
          <p class="hc-evidence-label" style="color:${v.accentText}">What Evidence Says</p>
          <div class="hc-explanation-slot">${explanationFullHtml}</div>
        </div>

        <div class="hc-accordion">
          <button class="hc-accordion-btn">
            <span>${isHarmful ? "Why is this harmful?" : "Nuances &amp; Caveats"}</span>
            <svg class="hc-accordion-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#9a988e" stroke-width="1.5" stroke-linecap="round">
              <path d="M2 4.5L6 8L10 4.5" />
            </svg>
          </button>
          <div class="hc-accordion-panel">
            <p class="hc-accordion-inner">${escapeHtml(result.explanation)}</p>
          </div>
        </div>

        ${
          result.sources.length
            ? `<p class="hc-sources-label">Evidence Sources</p><div class="hc-sources">${sourcesHtml}</div>${
                hiddenSources.length
                  ? `<button class="hc-sources-more">+${hiddenSources.length} more source${hiddenSources.length > 1 ? "s" : ""}</button>`
                  : ""
              }`
            : ""
        }
      </div>

      <div class="hc-overlay-footer">
        <button class="hc-footer-btn hc-btn-more" aria-label="More context">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
            <circle cx="8" cy="8" r="6.5" /><line x1="8" y1="6.5" x2="8" y2="11" /><circle cx="8" cy="4.8" r="0.6" fill="currentColor" />
          </svg>
          <span>More</span>
        </button>
        <button class="hc-footer-btn hc-btn-explain" aria-label="Explain simply">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
            <path d="M2 4.5h12M2 8h8.5M2 11.5h5.5" />
          </svg>
          <span>Explain</span>
        </button>
        <button class="hc-footer-btn hc-btn-share" aria-label="Share result">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
            <circle cx="12" cy="3" r="1.8" /><circle cx="3.5" cy="8" r="1.8" /><circle cx="12" cy="13" r="1.8" />
            <line x1="5.3" y1="7.1" x2="10.2" y2="3.9" /><line x1="5.3" y1="8.9" x2="10.2" y2="12.1" />
          </svg>
          <span>Share</span>
        </button>
      </div>
    `;
    this.bindClose();

    const accBtn = this.card.querySelector<HTMLButtonElement>(".hc-accordion-btn");
    const accPanel = this.card.querySelector<HTMLDivElement>(".hc-accordion-panel");
    const accChevron = this.card.querySelector<SVGElement>(".hc-accordion-chevron");
    accBtn?.addEventListener("click", () => {
      accPanel?.classList.toggle("hc-open");
      accChevron?.classList.toggle("hc-open");
    });

    // More context — reveal the rest of the evidence sources beyond the
    // initial 3-item preview.
    const moreBtn = this.card.querySelector<HTMLButtonElement>(".hc-btn-more");
    const moreSourcesBtn = this.card.querySelector<HTMLButtonElement>(".hc-sources-more");
    const sourcesRow = this.card.querySelector<HTMLDivElement>(".hc-sources");
    const expandSources = () => {
      if (!hiddenSources.length || !sourcesRow) return;
      sourcesRow.insertAdjacentHTML("beforeend", hiddenSourcesHtml);
      moreSourcesBtn?.remove();
      moreBtn?.classList.add("hc-active");
    };
    moreBtn?.addEventListener("click", expandSources);
    moreSourcesBtn?.addEventListener("click", expandSources);

    // Explain simply — swap the same explanation field between one dense
    // paragraph and a short-sentence bullet breakdown. No extra API call.
    const explainBtn = this.card.querySelector<HTMLButtonElement>(".hc-btn-explain");
    const explainLabel = explainBtn?.querySelector("span");
    const explanationSlot = this.card.querySelector<HTMLDivElement>(".hc-explanation-slot");
    let simpleMode = false;
    explainBtn?.addEventListener("click", () => {
      simpleMode = !simpleMode;
      if (explanationSlot) explanationSlot.innerHTML = simpleMode ? explanationSimpleHtml : explanationFullHtml;
      if (explainLabel) explainLabel.textContent = simpleMode ? "Full" : "Explain";
      explainBtn.classList.toggle("hc-active", simpleMode);
    });

    // Share result — native share sheet when available, otherwise copy a
    // short summary to the clipboard.
    const shareBtn = this.card.querySelector<HTMLButtonElement>(".hc-btn-share");
    const shareLabel = shareBtn?.querySelector("span");
    shareBtn?.addEventListener("click", async () => {
      const shareText = `"${truncate(claim, 160)}" — ${result.verdict} (checked with HealthClaim)`;
      if (navigator.share) {
        try {
          await navigator.share({ title: "HealthClaim result", text: shareText });
        } catch {
          // user dismissed the native share sheet — nothing to do
        }
        return;
      }
      try {
        await navigator.clipboard.writeText(shareText);
        if (shareLabel) {
          shareLabel.textContent = "Copied";
          shareBtn.classList.add("hc-active");
          setTimeout(() => {
            shareLabel.textContent = "Share";
            shareBtn.classList.remove("hc-active");
          }, 1800);
        }
      } catch {
        // clipboard blocked — silently ignore, button just won't confirm
      }
    });

    this.show();
  }

  showError(anchorRect: DOMRect, message: string, onRetry: () => void) {
    this.stopLoadingTimer();
    this.position(anchorRect);
    this.card.innerHTML = `
      ${this.header()}
      <div class="hc-error-block">
        <h2 class="hc-error-title">Couldn't verify this claim</h2>
        <p class="hc-error-msg">${escapeHtml(message)}</p>
        <button class="hc-retry">Try again</button>
      </div>
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
    this.stopLoadingTimer();
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