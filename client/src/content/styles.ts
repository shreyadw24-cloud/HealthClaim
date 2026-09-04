// ── Injected UI styling ──────────────────────────────────────────────────────
// The content script renders into its own Shadow DOM (per element) so host
// page CSS can't bleed in and our styles can't bleed out. No Tailwind at
// runtime here — just the same brand tokens App.tsx uses, as plain CSS,
// scoped to the shadow root.

export const BRAND = {
  navy: "#0B1F3A",
  teal: "#20B2AA",
  tealLight: "#3ED6C9",
  tealDark: "#178F88",
  cream: "#EAF6F4",
  card: "#FFFFFF",
  rose: "#fb7185",
  roseDark: "#be123c",
  emerald: "#34d399",
  emeraldDark: "#10b981",
  amber: "#fbbf24",
} as const;

export const FONT_LINK_HREF =
  "https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600&family=Inter:wght@400;500;600&display=swap";

export function injectFontLink(root: ShadowRoot | Document) {
  if (root.querySelector(`link[href="${FONT_LINK_HREF}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = FONT_LINK_HREF;
  root instanceof ShadowRoot ? root.appendChild(link) : root.head.appendChild(link);
}

export const BASE_CSS = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  .hc-root {
    font-family: 'Inter', system-ui, sans-serif;
    color: ${BRAND.navy};
  }
  .hc-serif { font-family: 'Fraunces', Georgia, serif; }
`;

export const BUTTON_CSS = `
  ${BASE_CSS}
  .hc-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    border-radius: 999px;
    border: 1px solid rgba(32,178,170,0.45);
    background: rgba(32,178,170,0.08);
    color: ${BRAND.navy};
    font-size: 11.5px;
    font-weight: 500;
    cursor: pointer;
    line-height: 1;
    transition: background 0.15s ease, transform 0.1s ease;
  }
  .hc-btn:hover { background: rgba(32,178,170,0.18); }
  .hc-btn:active { transform: scale(0.97); }
  .hc-btn[disabled] { opacity: 0.55; cursor: default; }
  .hc-btn-dot {
    width: 6px; height: 6px; border-radius: 999px;
    background: ${BRAND.teal};
    flex: none;
  }
  .hc-btn-spinner {
    width: 11px; height: 11px; border-radius: 999px;
    border: 1.5px solid rgba(11,31,58,0.2);
    border-top-color: ${BRAND.navy};
    animation: hc-spin 0.7s linear infinite;
    flex: none;
  }
  @keyframes hc-spin { to { transform: rotate(360deg); } }
`;

export const OVERLAY_CSS = `
  ${BASE_CSS}
  .hc-overlay {
    position: fixed;
    width: 320px;
    max-height: 420px;
    overflow-y: auto;
    background: ${BRAND.card};
    border-radius: 16px;
    border: 1px solid rgba(11,31,58,0.08);
    box-shadow: 0 1px 2px rgba(11,31,58,0.06), 0 16px 40px -12px rgba(11,31,58,0.28);
    z-index: 2147483647;
    padding: 14px 16px 16px;
    opacity: 0;
    transform: translateY(4px);
    transition: opacity 0.15s ease, transform 0.15s ease;
  }
  .hc-overlay.hc-visible { opacity: 1; transform: translateY(0); }
  .hc-overlay-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 10px;
  }
  .hc-brand { display: flex; align-items: center; gap: 6px; font-size: 12px; opacity: 0.6; font-weight: 500; }
  .hc-close {
    width: 20px; height: 20px; border-radius: 999px; border: 1px solid rgba(11,31,58,0.12);
    background: transparent; color: rgba(11,31,58,0.45); cursor: pointer;
    display: flex; align-items: center; justify-content: center; font-size: 11px; line-height: 1;
  }
  .hc-close:hover { background: rgba(11,31,58,0.05); }
  .hc-claim {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 13.5px;
    line-height: 1.5;
    opacity: 0.88;
    margin-bottom: 10px;
  }
  .hc-pill {
    display: inline-block;
    font-size: 10.5px;
    font-weight: 500;
    padding: 3px 9px;
    border-radius: 999px;
    margin-bottom: 8px;
  }
  .hc-bar-track {
    height: 3px; border-radius: 999px; background: rgba(11,31,58,0.08);
    overflow: hidden; margin-bottom: 10px;
  }
  .hc-bar-fill { height: 100%; border-radius: 999px; }
  .hc-explanation {
    font-size: 11.5px; line-height: 1.65; opacity: 0.65; margin-bottom: 10px;
  }
  .hc-sources-label {
    font-size: 9px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em;
    opacity: 0.35; margin-bottom: 6px;
  }
  .hc-sources { display: flex; flex-wrap: wrap; gap: 6px; }
  .hc-source-chip {
    font-size: 10.5px; padding: 4px 8px; border-radius: 999px;
    background: rgba(11,31,58,0.04); border: 1px solid rgba(11,31,58,0.09);
    text-decoration: none; color: ${BRAND.navy}; opacity: 0.75;
  }
  .hc-source-chip:hover { opacity: 1; background: rgba(11,31,58,0.08); }
  .hc-loading { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 20px 4px; }
  .hc-loading-text { font-size: 11.5px; opacity: 0.55; }
  .hc-ring {
    width: 28px; height: 28px; border-radius: 999px;
    border: 2px solid rgba(32,178,170,0.25); border-top-color: ${BRAND.teal};
    animation: hc-spin 0.8s linear infinite;
  }
  .hc-error { font-size: 12px; padding: 10px 2px; opacity: 0.7; }
  .hc-retry {
    margin-top: 8px; font-size: 11px; font-weight: 500; color: ${BRAND.navy};
    background: rgba(11,31,58,0.05); border: 1px solid rgba(11,31,58,0.1);
    border-radius: 8px; padding: 5px 10px; cursor: pointer;
  }
`;