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
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Inter:wght@400;500;600&display=swap";

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
    gap: 7px;
    padding: 6px 14px 6px 6px;
    border-radius: 999px;
    border: none;
    background: linear-gradient(135deg, ${BRAND.tealLight} 0%, ${BRAND.teal} 55%, ${BRAND.tealDark} 100%);
    color: #FFFFFF;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.01em;
    cursor: pointer;
    line-height: 1;
    box-shadow: 0 6px 16px -4px rgba(32,178,170,0.55), 0 1px 2px rgba(11,31,58,0.08);
    transition: box-shadow 0.15s ease, transform 0.1s ease, filter 0.15s ease;
  }
  .hc-btn:hover { filter: brightness(1.05); box-shadow: 0 8px 20px -4px rgba(32,178,170,0.65), 0 1px 2px rgba(11,31,58,0.08); }
  .hc-btn:active { transform: scale(0.97); }
  .hc-btn[disabled] { opacity: 0.6; cursor: default; }
  .hc-btn-badge {
    width: 20px; height: 20px; border-radius: 7px;
    background: rgba(255,255,255,0.18);
    display: flex; align-items: center; justify-content: center;
    flex: none;
  }
  .hc-btn-spinner {
    width: 11px; height: 11px; border-radius: 999px;
    border: 1.5px solid rgba(255,255,255,0.35);
    border-top-color: #FFFFFF;
    animation: hc-spin 0.7s linear infinite;
    flex: none;
  }
  @keyframes hc-spin { to { transform: rotate(360deg); } }
`;

export const OVERLAY_CSS = `
  ${BASE_CSS}

  /* ── Card shell — matches the popup's card exactly ─────────────────────── */
  .hc-overlay {
    position: fixed;
    width: 340px;
    max-height: 80vh;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, #FFFFFF 0%, #F3FBFA 100%);
    border-radius: 22px;
    border: 1px solid rgba(32,178,170,0.16);
    box-shadow: 0 24px 60px -20px rgba(11,31,58,0.22), 0 4px 14px rgba(11,31,58,0.05);
    z-index: 2147483647;
    opacity: 0;
    transform: translateY(4px);
    transition: opacity 0.15s ease, transform 0.15s ease;
  }
  .hc-overlay.hc-visible { opacity: 1; transform: translateY(0); }

  .hc-topbar {
    flex: none;
    height: 3px;
    width: 100%;
    background: linear-gradient(90deg, #20B2AA, #3ED6C9);
  }

  /* ── Header — logo badge + wordmark + close, same as ResultScreen ──────── */
  .hc-overlay-header {
    flex: none;
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 18px;
    border-bottom: 1px solid rgba(32,178,170,0.12);
  }
  .hc-brand { display: flex; align-items: center; gap: 8px; }
  .hc-badge-sm {
    width: 26px; height: 26px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center; overflow: hidden;
    background: linear-gradient(135deg, #3ED6C9, #20B2AA 60%, #178F88);
    flex: none;
  }
  .hc-wordmark {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 13.5px; font-weight: 500; color: ${BRAND.navy};
  }
  .hc-close {
    width: 26px; height: 26px; border-radius: 999px; border: 1px solid rgba(11,31,58,0.12);
    background: transparent; color: #8a8a86; cursor: pointer;
    display: flex; align-items: center; justify-content: center; flex: none;
  }
  .hc-close:hover { background: rgba(11,31,58,0.05); }

  /* ── Body ────────────────────────────────────────────────────────────── */
  .hc-body { flex: 1; padding: 16px 18px; }

  .hc-claim-card {
    border-radius: 16px; padding: 16px;
    background: #FFFFFF;
    border: 1px solid rgba(11,31,58,0.08);
    box-shadow: 0 2px 8px rgba(11,31,58,0.04);
  }
  .hc-claim-label-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .hc-claim-label {
    font-family: 'Inter', sans-serif;
    font-size: 9.5px; font-weight: 600; color: #9a988e;
    letter-spacing: 0.14em; text-transform: uppercase; white-space: nowrap;
  }
  .hc-claim-rule { flex: 1; height: 1px; background: rgba(11,31,58,0.08); }
  .hc-claim {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 15px; font-weight: 500; color: ${BRAND.navy};
    line-height: 1.55; margin: 0;
  }

  .hc-status-block { display: flex; flex-direction: column; gap: 8px; margin-top: 14px; }
  .hc-pill {
    align-self: flex-start;
    font-family: 'Inter', sans-serif;
    font-size: 11.5px; font-weight: 600;
    padding: 6px 14px; border-radius: 999px;
  }
  .hc-confidence-label {
    font-family: 'Inter', sans-serif;
    font-size: 10.5px; color: #9a988e; margin-top: 4px;
  }
  .hc-bar-track {
    height: 5px; border-radius: 4px; overflow: hidden;
    background: rgba(11,31,58,0.07);
  }
  .hc-bar-fill { height: 100%; border-radius: 4px; transition: width 1s ease; }

  .hc-evidence-block { padding-left: 14px; margin-top: 16px; border-left: 3px solid; }
  .hc-evidence-label {
    font-family: 'Inter', sans-serif;
    font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;
    margin: 0;
  }
  .hc-explanation {
    font-family: 'Inter', sans-serif;
    font-size: 13px; line-height: 1.6; color: #4a4a45; margin: 6px 0 0;
  }

  .hc-accordion {
    border-radius: 12px; overflow: hidden; margin-top: 14px;
    border: 1px solid rgba(11,31,58,0.08);
  }
  .hc-accordion-btn {
    width: 100%; display: flex; align-items: center; justify-content: space-between;
    padding: 12px 14px; background: none; border: none; cursor: pointer;
    font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 500; color: ${BRAND.navy};
  }
  .hc-accordion-btn:hover { background: rgba(11,31,58,0.03); }
  .hc-accordion-chevron { transition: transform 0.25s ease; flex: none; }
  .hc-accordion-chevron.hc-open { transform: rotate(180deg); }
  .hc-accordion-panel { max-height: 0; overflow: hidden; transition: max-height 0.3s ease; }
  .hc-accordion-panel.hc-open { max-height: 160px; }
  .hc-accordion-inner {
    padding: 12px 16px 16px; border-top: 1px solid rgba(11,31,58,0.06);
    font-family: 'Inter', sans-serif; font-size: 12px; line-height: 1.72;
    color: ${BRAND.navy}; opacity: 0.52; margin: 0;
  }

  .hc-sources-label {
    font-family: 'Inter', sans-serif;
    font-size: 9.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.14em;
    color: #9a988e; margin: 14px 0 10px;
  }
  .hc-sources { display: flex; gap: 8px; flex-wrap: wrap; }
  .hc-source-chip {
    flex: 1; min-width: 72px; border-radius: 12px; padding: 10px 8px; text-align: center;
    background: #F3FBFA; border: 1px solid rgba(32,178,170,0.18);
    text-decoration: none; display: block;
  }
  .hc-source-chip:hover { background: #E8F7F5; }
  .hc-source-name {
    font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600; color: ${BRAND.navy};
  }
  .hc-source-caption {
    font-family: 'Inter', sans-serif; font-size: 9px; color: #9a988e; margin-top: 2px;
  }
  .hc-sources-more {
    display: block; margin-top: 8px; background: none; border: none; cursor: pointer;
    font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600; color: #20B2AA; padding: 0;
  }
  .hc-explanation-list { list-style: none; margin: 6px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .hc-explanation-list li { display: flex; align-items: flex-start; gap: 8px; }
  .hc-explanation-list li::before {
    content: ""; width: 4px; height: 4px; border-radius: 999px; background: currentColor;
    margin-top: 7px; flex: none;
  }
  .hc-explanation-list span {
    font-family: 'Inter', sans-serif; font-size: 13px; line-height: 1.6; color: #4a4a45;
  }

  /* ── Footer — same 3-icon row as ResultScreen ───────────────────────────── */
  .hc-overlay-footer {
    flex: none;
    display: flex; align-items: center; justify-content: space-around;
    padding: 12px 0;
    border-top: 1px solid rgba(32,178,170,0.12);
  }
  .hc-footer-btn {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    background: none; border: none; cursor: pointer; color: #20B2AA;
  }
  .hc-footer-btn span {
    font-family: 'Inter', sans-serif; font-size: 9.5px; color: #6b6a63;
  }
  .hc-footer-btn.hc-active { color: #178F88; }
  .hc-footer-btn.hc-active span { color: #178F88; font-weight: 600; }

  /* ── Loading state — same pulse mark, rings and copy as LoadingScreen ──── */
  .hc-loading {
    flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 28px; padding: 36px 18px;
  }
  .hc-rings { position: relative; width: 96px; height: 96px; display: flex; align-items: center; justify-content: center; }
  .hc-ring-out {
    position: absolute; width: 96px; height: 96px; border-radius: 999px;
    border: 1px solid rgba(32,178,170,0.28);
    animation: hc-ring-out-kf 2.6s ease-in-out infinite;
  }
  .hc-ring-mid {
    position: absolute; width: 72px; height: 72px; border-radius: 999px;
    border: 1px solid rgba(32,178,170,0.4);
    animation: hc-ring-mid-kf 2.6s ease-in-out infinite 0.2s;
  }
  .hc-badge-lg {
    width: 54px; height: 54px; border-radius: 999px;
    display: flex; align-items: center; justify-content: center; overflow: hidden;
    background: linear-gradient(135deg, #3ED6C9, #20B2AA 60%, #178F88);
    box-shadow: 0 14px 26px -8px rgba(32,178,170,0.5);
  }
  .hc-pulse-line { stroke-dasharray: 120; animation: hc-pulse-draw-kf 1.8s linear infinite; }
  .hc-loading-msg {
    font-family: 'Fraunces', Georgia, serif;
    font-style: italic; font-size: 15px; color: ${BRAND.navy}; margin: 0;
    letter-spacing: 0.01em;
    animation: hc-msg-fade-kf 2.2s ease-in-out infinite;
  }
  .hc-dots { display: flex; gap: 8px; }
  .hc-dot { height: 4px; border-radius: 4px; background: rgba(32,178,170,0.25); transition: all 0.4s ease; }
  .hc-dot.hc-active { width: 16px; background: #20B2AA; }
  .hc-dot:not(.hc-active) { width: 4px; }
  .hc-cross-checking { display: flex; align-items: center; gap: 12px; opacity: 0.55; }
  .hc-cross-checking span {
    font-family: 'Inter', sans-serif; font-size: 9.5px; color: ${BRAND.navy};
  }
  .hc-cross-checking .hc-cc-label { text-transform: uppercase; letter-spacing: 0.08em; }
  .hc-cross-checking .hc-cc-source { font-weight: 600; font-size: 10px; }

  @keyframes hc-ring-out-kf {
    0%, 100% { transform: scale(1); opacity: 0.12; }
    50% { transform: scale(1.22); opacity: 0.03; }
  }
  @keyframes hc-ring-mid-kf {
    0%, 100% { transform: scale(1); opacity: 0.22; }
    50% { transform: scale(1.12); opacity: 0.07; }
  }
  @keyframes hc-msg-fade-kf {
    0%, 100% { opacity: 0.55; }
    50% { opacity: 1; }
  }
  @keyframes hc-pulse-draw-kf {
    0% { stroke-dashoffset: 120; }
    60% { stroke-dashoffset: 0; }
    100% { stroke-dashoffset: -120; }
  }

  /* ── Error state ─────────────────────────────────────────────────────── */
  .hc-error-block {
    flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 12px; padding: 36px 24px; text-align: center;
  }
  .hc-error-title {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 16px; font-weight: 500; color: ${BRAND.navy}; margin: 0;
  }
  .hc-error-msg {
    font-family: 'Inter', sans-serif; font-size: 12px; color: ${BRAND.navy}; opacity: 0.45; margin: 0;
  }
  .hc-retry {
    margin-top: 4px;
    font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600; color: #FFFFFF;
    background: linear-gradient(135deg, #3ED6C9 0%, #20B2AA 55%, #178F88 100%);
    box-shadow: 0 10px 20px -8px rgba(32,178,170,0.5);
    border: none; border-radius: 999px; padding: 10px 20px; cursor: pointer;
  }
`;