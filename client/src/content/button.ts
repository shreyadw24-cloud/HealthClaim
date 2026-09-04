import { BUTTON_CSS, injectFontLink } from "./styles";

export type ButtonState = "idle" | "loading" | "no-claim";

export interface VerifyButtonHandle {
  /** The element to insert into the page (a custom element hosting a shadow root). */
  el: HTMLElement;
  setState: (state: ButtonState) => void;
}

const ICON_LOGO = `
  <span class="hc-btn-badge">
    <svg width="12" height="12" viewBox="0 0 40 40" fill="none">
      <path d="M20 3L5.5 9.5V22C5.5 30 11.8 37 20 39C28.2 37 34.5 30 34.5 22V9.5L20 3Z" fill="rgba(255,255,255,0.15)" stroke="#FFFFFF" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M9 21H14L16 15L18.5 27.5L20.5 17L22.2 22L24 21H31" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </span>
`;

/**
 * Builds a "Verify Health Claim" button, isolated inside its own shadow root
 * so it never inherits (or leaks) styles on the host page.
 */
export function createVerifyButton(onClick: () => void): VerifyButtonHandle {
  const host = document.createElement("healthclaim-button");
  host.style.setProperty("visibility", "visible", "important");
  host.style.setProperty("display", "inline-flex", "important");
  host.style.display = "inline-flex";
  host.style.verticalAlign = "middle";
  host.style.marginLeft = "6px";

  const shadow = host.attachShadow({ mode: "open" });
  injectFontLink(shadow);

  const style = document.createElement("style");
  style.textContent = BUTTON_CSS;
  shadow.appendChild(style);

  const root = document.createElement("div");
  root.className = "hc-root";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "hc-btn";
  button.innerHTML = `${ICON_LOGO}<span class="hc-btn-label">Verify Health Claim</span>`;
  button.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });

  root.appendChild(button);
  shadow.appendChild(root);

  const setState = (state: ButtonState) => {
    if (state === "loading") {
      button.disabled = true;
      button.innerHTML = `<span class="hc-btn-spinner"></span><span class="hc-btn-label">Verifying…</span>`;
    } else if (state === "no-claim") {
      button.disabled = false;
      button.innerHTML = `${ICON_LOGO}<span class="hc-btn-label">No claim detected</span>`;
      setTimeout(() => setState("idle"), 2200);
    } else {
      button.disabled = false;
      button.innerHTML = `${ICON_LOGO}<span class="hc-btn-label">Verify Health Claim</span>`;
    }
  };

  return { el: host, setState };
}